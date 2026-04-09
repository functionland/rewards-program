"use client";

import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import SupervisorAccountIcon from "@mui/icons-material/SupervisorAccount";
import GroupIcon from "@mui/icons-material/Group";
import PersonIcon from "@mui/icons-material/Person";
import StorefrontIcon from "@mui/icons-material/Storefront";
import RocketLaunchIcon from "@mui/icons-material/RocketLaunch";
import { useState } from "react";

/* ------------------------------------------------------------------ */
/*  Tiny helpers                                                       */
/* ------------------------------------------------------------------ */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ color: "primary.main", mt: 2 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <List dense disablePadding>
      {items.map((text, i) => (
        <ListItem key={i} sx={{ pl: 0 }}>
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Chip label={i + 1} size="small" color="primary" sx={{ width: 24, height: 24, fontSize: "0.75rem" }} />
          </ListItemIcon>
          <ListItemText primary={text} />
        </ListItem>
      ))}
    </List>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
      {children}
    </Typography>
  );
}

function Bold({ children }: { children: React.ReactNode }) {
  return <Box component="span" sx={{ fontWeight: 600, color: "text.primary" }}>{children}</Box>;
}

/* ------------------------------------------------------------------ */
/*  Permission matrix data                                             */
/* ------------------------------------------------------------------ */

