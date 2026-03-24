"use client";

import { useState } from "react";
import {
  Typography, Box, Paper, TextField, Button, Grid, Tabs, Tab,
  Alert, CircularProgress, FormControlLabel, Checkbox, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow,
} from "@mui/material";
import { useAccount } from "wagmi";
import { zeroAddress } from "viem";
import {
  useApproveToken, useAddTokens, useTransferToSubMember, useTransferToParent,
  useWithdraw, useMemberBalance, useTimeLocks, useTokenBalance, useTransferCount,
  useTransferRecord,
} from "@/hooks/useRewardsProgram";
import { formatFula, formatDate, isValidAddress, formatContractError } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  return value === index ? <Box sx={{ pt: 3 }}>{children}</Box> : null;
}

function RecentTransfer({ id }: { id: number }) {
  const { data: record } = useTransferRecord(id);
  if (!record) return null;
  return (
    <TableRow>
      <TableCell>{record.id.toString()}</TableCell>
      <TableCell>{record.from.slice(0, 8)}...</TableCell>
      <TableCell>{record.to.slice(0, 8)}...</TableCell>
      <TableCell>{formatFula(record.amount)}</TableCell>
      <TableCell>{record.locked ? "Locked" : record.lockTimeDays > 0 ? `${record.lockTimeDays}d` : "Free"}</TableCell>
      <TableCell>{record.note.slice(0, 30)}{record.note.length > 30 ? "..." : ""}</TableCell>
      <TableCell>{formatDate(Number(record.timestamp))}</TableCell>
    </TableRow>
  );
}

export default function TokensPage() {
  const { address } = useAccount();
  const [tab, setTab] = useState(0);
  const [programId, setProgramId] = useState("1");
  const pid = parseInt(programId) || 0;

  // Balance
  const { data: effectiveBalance } = useMemberBalance(pid, address);
  const { data: timeLocks } = useTimeLocks(pid, address);
  const { data: walletBalance } = useTokenBalance(address);
  const { data: transferCount } = useTransferCount();

  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositDisclaimer, setDepositDisclaimer] = useState(false);
  const { approve, isPending: isApproving, isConfirming: isAppConfirming, isSuccess: approveSuccess } = useApproveToken();
  const { addTokens, isPending: isDepositing, isConfirming: isDepConfirming, isSuccess: depositSuccess, error: depositError } = useAddTokens();

  // Transfer state
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNote, setTransferNote] = useState("");
  const [transferLocked, setTransferLocked] = useState(false);
  const [transferLockDays, setTransferLockDays] = useState("0");
  const [transferDisclaimer, setTransferDisclaimer] = useState(false);
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
      {effectiveBalance && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Balance in Program {programId}</Typography>
          <Grid container spacing={2}>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Wallet FULA</Typography>
              <Typography variant="h6">{walletBalance ? formatFula(walletBalance) : "0"}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Withdrawable</Typography>
              <Typography variant="h6" color="success.main">{formatFula(effectiveBalance[0])}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Permanently Locked</Typography>
              <Typography variant="h6" color="error.main">{formatFula(effectiveBalance[1])}</Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography variant="body2" color="text.secondary">Time-Locked</Typography>
              <Typography variant="h6" color="warning.main">{formatFula(effectiveBalance[2])}</Typography>
            </Grid>
          </Grid>
          {timeLocks && timeLocks.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>Time Lock Details:</Typography>
              {timeLocks.map((lock, i) => (
                <Typography key={i} variant="body2">
                  {formatFula(BigInt(lock.amount))} FULA - unlocks {formatDate(Number(lock.unlockTime))}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      )}

      <Paper sx={{ p: 3 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Deposit" />
          <Tab label="Transfer to Sub-Member" />
          <Tab label="Transfer to Parent" />
          <Tab label="Withdraw" />
          <Tab label="History" />
        </Tabs>

        {/* DEPOSIT */}
        <TabPanel value={tab} index={0}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Step 1: Approve FULA tokens. Step 2: Deposit into the program.
          </Typography>
          <TextField label="Amount (FULA)" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <OnChainDisclaimer accepted={depositDisclaimer} onChange={setDepositDisclaimer} />
          <Box sx={{ display: "flex", gap: 2, mt: 2 }}>
            <Button variant="outlined" onClick={() => approve(depositAmount)}
              disabled={isApproving || isAppConfirming || !depositAmount || !depositDisclaimer}>
              {isApproving || isAppConfirming ? <CircularProgress size={20} /> : "1. Approve"}
            </Button>
            <Button variant="contained" onClick={() => addTokens(pid, depositAmount)}
              disabled={isDepositing || isDepConfirming || !depositAmount || !depositDisclaimer}>
              {isDepositing || isDepConfirming ? <CircularProgress size={20} /> : "2. Deposit"}
            </Button>
          </Box>
          {approveSuccess && <Alert severity="info" sx={{ mt: 2 }}>Approval confirmed. Now click Deposit.</Alert>}
          {depositSuccess && <Alert severity="success" sx={{ mt: 2 }}>Deposit successful!</Alert>}
          {depositError && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(depositError)}</Alert>}
        </TabPanel>

        {/* TRANSFER TO SUB-MEMBER */}
        <TabPanel value={tab} index={1}>
          <TextField label="Recipient Wallet" value={transferTo} onChange={(e) => setTransferTo(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!transferTo && !transferToValid} helperText={transferTo && !transferToValid ? "Invalid wallet address" : ""} />
          <TextField label="Amount (FULA)" value={transferAmount} onChange={(e) => setTransferAmount(e.target.value)}
            fullWidth margin="normal" type="number" />
          <TextField label="Note" value={transferNote} onChange={(e) => setTransferNote(e.target.value)}
            fullWidth margin="normal" multiline rows={2} inputProps={{ maxLength: 256 }} helperText={`${transferNote.length}/256`} />
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
            onClick={() => transfer(pid, transferTo as `0x${string}`, transferAmount, transferNote, transferLocked, parseInt(transferLockDays))}
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

        {/* HISTORY */}
        <TabPanel value={tab} index={4}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Recent transfers (showing last 10)
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>From</TableCell>
                  <TableCell>To</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Lock</TableCell>
                  <TableCell>Note</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transferCount && Number(transferCount) > 0 ? (
                  Array.from(
                    { length: Math.min(10, Number(transferCount)) },
                    (_, i) => Number(transferCount) - i
                  ).map((id) => <RecentTransfer key={id} id={id} />)
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} align="center">No transfers yet.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Paper>
    </Box>
  );
}
