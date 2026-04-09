import { BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
  TokensDeposited,
  TokensTransferredToMember,
  TokensTransferredToParent,
  TokensWithdrawn,
  TimeLockResolved,
  MemberAdded,
  ProgramAdminAssigned,
  MemberRemoved,
  MemberClaimed,
  MemberWalletChanged,
  MemberIDUpdated,
  MemberTypeChanged,
  ProgramCreated,
  ProgramUpdated,
  ProgramDeactivated,
  TransferLimitUpdated,
  RewardTypeAdded,
  RewardTypeRemoved,
  SubTypeAdded,
  SubTypeRemoved,
} from "../generated/RewardsProgram/RewardsProgram";
import { ContractEvent } from "../generated/schema";

const ZERO_ADDR = Bytes.fromHexString("0x0000000000000000000000000000000000000000");
const ROLE_LABELS = ["None", "Client", "Team Leader", "Program Admin"];
const TYPE_LABELS = ["Free", "Basic", "Pro"];

function eventId(event: ethereum.Event): Bytes {
  return event.transaction.hash.concatI32(event.logIndex.toI32());
}

function bytesToUtf8(bytes: Bytes): string {
  let result = "";
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] == 0) break;
    result += String.fromCharCode(bytes[i]);
  }
  return result;
}

function roleLabel(role: i32): string {
  if (role >= 0 && role < ROLE_LABELS.length) return ROLE_LABELS[role];
  return "Role" + role.toString();
}

function typeLabel(t: i32): string {
  if (t >= 0 && t < TYPE_LABELS.length) return TYPE_LABELS[t];
  return "Type" + t.toString();
}

function shortenAddr(addr: Bytes): string {
  let hex = addr.toHexString();
  return hex.slice(0, 10) + "…";
}

function baseEvent(event: ethereum.Event, eventType: string, programId: BigInt, wallet: Bytes, amount: BigInt): ContractEvent {
  let entity = new ContractEvent(eventId(event));
  entity.eventType = eventType;
  entity.programId = programId.toI32();
  entity.wallet = wallet;
  entity.amount = amount;
  entity.detail = null;
  entity.rewardType = 0;
  entity.note = null;
  entity.depositId = null;
  entity.blockNumber = event.block.number;
  entity.blockTimestamp = event.block.timestamp;
  entity.transactionHash = event.transaction.hash;
  entity.logIndex = event.logIndex;
  return entity;
}

// --- Token events ---

export function handleTokensDeposited(event: TokensDeposited): void {
  let e = baseEvent(event, "Deposit", event.params.programId, event.params.wallet, event.params.amount);
  e.depositId = event.params.depositId.toString();
  e.rewardType = event.params.rewardType;
  e.note = event.params.note;
  e.save();
}

export function handleTokensTransferredToMember(event: TokensTransferredToMember): void {
  let e = baseEvent(event, "Transfer", event.params.programId, event.params.from, event.params.amount);
  e.rewardType = event.params.rewardType;
  e.note = event.params.note;
  if (event.params.locked) {
    e.detail = "Locked " + event.params.lockTimeDays.toString() + "d → " + shortenAddr(event.params.to);
  } else {
    e.detail = "→ " + shortenAddr(event.params.to);
  }
  e.save();
}

export function handleTokensTransferredToParent(event: TokensTransferredToParent): void {
  let e = baseEvent(event, "TransferToParent", event.params.programId, event.params.from, event.params.amount);
  e.detail = "→ " + shortenAddr(event.params.to);
  e.note = event.params.note;
  e.save();
}

export function handleTokensWithdrawn(event: TokensWithdrawn): void {
  let e = baseEvent(event, "Withdrawal", event.params.programId, event.params.wallet, event.params.amount);
  e.save();
}

export function handleTimeLockResolved(event: TimeLockResolved): void {
  let e = baseEvent(event, "TimeLockResolved", event.params.programId, event.params.wallet, event.params.amount);
  e.save();
}

// --- Member events ---