const permRows: { action: string; admin: boolean; pa: boolean; tl: boolean; client: boolean; note?: string }[] = [
  { action: "Create program", admin: true, pa: false, tl: false, client: false },
  { action: "Assign Program Admin", admin: true, pa: false, tl: false, client: false },
  { action: "Add Team Leader", admin: true, pa: true, tl: false, client: false },
  { action: "Add Client", admin: true, pa: true, tl: true, client: false },
  { action: "Update program details", admin: true, pa: true, tl: false, client: false, note: "PA: own program only" },
  { action: "Set program logo", admin: true, pa: true, tl: false, client: false, note: "PA: own program only" },
  { action: "Deactivate program", admin: true, pa: true, tl: false, client: false, note: "PA: own program only" },
  { action: "Manage reward types", admin: true, pa: true, tl: false, client: false },
  { action: "Manage sub-types", admin: true, pa: true, tl: false, client: false },
  { action: "Set transfer limit", admin: true, pa: true, tl: false, client: false },
  { action: "Deposit tokens", admin: true, pa: true, tl: true, client: true },
  { action: "Transfer to sub-member", admin: true, pa: true, tl: true, client: false },
  { action: "Transfer to parent", admin: true, pa: true, tl: true, client: true },
  { action: "Withdraw tokens", admin: true, pa: true, tl: true, client: true },
  { action: "Change member type", admin: true, pa: true, tl: false, client: false, note: "PA: own members" },
  { action: "Change member wallet", admin: true, pa: true, tl: false, client: false, note: "PA: own members" },
  { action: "Remove member", admin: true, pa: true, tl: false, client: false, note: "PA: cannot remove other PAs" },
  { action: "Update member ID", admin: true, pa: false, tl: false, client: false },
  { action: "Act for walletless member", admin: true, pa: true, tl: true, client: false, note: "TL/PA: same program" },
  { action: "View balance / reports", admin: true, pa: true, tl: true, client: true, note: "No wallet needed" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function HelpPage() {
  const [expanded, setExpanded] = useState<string | false>("getting-started");

  const toggle = (panel: string) => (_: unknown, isOpen: boolean) => {
    setExpanded(isOpen ? panel : false);
  };

  const accordionSx = {
    bgcolor: "background.paper",
    "&:before": { display: "none" },
    borderRadius: "8px !important",
    mb: 1.5,
  };

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", py: 3, px: { xs: 2, sm: 3 } }}>
      <Typography variant="h4" gutterBottom>
        Onboarding Guide
      </Typography>
      <Para>
        This guide walks you through every action in the Rewards Program portal, organized by role.
        No technical knowledge is required.
      </Para>

      <Alert severity="info" sx={{ mb: 3 }}>
        All actions that change data (adding members, transferring tokens, etc.) require you to sign a
        transaction with your wallet. You will see a confirmation prompt from your wallet app each time.
      </Alert>

      {/* ============================================================ */}
      {/*  GETTING STARTED                                              */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "getting-started"} onChange={toggle("getting-started")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <RocketLaunchIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Getting Started</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Section title="Connecting Your Wallet">
            <Steps items={[
              "Open the portal in your browser.",
              "Click Connect Wallet in the top-right corner.",
              "Choose your wallet (MetaMask, WalletConnect, etc.).",
              "Approve the connection in your wallet app.",
              "Make sure you are on the Base network -- the portal will prompt you to switch if needed.",
            ]} />
            <Para>
              Your role (Admin, Program Admin, Team Leader, or Client) is detected automatically and
              shown next to your wallet address.
            </Para>
          </Section>

          <Section title="Portal Pages at a Glance">
            <TableContainer component={Paper} variant="outlined" sx={{ mb: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Page</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>What it does</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {[
                    ["Dashboard", "Overview of all programs"],
                    ["Programs", "Create and manage programs and their members"],
                    ["Members", "Search for any member by their ID"],
                    ["Tokens", "Deposit, transfer, and withdraw FULA tokens"],
                    ["Balance Lookup", "Look up any member's balance (no wallet needed)"],
                    ["Redeem", "Merchant redemption page for scanning member QR codes"],
                    ["Reports", "Transaction history and statistics"],
                  ].map(([page, desc]) => (
                    <TableRow key={page}>
                      <TableCell><Bold>{page}</Bold></TableCell>
                      <TableCell>{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  ADMIN                                                        */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "admin"} onChange={toggle("admin")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AdminPanelSettingsIcon sx={{ color: "error.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>For Admins</Typography>
            <Chip label="Admin" color="error" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>
            The Admin is the top-level administrator of the entire system. Only the Admin can create
            programs and assign Program Admins.
          </Para>

          <Section title="Creating a New Program">
            <Steps items={[
              "Go to the Programs page.",
              "Click Create Program.",
              "Enter a Program Code (short code up to 8 characters, e.g. \"SRP\"). This cannot be changed later.",
              "Enter a Program Name and Description.",
              "Check the on-chain data disclaimer checkbox.",
              "Click Create and confirm the transaction in your wallet.",
            ]} />
          </Section>

          <Section title="Assigning a Program Admin">
            <Para>
              A Program Admin manages one specific program. They can add members, manage settings, and
              handle day-to-day operations.
            </Para>
            <Steps items={[
              "Go to Programs and click on the program name to open its detail view.",
              "Click Add Program Admin.",
              "Enter the Wallet Address (leave empty if they don't have a wallet yet).",
              "Enter a Member ID -- a unique identifier within this program (e.g. \"PA-JOHN\").",
              "Select a Member Type (Free, VIP, Elite, or PS Partner).",
              "Check the disclaimer, click Assign, and confirm the transaction.",
            ]} />
            <Alert severity="warning" sx={{ mt: 1, mb: 1 }}>
              If the wallet was left empty, a dialog will appear with a <strong>Claim Link</strong> and
              an <strong>Edit Code</strong>. Copy the claim link and send it securely to the new Program
              Admin. They will use it to connect their wallet later.
            </Alert>
          </Section>

          <Section title="Depositing Tokens into a Program">
            <Para>Before tokens can be distributed to members, they must be deposited into the program.</Para>
            <Steps items={[
              "Go to the Tokens page and select the Deposit tab.",
              "Enter the Program ID, Amount of FULA tokens to deposit.",
              "Optionally select a Reward Type and add a Note (up to 128 characters).",
              "The portal will first ask you to Approve the token transfer (this gives the contract permission to move your FULA tokens).",
              "Then click Deposit and confirm the transaction.",
            ]} />
          </Section>

          <Section title="Transferring Tokens to a Sub-Member">
            <Para>After depositing, you can distribute tokens to any member in any program.</Para>
            <Steps items={[
              "Go to the Tokens page and select the Transfer to Sub-Member tab.",
              "Enter the Program ID.",
              "Enter the Recipient -- type their Member ID, wallet address, or click the QR scanner icon to scan their QR code.",
              "Enter the Amount.",
              "Choose a lock type: Unlocked (withdraw immediately), Time-Locked (wait N days), or Permanently Locked (can only transfer back to parent, never withdraw).",
              "Optionally select Reward Type, Sub-Type, and add a Note.",
              "Check the disclaimer, click Transfer, and confirm.",
            ]} />
          </Section>

          <Section title="Managing Reward Types">
            <Para>
              Reward types are categories used when depositing tokens (e.g. &quot;MVP&quot;, &quot;Bonus&quot;, &quot;Referral&quot;).
            </Para>
            <Steps items={[
              "Go to the program detail page (click program name on the Programs page).",
              "Scroll to the Reward Types section.",
              "Click Add Reward Type and enter a Type ID (0-255) and Name.",
              "To remove a reward type, click the remove button next to it.",
            ]} />
          </Section>

          <Section title="Setting a Transfer Control Limit">
            <Para>
              This limits how much a Client can transfer to their parent, as a percentage of their total balance.
            </Para>
            <Steps items={[
              "Go to the program detail page.",
              "Click Set Transfer Limit.",
              "Enter a percentage (0-100). Examples: 0% = no restriction, 50% = a client with 1,000 tokens can transfer at most 500.",
              "Click Set and confirm.",
            ]} />
            <Para>
              <Bold>Note:</Bold> This only applies to Clients. Team Leaders and Program Admins are not restricted.
            </Para>
          </Section>

          <Section title="Managing Members">
            <Para>
              On the <Bold>Members</Bold> page, search for any member by their Member ID and Program ID.
              As Admin, you can:
            </Para>
            <List dense>
              {[
                "Link / Change Wallet -- connect or change a member's wallet address",
                "Set Edit Code -- generate a new claim link for a walletless member",
                "Change Type -- switch between Free, VIP, Elite, PS Partner",
                "Update Member ID -- change the member's ID (Admin only)",
                "Remove Member -- remove a member (must have zero balance and no sub-members)",
              ].map((text, i) => (
                <ListItem key={i} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary={text} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
          </Section>

          <Section title="Updating Program Details and Logo">
            <Steps items={[
              "Go to the program detail page.",
              "Click Edit Program to change the name or description.",
              "Click Set Logo and enter the IPFS CID of the logo image (upload to IPFS first via Pinata, web3.storage, etc.).",
              "The logo will appear in the program header and be embedded in member QR codes.",
              "Click Deactivate to disable a program (prevents new operations).",
            ]} />
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  PROGRAM ADMIN                                                */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "pa"} onChange={toggle("pa")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SupervisorAccountIcon sx={{ color: "warning.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>For Program Admins</Typography>
            <Chip label="Program Admin" color="warning" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>
            A Program Admin manages one specific program. You were assigned by the Admin and may have
            received a claim link to activate your account.
          </Para>

          <Section title="Adding a Team Leader">
            <Para>
              Team Leaders help manage groups of Clients within your program.
            </Para>
            <Steps items={[
              "Go to Programs and click your program name.",
              "Click Add Member.",
              "Select Role: Team Leader.",
              "Enter a Wallet Address (or leave empty for walletless), Member ID, and Member Type.",
              "Check the disclaimer, click Add, and confirm.",
            ]} />
            <Para>If walletless, copy the claim link from the dialog and send it to the Team Leader.</Para>
          </Section>

          <Section title="Adding a Client">
            <Para>You can add Clients directly -- they will be under you in the hierarchy.</Para>
            <Steps items={[
              "Go to Programs and click your program name.",
              "Click Add Member.",
              "Select Role: Client.",
              "Enter their details (wallet optional, Member ID, Member Type).",
              "Check the disclaimer, click Add, and confirm.",
            ]} />
          </Section>

          <Section title="Changing Program Details and Logo">
            <Steps items={[
              "Go to your program detail page.",
              "Click Edit Program to update the name or description.",
              "Click Set Logo and enter an IPFS CID for the program logo.",
            ]} />
          </Section>

          <Section title="Managing Reward Sub-Types">
            <Para>
              Sub-types are subdivisions under each reward type, specific to your program. For example,
              under reward type &quot;MVP&quot; for a basketball program: &quot;3pShotMade&quot;, &quot;Assist&quot;, &quot;Block&quot;.
            </Para>
            <Steps items={[
              "Go to your program detail page.",
              "Scroll to the Sub-Types section.",
              "Click Add Sub-Type, select the parent Reward Type, enter a Sub-Type ID and Name.",
              "To remove, click the remove button.",
            ]} />
          </Section>

          <Section title="Transferring Tokens to Members">
            <Para>
              Same process as described in the Admin section above. You can transfer to any member under
              you in the hierarchy (Team Leaders and Clients you added, and their sub-members).
            </Para>
          </Section>

          <Section title="Acting on Behalf of Walletless Members">
            <Para>
              If a member does not have a wallet connected, you can perform actions on their behalf:
            </Para>
            <Steps items={[
              "Go to the Balance page and enter the member's Member ID.",
              "If the member is walletless and you are their PA (or in their parent chain), action buttons will appear.",
              "You can deposit tokens, transfer to their parent, or perform other actions for them.",
            ]} />
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  TEAM LEADER                                                  */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "tl"} onChange={toggle("tl")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <GroupIcon sx={{ color: "info.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>For Team Leaders</Typography>
            <Chip label="Team Leader" color="info" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>A Team Leader manages a group of Clients within a program.</Para>

          <Section title="Adding Clients">
            <Steps items={[
              "Go to Programs and click your program name.",
              "Click Add Member.",
              "Select Role: Client (this is the only role you can assign).",
              "Enter their details (wallet optional, Member ID, Member Type).",
              "Check the disclaimer, click Add, and confirm.",
            ]} />
            <Para>Send the claim link to walletless clients so they can activate their account later.</Para>
          </Section>

          <Section title="Transferring Tokens to Your Clients">
            <Steps items={[
              "Go to the Tokens page and select the Transfer to Sub-Member tab.",
              "Enter the Program ID and recipient (Member ID, wallet, or scan their QR code).",
              "Enter the amount and choose lock settings.",
              "Confirm the transaction.",
            ]} />
          </Section>

          <Section title="Depositing, Withdrawing, and Transferring to Parent">
            <List dense>
              {[
                "Deposit: Go to Tokens > Deposit tab, enter amount and program.",
                "Withdraw: Go to Tokens > Withdraw tab, enter amount and program. Only your available (unlocked) balance can be withdrawn.",
                "Transfer to Parent: Go to Tokens > Transfer to Parent tab. Leave the \"To\" field empty to send to your direct parent, or enter a specific parent's address.",
              ].map((text, i) => (
                <ListItem key={i} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary={text} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  CLIENT                                                       */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "client"} onChange={toggle("client")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon sx={{ color: "success.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>For Members (Clients)</Typography>
            <Chip label="Client" color="success" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>
            As a Client, you are a member of one or more programs. You can receive tokens, view your balance,
            transfer tokens to your parent, and withdraw.
          </Para>

          <Section title="Claiming Your Account (Using a Claim Link)">
            <Para>
              If someone added you to a program without a wallet, they gave you a <Bold>claim link</Bold>.
              This is how you connect your wallet to your account.
            </Para>
            <Steps items={[
              "Open the claim link in your browser. It looks like: /balance?member=YOUR_ID&claim=PROGRAM_ID&code=SECRET_CODE",
              "The page will show your member information and a Claim section.",
              "Click Connect Wallet and connect the wallet you want to use.",
              "The Edit Code will be pre-filled from the link.",
              "Click Claim.",
              "Step 1 (Commit): Registers your intent to claim -- confirm in your wallet.",
              "Wait a few seconds (the portal handles this automatically).",
              "Step 2 (Reveal): Completes the claim -- confirm again in your wallet.",
              "Done! Your wallet is now linked. You can use the portal normally.",
            ]} />
            <Alert severity="warning" sx={{ mt: 1 }}>
              Keep your claim link private. Anyone with this link could claim your account before you do.
            </Alert>
          </Section>

          <Section title="Viewing Your Balance">
            <Steps items={[
              "Go to the Balance page.",
              "Enter your Member ID.",
              "You will see your balance across all programs you belong to.",
            ]} />
            <Para>
              Balance types: <Bold>Available</Bold> (can withdraw now),{" "}
              <Bold>Permanently Locked</Bold> (can only transfer to parent),{" "}
              <Bold>Time-Locked</Bold> (becomes available after a waiting period).
            </Para>
            <Para>
              You can share your balance link with others -- no wallet connection is needed to view.
            </Para>
          </Section>

          <Section title="Transferring Tokens to Your Parent">
            <Steps items={[
              "Go to Tokens > Transfer to Parent tab (or use the action button on the Balance page).",
              "Enter the Program ID and Amount.",
              "Optionally add a Note.",
              "Click Transfer and confirm.",
            ]} />
            <Alert severity="info" sx={{ mt: 1 }}>
              If your program has a <strong>transfer limit</strong>, you can only transfer up to a certain
              percentage of your total balance per transaction. The portal will show you the maximum
              allowed amount.
            </Alert>
            <Para>
              <Bold>Deduction order:</Bold> Available balance first, then expired time-locks, then
              unexpired time-locks, then permanently locked.
            </Para>
          </Section>

          <Section title="Withdrawing Tokens">
            <Steps items={[
              "Go to Tokens > Withdraw tab (or use the action button on the Balance page).",
              "Enter the Program ID and Amount.",
              "Click Withdraw and confirm.",
            ]} />
            <Para>
              Only your <Bold>available</Bold> balance can be withdrawn. Permanently locked and unexpired
              time-locked tokens cannot be withdrawn.
            </Para>
          </Section>

          <Section title="Your QR Code">
            <Para>
              Each member has a QR code displayed on the Balance and Programs pages. This QR contains your
              Member ID and Program ID. It can be scanned by someone sending you tokens or by a merchant
              for redemption.
            </Para>
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  MERCHANT / REDEEM                                            */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "merchant"} onChange={toggle("merchant")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <StorefrontIcon sx={{ color: "secondary.main" }} />
            <Typography variant="subtitle1" fontWeight={600}>For Merchants (Redeem)</Typography>
            <Chip label="Redeem" color="secondary" size="small" />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>
            The Redeem page allows store operators to process token redemptions on behalf of members.
            The member does not need a wallet or even be present -- you just need their QR code.
          </Para>

          <Section title="How Redemption Works">
            <Steps items={[
              "The member shows their QR code -- this is displayed on their Balance page (from their claim link).",
              "Scan the QR code with your phone camera or a QR scanner app. This opens the Redeem page with the member's info pre-filled.",
              "Connect your wallet -- you must have authority in the program (parent, ancestor, Team Leader, or Program Admin).",
              "Verify the member info: the page shows their ID, total balance, and their parent's Member ID.",
              "Enter the redemption amount.",
              "Click \"Redeem to [PARENT_ID]\" and confirm the transaction in your wallet.",
            ]} />
            <Para>
              Behind the scenes, this transfers the entered amount from the member&apos;s balance to their direct
              parent. The member does not need to sign anything.
            </Para>
          </Section>

          <Section title="Requirements">
            <List dense>
              {[
                "Your wallet must be connected and on the Base network.",
                "You must have authority over the member (parent, ancestor, TL, or PA in the same program).",
                "The member must have sufficient balance.",
              ].map((text, i) => (
                <ListItem key={i} sx={{ pl: 0 }}>
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckCircleIcon fontSize="small" color="success" />
                  </ListItemIcon>
                  <ListItemText primary={text} primaryTypographyProps={{ variant: "body2" }} />
                </ListItem>
              ))}
            </List>
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  PERMISSIONS MATRIX                                           */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "permissions"} onChange={toggle("permissions")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CheckCircleIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>Quick Reference: Who Can Do What</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600 }}>Action</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Admin</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>PA</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>TL</TableCell>
                  <TableCell align="center" sx={{ fontWeight: 600 }}>Client</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Note</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {permRows.map((row) => (
                  <TableRow key={row.action}>
                    <TableCell>{row.action}</TableCell>
                    {[row.admin, row.pa, row.tl, row.client].map((ok, i) => (
                      <TableCell key={i} align="center">
                        {ok
                          ? <CheckCircleIcon fontSize="small" color="success" />
                          : <RemoveCircleOutlineIcon fontSize="small" sx={{ color: "text.disabled" }} />}
                      </TableCell>
                    ))}
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{row.note || ""}</Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  WALLETLESS MEMBERS                                           */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "walletless"} onChange={toggle("walletless")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PersonIcon color="primary" />
            <Typography variant="subtitle1" fontWeight={600}>About Walletless Members</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Para>Members can be added to the system without a wallet. This is useful when:</Para>
          <List dense>
            {[
              "The person does not have a crypto wallet yet.",
              "You want to set up their account in advance.",
              "The person will claim their account later using a mobile device.",
            ].map((text, i) => (
              <ListItem key={i} sx={{ pl: 0 }}>
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <CheckCircleIcon fontSize="small" color="info" />
                </ListItemIcon>
                <ListItemText primary={text} primaryTypographyProps={{ variant: "body2" }} />
              </ListItem>
            ))}
          </List>

          <Section title="How It Works">
            <Steps items={[
              "When adding a member, leave the wallet address empty.",
              "The system generates a secret Edit Code and a Claim Link.",
              "Send the claim link to the person securely.",
              "They open the link, connect their wallet, and claim the account.",
              "Until they claim, their balance is held at a virtual address and authorized people (parent, TL, PA) can act on their behalf.",
            ]} />
          </Section>

          <Section title="Re-issuing a Claim Link">
            <Para>
              If a claim link is lost, an Admin or the member&apos;s parent can generate a new edit code from
              the <Bold>Members</Bold> page (click <Bold>Set Edit Code</Bold>). This invalidates the old
              claim link.
            </Para>
          </Section>
        </AccordionDetails>
      </Accordion>

      {/* ============================================================ */}
      {/*  GLOSSARY                                                     */}
      {/* ============================================================ */}
      <Accordion expanded={expanded === "glossary"} onChange={toggle("glossary")} sx={accordionSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>Glossary</Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>Term</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Meaning</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {[
                  ["FULA", "The token used in the rewards system"],
                  ["Program", "A rewards program that contains members and manages token distribution"],
                  ["Program Code", "A short identifier for a program (e.g. \"SRP\")"],
                  ["Member ID", "A unique identifier for a person within a program (also called Reward ID)"],
                  ["Member Type", "Classification tier: Free, VIP, Elite, or PS Partner"],
                  ["Role", "Permission level: Admin, Program Admin, Team Leader, or Client"],
                  ["Parent", "The person who added you to the program (your supervisor in the hierarchy)"],
                  ["Claim Link", "A URL used by walletless members to connect their wallet to their account"],
                  ["Edit Code", "A secret code used in the claim process, embedded in the claim link"],
                  ["Available Balance", "Tokens that can be withdrawn to your wallet right now"],
                  ["Permanently Locked", "Tokens that can only be transferred to a parent, never withdrawn"],
                  ["Time-Locked", "Tokens with a waiting period before they become available"],
                  ["Transfer Limit", "A per-program percentage cap on how much a Client can transfer to their parent"],
                  ["QR Code", "A scannable code containing your Member ID, used for transfers and redemption"],
                  ["Redeem", "The process of a merchant transferring a member's tokens to their parent at a store"],
                  ["Base", "The blockchain network where the rewards contract is deployed"],
                ].map(([term, meaning]) => (
                  <TableRow key={term}>
                    <TableCell><Bold>{term}</Bold></TableCell>
                    <TableCell>{meaning}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>

      <Divider sx={{ my: 3 }} />
      <Typography variant="caption" color="text.secondary" textAlign="center" display="block">
        FULA Rewards Program Portal
      </Typography>
    </Box>
  );
}
