"""Build private, local D1 staging SQL from an encrypted portable backup.

This preserves original rows; it does NOT implement the site's replacement auth,
permissions, realtime, storage or live database adapter. No network calls.
"""
import argparse
import getpass
import hashlib
import json
from pathlib import Path
import sqlite3
import tarfile
import tempfile
import importlib.util

spec = importlib.util.spec_from_file_location("backup", Path(__file__).with_name("recovery-backup.py"))
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


def convert(lines, connection):
    connection.executescript("""
        CREATE TABLE source_tables(name TEXT PRIMARY KEY, expected_rows INTEGER NOT NULL);
        CREATE TABLE source_records(table_name TEXT NOT NULL REFERENCES source_tables(name),
          ordinal INTEGER NOT NULL, record_json TEXT NOT NULL CHECK(json_valid(record_json)),
          sha256 TEXT NOT NULL, PRIMARY KEY(table_name,ordinal));
    """)
    counts = {}
    for line in lines:
        item = json.loads(line)
        name = item["table"]
        if "count" in item:
            connection.execute("INSERT INTO source_tables VALUES (?,?)", (name, item["count"]))
            counts[name] = 0
        else:
            raw = item["row"]
            json.loads(raw)  # Validate without reserializing numbers, IDs or hashes.
            counts[name] += 1
            connection.execute("INSERT INTO source_records VALUES (?,?,?,?)", (
                name, counts[name], raw, hashlib.sha256(raw.encode()).hexdigest()))
    for name, expected in connection.execute("SELECT name,expected_rows FROM source_tables"):
        if counts[name] != expected:
            raise ValueError("Source row count mismatch")
    if "auth.users" not in counts:
        raise ValueError("Missing auth.users snapshot")
    connection.commit()
    return counts


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("backup", type=Path)
    parser.add_argument("--output", type=Path, default=Path.home() / "PandorasBoxMigration")
    args = parser.parse_args()
    output = args.output.resolve()
    if output.is_relative_to(backup.ROOT.parent.resolve()) or output.exists():
        raise ValueError("Use a new private output folder outside the repository")
    password = getpass.getpass("Backup passphrase: ")
    with tempfile.TemporaryDirectory(prefix="pbox-d1-") as temp:
        work = Path(temp)
        archive = work / "backup.tar.gz"
        backup.decrypt(args.backup, archive, password)
        backup.verify_archive(archive)
        db = sqlite3.connect(work / "staging.sqlite")
        with tarfile.open(archive, "r:gz") as tar:
            rows = tar.extractfile("portable.jsonl")
            counts = convert(rows, db)
        sql = work / "staging.sql"
        largest = 0
        with sql.open("w", encoding="utf-8", newline="\n") as stream:
            for statement in db.iterdump():
                largest = max(largest, len(statement.encode()))
                stream.write(statement + "\n")
        db.close()
        # D1 accepts at most 100 KB per SQL statement. Do not silently skip rows.
        if largest > 100000:
            raise ValueError("A row exceeds D1 SQL import limits; split/normalize it before import")
        if sql.stat().st_size > 450 * 1024 * 1024:
            raise ValueError("Staging exceeds free D1 headroom; choose sufficient capacity")
        output.mkdir()
        sql.replace(output / "staging.sql")
        (output / "validation.json").write_text(json.dumps({"tables": counts,
            "sql_sha256": backup.digest(output / "staging.sql"), "live_ready": False}, indent=2))
        print("Private D1 staging import prepared:", output)
        print("Contains sensitive account data. Test in private staging; no live cutover performed.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print("Import preparation stopped:", str(error) if isinstance(error, ValueError) else type(error).__name__)
        raise SystemExit(1)
