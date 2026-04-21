"use client";

import { useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useWithdraw, useMemberBalance } from "@/hooks/useRewardsProgram";
import { formatContractError, formatFula } from "@/lib/utils";

export function WithdrawBranch({ programId: initialProgramId }: { programId: string }) {
  const { address } = useAccount();
  const [programId, setProgramId] = useState(initialProgramId || "1");
  const pid = parseInt(programId) || 0;

  const [amount, setAmount] = useState("");

  const { data: balance } = useMemberBalance(pid, address);
  const { withdraw, isPending, isConfirming, isSuccess, error } = useWithdraw();

  if (!address) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ mb: 1.5, color: "text.secondary" }}>
          Connect a wallet to withdraw tokens.
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

        <Typography sx={{ color: "text.secondary", fontSize: 13 }}>
          Withdraw available tokens to your wallet. Expired time-locks resolve automatically.
        </Typography>

        <TextField
          label="Amount (FULA)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          type="number"
          fullWidth
        />

        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={() => withdraw(pid, amount)}
          disabled={isPending || isConfirming || !amount}
        >
          {isPending || isConfirming ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Withdraw to wallet"
          )}
        </Button>

        {isSuccess && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Withdrawal successful.
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
