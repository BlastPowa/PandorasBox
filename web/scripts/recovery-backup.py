"""Read-only full PostgreSQL + Supabase Storage backup, encrypted off-provider.

Requires PostgreSQL client tools and cryptography. No restore or deletion commands.
Credentials come from the environment or ignored .env.backup.local/.env.local.
"""
import argparse
import getpass
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tarfile
import tempfile
import urllib.parse
import urllib.request
from datetime import datetime, timezone

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives.kdf.scrypt import Scrypt

ROOT = Path(__file__).resolve().parents[1]
PROJECT = "grflphqeoktyudsehlse"
MAGIC = b"PBOXBACKUP1\n"


def settings():
    result = {}
    for name in (".env.local", ".env.backup.local"):
        path = ROOT / name
        if path.exists():
            for line in path.read_text(encoding="utf-8-sig").splitlines():
                if "=" in line and not line.lstrip().startswith("#"):
                    k, v = line.split("=", 1)
                    result[k.strip()] = v.strip().strip("\"").strip("'")
    return result | dict(os.environ)


def key_for(password, salt):
    return Scrypt(salt=salt, length=32, n=2**15, r=8, p=1).derive(password.encode())


def encrypt(source, target, password):
    salt, nonce = os.urandom(16), os.urandom(12)
    header = MAGIC + salt + nonce
    enc = Cipher(algorithms.AES(key_for(password, salt)), modes.GCM(nonce)).encryptor()
    enc.authenticate_additional_data(header)
    with source.open("rb") as src, target.open("xb") as dst:
        dst.write(header)
        while chunk := src.read(1024 * 1024):
            dst.write(enc.update(chunk))
        dst.write(enc.finalize())
        dst.write(enc.tag)


def decrypt(source, target, password):
    with source.open("rb") as src:
        header = src.read(len(MAGIC) + 28)
        if not header.startswith(MAGIC):
            raise ValueError("Invalid backup format")
        salt, nonce = header[len(MAGIC):len(MAGIC)+16], header[-12:]
        src.seek(-16, 2)
        tag = src.read(16)
        remaining = source.stat().st_size - len(header) - 16
        dec = Cipher(algorithms.AES(key_for(password, salt)), modes.GCM(nonce, tag)).decryptor()
        dec.authenticate_additional_data(header)
        src.seek(len(header))
        with target.open("xb") as dst:
            while remaining:
                chunk = src.read(min(remaining, 1024 * 1024))
                if not chunk:
                    raise ValueError("Truncated backup")
                remaining -= len(chunk)
                dst.write(dec.update(chunk))
            dst.write(dec.finalize())


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def verify_archive(path):
    # Never extract untrusted archive paths. Verification streams every member.
    with tarfile.open(path, "r:gz") as archive:
        manifest = json.load(archive.extractfile("manifest.json"))
        for entry in manifest["files"]:
            stream = archive.extractfile(entry["path"])
            if hashlib.file_digest(stream, "sha256").hexdigest() != entry["sha256"]:
                raise ValueError("Backup checksum mismatch")
        return manifest


def database_export(config, directory):
    url = urllib.parse.urlsplit(config.get("PBOX_DATABASE_URL", ""))
    if url.scheme not in ("postgres", "postgresql") or not url.hostname or not url.password:
        raise ValueError("Save PBOX_DATABASE_URL with password in web/.env.backup.local")
    # Prevent accidentally exporting the separate NightWatch project.
    if PROJECT not in ((url.username or "") + url.hostname):
        raise ValueError("Database connection must identify the Pandora's Box project")
    tools = {}
    for tool in ("pg_dump", "pg_dumpall", "pg_restore"):
        tools[tool] = shutil.which(tool) or shutil.which(str(Path(config.get("PBOX_PG_BIN", "")) / tool))
        if not tools[tool]:
            raise ValueError("Install PostgreSQL client tools or set PBOX_PG_BIN")
    env = dict(os.environ)
    env.update(PGHOST=url.hostname, PGPORT=str(url.port or 5432),
               PGUSER=urllib.parse.unquote(url.username), PGPASSWORD=urllib.parse.unquote(url.password),
               PGDATABASE=url.path.lstrip("/") or "postgres", PGSSLMODE="require", PGCONNECT_TIMEOUT="15")
    # Never put the connection URI/password in command arguments or logs.
    commands = [
        [tools["pg_dump"], "--format=custom", "--no-owner", "--no-acl", "--file", str(directory / "database.dump")],
        [tools["pg_dumpall"], "--roles-only", "--no-role-passwords", "--file", str(directory / "roles.sql")],
        [tools["pg_restore"], "--list", str(directory / "database.dump")],
    ]
    for command in commands:
        result = subprocess.run(command, env=env, capture_output=True, timeout=3600)
        if result.returncode:
            # Database errors can contain private connection metadata: do not echo.
            raise RuntimeError("Database export/validation failed; no complete backup was created")
    # Full pg_dump includes auth, storage metadata, public tables, schema and sequences.
    toc = result.stdout.decode("utf-8", errors="replace")
    if "TABLE DATA auth users" not in toc:
        raise RuntimeError("Export is missing auth.users; refusing incomplete account backup")
    (directory / "database-contents.txt").write_text(toc, encoding="utf-8")


