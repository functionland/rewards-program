# FULA Rewards Program Portal

A decentralized web portal for managing reward programs, members, and FULA token distributions. All data is stored on-chain — no backend or database required. Designed for static hosting on GitHub Pages.

## Overview

The Rewards Program system enables organizations to create hierarchical reward programs where FULA tokens can be deposited, distributed to members with optional lock conditions, and withdrawn. The portal is a pure frontend that interacts directly with the `RewardsProgram` smart contract on Base network.

---

## BA Requirements Coverage (QA3–QA10)

This section maps each business requirement to its implementation so the BA can verify full coverage.

### QA3 — Program ID & Member ID

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Each program has a unique code (e.g., "SRP") | Supported | `Program Code` — up to 8 characters, stored as `bytes8` on-chain. Displayed on Programs list, Dashboard table, and Balance Lookup. |
| Each member has a unique numeric Member ID within a program | Supported | `Member ID` (also called Reward ID) — up to 12 characters, stored as `bytes12`. Unique per program. Used for lookups, QR codes, and transfers. |

### QA4 — Transfer to Parent Hierarchy

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Client can transfer to their Team Leader | Supported | `Transfer to Parent` on Tokens page and Balance Lookup actions panel. |
| Client can transfer to their Program Admin | Supported | Specify parent wallet address, or leave empty for direct parent. Contract validates the recipient is in the caller's parent chain. |
| Team Leader can transfer to their Program Admin | Supported | Same mechanism — any member can transfer to any ancestor in their hierarchy. |
| Team Leader can transfer to an upline Team Leader | Supported | The contract walks the full parent chain, so multi-level transfers are supported. |

### QA5 — Admin Dashboard

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Admin can track all programs from dashboard | Supported | **Dashboard** (`/`) shows a summary table of all programs with ID, Code, Name, and Status (Active/Inactive). Clicking a program name navigates to its detail view. |
| Program count visible | Supported | Total Programs count card displayed prominently on the dashboard. |

### QA6 — Balance Lookup & Transaction Details

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Look up member balance by Member ID | Supported | **Balance Lookup** (`/balance`) — enter a Member ID to see balances across all programs: Available, Permanently Locked, and Time-Locked. |
| View transaction history (deposits, transfers, withdrawals) | Supported | **Reports** (`/reports`) — queries on-chain events (`TokensDeposited`, `TokensTransferredToMember`, `TokensTransferredToParent`, `TokensWithdrawn`) and displays them in a filterable table with amounts, reward types, notes, and block numbers. |
| Shareable balance link | Supported | `/balance?member=MEMBER_ID` — bookmarkable, no wallet connection required to view. |

### QA7 — Member Type (FREE / VIP / ELITE / PS PARTNER)

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Assign a type when adding a member | Supported | **Member Type dropdown** in both "Assign Program Admin" and "Add Member" dialogs on the Programs detail page. Options: Free, VIP, Elite, PS Partner. |
| Display member type | Supported | Member type shown as a chip in: Programs member table, Members search results, and Balance Lookup program rows. |
| Change member type after creation | Supported | `setMemberType` contract function (callable by parent or admin). Available via the extension contract. |
| Member type stored on-chain | Supported | `uint8 memberType` field in the `Member` struct. Packed into existing storage slot at zero additional cost. |

**On-chain enum values:** `0 = Free`, `1 = VIP`, `2 = Elite`, `3 = PS Partner`

### QA8 — Reward Type on Deposits & Note

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Select a reward type when depositing | Supported | **Reward Type dropdown** on the Deposit tab (Tokens page) and in the Balance Lookup owner deposit section. Populated dynamically from the contract's registered reward types. |
| Admin can manage reward types | Supported | `addRewardType(typeId, name)` and `removeRewardType(typeId)` — admin-only functions. Up to 256 types supported via bitmap storage. |
| Add a note (max 128 chars) to each deposit | Supported | **Note text field** with character counter (128 max) on both deposit forms. Stored on-chain in the `TokensDeposited` event. |
| Deposit ID for tracking | Supported | Auto-incrementing `depositCount` — each deposit emits a `TokensDeposited` event with a unique `depositId`. |

### QA9 — Reward Sub-Types per Program

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Each program can define sub-types under a reward type | Supported | `addSubType(programId, rewardType, subTypeId, name)` — callable by ProgramAdmin or Admin. Up to 256 sub-types per reward type per program (bitmap storage). |
| Remove sub-types | Supported | `removeSubType(programId, rewardType, subTypeId)` — ProgramAdmin or Admin. |
| Deposit with sub-type breakdown | Supported | `addTokensDetailed(programId, amount, rewardType, note, subTypeIds, subTypeQtys)` — validates sub-type IDs exist and quantities sum to the deposit amount. Emits `DepositSubTypes` event. |
| View sub-types | Supported | `getSubTypes(programId, rewardType)` returns all active sub-type IDs and names. |

