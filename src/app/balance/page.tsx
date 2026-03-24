"use client";

import { useState, Suspense } from "react";
import {
  Typography, Box, Paper, Grid, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button, Alert,
  CircularProgress,
} from "@mui/material";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { useSearchParams } from "next/navigation";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels } from "@/config/contracts";
import { toBytes12, fromBytes12, fromBytes8, shortenAddress, formatFula, formatDate, formatContractError } from "@/lib/utils";
import { useProgramCount, useProgram, useTimeLocks, useDirectChildren, useTransferToParent, useWithdraw, useApproveToken, useAddTokens } from "@/hooks/useRewardsProgram";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";

/* -- Per-program membership row -- */

function MemberProgramRow({ memberID, programId }: { memberID: string; programId: number }) {
  const memberIDBytes = toBytes12(memberID);

  const { data: member } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: [memberIDBytes, programId],
    query: { enabled: !!memberID },
  });

  const { data: program } = useProgram(programId);

  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getEffectiveBalance",
    args: member?.wallet && member.wallet !== zeroAddress ? [programId, member.wallet as `0x${string}`] : undefined,
    query: { enabled: !!member?.wallet && member.wallet !== zeroAddress },
  });

  if (!member || !member.wallet || member.wallet === zeroAddress) return null;

  return (
    <TableRow>
      <TableCell>{program ? program.name : `Program #${programId}`}</TableCell>
      <TableCell>{program ? fromBytes8(program.code as `0x${string}`) : "-"}</TableCell>
      <TableCell>
        <Chip label={MemberRoleLabels[Number(member.role)] || "Unknown"} size="small"
          color={Number(member.role) === 3 ? "primary" : Number(member.role) === 2 ? "secondary" : "default"} />
      </TableCell>
      <TableCell>{shortenAddress(member.parent)}</TableCell>
      <TableCell sx={{ color: "success.main" }}>{balance ? formatFula(balance[0]) : "-"}</TableCell>
      <TableCell sx={{ color: "error.main" }}>{balance ? formatFula(balance[1]) : "-"}</TableCell>
      <TableCell sx={{ color: "warning.main" }}>{balance ? formatFula(balance[2]) : "-"}</TableCell>
      <TableCell>{member.active ? "Active" : "Inactive"}</TableCell>
    </TableRow>
  );
}

/* -- Actions panel (only for wallet owner) -- */

