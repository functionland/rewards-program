"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Typography, Box, Paper, Grid, Chip, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button, Alert,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, useTheme,
} from "@mui/material";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { useSearchParams } from "next/navigation";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels, MemberTypeLabels } from "@/config/contracts";
import { toBytes12, fromBytes12, fromBytes8, shortenAddress, formatFula, formatContractError, fromBytes16 } from "@/lib/utils";
import { useProgramCount, useProgram, useTransferToParent, useWithdraw, useApproveToken, useAddTokens, useRewardTypes, useTransferLimit, useClaimMember } from "@/hooks/useRewardsProgram";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";
import { QRScannerButton } from "@/components/common/QRScannerButton";

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
    functionName: "getBalance",
    args: member?.wallet && member.wallet !== zeroAddress ? [programId, member.wallet as `0x${string}`] : undefined,
    query: { enabled: !!member?.wallet && member.wallet !== zeroAddress },
  });

  if (!member || !member.active) return null;

  return (
    <TableRow>
      <TableCell>{program ? program.name : `Program #${programId}`}</TableCell>
      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{program ? fromBytes8(program.code as `0x${string}`) : "-"}</TableCell>
      <TableCell>
        <Chip label={MemberRoleLabels[Number(member.role)] || "Unknown"} size="small"
          color={Number(member.role) === 3 ? "primary" : Number(member.role) === 2 ? "secondary" : "default"} />
      </TableCell>
      <TableCell>
        <Chip label={MemberTypeLabels[Number(member.memberType)] || "Free"} size="small" variant="outlined" />
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{shortenAddress(member.parent)}</TableCell>
      <TableCell sx={{ color: "success.main" }}>{balance ? formatFula(balance[0]) : "-"}</TableCell>
      <TableCell sx={{ color: "error.main", display: { xs: "none", sm: "table-cell" } }}>{balance ? formatFula(balance[1]) : "-"}</TableCell>
      <TableCell sx={{ color: "warning.main", display: { xs: "none", sm: "table-cell" } }}>{balance ? formatFula(balance[2]) : "-"}</TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{member.active ? "Active" : "Inactive"}</TableCell>
      <TableCell>
        <QRCodeDisplay programId={programId} memberID={memberID} size={64} />
      </TableCell>
    </TableRow>
  );
}

/* -- Claim Member Section -- */

