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

export const MemberTypeEnum = {
  Free: 0,
  Vip: 1,
  Elite: 2,
  PSPartner: 3,
} as const;

export const MemberTypeLabels: Record<number, string> = {
  0: "Free",
  1: "VIP",
  2: "Elite",
  3: "PS Partner",
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
    name: "programCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint32" }],
  },
  {
    name: "programCodeToId",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "code", type: "bytes8" }],
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
        { name: "memberType", type: "uint8" },
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
        { name: "memberType", type: "uint8" },
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
    name: "memberIDLookup",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "memberID", type: "bytes12" },
      { name: "programId", type: "uint32" },
    ],
    outputs: [{ type: "address" }],
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
  {
    name: "getRewardTypes",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      { name: "ids", type: "uint8[]" },
      { name: "names", type: "bytes16[]" },
    ],
  },
  {
    name: "getSubTypes",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "rewardType", type: "uint8" },
    ],
    outputs: [
      { name: "ids", type: "uint8[]" },
      { name: "names", type: "bytes16[]" },
    ],
  },
  {
    name: "validRewardTypes",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "depositCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint64" }],
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
    name: "updateProgram",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "name", type: "string" },
      { name: "description", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "deactivateProgram",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "programId", type: "uint32" }],
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
      { name: "editCodeHash", type: "bytes32" },
      { name: "memberType", type: "uint8" },
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
      { name: "editCodeHash", type: "bytes32" },
      { name: "memberType", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "addMemberUnder",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "parentMemberID", type: "bytes12" },
      { name: "wallet", type: "address" },
      { name: "memberID", type: "bytes12" },
      { name: "role", type: "uint8" },
      { name: "editCodeHash", type: "bytes32" },
      { name: "memberType", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "setMemberWallet",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberID", type: "bytes12" },
      { name: "newWallet", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "updateMemberID",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "oldMemberID", type: "bytes12" },
      { name: "newMemberID", type: "bytes12" },
    ],
    outputs: [],
  },
  {
    name: "removeMember",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberKey", type: "address" },
    ],
    outputs: [],
  },
  {
    name: "claimMember",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberID", type: "bytes12" },
      { name: "editCode", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    name: "setEditCodeHash",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberID", type: "bytes12" },
      { name: "newHash", type: "bytes32" },
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
      { name: "rewardType", type: "uint8" },
      { name: "note", type: "string" },
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
  {
    name: "actForMember",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberID", type: "bytes12" },
      { name: "action", type: "uint8" },
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "locked", type: "bool" },
      { name: "lockTimeDays", type: "uint32" },
      { name: "rewardType", type: "uint8" },
      { name: "note", type: "string" },
    ],
    outputs: [],
  },
  {
    name: "setMemberType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "memberID", type: "bytes12" },
      { name: "newType", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "addRewardType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "typeId", type: "uint8" },
      { name: "name", type: "bytes16" },
    ],
    outputs: [],
  },
  {
    name: "removeRewardType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "typeId", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "addSubType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "rewardType", type: "uint8" },
      { name: "subTypeId", type: "uint8" },
      { name: "name", type: "bytes16" },
    ],
    outputs: [],
  },
  {
    name: "removeSubType",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "rewardType", type: "uint8" },
      { name: "subTypeId", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "addTokensDetailed",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "amount", type: "uint256" },
      { name: "rewardType", type: "uint8" },
      { name: "note", type: "string" },
      { name: "subTypeIds", type: "uint8[]" },
      { name: "subTypeQtys", type: "uint128[]" },
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
    name: "MemberAdded",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "parent", type: "address", indexed: true },
      { name: "role", type: "uint8", indexed: false },
      { name: "memberType", type: "uint8", indexed: false },
      { name: "memberID", type: "bytes12", indexed: false },
    ],
  },
  {
    name: "TokensTransferredToMember",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "locked", type: "bool", indexed: false },
      { name: "lockTimeDays", type: "uint32", indexed: false },
    ],
  },
  {
    name: "TokensDeposited",
    type: "event",
    inputs: [
      { name: "depositId", type: "uint256", indexed: true },
      { name: "programId", type: "uint32", indexed: true },
      { name: "wallet", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "rewardType", type: "uint8", indexed: false },
      { name: "note", type: "string", indexed: false },
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
  {
    name: "MemberClaimed",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "memberKey", type: "address", indexed: true },
      { name: "wallet", type: "address", indexed: true },
    ],
  },
  {
    name: "MemberTypeChanged",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "memberKey", type: "address", indexed: true },
      { name: "oldType", type: "uint8", indexed: false },
      { name: "newType", type: "uint8", indexed: false },
    ],
  },
  {
    name: "RewardTypeAdded",
    type: "event",
    inputs: [
      { name: "typeId", type: "uint8", indexed: true },
      { name: "name", type: "bytes16", indexed: false },
    ],
  },
  {
    name: "DepositSubTypes",
    type: "event",
    inputs: [
      { name: "depositId", type: "uint256", indexed: true },
      { name: "programId", type: "uint32", indexed: true },
      { name: "depositor", type: "address", indexed: true },
      { name: "subTypeIds", type: "uint8[]", indexed: false },
      { name: "quantities", type: "uint128[]", indexed: false },
    ],
  },
  // Transfer Control Limit
  {
    name: "setTransferLimit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "programId", type: "uint32" },
      { name: "limitPercent", type: "uint8" },
    ],
    outputs: [],
  },
  {
    name: "getTransferLimit",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "programId", type: "uint32" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "TransferLimitUpdated",
    type: "event",
    inputs: [
      { name: "programId", type: "uint32", indexed: true },
      { name: "oldLimit", type: "uint8", indexed: false },
      { name: "newLimit", type: "uint8", indexed: false },
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
