"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Typography, Box, Paper, TextField, Button, Grid, Tabs, Tab,
  Alert, CircularProgress, FormControlLabel, Checkbox,
  Select, MenuItem, FormControl, InputLabel, Tooltip,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useAccount, useReadContract } from "wagmi";
import { useSearchParams } from "next/navigation";
import { zeroAddress } from "viem";
import {
  useDepositTokens, useTransferToSubMember, useTransferToParent,
  useWithdraw, useMemberBalance, useTokenBalance, useRewardTypes, useSubTypes, useTransferLimit,
} from "@/hooks/useRewardsProgram";
import { formatFula, toBytes12, fromBytes12, isValidAddress, formatContractError, fromBytes16, shortenAddress } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRScannerButton } from "@/components/common/QRScannerButton";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels } from "@/config/contracts";

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function TokensPage() {
  // useSearchParams must be inside a Suspense boundary in app router pages.
  return (
    <Suspense fallback={null}>
      <TokensPageInner />
    </Suspense>
  );
}

function TokensPageInner() {
  const searchParams = useSearchParams();
  const { address } = useAccount();
  const [tab, setTab] = useState(0);
  const [programId, setProgramId] = useState("1");
  const pid = parseInt(programId) || 0;

  // Balance
  const { data: balance } = useMemberBalance(pid, address);
  const { data: walletBalance } = useTokenBalance(address);

  // Reward types
  const { data: rewardTypesData } = useRewardTypes(pid);

  // Transfer limit
  const { data: transferLimitData } = useTransferLimit(pid);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRewardType, setDepositRewardType] = useState(0);
  const [depositNote, setDepositNote] = useState("");
  const [depositDisclaimer, setDepositDisclaimer] = useState(false);
  const { deposit: depositTokens, isApproving, isDepositing, isPending: isDepositPending, isSuccess: depositSuccess, error: depositError } = useDepositTokens();

  // Transfer state
  const [transferMemberCode, setTransferMemberCode] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLocked, setTransferLocked] = useState(true);
  const [transferLockDays, setTransferLockDays] = useState("0");
  const [transferNote, setTransferNote] = useState("");
  const [transferRewardType, setTransferRewardType] = useState(0);
  const [transferSubType, setTransferSubType] = useState(0);
  const [transferDisclaimer, setTransferDisclaimer] = useState(false);
  const [scanInfo, setScanInfo] = useState("");
  const { data: transferSubTypesData } = useSubTypes(pid, transferRewardType);
  const { transfer, isPending: isTransferring, isConfirming: isTransConfirming, isSuccess: transferSuccess, error: transferError } = useTransferToSubMember();

  // Resolve member code → storage key
  const memberCodeBytes = transferMemberCode.length > 0 ? toBytes12(transferMemberCode) : undefined;
  const { data: resolvedStorageKey } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "memberIDLookup",
    args: memberCodeBytes ? [memberCodeBytes, pid] : undefined,
    query: { enabled: !!memberCodeBytes && pid > 0 },
  });
  const { data: resolvedMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: memberCodeBytes ? [memberCodeBytes, pid] : undefined,
    query: { enabled: !!memberCodeBytes && pid > 0 },
  });
  const resolvedAddr = resolvedStorageKey && resolvedStorageKey !== "0x0000000000000000000000000000000000000000" ? resolvedStorageKey as string : "";
  const transferTarget = resolvedAddr || transferTo;

  // Transfer back state
  const [parentTo, setParentTo] = useState("");
  const [parentAmount, setParentAmount] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [parentDisclaimer, setParentDisclaimer] = useState(false);
  const { transferBack, isPending: isTransBack, isConfirming: isTransBackConf, isSuccess: transBackSuccess, error: transBackError } = useTransferToParent();

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDisclaimer, setWithdrawDisclaimer] = useState(false);
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithConfirming, isSuccess: withdrawSuccess, error: withdrawError } = useWithdraw();

  // My member info (for parent detection)
  const { data: myMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address ? [pid, address] : undefined,
    query: { enabled: !!address && pid > 0 },
  });
  const parentAddr = myMember?.parent && myMember.parent !== zeroAddress ? myMember.parent as string : "";

  const transferToValid = !transferTo || isValidAddress(transferTo);

  // One-shot deep-link hydration: /tokens?program=X&member=CODE&action=transfer opens
  // the Transfer tab prefilled (used by the member-QR scan-with-camera flow).
  // Read only on mount so subsequent user edits aren't clobbered by stale URL params.
  useEffect(() => {
    const programParam = searchParams.get("program");
    const memberParam = searchParams.get("member");
    const actionParam = searchParams.get("action");
    if (programParam && Number(programParam) > 0) {
      setProgramId(programParam);
    }
    if (actionParam === "transfer") {
      setTab(1);
      if (memberParam) {
        setTransferMemberCode(memberParam.toUpperCase());
        setScanInfo(`Prefilled: ${memberParam} (Program ${programParam || "?"})`);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleQRScan = ({ programId: p, memberID }: { programId: number; memberID: string }) => {
    setProgramId(String(p));
    setTransferMemberCode(memberID.toUpperCase());
    setTransferTo("");
    setScanInfo(`Scanned: ${memberID} (Program ${p})`);
    setTab(1); // Switch to Transfer tab
  };

  // Wallet guard
  if (!address) {
    return (
      <Box>
        <Typography variant="h4" gutterBottom>Token Operations</Typography>
        <Alert severity="info">Connect your wallet to access token operations.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Token Operations</Typography>

      <Box sx={{ mb: 3 }}>
        <TextField label="Program ID" value={programId} onChange={(e) => setProgramId(e.target.value)}
          type="number" size="small" sx={{ width: 150 }} />
      </Box>

      {/* Balance Display */}
      {balance && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Balance in Program {programId}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Wallet FULA</Typography>
              <Typography variant="h6">{walletBalance ? formatFula(walletBalance) : "0"}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Available</Typography>
              <Typography variant="h6" color="success.main">{formatFula(balance[0])}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Permanently Locked</Typography>
              <Typography variant="h6" color="error.main">{formatFula(balance[1])}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Time-Locked</Typography>
              <Typography variant="h6" color="warning.main">{formatFula(balance[2])}</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto">
          <Tab label="Deposit" />
          <Tab label="Transfer to Sub-Member" />
          <Tab label="Transfer to Parent" />
          <Tab label="Withdraw" />
        </Tabs>

        {/* DEPOSIT */}
        <TabPanel value={tab} index={0}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Deposit FULA tokens into the program. Approval is handled automatically.
          </Typography>
          <TextField label="Amount (FULA)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <FormControl fullWidth margin="normal">
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
          <TextField label="Note (optional, max 128 chars)" value={depositNote}
            onChange={(e) => setDepositNote(e.target.value.slice(0, 128))}
            fullWidth margin="normal" inputProps={{ maxLength: 128 }}
            helperText={`${depositNote.length}/128`} />
          <OnChainDisclaimer accepted={depositDisclaimer} onChange={setDepositDisclaimer} />
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button variant="contained" onClick={() => depositTokens(pid, depositAmount, depositRewardType, depositNote)}
              disabled={isDepositPending || !depositAmount || !depositDisclaimer}>
              {isApproving ? <><CircularProgress size={20} sx={{ mr: 1 }} /> Approving...</>
                : isDepositing ? <><CircularProgress size={20} sx={{ mr: 1 }} /> Depositing...</>
                : "Deposit"}
            </Button>
          </Box>
          {depositSuccess && <Alert severity="success" sx={{ mt: 2 }}>Deposit successful!</Alert>}
          {depositError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(depositError)}</Alert>}
        </TabPanel>

        {/* TRANSFER TO SUB-MEMBER */}
        <TabPanel value={tab} index={1}>
          {scanInfo && <Alert severity="info" sx={{ mb: 2 }}>{scanInfo}</Alert>}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField label="Recipient Member Code" value={transferMemberCode}
              onChange={(e) => setTransferMemberCode(e.target.value.toUpperCase().slice(0, 12))}
              fullWidth margin="normal" placeholder="e.g. ALICE01"
              inputProps={{ maxLength: 12 }} />
            <QRScannerButton
              tooltip="Scan member QR to auto-fill recipient"
              onScan={handleQRScan}
            />
          </Box>
          {transferMemberCode && resolvedAddr && resolvedMember && (
            <Alert severity="success" sx={{ mb: 1 }}>
              Resolved: <strong>{fromBytes12(resolvedMember.memberID)}</strong> — {MemberRoleLabels[resolvedMember.role] || "Unknown"}
              {resolvedMember.wallet && resolvedMember.wallet !== zeroAddress
                ? ` (${shortenAddress(resolvedMember.wallet)})`
                : " (walletless member)"}
            </Alert>
          )}
          {transferMemberCode && !resolvedAddr && memberCodeBytes && (
            <Alert severity="warning" sx={{ mb: 1 }}>Member not found in program {programId}.</Alert>
          )}
          <TextField label="Override Wallet (optional)" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
            fullWidth margin="normal" placeholder="0x... (only if member code is empty)"
            error={!!transferTo && !transferToValid} helperText={transferTo && !transferToValid ? "Invalid wallet address" : "Used only when member code is empty"}
            disabled={!!resolvedAddr} />
          <TextField label="Amount (FULA)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={6}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <FormControlLabel control={<Checkbox checked={transferLocked} onChange={(e) => { setTransferLocked(e.target.checked); if (e.target.checked) setTransferLockDays("0"); }} />}
                  label="Permanently Locked" />
                <Tooltip title="If you check this, the recipient can only transfer the tokens back to sender and cannot withdraw to their wallet" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help", ml: -1 }} />
                </Tooltip>
              </Box>
            </Grid>
            <Grid item xs={6}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <TextField label="Lock Time (days, 0-1095)" value={transferLockDays}
                  onChange={(e) => setTransferLockDays(e.target.value)} type="number" fullWidth margin="normal"
                  inputProps={{ min: 0, max: 1095 }} disabled={transferLocked} />
                <Tooltip title="If you set a time, the user needs to wait for that number of days before they can withdraw tokens to their wallet. They can still transfer tokens back to sender at any time without waiting" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
          {rewardTypesData && (rewardTypesData as [number[], `0x${string}`[]])[0]?.length > 0 && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Reward Type</InputLabel>
              <Select value={transferRewardType} onChange={(e) => { setTransferRewardType(Number(e.target.value)); setTransferSubType(0); }} label="Reward Type">
                <MenuItem value={0}>None</MenuItem>
                {(rewardTypesData as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                  <MenuItem key={id} value={id}>
                    {fromBytes16((rewardTypesData as [number[], `0x${string}`[]])[1][idx]) || `Type ${id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {transferRewardType > 0 && transferSubTypesData && (transferSubTypesData as [number[], `0x${string}`[]])[0]?.length > 0 && (
            <FormControl fullWidth margin="normal">
              <InputLabel>Sub-Type</InputLabel>
              <Select value={transferSubType} onChange={(e) => setTransferSubType(Number(e.target.value))} label="Sub-Type">
                <MenuItem value={0}>None</MenuItem>
                {(transferSubTypesData as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                  <MenuItem key={id} value={id}>
                    {fromBytes16((transferSubTypesData as [number[], `0x${string}`[]])[1][idx]) || `Sub-Type ${id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          <TextField label="Note (optional, max 128 chars)" value={transferNote}
            onChange={(e) => setTransferNote(e.target.value.slice(0, 128))}
            fullWidth margin="normal" inputProps={{ maxLength: 128 }}
            helperText={`${transferNote.length}/128`} />
          <OnChainDisclaimer accepted={transferDisclaimer} onChange={setTransferDisclaimer} />
          <Button variant="contained" sx={{ mt: 2 }}
            onClick={() => transfer(pid, transferTarget as `0x${string}`, transferAmount, transferLocked, parseInt(transferLockDays), transferRewardType, transferSubType, transferNote)}
            disabled={isTransferring || isTransConfirming || !transferTarget || !transferAmount || !transferDisclaimer || (!resolvedAddr && !transferToValid)}>
            {isTransferring || isTransConfirming ? <CircularProgress size={20} /> : "Transfer"}
          </Button>
          {transferSuccess && <Alert severity="success" sx={{ mt: 2 }}>Transfer successful!</Alert>}
          {transferError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(transferError)}</Alert>}
        </TabPanel>

        {/* TRANSFER TO PARENT */}
        <TabPanel value={tab} index={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Transfer tokens from your program balance to your parent. This uses your locked and available balance in the contract, not your wallet.
          </Typography>
          {parentAddr && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Your parent in this program: <strong>{shortenAddress(parentAddr)}</strong>. Leave the wallet field empty to transfer directly to them.
            </Alert>
          )}
          {transferLimitData != null && Number(transferLimitData) > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This program limits Client transfers to <strong>{Number(transferLimitData)}%</strong> of total balance.
              {balance && (
                <> Your max transferable: <strong>{formatFula((balance[0] + balance[1] + balance[2]) * BigInt(Number(transferLimitData)) / BigInt(100))} FULA</strong></>
              )}
            </Alert>
          )}
          <TextField label="Override Parent Wallet (optional)" value={parentTo} onChange={(e) => setParentTo(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            helperText="Leave empty to transfer to your direct parent" />
          <TextField label="Amount (FULA)" value={parentAmount} onChange={(e) => setParentAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <TextField label="Note (optional, max 128 chars)" value={parentNote}
            onChange={(e) => setParentNote(e.target.value.slice(0, 128))}
            fullWidth margin="normal" inputProps={{ maxLength: 128 }}
            helperText={`${parentNote.length}/128`} />
          <OnChainDisclaimer accepted={parentDisclaimer} onChange={setParentDisclaimer} />
          <Button variant="contained" sx={{ mt: 2 }}
            onClick={() => transferBack(pid, (parentTo || zeroAddress) as `0x${string}`, parentAmount, parentNote)}
            disabled={isTransBack || isTransBackConf || !parentAmount || !parentDisclaimer}>
            {isTransBack || isTransBackConf ? <CircularProgress size={20} /> : "Transfer to Parent"}
          </Button>
          {transBackSuccess && <Alert severity="success" sx={{ mt: 2 }}>Transfer successful!</Alert>}
          {transBackError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(transBackError)}</Alert>}
        </TabPanel>

        {/* WITHDRAW */}
        <TabPanel value={tab} index={3}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Withdraw available tokens to your wallet. Expired time-locks are auto-resolved.
          </Typography>
          <TextField label="Amount (FULA)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <OnChainDisclaimer accepted={withdrawDisclaimer} onChange={setWithdrawDisclaimer} />
          <Button variant="contained" sx={{ mt: 2 }} color="secondary"
            onClick={() => withdraw(pid, withdrawAmount)}
            disabled={isWithdrawing || isWithConfirming || !withdrawAmount || !withdrawDisclaimer}>
            {isWithdrawing || isWithConfirming ? <CircularProgress size={20} /> : "Withdraw"}
          </Button>
          {withdrawSuccess && <Alert severity="success" sx={{ mt: 2 }}>Withdrawal successful!</Alert>}
          {withdrawError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(withdrawError)}</Alert>}
        </TabPanel>
      </Paper>
    </Box>
  );
}
