# FULA Rewards Program Portal

A decentralized web portal for managing reward programs, members, and FULA token distributions. All data is stored on-chain — no backend or database required. Designed for static hosting on GitHub Pages.

## Overview

The Rewards Program system enables organizations to create hierarchical reward programs where FULA tokens can be deposited, distributed to members with optional lock conditions, and withdrawn. The portal is a pure frontend that interacts directly with the `RewardsProgram` smart contract on Base network.

## Role Hierarchy

```
Admin
  └── ProgramAdmin
        └── TeamLeader
              └── Client
```

- **Admin**: Contract-level administrator. Can create programs, assign ProgramAdmins, and manage all members across all programs.
- **ProgramAdmin**: Manages a specific program. Can add TeamLeaders and Clients. Assigned by Admin.
- **TeamLeader**: Can add Clients under themselves. Assigned by ProgramAdmin or Admin.
- **Client**: End member. Cannot add other members. Assigned by TeamLeader, ProgramAdmin, or Admin.

Each member is identified by a **Member ID** (also called Reward ID), which is unique within each program but can be reused across different programs.

## Programs

Programs are identified by:
- **Program ID**: Auto-incrementing numeric ID (1, 2, 3, ...)
- **Program Code**: Short code up to 8 characters (e.g., "SRP", "GTP")
- **Name** and **Description**

Only Admins can create programs.

## Token Operations

### Deposit
Members deposit FULA tokens from their wallet into the program's StakingPool vault. Two-step process:
1. **Approve** the contract to spend FULA tokens
2. **Deposit** tokens into a specific program

### Transfer to Sub-Member
Parents can transfer tokens to their sub-members with optional restrictions:
- **Free transfer** (`locked=false`, `lockTime=0`): Recipient can withdraw immediately
- **Time-locked** (`locked=false`, `lockTime>0`): Recipient can withdraw after the lock period expires (1-1095 days). Each transfer's lock time is tracked independently.
- **Permanently locked** (`locked=true`): Recipient cannot withdraw. Can only transfer back to a parent in their hierarchy.
- Transfers include an optional **note** (max 256 characters) recorded on-chain.

### Transfer to Parent
Members can transfer tokens back up the hierarchy to any parent in their chain. If no specific parent is specified, tokens go to the direct parent. This is the only way to move permanently locked tokens.

Deduction order: available balance -> expired time-locks -> unexpired time-locks -> permanently locked.

### Withdraw
Members withdraw available (unlocked) tokens to their wallet. Expired time-locks are automatically resolved during withdrawal.

## Balance Types

Each member's balance in a program has three components:
- **Withdrawable**: Freely available tokens that can be withdrawn
- **Permanently Locked**: Tokens that can only be transferred back to parents, never withdrawn
- **Time-Locked**: Tokens with an expiry date. Become withdrawable after the lock period. Max 50 active time-lock tranches per member per program.

## Pages

### Dashboard (`/`)
Role-based overview showing total programs, your programs, wallet FULA balance, and current role. Requires wallet connection.

### Programs (`/programs`)
- **List view**: Table of all programs with ID, code, name, description, and status
- **Detail view** (`/programs?id=1`): Program details, your balance breakdown, and member table (sub-members if TeamLeader/Client, all members if Admin)
- **Create Program** (Admin only): Dialog to create a new program with code, name, and description
- **Add Program Admin** (Admin only): Assign a ProgramAdmin with wallet and member ID
- **Add Member** (ProgramAdmin/TeamLeader): Add TeamLeaders or Clients

### Members (`/members`)
Search for members by:
- **Member ID** + Program ID: Find a specific member's details
- **Program Code**: Look up a program by its short code

### Tokens (`/tokens`)
Five-tab interface for token operations:
1. **Deposit**: Approve and deposit FULA tokens into a program
2. **Transfer to Sub-Member**: Send tokens to a sub-member with optional lock and note
3. **Transfer to Parent**: Return tokens to a parent in the hierarchy
4. **Withdraw**: Withdraw available tokens to your wallet
5. **History**: Recent transfer records with ID, from/to, amount, lock status, note, and date