### QA10 — Data Intelligence Reports

| Requirement | Status | Implementation |
|-------------|--------|----------------|
| Filter transactions by Program ID | Supported | **Reports page** (`/reports`) — Program ID filter. |
| Filter by Member Type | Supported | Member Type dropdown filter on Reports page. |
| Filter by Reward Type | Supported | Reward Type dropdown filter on Reports page (populated from contract). |
| Summary statistics | Supported | Summary cards showing total Deposits, Transfers, and Withdrawals with FULA amounts and transaction counts. |
| Detailed transaction table | Supported | Table with columns: Type (color-coded chip), Program, Wallet, Amount, Reward Type, Note, Block. Sorted by most recent first. Shows up to 100 events. |

---

## Role Hierarchy

```
Admin
  +-- ProgramAdmin
        +-- TeamLeader
              +-- Client
```

- **Admin**: Contract-level administrator. Can create programs, assign ProgramAdmins, and manage all members across all programs.
- **ProgramAdmin**: Manages a specific program. Can add TeamLeaders and Clients, manage sub-types. Assigned by Admin.
- **TeamLeader**: Can add Clients under themselves. Assigned by ProgramAdmin or Admin.
- **Client**: End member. Cannot add other members. Assigned by TeamLeader, ProgramAdmin, or Admin.

Each member is identified by a **Member ID** (also called Reward ID), which is unique within each program but can be reused across different programs.

## Member Types

Every member has a **type** in addition to their role. Types classify members for reporting and business logic:

| Value | Type | Description |
|-------|------|-------------|
| 0 | Free | Default type for new members |
| 1 | VIP | VIP tier member |
| 2 | Elite | Elite tier member |
| 3 | PS Partner | PS Partner tier member |

Member type is set when adding a member and can be changed later by the member's parent or an admin.

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

Each deposit includes:
- **Reward Type** (optional) — selected from admin-defined types (e.g., "MVP", "Bonus")
- **Note** (optional) — free-text up to 128 characters, recorded on-chain
- **Deposit ID** — auto-incrementing, emitted in the `TokensDeposited` event for tracking

### Detailed Deposit (with Sub-Type Breakdown)
For granular tracking, `addTokensDetailed` allows specifying how the deposit amount breaks down across sub-types. The contract validates that:
- All sub-type IDs are registered for the given program and reward type
- The sub-type quantities sum exactly to the deposit amount

### Transfer to Sub-Member
Parents can transfer tokens to their sub-members with optional restrictions:
- **Free transfer** (`locked=false`, `lockTime=0`): Recipient can withdraw immediately
- **Time-locked** (`locked=false`, `lockTime>0`): Recipient can withdraw after the lock period expires (1-1095 days). Each transfer's lock time is tracked independently.
- **Permanently locked** (`locked=true`): Recipient cannot withdraw. Can only transfer back to a parent in their hierarchy.

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

## Reward Types & Sub-Types

### Reward Types (Global)
Admin-managed categories for classifying deposits. Stored as a bitmap supporting up to 256 types. Each type has an ID (0-255) and a display name (up to 16 characters).

Examples: "MVP", "Bonus", "Commission", "Referral"

**Management:** Admin-only via `addRewardType` / `removeRewardType`.

### Sub-Types (Per Program)
Program-specific subdivisions under each reward type. Managed by the ProgramAdmin or Admin. Also bitmap-based (up to 256 per reward type per program).

Example: Under reward type "MVP" for a basketball program: "3pShotMade", "Assist", "Block".

**Management:** ProgramAdmin or Admin via `addSubType` / `removeSubType`.

## Pages

### Dashboard (`/`)
Overview showing total programs count and a summary table of all programs (ID, Code, Name, Status). Connected users also see their wallet FULA balance and role.

### Programs (`/programs`)
- **List view**: Table of all programs with ID, code, name, description, and status
- **Detail view** (`/programs?id=1`): Program details, your balance breakdown, and member table with columns: Member ID, Wallet, Role, **Type**, Parent, Balance, Status, QR
- **Create Program** (Admin only): Dialog to create a new program with code, name, and description
- **Add Program Admin** (Admin only): Assign a ProgramAdmin with wallet, member ID, and **member type**
- **Add Member** (ProgramAdmin/TeamLeader): Add TeamLeaders or Clients with role and **member type** selection

### Members (`/members`)
Search for members by:
- **Member ID** + Program ID: Find a specific member's details including **member type**
- **Program Code**: Look up a program by its short code

Results show: Member ID, Wallet, Role, **Type**, Program, Parent, Balance, Status, QR.

### Tokens (`/tokens`)
Four-tab interface for token operations:
1. **Deposit**: Approve and deposit FULA tokens with **reward type** selection and **note** field (128 chars)
2. **Transfer to Sub-Member**: Send tokens to a sub-member with optional lock
3. **Transfer to Parent**: Return tokens to a parent in the hierarchy
4. **Withdraw**: Withdraw available tokens to your wallet