def storage_export(config, directory):
    base = config.get("NEXT_PUBLIC_SUPABASE_URL", "").rstrip("/")
    token = config.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if urllib.parse.urlsplit(base).hostname != PROJECT + ".supabase.co" or not token:
        raise ValueError("Expected Pandora's Box Storage URL and service-role key locally")

    def request(path, body=None):
        data = None if body is None else json.dumps(body).encode()
        req = urllib.request.Request(base + "/storage/v1" + path, data=data, headers={
            "apikey": token, "Authorization": "Bearer " + token, "Content-Type": "application/json"})
        return urllib.request.urlopen(req, timeout=60)

    with request("/bucket") as response:
        buckets = json.load(response)
    (directory / "storage-buckets.json").write_text(json.dumps(buckets), encoding="utf-8")
    objects = []
    for bucket in buckets:
        bucket_id = bucket["id"]
        queue = [""]
        while queue:
            prefix = queue.pop()
            offset = 0
            while True:
                with request("/object/list/" + urllib.parse.quote(bucket_id, safe=""), {
                    "prefix": prefix, "limit": 100, "offset": offset,
                    "sortBy": {"column": "name", "order": "asc"}}) as response:
                    entries = json.load(response)
                for entry in entries:
                    name = (prefix + "/" if prefix else "") + entry["name"]
                    if entry.get("id") is None:
                        queue.append(name)
                        continue
                    # Hash local filenames; object keys can contain unsafe paths.
                    local = "storage/" + hashlib.sha256((bucket_id + "/" + name).encode()).hexdigest()
                    target = directory / local
                    target.parent.mkdir(exist_ok=True)
                    with request("/object/" + urllib.parse.quote(bucket_id, safe="") + "/" +
                                 urllib.parse.quote(name, safe="/")) as response, target.open("xb") as output:
                        shutil.copyfileobj(response, output)
                    objects.append({"bucket": bucket_id, "key": name, "file": local})
                if len(entries) < 100:
                    break
                offset += len(entries)
    (directory / "storage-objects.json").write_text(json.dumps(objects), encoding="utf-8")
    return len(objects)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=Path.home() / "PandorasBoxBackups")
    parser.add_argument("--verify", type=Path, help="Verify an encrypted backup without restoring it")
    args = parser.parse_args()
    password = getpass.getpass("Backup encryption passphrase (store in your password manager): ")
    if len(password) < 16:
        raise ValueError("Use a passphrase of at least 16 characters")
    with tempfile.TemporaryDirectory(prefix="pbox-recovery-") as temp:
        work = Path(temp)
        if args.verify:
            archive = work / "verify.tar.gz"
            decrypt(args.verify, archive, password)
            verify_archive(archive)
            print("PASS: authenticated encryption and all file checksums verified. Restore drill still required.")
            return
        if getpass.getpass("Confirm passphrase: ") != password:
            raise ValueError("Passphrases do not match")
        config = settings()
        payload = work / "payload"
        payload.mkdir()
        print("Exporting database read-only; this may take several minutes...")
        database_export(config, payload)
        print("Exporting uploaded files...")
        object_count = storage_export(config, payload)
        manifest = {"project": PROJECT, "created_utc": datetime.now(timezone.utc).isoformat(),
                    "storage_objects": object_count, "files": [
                        {"path": p.relative_to(payload).as_posix(), "bytes": p.stat().st_size,
                         "sha256": digest(p)} for p in payload.rglob("*") if p.is_file()]}
        (payload / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        archive = work / "backup.tar.gz"
        with tarfile.open(archive, "w:gz") as tar:
            for file in payload.rglob("*"):
                if file.is_file():
                    tar.add(file, arcname=file.relative_to(payload).as_posix())
        args.output.mkdir(parents=True, exist_ok=True)
        if args.output.resolve().is_relative_to(ROOT.parent.resolve()):
            raise ValueError("Backup destination must be outside the source repository")
        target = args.output / (datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ") + ".pboxbackup")
        try:
            encrypt(archive, target, password)
            checked = work / "checked.tar.gz"
            decrypt(target, checked, password)
            verify_archive(checked)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        print("Complete encrypted backup saved:", target)
        print("Copy this encrypted file to an independent drive/cloud account. Test a restore before relying on it.")


if __name__ == "__main__":
    try:
        main()
    except (Exception, KeyboardInterrupt) as error:
        # Generic errors prevent credentials, private paths and API response bodies leaking.
        if isinstance(error, ValueError):
            print("Backup stopped:", error)
        else:
            print("Backup stopped (" + type(error).__name__ + "). No complete backup was confirmed.")
        raise SystemExit(1)
