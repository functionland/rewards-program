"use client";

import { useState } from "react";
import {
  Typography, Box, Paper, TextField, Button, Grid, Tabs, Tab,
  Alert, CircularProgress, FormControlLabel, Checkbox,
  Select, MenuItem, FormControl, InputLabel,
} from "@mui/material";
import { useAccount } from "wagmi";
import { readContract } from "wagmi/actions";
import { zeroAddress } from "viem";
import {
  useDepositTokens, useTransferToSubMember, useTransferToParent,
  useWithdraw, useMemberBalance, useTokenBalance, useRewardTypes, useTransferLimit,
} from "@/hooks/useRewardsProgram";
import { formatFula, toBytes12, isValidAddress, formatContractError, fromBytes16 } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRScannerButton } from "@/components/common/QRScannerButton";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { wagmiConfig } from "@/lib/wagmi";

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

export default function TokensPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState(0);
  const [programId, setProgramId] = useState("1");
  const pid = parseInt(programId) || 0;

  // Balance
  const { data: balance } = useMemberBalance(pid, address);
  const { data: walletBalance } = useTokenBalance(address);

  // Reward types
  const { data: rewardTypesData } = useRewardTypes();

  // Transfer limit
  const { data: transferLimitData } = useTransferLimit(pid);

  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRewardType, setDepositRewardType] = useState(0);
  const [depositNote, setDepositNote] = useState("");
  const [depositDisclaimer, setDepositDisclaimer] = useState(false);
  const { deposit: depositTokens, isApproving, isDepositing, isPending: isDepositPending, isSuccess: depositSuccess, error: depositError } = useDepositTokens();

  // Transfer state
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferLocked, setTransferLocked] = useState(true);
  const [transferLockDays, setTransferLockDays] = useState("0");
  const [transferDisclaimer, setTransferDisclaimer] = useState(false);
  const [scanInfo, setScanInfo] = useState("");
  const { transfer, isPending: isTransferring, isConfirming: isTransConfirming, isSuccess: transferSuccess, error: transferError } = useTransferToSubMember();

  // Transfer back state
  const [parentTo, setParentTo] = useState("");
  const [parentAmount, setParentAmount] = useState("");
  const [parentDisclaimer, setParentDisclaimer] = useState(false);
  const { transferBack, isPending: isTransBack, isConfirming: isTransBackConf, isSuccess: transBackSuccess, error: transBackError } = useTransferToParent();

  // Withdraw state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawDisclaimer, setWithdrawDisclaimer] = useState(false);
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithConfirming, isSuccess: withdrawSuccess, error: withdrawError } = useWithdraw();

  const transferToValid = !transferTo || isValidAddress(transferTo);

  const handleQRScan = async ({ programId: p, memberID }: { programId: number; memberID: string }) => {
    setProgramId(String(p));
    setScanInfo(`Scanned: ${memberID} (Program ${p})`);
    setTab(1); // Switch to Transfer tab

    try {
      const member = await readContract(wagmiConfig, {
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "getMemberByID",
        args: [toBytes12(memberID), p],
      });
      if (member && member.wallet && member.wallet !== zeroAddress) {
        setTransferTo(member.wallet);
        setScanInfo(`Scanned: ${memberID} (Program ${p}) - wallet found`);
      } else {
        setScanInfo(`Scanned: ${memberID} (Program ${p}) - walletless member, enter storageKey manually`);
      }
    } catch {
      setScanInfo(`Scanned: ${memberID} (Program ${p}) - member not found`);
    }
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
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
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
            <TextField label="Recipient Wallet" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
              fullWidth margin="normal" placeholder="0x..."
              error={!!transferTo && !transferToValid} helperText={transferTo && !transferToValid ? "Invalid wallet address" : ""} />
            <QRScannerButton
              tooltip="Scan member QR to auto-fill recipient"
              onScan={handleQRScan}
            />
          </Box>
          <TextField label="Amount (FULA)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <FormControlLabel control={<Checkbox checked={transferLocked} onChange={(e) => setTransferLocked(e.target.checked)} />}
                label="Permanently Locked (recipient can only transfer back)" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Lock Time (days, 0-1095)" value={transferLockDays}
                onChange={(e) => setTransferLockDays(e.target.value)} type="number" fullWidth margin="normal"
                inputProps={{ min: 0, max: 1095 }} />
            </Grid>
          </Grid>
          <OnChainDisclaimer accepted={transferDisclaimer} onChange={setTransferDisclaimer} />
          <Button variant="contained" sx={{ mt: 2 }}
            onClick={() => transfer(pid, transferTo as `0x${string}`, transferAmount, transferLocked, parseInt(transferLockDays))}
            disabled={isTransferring || isTransConfirming || !transferTo || !transferAmount || !transferDisclaimer || !transferToValid}>
            {isTransferring || isTransConfirming ? <CircularProgress size={20} /> : "Transfer"}
          </Button>
          {transferSuccess && <Alert severity="success" sx={{ mt: 2 }}>Transfer successful!</Alert>}
          {transferError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(transferError)}</Alert>}
        </TabPanel>

        {/* TRANSFER TO PARENT */}
        <TabPanel value={tab} index={2}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Leave wallet empty to transfer to your direct parent.
          </Typography>
          {transferLimitData != null && Number(transferLimitData) > 0 && (
            <Alert severity="info" sx={{ mb: 2 }}>
              This program limits Client transfers to <strong>{Number(transferLimitData)}%</strong> of total balance.
              {balance && (
                <> Your max transferable: <strong>{formatFula((balance[0] + balance[1] + balance[2]) * BigInt(Number(transferLimitData)) / BigInt(100))} FULA</strong></>
              )}
            </Alert>
          )}
          <TextField label="Parent Wallet (optional)" value={parentTo} onChange={(e) => setParentTo(e.target.value)}
            fullWidth margin="normal" placeholder="0x... (leave empty for direct parent)" />
          <TextField label="Amount (FULA)" value={parentAmount} onChange={(e) => setParentAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <OnChainDisclaimer accepted={parentDisclaimer} onChange={setParentDisclaimer} />
          <Button variant="contained" sx={{ mt: 2 }}
            onClick={() => transferBack(pid, (parentTo || zeroAddress) as `0x${string}`, parentAmount)}
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
