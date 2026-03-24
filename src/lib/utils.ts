import { formatUnits, type Hex } from "viem";

export function toBytes8(str: string): Hex {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const padded = new Uint8Array(8);
  padded.set(bytes.slice(0, 8));
  return ("0x" + Array.from(padded).map(b => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

export function toBytes12(str: string): Hex {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const padded = new Uint8Array(12);
  padded.set(bytes.slice(0, 12));
  return ("0x" + Array.from(padded).map(b => b.toString(16).padStart(2, "0")).join("")) as Hex;
}

export function fromBytes8(hex: Hex): string {
  const bytes = hexToBytes(hex);
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

export function fromBytes12(hex: Hex): string {
  const bytes = hexToBytes(hex);
  return new TextDecoder().decode(bytes).replace(/\0+$/, "");
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

export function formatFula(amount: bigint): string {
  return formatUnits(amount, 18);
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
