"use client";

import { useState } from "react";
import {
  Alert, Box, Button, Checkbox, CircularProgress, FormControl,
  FormControlLabel, Grid, InputLabel, MenuItem, Paper, Select,
  Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useAccount, useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useTransferToSubMember, useRewardTypes, useSubTypes, useTransferLimit, useMemberBalance,
} from "@/hooks/useRewardsProgram";
import { CONTRACTS, MemberRoleLabels, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import {
  formatContractError, formatFula, fromBytes12, fromBytes16, isValidAddress,
  shortenAddress, toBytes12,
} from "@/lib/utils";
import { CameraScanner } from "@/components/rewards/CameraScanner";

export function SendSubBranch({
  programId: initialProgramId,
  memberCode: initialMemberCode,
}: {
  programId: string;
  memberCode: string;
}) {
  const { address } = useAccount();
  const [programId, setProgramId] = useState(initialProgramId || "1");
  const pid = parseInt(programId) || 0;

  const [memberCode, setMemberCode] = useState(initialMemberCode);
  const [overrideWallet, setOverrideWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [locked, setLocked] = useState(true);
  const [lockDays, setLockDays] = useState("0");
  const [note, setNote] = useState("");
  const [rewardType, setRewardType] = useState(0);
  const [subType, setSubType] = useState(0);
  const [scannerOpen, setScannerOpen] = useState(false);

  const { data: balance } = useMemberBalance(pid, address);
  const { data: rewardTypesData } = useRewardTypes(pid);
  const { data: subTypesData } = useSubTypes(pid, rewardType);
  const { data: transferLimit } = useTransferLimit(pid);
  const { transfer, isPending, isConfirming, isSuccess, error } = useTransferToSubMember();

  const memberBytes = memberCode.length > 0 ? toBytes12(memberCode) : undefined;
  const { data: resolvedKey } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "memberIDLookup",
    args: memberBytes && pid > 0 ? [memberBytes, pid] : undefined,
    query: { enabled: !!memberBytes && pid > 0 },
  });
  const { data: resolvedMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: memberBytes && pid > 0 ? [memberBytes, pid] : undefined,
    query: { enabled: !!memberBytes && pid > 0 },
  });

  const resolvedAddr =
    resolvedKey && resolvedKey !== "0x0000000000000000000000000000000000000000"
      ? (resolvedKey as string)
      : "";
  const target = resolvedAddr || overrideWallet;
  const overrideValid = !overrideWallet || isValidAddress(overrideWallet);

  if (!address) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ mb: 1.5, color: "text.secondary" }}>
          Connect a wallet to send points to a sub-member.
        </Typography>
        <ConnectButton />
      </Paper>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Paper sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}>
          <TextField
            label="Program ID"
            value={programId}
            onChange={(e) => setProgramId(e.target.value.replace(/[^0-9]/g, ""))}
            size="small"
            sx={{ width: 120 }}
          />
          {balance && (
            <Typography variant="mono" sx={{ color: "text.tertiary", fontSize: 12 }}>
              Available: {formatFula(balance[0] as bigint)} FULA
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            label="Recipient member code"
            value={memberCode}
            onChange={(e) => setMemberCode(e.target.value.toUpperCase().slice(0, 12))}
            size="small"
            fullWidth
            placeholder="e.g. ALICE01"
            inputProps={{ maxLength: 12 }}
          />
          <Button variant="outlined" size="small" onClick={() => setScannerOpen(true)}>
            Scan
          </Button>
        </Box>

        {memberCode && resolvedAddr && resolvedMember && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Resolved: <strong>{fromBytes12(resolvedMember.memberID)}</strong> ·{" "}
            {MemberRoleLabels[resolvedMember.role] || "Unknown"}
            {resolvedMember.wallet && resolvedMember.wallet !== zeroAddress
              ? ` (${shortenAddress(resolvedMember.wallet)})`
              : " (walletless member)"}
          </Alert>
        )}
        {memberCode && !resolvedAddr && memberBytes && (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            Member not found in program {programId}.
          </Alert>
        )}

        <TextField
          label="Override wallet (optional)"
          value={overrideWallet}
          onChange={(e) => setOverrideWallet(e.target.value)}
          size="small"
          fullWidth
          placeholder="0x… only if member code is empty"
          error={!!overrideWallet && !overrideValid}
          helperText={
            overrideWallet && !overrideValid
              ? "Invalid wallet address"
              : "Leave blank when using member code"
          }
          disabled={!!resolvedAddr}
        />

        <TextField
          label="Amount (FULA)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          type="number"
          fullWidth
        />

        <Grid container spacing={1.5}>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={locked}
                    onChange={(e) => {
                      setLocked(e.target.checked);
                      if (e.target.checked) setLockDays("0");
                    }}
                  />
                }
                label="Permanently locked"
              />
              <Tooltip
                arrow
                title="Recipient can only transfer locked tokens back to sender, not withdraw to a wallet."
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.tertiary", cursor: "help" }} />
              </Tooltip>
            </Box>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <TextField
                label="Time-lock days (0-1095)"
                value={lockDays}
                onChange={(e) => setLockDays(e.target.value.replace(/[^0-9]/g, ""))}
                size="small"
                type="number"
                fullWidth
                inputProps={{ min: 0, max: 1095 }}
                disabled={locked}
              />
              <Tooltip
                arrow
                title="Recipient must wait this many days before withdrawing. They can always transfer back early."
              >
                <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.tertiary", cursor: "help" }} />
              </Tooltip>
            </Box>
          </Grid>
        </Grid>

        {rewardTypesData && (rewardTypesData as [number[], `0x${string}`[]])[0]?.length > 0 && (
          <FormControl fullWidth size="small">
            <InputLabel>Reward type</InputLabel>
            <Select
              value={rewardType}
              label="Reward type"
              onChange={(e) => {
                setRewardType(Number(e.target.value));
                setSubType(0);
              }}
            >
              <MenuItem value={0}>None</MenuItem>
              {(rewardTypesData as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                <MenuItem key={id} value={id}>
                  {fromBytes16((rewardTypesData as [number[], `0x${string}`[]])[1][idx]) ||
                    `Type ${id}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {rewardType > 0 &&
          subTypesData &&
          (subTypesData as [number[], `0x${string}`[]])[0]?.length > 0 && (
            <FormControl fullWidth size="small">
              <InputLabel>Sub-type</InputLabel>
              <Select
                value={subType}
                label="Sub-type"
                onChange={(e) => setSubType(Number(e.target.value))}
              >
                <MenuItem value={0}>None</MenuItem>
                {(subTypesData as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                  <MenuItem key={id} value={id}>
                    {fromBytes16((subTypesData as [number[], `0x${string}`[]])[1][idx]) ||
                      `Sub-type ${id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

        <TextField
          label="Note (optional, max 128 chars)"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 128))}
          size="small"
          fullWidth
          inputProps={{ maxLength: 128 }}
          helperText={`${note.length}/128`}
        />

        {transferLimit != null && Number(transferLimit) > 0 && (
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            Program limit: Clients can transfer up to {Number(transferLimit)}% of total balance per
            TX.
          </Typography>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={() =>
            transfer(
              pid,
              target as `0x${string}`,
              amount,
              locked,
              parseInt(lockDays) || 0,
              rewardType,
              subType,
              note,
            )
          }
          disabled={
            isPending ||
            isConfirming ||
            !target ||
            !amount ||
            (!resolvedAddr && !overrideValid)
          }
        >
          {isPending || isConfirming ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Send points"
          )}
        </Button>

        {isSuccess && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Points sent successfully.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {formatContractError(error)}
          </Alert>
        )}
      </Paper>

      <CameraScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={({ programId: scannedPid, memberID }) => {
          if (scannedPid && scannedPid > 0) setProgramId(String(scannedPid));
          if (memberID) {
            setMemberCode(memberID.toUpperCase());
            setOverrideWallet("");
          }
          setScannerOpen(false);
        }}
      />
    </Stack>
  );
}
