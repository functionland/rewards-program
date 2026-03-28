import { formatUnits, parseUnits, isAddress, type Hex } from "viem";

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

export function fromBytes16(hex: Hex): string {
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
  const raw = formatUnits(amount, 18);
  const [whole, decimals] = raw.split(".");
  if (!decimals || decimals === "0") return whole;
  const trimmed = decimals.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

export function safeParseAmount(amount: string): bigint | null {
  try {
    const trimmed = amount.trim();
    if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) < 0) return null;
    return parseUnits(trimmed, 18);
  } catch {
    return null;
  }
}

export function isValidAddress(addr: string): boolean {
  return isAddress(addr);
}

const ERROR_MAP: Record<string, string> = {
  InsufficientBalance: "Insufficient balance for this operation.",
  MemberNotFound: "Member not found or inactive in this program.",
  MemberAlreadyExists: "This wallet is already a member of the program.",
  DuplicateMemberID: "This Member ID is already taken in the program.",
  InvalidMemberID: "Member ID cannot be empty.",
  InvalidAmount: "Invalid token amount.",
  InvalidRole: "Invalid role for this operation.",
  UnauthorizedRole: "You do not have permission to assign this role.",
  NotSubMember: "Recipient is not your sub-member in this program.",
  NotInParentChain: "Target is not in your parent chain.",
  NoParentFound: "No parent found for this member.",
  ProgramNotFound: "Program not found.",
  ProgramNotActive: "This program is not active.",
  DuplicateProgramCode: "A program with this code already exists.",
  InvalidProgramCode: "Program code cannot be empty.",
  LockTimeTooLong: "Lock time exceeds maximum of 1095 days (3 years).",
  MaxTimeLockTranchesReached: "Maximum number of time-lock tranches reached (50).",
  NoteTooLong: "Note must be 128 characters or fewer.",
  InvalidMemberType: "Invalid member type.",
  InvalidRewardType: "Invalid reward type.",
  InvalidSubTypeData: "Invalid sub-type data.",
  TransferExceedsLimit: "Transfer amount exceeds the program's transfer control limit.",
  InvalidTransferLimit: "Transfer limit must be between 0 and 100.",
  InvalidAddress: "Invalid address provided.",
};

export function formatContractError(error: Error): string {
  const msg = error.message || "";
  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return friendly;
  }
  if (msg.includes("User rejected") || msg.includes("user rejected")) return "Transaction was rejected.";
  if (msg.includes("insufficient funds")) return "Insufficient funds for gas fees.";
  return "Transaction failed. Please try again.";
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
