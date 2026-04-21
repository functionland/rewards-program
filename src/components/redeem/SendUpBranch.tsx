"use client";

import { useState } from "react";
import {
  Alert, Box, Button, CircularProgress, Paper, Stack, TextField, Typography,
} from "@mui/material";
import { useAccount, useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useTransferToParent, useTransferLimit, useMemberBalance,
} from "@/hooks/useRewardsProgram";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { formatContractError, formatFula, shortenAddress } from "@/lib/utils";

export function SendUpBranch({ programId: initialProgramId }: { programId: string }) {
  const { address } = useAccount();
  const [programId, setProgramId] = useState(initialProgramId || "1");
  const pid = parseInt(programId) || 0;

  const [overrideWallet, setOverrideWallet] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const { data: balance } = useMemberBalance(pid, address);
  const { data: transferLimit } = useTransferLimit(pid);
  const { transferBack, isPending, isConfirming, isSuccess, error } = useTransferToParent();

  const { data: myMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address && pid > 0 ? [pid, address] : undefined,
    query: { enabled: !!address && pid > 0 },
  });

  const parentAddr =
    myMember?.parent && myMember.parent !== zeroAddress
      ? (myMember.parent as `0x${string}`)
      : undefined;

  if (!address) {
    return (
      <Paper sx={{ p: 3, textAlign: "center" }}>
        <Typography sx={{ mb: 1.5, color: "text.secondary" }}>
          Connect a wallet to send points to your parent.
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

        {parentAddr ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Your parent in this program: <strong>{shortenAddress(parentAddr)}</strong>. Leave the
            wallet field empty to transfer directly to them.
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ borderRadius: 2 }}>
            No parent detected for this program. Use the override field below only if you know the
            parent wallet.
          </Alert>
        )}

        {transferLimit != null && Number(transferLimit) > 0 && balance && (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            Per-TX limit: {Number(transferLimit)}% of total balance · Max{" "}
            <strong>
              {formatFula(
                ((balance[0] as bigint) + (balance[1] as bigint) + (balance[2] as bigint)) *
                  BigInt(Number(transferLimit)) /
                  BigInt(100),
              )}{" "}
              FULA
            </strong>
          </Alert>
        )}

        <TextField
          label="Override parent wallet (optional)"
          value={overrideWallet}
          onChange={(e) => setOverrideWallet(e.target.value)}
          size="small"
          fullWidth
          placeholder="0x…"
          helperText="Leave empty to send to your direct parent"
        />
        <TextField
          label="Amount (FULA)"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          size="small"
          type="number"
          fullWidth
        />
        <TextField
          label="Note (optional, max 128 chars)"
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 128))}
          size="small"
          fullWidth
          inputProps={{ maxLength: 128 }}
          helperText={`${note.length}/128`}
        />

        <Button
          variant="contained"
          size="large"
          onClick={() =>
            transferBack(
              pid,
              (overrideWallet || zeroAddress) as `0x${string}`,
              amount,
              note,
            )
          }
          disabled={isPending || isConfirming || !amount}
        >
          {isPending || isConfirming ? (
            <CircularProgress size={22} color="inherit" />
          ) : (
            "Send up"
          )}
        </Button>

        {isSuccess && (
          <Alert severity="success" sx={{ borderRadius: 2 }}>
            Transfer successful.
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