function ClaimMemberSection({ memberID, programCount }: { memberID: string; programCount: number }) {
  const { address, isConnected } = useAccount();
  const { claimMember, isPending, isConfirming, isSuccess, error } = useClaimMember();
  const [editCode, setEditCode] = useState("");
  const [claimProgramId, setClaimProgramId] = useState("1");
  const [disclaimer, setDisclaimer] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setEditCode("");
      setDisclaimer(false);
    }
  }, [isSuccess]);

  if (!isConnected) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        Connect your wallet to claim this member and link your wallet address.
      </Alert>
    );
  }

  const handleClaim = () => {
    const pid = parseInt(claimProgramId);
    if (!pid || !editCode) return;
    const codeHex = editCode.startsWith("0x") ? editCode as `0x${string}` : `0x${editCode}` as `0x${string}`;
    claimMember(pid, memberID, codeHex);
  };

  return (
    <Paper sx={{ p: 3, mt: 2 }}>
      <Typography variant="h6" gutterBottom>Claim this Member</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This is a walletless member. Enter the edit code you received to link your connected wallet ({address ? shortenAddress(address) : ""}).
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={3}>
          <TextField label="Program ID" value={claimProgramId}
            onChange={(e) => setClaimProgramId(e.target.value)}
            type="number" fullWidth size="small" />
        </Grid>
        <Grid item xs={12} sm={9}>
          <TextField label="Edit Code (0x...)" value={editCode}
            onChange={(e) => setEditCode(e.target.value)}
            fullWidth size="small" placeholder="0x..."
            sx={{ fontFamily: "monospace" }} />
        </Grid>
      </Grid>
      <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
      <Box sx={{ mt: 2, display: "flex", gap: 1, alignItems: "center" }}>
        <Button variant="contained" onClick={handleClaim}
          disabled={isPending || isConfirming || !editCode || !claimProgramId || !disclaimer}>
          {isPending || isConfirming ? <CircularProgress size={20} /> : "Claim Member"}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(error)}</Alert>}
      {isSuccess && <Alert severity="success" sx={{ mt: 2 }}>Member claimed! Your wallet is now linked. Refresh the page to see updated status.</Alert>}
    </Paper>
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
  const { data: transferLimitData } = useTransferLimit(pid);

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithConf, isSuccess: withdrawSuccess, error: withdrawError } = useWithdraw();

  // Deposit
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRewardType, setDepositRewardType] = useState(0);
  const [depositNote, setDepositNote] = useState("");
  const { approve, isPending: isApproving, isConfirming: isAppConf, isSuccess: approveSuccess } = useApproveToken();
  const { addTokens, isPending: isDepositing, isConfirming: isDepConf, isSuccess: depositSuccess, error: depositError } = useAddTokens();
  const { data: rewardTypesData } = useRewardTypes();

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
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Reward Type</InputLabel>
            <Select value={depositRewardType} onChange={(e) => setDepositRewardType(Number(e.target.value))} label="Reward Type">
              <MenuItem value={0}>None</MenuItem>
              {rewardTypesData && (rewardTypesData as [number[], string[]])[0]?.map((id: number, idx: number) => (
                <MenuItem key={id} value={id}>
                  {fromBytes16((rewardTypesData as [number[], `0x${string}`[]])[1][idx]) || `Type ${id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField label="Note (max 128)" value={depositNote}
            onChange={(e) => setDepositNote(e.target.value.slice(0, 128))}
            fullWidth size="small" sx={{ mt: 1 }} inputProps={{ maxLength: 128 }} />
          <Box sx={{ display: "flex", gap: 1, mt: 1 }}>
            <Button size="small" variant="outlined" onClick={() => approve(depositAmount)}
              disabled={isApproving || isAppConf || !depositAmount || !disclaimer}>
              {isApproving || isAppConf ? <CircularProgress size={16} /> : "Approve"}
            </Button>
            <Button size="small" variant="contained" onClick={() => addTokens(pid, depositAmount, depositRewardType, depositNote)}
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
          {transferLimitData != null && Number(transferLimitData) > 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Transfer limit: <strong>{Number(transferLimitData)}%</strong> of total balance (Clients only).
            </Alert>
          )}
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

/* -- Main balance view -- */

function BalanceContent() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
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

  // Check if member exists in any program (even walletless)
  let memberExists = false;
  if (multicallResults) {
    for (const result of multicallResults) {
      if (result.status === "success" && result.result) {
        const member = result.result as { active: boolean };
        if (member.active) {
          memberExists = true;
          break;
        }
      }
    }
  }

  const handleSearch = () => setSearchID(memberID);

  const handleQRScan = ({ programId: _p, memberID: m }: { programId: number; memberID: string }) => {
    setMemberID(m);
    setSearchID(m);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Member Balance</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
          <TextField
            label="Member ID (Reward ID)"
            value={memberID}
            onChange={(e) => setMemberID(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 150 }}
            inputProps={{ maxLength: 12 }}
            placeholder="Enter member ID..."
          />
          <QRScannerButton tooltip="Scan member QR to search" onScan={handleQRScan} />
          <Button variant="contained" onClick={handleSearch} disabled={!memberID}>Look Up</Button>
        </Box>
      </Paper>

      {searchID && count > 0 && (
        <>
          {memberWallet && (
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Wallet: <Typography component="span" sx={{ fontFamily: "monospace" }}>{isMobile ? shortenAddress(memberWallet) : memberWallet}</Typography>
              </Typography>
            </Paper>
          )}

          {!memberExists && (
            <Alert severity="warning" sx={{ mb: 3 }}>No member found with ID &quot;{searchID}&quot; in any program.</Alert>
          )}

          {memberExists && !memberWallet && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>Member &quot;{searchID}&quot; exists but has no linked wallet (walletless member).</Alert>
              <ClaimMemberSection memberID={searchID} programCount={count} />
            </>
          )}

          {memberExists && (
            <>
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>Programs & Balances for &quot;{searchID}&quot;</Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
                  Balance columns: Available / Permanently Locked / Time-Locked (FULA)
                </Typography>
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Program</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Code</TableCell>
                        <TableCell>Role</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Parent</TableCell>
                        <TableCell>Available</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Locked</TableCell>
                        <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Time-Locked</TableCell>
                        <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Status</TableCell>
                        <TableCell>QR</TableCell>
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

              {memberWallet && <OwnerActions memberWallet={memberWallet} />}
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