function OwnerActions({ memberWallet }: { memberWallet: string }) {
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === memberWallet.toLowerCase();

  const [actionProgramId, setActionProgramId] = useState("1");
  const pid = parseInt(actionProgramId) || 0;

  // Transfer to Parent
  const [parentTo, setParentTo] = useState("");
  const [parentAmount, setParentAmount] = useState("");
  const { transferBack, isPending: isTransBack, isConfirming: isTransBackConf, isSuccess: transBackSuccess, error: transBackError } = useTransferToParent();

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithConf, isSuccess: withdrawSuccess, error: withdrawError } = useWithdraw();

  // Deposit
  const [depositAmount, setDepositAmount] = useState("");
  const { approve, isPending: isApproving, isConfirming: isAppConf, isSuccess: approveSuccess } = useApproveToken();
  const { addTokens, isPending: isDepositing, isConfirming: isDepConf, isSuccess: depositSuccess, error: depositError } = useAddTokens();

  const [disclaimer, setDisclaimer] = useState(false);

  if (!isOwner) return null;

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Actions</Typography>
      <TextField label="Program ID" value={actionProgramId} onChange={(e) => setActionProgramId(e.target.value)}
        type="number" size="small" sx={{ width: 150, mb: 2 }} />

      <Grid container spacing={3}>
        {/* Deposit */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>Deposit FULA</Typography>
          <TextField label="Amount (FULA)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
            fullWidth size="small" type="number" />
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined" onClick={() => approve(depositAmount)}
              disabled={isApproving || isAppConf || !depositAmount || !disclaimer}>
              {isApproving || isAppConf ? <CircularProgress size={16} /> : "Approve"}
            </Button>
            <Button size="small" variant="contained" onClick={() => addTokens(pid, depositAmount)}
              disabled={isDepositing || isDepConf || !depositAmount || !disclaimer}>
              {isDepositing || isDepConf ? <CircularProgress size={16} /> : "Deposit"}
            </Button>
          </Box>
          {approveSuccess && <Alert severity="info" sx={{ mt: 1 }}>Approved. Now click Deposit.</Alert>}
          {depositSuccess && <Alert severity="success" sx={{ mt: 1 }}>Deposited!</Alert>}
          {depositError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(depositError)}</Alert>}
        </Grid>

        {/* Transfer to Parent */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>Transfer to Parent</Typography>
          <TextField label="Parent Wallet (optional)" value={parentTo} onChange={(e) => setParentTo(e.target.value)}
            fullWidth size="small" placeholder="0x... (empty = direct parent)" />
          <TextField label="Amount (FULA)" value={parentAmount} onChange={(e) => setParentAmount(e.target.value)}
            fullWidth size="small" type="number" sx={{ mt: 1 }} />
          <Button size="small" variant="contained" sx={{ mt: 1 }}
            onClick={() => transferBack(pid, (parentTo || zeroAddress) as `0x${string}`, parentAmount)}
            disabled={isTransBack || isTransBackConf || !parentAmount || !disclaimer}>
            {isTransBack || isTransBackConf ? <CircularProgress size={16} /> : "Transfer"}
          </Button>
          {transBackSuccess && <Alert severity="success" sx={{ mt: 1 }}>Transferred!</Alert>}
          {transBackError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(transBackError)}</Alert>}
        </Grid>

        {/* Withdraw */}
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" gutterBottom>Withdraw</Typography>
          <TextField label="Amount (FULA)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
            fullWidth size="small" type="number" />
          <Button size="small" variant="contained" color="secondary" sx={{ mt: 1 }}
            onClick={() => withdraw(pid, withdrawAmount)}
            disabled={isWithdrawing || isWithConf || !withdrawAmount || !disclaimer}>
            {isWithdrawing || isWithConf ? <CircularProgress size={16} /> : "Withdraw"}
          </Button>
          {withdrawSuccess && <Alert severity="success" sx={{ mt: 1 }}>Withdrawn!</Alert>}
          {withdrawError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(withdrawError)}</Alert>}
        </Grid>
      </Grid>

      <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
    </Paper>
  );
}

/* -- Time Locks detail -- */

function TimeLockDetails({ programId, wallet }: { programId: number; wallet: `0x${string}` }) {
  const { data: timeLocks } = useTimeLocks(programId, wallet);

  if (!timeLocks || timeLocks.length === 0) return null;

  return (
    <Box sx={{ mt: 1 }}>
      {timeLocks.map((lock, i) => (
        <Typography key={i} variant="body2" color="text.secondary">
          {formatFula(BigInt(lock.amount))} FULA - unlocks {formatDate(Number(lock.unlockTime))}
        </Typography>
      ))}
    </Box>
  );
}

/* -- Sub-member row -- */

function SubMemberRow({ programId, wallet }: { programId: number; wallet: `0x${string}` }) {
  const { data: member } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: [programId, wallet],
  });
  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getEffectiveBalance",
    args: [programId, wallet],
  });

  if (!member) return null;

  return (
    <TableRow>
      <TableCell>{fromBytes12(member.memberID as `0x${string}`)}</TableCell>
      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{shortenAddress(member.wallet)}</TableCell>
      <TableCell>
        <Chip label={MemberRoleLabels[Number(member.role)] || "Unknown"} size="small"
          color={Number(member.role) === 3 ? "primary" : Number(member.role) === 2 ? "secondary" : "default"} />
      </TableCell>
      <TableCell sx={{ color: "success.main" }}>{balance ? formatFula(balance[0]) : "-"}</TableCell>
      <TableCell sx={{ color: "error.main" }}>{balance ? formatFula(balance[1]) : "-"}</TableCell>
      <TableCell sx={{ color: "warning.main" }}>{balance ? formatFula(balance[2]) : "-"}</TableCell>
      <TableCell>{member.active ? "Active" : "Inactive"}</TableCell>
    </TableRow>
  );
}