### Balance Lookup (`/balance`)
Public page that does **not require wallet connection** for viewing. Enter a Member ID to see:
- All programs the member belongs to
- Their role and parent in each program
- Balance breakdown (withdrawable, locked, time-locked) per program
- Status in each program

If the connected wallet matches the member's wallet, action panels appear for deposit, transfer to parent, and withdraw.

Shareable link format: `/balance?member=MEMBER_ID`

## On-Chain Data Notice

All data entered through this portal is stored on the blockchain and is **publicly visible and verifiable**. Users must acknowledge this before submitting any transaction. A disclaimer checkbox is required before:
- Creating a program
- Assigning a Program Admin
- Adding a member
- Transferring tokens to a sub-member

A persistent footer notice reminds users that all records are permanently on-chain.

## Tech Stack

- **Next.js 15** (Static Export) — no server required
- **React 19** — UI framework
- **RainbowKit 2.x** — wallet connection (desktop + mobile)
- **Wagmi 2.x** + **Viem 2.x** — contract interaction
- **TanStack React Query** — data fetching and caching
- **Material UI 6.x** — component library (dark theme)

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          Root layout with sidebar nav + header + footer
│   ├── page.tsx            Dashboard
│   ├── providers.tsx       Wagmi, RainbowKit, MUI, QueryClient providers
│   ├── balance/page.tsx    Public member balance lookup
│   ├── members/page.tsx    Member search
│   ├── programs/page.tsx   Program list + detail (via ?id= param)
│   └── tokens/page.tsx     Token operations (deposit, transfer, withdraw)
├── components/
│   ├── common/
│   │   └── OnChainDisclaimer.tsx   Reusable on-chain data checkbox
│   └── layout/
│       ├── Header.tsx      AppBar with wallet connect + role chip
│       └── Navigation.tsx  Sidebar navigation
├── config/
│   ├── chains.ts           Supported chains (Base, Base Sepolia, Hardhat)
│   └── contracts.ts        Contract addresses, ABIs, role enums
├── hooks/
│   ├── useRewardsProgram.ts  Contract read/write hooks
│   └── useUserRole.ts       Role detection hooks
└── lib/
    ├── utils.ts            Formatting utilities
    └── wagmi.ts            Wagmi configuration
```

## Smart Contract

The portal interacts with the `RewardsProgram` smart contract which inherits from `GovernanceModule` (UUPS upgradeable). The contract uses a separate `StakingPool` as the token vault — all FULA tokens are held in the StakingPool while the RewardsProgram manages the accounting ledger.

- **FULA Token**: `0x9e12735d77c72c5C3670636D428f2F3815d8A4cB` (Base)
- **RewardsProgram**: Set via `NEXT_PUBLIC_REWARDS_PROGRAM_ADDRESS` env var
- **StakingPool**: Set via `NEXT_PUBLIC_STAKING_POOL_ADDRESS` env var

## Setup

```bash
# Install dependencies
npm install

# Set environment variables
cp .env.local.example .env.local
# Edit .env.local with your contract addresses and WalletConnect project ID

# Development
npm run dev

# Build for static hosting
npm run build
# Output in out/ directory
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_REWARDS_PROGRAM_ADDRESS` | Deployed RewardsProgram contract address |
| `NEXT_PUBLIC_STAKING_POOL_ADDRESS` | Deployed StakingPool contract address |
| `NEXT_PUBLIC_FULA_TOKEN_ADDRESS` | FULA token address (defaults to Base mainnet) |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID for wallet connections |
| `NEXT_PUBLIC_CHAIN` | Target chain: `base`, `baseSepolia`, or `hardhat` |

## Deployment

### GitHub Pages

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that automatically builds and deploys to GitHub Pages on push to `main`.

1. Go to repository Settings > Pages
2. Set Source to "GitHub Actions"
3. Push to `main` — the workflow builds and deploys automatically

### Manual Static Hosting

```bash
npm run build
# Serve the out/ directory with any static file server
npx serve out
```

## Security Considerations

- All contract interactions require wallet signing — no private keys are stored
- The portal is read-only without a connected wallet (except the Balance Lookup page)
- On-chain data disclaimer required before any write transaction
- No personal or protected information should be entered — all data is publicly visible on the blockchain
- The contract enforces role-based access control — the portal's UI restrictions are convenience, not security
