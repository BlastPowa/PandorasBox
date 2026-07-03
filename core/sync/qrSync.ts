import type { ReelItem } from "../storage/schema";

const RUN_MARKER = "~";
const ESCAPED_MARKER = "~e";
const RUN_PREFIX = "~r";
const RUN_TERMINATOR = ";";
const MIN_RUN_LENGTH = 5;

function compress(input: string): string {
  let output = "";
  let i = 0;
  while (i < input.length) {
    const char = input[i] as string;
    if (char === RUN_MARKER) {
      output += ESCAPED_MARKER;
      i += 1;
      continue;
    }
    let runLength = 1;
    while (i + runLength < input.length && input[i + runLength] === char) {
      runLength += 1;
    }
    if (runLength >= MIN_RUN_LENGTH) {
      output += `${RUN_PREFIX}${char}${runLength}${RUN_TERMINATOR}`;
    } else {
      output += char.repeat(runLength);
    }
    i += runLength;
  }
  return output;
}

function decompress(input: string): string {
  let output = "";
  let i = 0;
  while (i < input.length) {
    const char = input[i] as string;
    if (char !== RUN_MARKER) {
      output += char;
      i += 1;
      continue;
    }
    const next = input[i + 1];
    if (next === "e") {
      output += RUN_MARKER;
      i += 2;
      continue;
    }
    if (next === "r") {
      const runChar = input[i + 2];
      if (runChar === undefined) {
        throw new Error("Invalid compressed data: truncated run");
      }
      const terminatorIndex = input.indexOf(RUN_TERMINATOR, i + 3);
      if (terminatorIndex === -1) {
        throw new Error("Invalid compressed data: unterminated run");
      }
      const count = Number.parseInt(input.slice(i + 3, terminatorIndex), 10);
      if (Number.isNaN(count) || count < 1) {
        throw new Error("Invalid compressed data: bad run count");
      }
      output += runChar.repeat(count);
      i = terminatorIndex + 1;
      continue;
    }
    throw new Error("Invalid compressed data: unknown marker sequence");
  }
  return output;
}

interface BufferLike {
  from(input: string, encoding: string): { toString(encoding: string): string };
}

interface BufferHost {
  Buffer?: BufferLike;
  btoa?: (data: string) => string;
  atob?: (data: string) => string;
}

function toBase64(input: string): string {
  const host = globalThis as BufferHost;
  if (host.Buffer) {
    return host.Buffer.from(input, "utf-8").toString("base64");
  }
  if (!host.btoa) {
    throw new Error("No base64 encoder available in this environment");
  }
  const bytes = new TextEncoder().encode(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return host.btoa(binary);
}

function fromBase64(input: string): string {
  const host = globalThis as BufferHost;
  if (host.Buffer) {
    return host.Buffer.from(input, "base64").toString("utf-8");
  }
  if (!host.atob) {
    throw new Error("No base64 decoder available in this environment");
  }
  const binary = host.atob(input);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

export function encodeListToQR(list: ReelItem[]): string {
  const json = JSON.stringify(list);
  const compressed = compress(json);
  return toBase64(compressed);
}

export function decodeListFromQR(encoded: string): ReelItem[] {
  const compressed = fromBase64(encoded);
  const json = decompress(compressed);
  const parsed = JSON.parse(json) as unknown;
  if (!validateDecodedList(parsed)) {
    throw new Error("Decoded QR data is not a valid Reel list");
  }
  return parsed;
}

export function validateDecodedList(data: unknown): data is ReelItem[] {
  if (!Array.isArray(data)) {
    return false;
  }
  return data.every((item) => {
    if (typeof item !== "object" || item === null) {
      return false;
    }
    const candidate = item as Record<string, unknown>;
    return (
      typeof candidate.id === "string" &&
      typeof candidate.type === "string" &&
      typeof candidate.title === "string" &&
      typeof candidate.status === "string"
    );
  });
}