export function handleMemberAdded(event: MemberAdded): void {
  let e = baseEvent(event, "MemberAdded", event.params.programId, event.params.wallet, BigInt.zero());
  let id = bytesToUtf8(event.params.memberID);
  e.detail = roleLabel(event.params.role) + " / " + typeLabel(event.params.memberType) + " — ID: " + id;
  e.save();
}

export function handleProgramAdminAssigned(event: ProgramAdminAssigned): void {
  let e = baseEvent(event, "PAAssigned", event.params.programId, event.params.wallet, BigInt.zero());
  e.detail = "ID: " + bytesToUtf8(event.params.memberID);
  e.save();
}

export function handleMemberRemoved(event: MemberRemoved): void {
  let e = baseEvent(event, "MemberRemoved", event.params.programId, event.params.wallet, BigInt.zero());
  e.save();
}

export function handleMemberClaimed(event: MemberClaimed): void {
  let e = baseEvent(event, "MemberClaimed", event.params.programId, event.params.wallet, BigInt.zero());
  e.detail = "Key: " + shortenAddr(event.params.memberKey);
  e.save();
}

export function handleMemberWalletChanged(event: MemberWalletChanged): void {
  let e = baseEvent(event, "WalletChanged", event.params.programId, event.params.memberKey, BigInt.zero());
  e.detail = shortenAddr(event.params.oldWallet) + " → " + shortenAddr(event.params.newWallet);
  e.save();
}

export function handleMemberIDUpdated(event: MemberIDUpdated): void {
  let e = baseEvent(event, "MemberIDUpdated", event.params.programId, event.params.wallet, BigInt.zero());
  e.detail = bytesToUtf8(event.params.oldMemberID) + " → " + bytesToUtf8(event.params.newMemberID);
  e.save();
}

export function handleMemberTypeChanged(event: MemberTypeChanged): void {
  let e = baseEvent(event, "TypeChanged", event.params.programId, event.params.memberKey, BigInt.zero());
  e.detail = typeLabel(event.params.oldType) + " → " + typeLabel(event.params.newType);
  e.save();
}

// --- Program events ---

export function handleProgramCreated(event: ProgramCreated): void {
  let e = baseEvent(event, "ProgramCreated", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = bytesToUtf8(event.params.code) + " — " + event.params.name;
  e.save();
}

export function handleProgramUpdated(event: ProgramUpdated): void {
  let e = baseEvent(event, "ProgramUpdated", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = event.params.name;
  e.save();
}

export function handleProgramDeactivated(event: ProgramDeactivated): void {
  let e = baseEvent(event, "ProgramDeactivated", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.save();
}

export function handleTransferLimitUpdated(event: TransferLimitUpdated): void {
  let e = baseEvent(event, "LimitUpdated", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = event.params.oldLimit.toString() + "% → " + event.params.newLimit.toString() + "%";
  e.save();
}

// --- Reward type events ---

export function handleRewardTypeAdded(event: RewardTypeAdded): void {
  let e = baseEvent(event, "RewardTypeAdded", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = "#" + event.params.typeId.toString() + ": " + bytesToUtf8(event.params.name);
  e.save();
}

export function handleRewardTypeRemoved(event: RewardTypeRemoved): void {
  let e = baseEvent(event, "RewardTypeRemoved", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = "#" + event.params.typeId.toString();
  e.save();
}

export function handleSubTypeAdded(event: SubTypeAdded): void {
  let e = baseEvent(event, "SubTypeAdded", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = "RT#" + event.params.rewardType.toString() + " → Sub#" + event.params.subTypeId.toString() + ": " + bytesToUtf8(event.params.name);
  e.save();
}

export function handleSubTypeRemoved(event: SubTypeRemoved): void {
  let e = baseEvent(event, "SubTypeRemoved", event.params.programId, ZERO_ADDR, BigInt.zero());
  e.detail = "RT#" + event.params.rewardType.toString() + " → Sub#" + event.params.subTypeId.toString();
  e.save();
}