/* -- Sub-members for a program -- */

function SubMembersSection({ programId, wallet }: { programId: number; wallet: `0x${string}` }) {
  const { data: children } = useDirectChildren(programId, wallet);
  const { data: program } = useProgram(programId);

  if (!children || children.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle2" gutterBottom>
        Sub-members in {program ? program.name : `Program #${programId}`}
      </Typography>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Member ID</TableCell>
              <TableCell>Wallet</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Withdrawable</TableCell>
              <TableCell>Locked</TableCell>
              <TableCell>Time-Locked</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {children.map((child) => (
              <SubMemberRow key={child} programId={programId} wallet={child as `0x${string}`} />
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

/* -- Main balance view -- */

function BalanceContent() {
  const searchParams = useSearchParams();
  const memberParam = searchParams.get("member") || "";
  const [memberID, setMemberID] = useState(memberParam);
  const [searchID, setSearchID] = useState(memberParam);

  const { data: programCount } = useProgramCount();
  const count = Number(programCount || 0);

  // Dynamic wallet discovery: multicall getMemberByID across all programs
  const memberIDBytes = toBytes12(searchID);
  const contracts = Array.from({ length: count }, (_, i) => ({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID" as const,
    args: [memberIDBytes, i + 1] as const,
  }));

  const { data: multicallResults } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
    query: { enabled: !!searchID && count > 0 },
  });

  // Find the first result that has a valid wallet
  let memberWallet = "";
  if (multicallResults) {
    for (const result of multicallResults) {
      if (result.status === "success" && result.result) {
        const member = result.result as { wallet: string };
        if (member.wallet && member.wallet !== zeroAddress) {
          memberWallet = member.wallet;
          break;
        }
      }
    }
  }

  const handleSearch = () => {
    setSearchID(memberID);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Member Balance</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <TextField
            label="Member ID (Reward ID)"
            value={memberID}
            onChange={(e) => setMemberID(e.target.value)}
            sx={{ flexGrow: 1 }}
            inputProps={{ maxLength: 12 }}
            placeholder="Enter member ID..."
          />
          <Button variant="contained" onClick={handleSearch} disabled={!memberID}>
            Look Up
          </Button>
        </Box>
      </Paper>

      {searchID && count > 0 && (
        <>
          {memberWallet && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Wallet: <Typography component="span" sx={{ fontFamily: "monospace" }}>{memberWallet}</Typography>
              </Typography>
            </Paper>
          )}

          {!memberWallet && (
            <Alert severity="warning" sx={{ mb: 3 }}>No member found with ID &quot;{searchID}&quot; in any program.</Alert>
          )}

          {memberWallet && (
            <>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>Programs & Balances for &quot;{searchID}&quot;</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                  Balance columns: Withdrawable / Permanently Locked / Time-Locked (FULA)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Program</TableCell>
                        <TableCell>Code</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Parent</TableCell>
                        <TableCell>Withdrawable</TableCell>
                        <TableCell>Locked</TableCell>
                        <TableCell>Time-Locked</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: count }, (_, i) => (
                        <MemberProgramRow key={i + 1} memberID={searchID} programId={i + 1} />
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              {/* Sub-members per program */}
              <Paper sx={{ p: 2, mt: 3 }}>
                <Typography variant="h6" gutterBottom>Sub-Members</Typography>
                {Array.from({ length: count }, (_, i) => (
                  <SubMembersSection key={i + 1} programId={i + 1} wallet={memberWallet as `0x${string}`} />
                ))}
              </Paper>

              <OwnerActions memberWallet={memberWallet} />
            </>
          )}
        </>
      )}

      {searchID && count === 0 && (
        <Alert severity="info">No programs exist yet.</Alert>
      )}
    </Box>
  );
}

export default function BalancePage() {
  return (
    <Suspense fallback={<Typography>Loading...</Typography>}>
      <BalanceContent />
    </Suspense>
  );
}
