import { type Address } from "viem";

// Contract addresses - update these after deployment
export const CONTRACTS = {
  rewardsProgram: (process.env.NEXT_PUBLIC_REWARDS_PROGRAM_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  stakingPool: (process.env.NEXT_PUBLIC_STAKING_POOL_ADDRESS || "0x0000000000000000000000000000000000000000") as Address,
  fulaToken: (process.env.NEXT_PUBLIC_FULA_TOKEN_ADDRESS || "0x9e12735d77c72c5C3670636D428f2F3815d8A4cB") as Address,
};

export const ADMIN_ROLE = "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42"; // keccak256("ADMIN_ROLE")

export const MemberRoleEnum = {
  None: 0,
  Client: 1,
  TeamLeader: 2,
  ProgramAdmin: 3,
} as const;

export const MemberRoleLabels: Record<number, string> = {
  0: "None",
  1: "Client",
  2: "Team Leader",
  3: "Program Admin",
};

// RewardsProgram ABI (minimal - key functions only)
export const REWARDS_PROGRAM_ABI = [
  // Read functions
  {
    name: "getProgram",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "programId", type: "uint32" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "id", type: "uint32" },
        { name: "code", type: "bytes8" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  {
    name: "getProgramByCode",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "code", type: "bytes8" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "id", type: "uint32" },
        { name: "code", type: "bytes8" },
        { name: "name", type: "string" },
        { name: "description", type: "string" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  {
    name: "programCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint32" }],
  },
  {
    name: "getMember",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{
      type: "tuple",
      components: [
        { name: "wallet", type: "address" },
        { name: "memberID", type: "bytes12" },
        { name: "role", type: "uint8" },
        { name: "programId", type: "uint32" },
        { name: "parent", type: "address" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  {
    name: "getMemberByID",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "memberID", type: "bytes12" },
      { name: "programId", type: "uint32" },
    ],
    outputs: [{
      type: "tuple",
      components: [
        { name: "wallet", type: "address" },
        { name: "memberID", type: "bytes12" },
        { name: "role", type: "uint8" },
        { name: "programId", type: "uint32" },
        { name: "parent", type: "address" },
        { name: "active", type: "bool" },
      ],
    }],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [
      { name: "available", type: "uint256" },
      { name: "permanentlyLocked", type: "uint256" },
      { name: "totalTimeLocked", type: "uint256" },
    ],
  },
  {
    name: "getEffectiveBalance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [
      { name: "withdrawable", type: "uint256" },
      { name: "permanentlyLocked", type: "uint256" },
      { name: "timeLocked", type: "uint256" },
    ],
  },
  {
    name: "getTimeLocks",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{
      type: "tuple[]",
      components: [
        { name: "amount", type: "uint128" },
        { name: "unlockTime", type: "uint64" },
      ],
    }],
  },
  {
    name: "getDirectChildren",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [{ type: "address[]" }],
  },
  {
    name: "getTransferRecord",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{
      type: "tuple",
      components: [
        { name: "id", type: "uint256" },
        { name: "programId", type: "uint32" },
        { name: "from", type: "address" },
        { name: "to", type: "address" },
        { name: "amount", type: "uint256" },
        { name: "note", type: "string" },
        { name: "locked", type: "bool" },
        { name: "lockTimeDays", type: "uint32" },
        { name: "timestamp", type: "uint64" },
      ],
    }],
  },
  {
    name: "transferCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getMemberPrograms",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "uint32[]" }],
  },
  {
    name: "adminMemberIDs",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "bytes12" }],
  },
  {
    name: "hasRole",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "role", type: "bytes32" },
      { name: "account", type: "address" },
    ],
    outputs: [{ type: "bool" }],
  },
  // Write functions
  {
    name: "createProgram",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "code", type: "bytes8" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    outputs: [{ type: "uint32" }],
  },
  {
    name: "setAdminMemberID",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "memberID", type: "bytes12" }],
    outputs: [],
  },
  {
    name: "assignProgramAdmin",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
      { name: "memberID", type: "bytes12" },
    ],
    outputs: [],
  },
  {
    name: "removeProgramAdmin",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "addMember",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "wallet", type: "address" },
      { name: "memberID", type: "bytes12" },
      { name: "role", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "addTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "transferToSubMember",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "note", type: "string" },
      { name: "locked", type: "bool" },
      { name: "lockTimeDays", type: "uint32" },
    ],
    outputs: [],
  },
  {
    name: "transferToParent",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  // Events
  {
    name: "ProgramCreated",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "code", type: "bytes8", indexed: false },
      { name: "name", type: "string", indexed: false },
    ],
  },
  {
    name: "TokensTransferredToMember",
    type: "event",
    inputs: [
      { name: "transferId", type: "uint256", indexed: true },
      { name: "programId", type: "uint32", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "locked", type: "bool", indexed: false },
      { name: "lockTimeDays", type: "uint32", indexed: false },
    ],
  },
  {
    name: "TokensWithdrawn",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;

// ERC20 ABI (minimal)
export const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    name: "allowance",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "string" }],
  },
  {
    name: "decimals",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
] as const;
