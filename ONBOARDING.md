# FULA Rewards Program -- Onboarding Guide

This guide walks you through every action in the Rewards Program portal, organized by role. No technical knowledge is required.

> **Important:** All actions that change data (adding members, transferring tokens, etc.) require you to sign a transaction with your wallet. You will see a confirmation prompt from your wallet app each time.

---

## Table of Contents

- [Getting Started](#getting-started)
- [For Admins](#for-admins)
- [For Program Admins](#for-program-admins)
- [For Team Leaders](#for-team-leaders)
- [For Members (Clients)](#for-members-clients)
- [For Merchants (Redeem)](#for-merchants-redeem)
- [Quick Reference: Who Can Do What](#quick-reference-who-can-do-what)

---

## Getting Started

### Connecting Your Wallet

1. Open the portal in your browser
2. Click **Connect Wallet** in the top-right corner
3. Choose your wallet (MetaMask, WalletConnect, etc.)
4. Approve the connection in your wallet app
5. Make sure you are on the **Base** network -- the portal will prompt you to switch if needed

Your role (Admin, Program Admin, Team Leader, or Client) is detected automatically and shown next to your wallet address.

### Understanding the Portal Pages

| Page | What it does |
|------|-------------|
| **Dashboard** | Overview of all programs |
| **Programs** | Create and manage programs and their members |
| **Members** | Search for any member by their ID |
| **Tokens** | Deposit, transfer, and withdraw FULA tokens |
| **Balance** | Look up any member's balance (no wallet needed to view) |
| **Redeem** | Merchant redemption page for scanning member QR codes |
| **Reports** | Transaction history and statistics |

---

## For Admins

The Admin is the top-level administrator of the entire system. Only the Admin can create programs and assign Program Admins.

### Creating a New Program

1. Go to the **Programs** page
2. Click **Create Program**
3. Fill in:
   - **Program Code** -- a short code up to 8 characters (e.g., "SRP", "GTP"). This cannot be changed later.
   - **Program Name** -- the display name
   - **Description** -- a brief description of the program
4. Check the on-chain data disclaimer checkbox
5. Click **Create** and confirm the transaction in your wallet

### Assigning a Program Admin

A Program Admin manages one specific program. They can add members, manage settings, and handle day-to-day operations.

1. Go to **Programs** and click on the program name to open its detail view
2. Click **Add Program Admin**
3. Fill in:
   - **Wallet Address** -- the Program Admin's wallet address. Leave empty if they do not have a wallet yet (see [Walletless Members](#about-walletless-members) below).
   - **Member ID** -- a unique identifier for this person within the program (e.g., "PA-JOHN", "ADMIN01")
   - **Member Type** -- select Free, VIP, Elite, or PS Partner
4. Check the on-chain data disclaimer checkbox
5. Click **Assign** and confirm the transaction

**If the wallet was left empty:** After the transaction succeeds, a dialog will appear showing:
- A **Claim Link** -- copy this and send it securely to the new Program Admin
- An **Edit Code** -- this is a secret code embedded in the claim link

The Program Admin will use this link to connect their wallet later (see [Claiming Your Account](#claiming-your-account-using-a-claim-link)).

### Depositing Tokens into a Program

Before tokens can be distributed to members, they must be deposited into the program.

1. Go to the **Tokens** page
2. Select the **Deposit** tab
3. Enter:
   - **Program ID** -- the number of the program
   - **Amount** -- how many FULA tokens to deposit
   - **Reward Type** (optional) -- select a category if reward types have been set up
   - **Note** (optional) -- a short note (up to 128 characters) for record-keeping
4. The portal will first ask you to **Approve** the token transfer (this gives the contract permission to move your FULA tokens)
5. Then click **Deposit** and confirm the transaction

### Transferring Tokens to a Sub-Member

After depositing, you can distribute tokens to any member in any program.

1. Go to the **Tokens** page and select the **Transfer to Sub-Member** tab
2. Enter:
   - **Program ID**
   - **Recipient** -- enter their Member ID or wallet address. You can also click the QR scanner icon to scan their QR code.
   - **Amount** -- how many tokens to transfer
   - **Lock Type**:
     - **Unlocked** -- the member can withdraw immediately
     - **Time-Locked** -- the member must wait a set number of days before withdrawing (enter the number of days)
     - **Permanently Locked** -- the member can never withdraw these tokens, only transfer them back to a parent
   - **Reward Type** and **Sub-Type** (optional) -- for categorization
   - **Note** (optional)
3. Check the on-chain data disclaimer and click **Transfer**

### Managing Reward Types

Reward types are categories used when depositing tokens (e.g., "MVP", "Bonus", "Referral").

1. Go to the program detail page (click program name on **Programs** page)
2. Scroll to the **Reward Types** section
3. Click **Add Reward Type** and enter a Type ID (0-255) and Name
4. To remove a reward type, click the remove button next to it

### Setting a Transfer Control Limit

This limits how much a Client can transfer to their parent as a percentage of their total balance.

1. Go to the program detail page
2. Click **Set Transfer Limit**
3. Enter a percentage (0-100):
   - **0%** = no restriction (default)
   - **50%** = a client with 1,000 tokens can transfer at most 500
   - This only applies to Clients -- Team Leaders and Program Admins are not restricted
4. Click **Set** and confirm

### Managing Members

On the **Members** page, search for any member by their Member ID and Program ID. As Admin, you can:

- **Link/Change Wallet** -- connect or change a member's wallet address
- **Set Edit Code** -- generate a new claim link for a walletless member
- **Change Type** -- change between Free, VIP, Elite, PS Partner
- **Update Member ID** -- change the member's ID (Admin only)
- **Remove Member** -- remove a member (they must have zero balance and no sub-members)

### Updating Program Details

1. Go to the program detail page
2. Click **Edit Program** to change the name or description
3. Click **Deactivate** to disable a program (prevents new operations)

### Adding a Program Logo

1. Go to the program detail page
2. Click **Set Logo**
3. Enter the IPFS CID of the logo image (upload your image to IPFS first using a service like Pinata or web3.storage)
4. The logo will appear in the program header and be embedded in member QR codes

---

## For Program Admins

A Program Admin manages one specific program. You were assigned by the Admin and may have received a claim link to activate your account.

### Adding a Team Leader

Team Leaders help manage groups of Clients within your program.

1. Go to **Programs** and click your program name
2. Click **Add Member**
3. Fill in:
   - **Role** -- select **Team Leader**
   - **Wallet Address** -- their wallet address, or leave empty for a walletless member
   - **Member ID** -- a unique ID for this person (e.g., "TL-SARAH")
   - **Member Type** -- select Free, VIP, Elite, or PS Partner
4. Check the on-chain data disclaimer
5. Click **Add** and confirm

If walletless, copy the claim link from the dialog and send it to the Team Leader.

### Adding a Client

You can add Clients directly (they will be under you in the hierarchy).

1. Go to **Programs** and click your program name
2. Click **Add Member**
3. Fill in:
   - **Role** -- select **Client**
   - **Wallet Address** -- their wallet, or leave empty
   - **Member ID** -- a unique ID (e.g., "CLIENT-042")
   - **Member Type** -- select the appropriate type
4. Check the disclaimer, click **Add**, and confirm

### Changing Program Details

1. Go to your program detail page
2. Click **Edit Program** to update the name or description
3. Click **Set Logo** to add or update the program logo (enter an IPFS CID)

### Managing Reward Sub-Types

Sub-types are subdivisions under each reward type, specific to your program.

Example: If the reward type is "MVP" for a basketball program, sub-types could be "3pShotMade", "Assist", "Block".

1. Go to your program detail page
2. Scroll to the **Sub-Types** section
3. Click **Add Sub-Type**, select the parent Reward Type, enter a Sub-Type ID and Name
4. To remove, click the remove button

### Transferring Tokens to Members

Same process as the Admin (see [Transferring Tokens to a Sub-Member](#transferring-tokens-to-a-sub-member)). You can transfer to any member under you in the hierarchy.

### Acting on Behalf of Walletless Members

If a member does not have a wallet connected, you can perform certain actions on their behalf:

1. Go to the **Balance** page and enter the member's Member ID
2. If the member is walletless and you are their PA (or in their parent chain), action buttons will appear
3. You can deposit tokens, transfer to their parent, or perform other actions for them

---

## For Team Leaders

A Team Leader manages a group of Clients within a program.

### Adding Clients

1. Go to **Programs** and click your program name
2. Click **Add Member**
3. Fill in:
   - **Role** -- **Client** (this is the only role you can assign)
   - **Wallet Address** -- their wallet, or leave empty
   - **Member ID** -- a unique ID
   - **Member Type** -- select the appropriate type
4. Check the disclaimer, click **Add**, and confirm

Send the claim link to walletless clients so they can activate their account later.

### Transferring Tokens to Your Clients

1. Go to the **Tokens** page, **Transfer to Sub-Member** tab
2. Enter the Program ID, recipient (Member ID, wallet, or scan QR), amount, and lock settings
3. Confirm the transaction

### Depositing and Withdrawing

- **Deposit**: Go to **Tokens** > **Deposit** tab, enter amount and program
- **Withdraw**: Go to **Tokens** > **Withdraw** tab, enter amount and program (only your available/unlocked balance can be withdrawn)

### Transferring Tokens to Your Parent

If you need to send tokens up the hierarchy (to your Program Admin):

1. Go to **Tokens** > **Transfer to Parent** tab
2. Enter:
   - **Program ID**
   - **Amount**
   - **To** (optional) -- leave empty to send to your direct parent, or enter a specific parent's address
   - **Note** (optional)
3. Confirm the transaction

---

## For Members (Clients)

As a Client, you are a member of one or more programs. You can receive tokens, view your balance, transfer tokens to your parent, and withdraw.

### Claiming Your Account (Using a Claim Link)

If someone added you to a program without a wallet, they gave you a **claim link**. This is how you connect your wallet to your account.

1. Open the claim link in your browser. It looks like:
   `https://portal-url/balance?member=YOUR_ID&claim=PROGRAM_ID&code=SECRET_CODE`
2. The page will show your member information and a **Claim** section
3. Click **Connect Wallet** and connect the wallet you want to use
4. The Edit Code will be pre-filled from the link
5. Click **Claim**
6. The system performs a two-step verification:
   - **Step 1 (Commit)**: Registers your intent to claim -- confirm in your wallet
   - **Wait a few seconds** (the portal handles this automatically)
   - **Step 2 (Reveal)**: Completes the claim -- confirm again in your wallet
7. Your wallet is now linked to your account. You can use the portal normally.

> **Keep your claim link private.** Anyone with this link could claim your account before you do.

### Viewing Your Balance

1. Go to the **Balance** page
2. Enter your **Member ID**
3. You will see your balance across all programs you belong to:
   - **Available** -- tokens you can withdraw right now
   - **Permanently Locked** -- tokens that can only be transferred to your parent
   - **Time-Locked** -- tokens that will become available after a waiting period

You can also share your balance link with others: `https://portal-url/balance?member=YOUR_ID`
No wallet connection is needed to view a balance.

### Transferring Tokens to Your Parent

To send tokens back up the hierarchy:

1. Go to **Tokens** > **Transfer to Parent** tab (or use the action button on the **Balance** page)
2. Enter:
   - **Program ID**
   - **Amount**
   - **Note** (optional)
3. Click **Transfer** and confirm

**Important:** If your program has a transfer limit set, you can only transfer up to a certain percentage of your total balance per transaction. The portal will show you the maximum allowed amount.

**Deduction order:** The system deducts from your available balance first, then expired time-locks, then unexpired time-locks, then permanently locked tokens.

### Withdrawing Tokens

To move tokens from the program to your personal wallet:

1. Go to **Tokens** > **Withdraw** tab (or use the action button on the **Balance** page)
2. Enter the Program ID and amount
3. Click **Withdraw** and confirm

Only your **available** balance can be withdrawn. Permanently locked and unexpired time-locked tokens cannot be withdrawn.

### Your QR Code

Each member has a QR code displayed on the **Balance** and **Programs** pages. This QR code contains your Member ID and Program ID. It can be:
- Scanned by someone sending you tokens (they scan it on the transfer form)
- Scanned by a merchant for redemption (see [For Merchants](#for-merchants-redeem))

---

## For Merchants (Redeem)

The Redeem page allows store operators to process token redemptions on behalf of members. The member does not need a wallet or even be present -- you just need their QR code.

### How Redemption Works

When a member wants to redeem tokens at your store:

1. **The member shows their QR code** -- this is displayed on their Balance page (from their claim link). The QR encodes a redeem URL.
2. **Scan the QR code** -- use your phone's camera or a QR scanner app. This opens the **Redeem** page with the member's info pre-filled.
3. **Connect your wallet** -- you (the merchant) must connect a wallet that has authority in the program (you must be the member's parent, an ancestor, a Team Leader, or Program Admin in the same program)
4. **Verify the member info** -- the page shows:
   - The member's ID
   - Their total balance
   - Their parent's Member ID (tokens will go to the parent)
5. **Enter the redemption amount**
6. Click **Redeem to [PARENT_ID]** and confirm the transaction in your wallet

Behind the scenes, this transfers the entered amount from the member's balance to their direct parent. The member does not need to sign anything.

### Requirements

- Your wallet must be connected and on the Base network
- You must have authority over the member (parent, ancestor, TL, or PA in the same program)
- The member must have sufficient balance

---

## Quick Reference: Who Can Do What

| Action | Admin | Program Admin | Team Leader | Client |
|--------|:-----:|:-------------:|:-----------:|:------:|
| Create program | Yes | -- | -- | -- |
| Assign Program Admin | Yes | -- | -- | -- |
| Add Team Leader | Yes | Yes | -- | -- |
| Add Client | Yes | Yes | Yes | -- |
| Update program name/description | Yes | Their program | -- | -- |
| Set program logo | Yes | Their program | -- | -- |
| Deactivate program | Yes | Their program | -- | -- |
| Manage reward types | Yes | Their program | -- | -- |
| Manage sub-types | Yes | Their program | -- | -- |
| Set transfer limit | Yes | Their program | -- | -- |
| Deposit tokens | Yes | Yes | Yes | Yes |
| Transfer to sub-member | Yes | Yes | Yes | -- |
| Transfer to parent | Yes | Yes | Yes | Yes |
| Withdraw tokens | Yes | Yes | Yes | Yes |
| Change member type | Yes | Their members | -- | -- |
| Change member wallet | Yes | Their members | -- | -- |
| Remove member | Yes | Their members (not PAs) | -- | -- |
| Update member ID | Yes | -- | -- | -- |
| Act for walletless member | Yes | Same program | Same program | -- |
| View balance (any member) | Anyone -- no wallet needed |
| View reports | Anyone -- no wallet needed |

---

## About Walletless Members

Members can be added to the system **without a wallet**. This is useful when:
- The person does not have a crypto wallet yet
- You want to set up their account in advance
- The person will claim their account later using a mobile device

**How it works:**
1. When adding a member, leave the wallet address empty
2. The system generates a secret **Edit Code** and a **Claim Link**
3. Send the claim link to the person securely
4. They open the link, connect their wallet, and claim the account
5. Until they claim, their balance is held at a virtual address and authorized people (parent, TL, PA) can act on their behalf

**Re-issuing a claim link:** If a claim link is lost, an Admin or the member's parent can generate a new edit code from the **Members** page (click **Set Edit Code**). This invalidates the old claim link.

---

## Glossary

| Term | Meaning |
|------|---------|
| **FULA** | The token used in the rewards system |
| **Program** | A rewards program that contains members and manages token distribution |
| **Program Code** | A short identifier for a program (e.g., "SRP") |
| **Member ID** | A unique identifier for a person within a program (also called Reward ID) |
| **Member Type** | Classification tier: Free, VIP, Elite, or PS Partner |
| **Role** | Permission level: Admin, Program Admin, Team Leader, or Client |
| **Parent** | The person who added you to the program (your direct supervisor in the hierarchy) |
| **Claim Link** | A URL used by walletless members to connect their wallet to their account |
| **Edit Code** | A secret code used in the claim process -- embedded in the claim link |
| **Available Balance** | Tokens that can be withdrawn to your wallet right now |
| **Permanently Locked** | Tokens that can only be transferred to a parent, never withdrawn |
| **Time-Locked** | Tokens with a waiting period before they become available |
| **Transfer Limit** | A per-program percentage cap on how much a Client can transfer to their parent |
| **QR Code** | A scannable code containing your Member ID, used for transfers and redemption |
| **Redeem** | The process of a merchant transferring a member's tokens to their parent at a store |
| **Base** | The blockchain network where the rewards contract is deployed |
