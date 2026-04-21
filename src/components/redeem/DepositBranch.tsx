"use client";

import { useState } from "react";
import {
  Alert, Box, Button, CircularProgress, FormControl, InputLabel,
  MenuItem, Paper, Select, Stack, TextField, Typography,
} from "@mui/material";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useDepositTokens, useRewardTypes, useTokenBalance,
} from "@/hooks/useRewardsProgram";
import { formatContractError, formatFula, fromBytes16 } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";

export function DepositBranch({ programId: initialProgramId }: { programId: string }) {
  const { address } = useAccount();
  const [programId, setProgramId] = useState(initialProgramId || "1");
  const pid = parseInt(programId) || 0;

  const [amount, setAmount] = useState("");
  const [rewardType, setRewardType] = useState(0);
  const [note, setNote] = useState("");
  const [disclaimer, setDisclaimer] = useState(false);

  const { data: walletBalance } = useTokenBalance(address);
  const { data: rewardTypesData } = useRewardTypes(pid);
  const {
    deposit, isApproving, isDepositing, isPending, isSuccess, error,
  } = useDepositTokens();

  if (!address) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ mb: 1.5, color: "text.secondary" }}>
          Connect a wallet to deposit tokens.
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
          {walletBalance != null && (
            <Typography variant="mono" sx={{ color: "text.tertiary", fontSize: 12 }}>
              Wallet: {formatFula(walletBalance)} FULA
            </Typography>
          )}
        </Box>

        <TextField
          label="Amount (FULA)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          type="number"
          fullWidth
        />

        <FormControl fullWidth size="small">
          <InputLabel>Reward type</InputLabel>
          <Select
            value={rewardType}
            label="Reward type"
            onChange={(e) => setRewardType(Number(e.target.value))}
          >
            <MenuItem value={0}>None</MenuItem>
            {rewardTypesData &&
              (rewardTypesData as [number[], `0x${string}`[]])[0]?.map((id: number, idx: number) => (
                <MenuItem key={id} value={id}>
                  {fromBytes16((rewardTypesData as [number[], `0x${string}`[]])[1][idx]) ||
                    `Type ${id}`}
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <TextField
          label="Note (optional, max 128 chars)"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 128))}
          size="small"
          fullWidth
          inputProps={{ maxLength: 128 }}
          helperText={`${note.length}/128`}
        />

        <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />

        <Button
          variant="contained"
          size="large"
          onClick={() => deposit(pid, amount, rewardType, note)}
          disabled={isPending || !amount || !disclaimer}
        >
          {isApproving ? (
            <>
              <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} /> Approving…
            </>
          ) : isDepositing ? (
            <>
              <CircularProgress size={22} color="inherit" sx={{ mr: 1 }} /> Depositing…
            </>
          ) : (
            "Deposit"
          )}
        </Button>

        {isSuccess && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Deposit successful.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {formatContractError(error)}
          </Alert>
        )}
      </Paper>
    </Stack>
  );
}