### Balance Lookup (`/balance`)
Public page that does **not require wallet connection** for viewing. Enter a Member ID to see:
- All programs the member belongs to
- Their role, **member type**, and parent in each program
- Balance breakdown (withdrawable, locked, time-locked) per program
- Status in each program

If the connected wallet matches the member's wallet, action panels appear for deposit (with **reward type** and **note**), transfer to parent, and withdraw.

Shareable link format: `/balance?member=MEMBER_ID`

### Reports (`/reports`)
Reporting page for transaction intelligence. Features:
- **Filters**: Program ID, Member Type, Reward Type
- **Summary cards**: Total deposits, transfers, and withdrawals (FULA amounts + transaction counts)
- **Detail table**: Type (color-coded), Program, Wallet, Amount, Reward Type, Note, Block number
- Data sourced from on-chain events — no backend required
- Sorted by most recent first, showing up to 100 events

## On-Chain Data Notice

All data entered through this portal is stored on the blockchain and is **publicly visible and verifiable**. Users must acknowledge this before submitting any transaction. A disclaimer checkbox is required before:
- Creating a program
- Assigning a Program Admin
- Adding a member
- Transferring tokens to a sub-member

A persistent footer notice reminds users that all records are permanently on-chain.

## Smart Contract Architecture

The portal interacts with two contracts that share a single proxy address:

```
                    +-------------------------------+
                    |    RewardsProgram (UUPS Proxy) |
                    |  +------------+ +----------+  |
                    |  | Core funcs | | fallback |--+--> RewardsExtension
                    |  | (deposit,  | | delegate |  |    (type mgmt, reward types,
                    |  |  transfer, | | call     |  |     sub-types, detailed deposit,
                    |  |  withdraw) | +----------+  |     moved admin functions)
                    |  +------------+               |
                    |       shared storage           |
                    +-------------------------------+
```

- **RewardsProgram**: Main contract with core operations (create program, add members, deposit, transfer, withdraw). UUPS upgradeable.
- **RewardsExtension**: Extension contract called via `delegatecall` from the main contract's `fallback()`. Handles member type management, reward type CRUD, sub-type CRUD, detailed deposits, and moved admin functions (updateProgram, updateMemberID, deactivateProgram).
- Both contracts share the same storage layout via `RewardsStorageBase`.
- The frontend interacts with **one address** (the proxy) using a **combined ABI** — the extension is transparent to the user.

### Contract Addresses

- **FULA Token**: `0x9e12735d77c72c5C3670636D428f2F3815d8A4cB` (Base)
- **RewardsProgram**: Set via `NEXT_PUBLIC_REWARDS_PROGRAM_ADDRESS` env var
- **StakingPool**: Set via `NEXT_PUBLIC_STAKING_POOL_ADDRESS` env var

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
+-- app/
|   +-- layout.tsx          Root layout with sidebar nav + header + footer
|   +-- page.tsx            Dashboard with program summary table
|   +-- providers.tsx       Wagmi, RainbowKit, MUI, QueryClient providers
|   +-- balance/page.tsx    Public member balance lookup + owner actions
|   +-- members/page.tsx    Member search with type display
|   +-- programs/page.tsx   Program list + detail with member type management
|   +-- reports/page.tsx    Reports with filters and transaction history
|   +-- tokens/page.tsx     Token operations (deposit with reward type/note, transfer, withdraw)
+-- components/
|   +-- common/
|   |   +-- OnChainDisclaimer.tsx   Reusable on-chain data checkbox
|   |   +-- QRCodeDisplay.tsx       QR code generation for member IDs
|   |   +-- QRScannerButton.tsx     QR code scanner for member lookups
|   +-- layout/
|       +-- Header.tsx      AppBar with wallet connect + role chip
|       +-- Navigation.tsx  Sidebar navigation (Dashboard, Programs, Members, Tokens, Balance, Reports)
+-- config/
|   +-- chains.ts           Supported chains (Base, Base Sepolia, Hardhat)
|   +-- contracts.ts        Contract addresses, ABIs, role/type enums and labels
+-- hooks/
|   +-- useRewardsProgram.ts  Contract read/write hooks (members, tokens, types, sub-types)
|   +-- useUserRole.ts       Role detection hooks
+-- lib/
    +-- utils.ts            Formatting utilities (bytes conversion, FULA formatting, error mapping)
    +-- wagmi.ts            Wagmi configuration
```

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
- The portal is read-only without a connected wallet (except the Balance Lookup and Reports pages)
- On-chain data disclaimer required before any write transaction
- No personal or protected information should be entered — all data is publicly visible on the blockchain
- The contract enforces role-based access control — the portal's UI restrictions are convenience, not security
