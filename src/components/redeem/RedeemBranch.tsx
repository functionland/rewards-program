"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, CircularProgress, IconButton, Paper,
  Stack, TextField, Tooltip, Typography,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { fromBytes12, formatContractError, safeParseAmount, toBytes12 } from "@/lib/utils";
import { virtualAddr } from "@/lib/memberKey";
import { useActForMember } from "@/hooks/useRewardsProgram";
import { BalanceHero } from "@/components/rewards/BalanceHero";

export function RedeemBranch({
  initialMemberCode,
  initialClaim,
  initialCode,
}: {
  initialMemberCode: string;
  initialClaim: string;
  initialCode: string;
}) {
  const { isConnected } = useAccount();

  const [memberID, setMemberID] = useState(initialMemberCode);
  const [codeFromUrl, setCodeFromUrl] = useState(!!initialCode);
  const [editCode, setEditCode] = useState(initialCode);
  const [editingCode, setEditingCode] = useState(!initialCode);
  const [codeInput, setCodeInput] = useState("");
  const [amount, setAmount] = useState("");
  const [transferredAmount, setTransferredAmount] = useState("");
  const { actForMember, isPending, isConfirming, isSuccess, error } = useActForMember();

  const programId = parseInt(initialClaim) || 0;

  const handleMemberChange = (val: string) => {
    const upper = val.toUpperCase();
    setMemberID(upper);
    if (upper !== initialMemberCode) {
      setCodeFromUrl(false);
      setEditCode("");
      setEditingCode(true);
      setCodeInput("");
    } else if (initialCode) {
      setCodeFromUrl(true);
      setEditCode(initialCode);
      setEditingCode(false);
    }
  };

  const handleSaveCode = () => {
    if (codeInput.trim()) {
      const code = codeInput.trim().startsWith("0x") ? codeInput.trim() : `0x${codeInput.trim()}`;
      setEditCode(code);
      setEditingCode(false);
    }
  };

  const memberIDBytes = memberID ? toBytes12(memberID) : undefined;
  const { data: member, isLoading: memberLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: memberIDBytes && programId > 0 ? [memberIDBytes, programId] : undefined,
    query: { enabled: !!memberIDBytes && programId > 0 },
  });

  const balanceKey: `0x${string}` | undefined = useMemo(() => {
    if (!member?.active) return undefined;
    if (member.wallet && member.wallet !== zeroAddress) return member.wallet as `0x${string}`;
    return virtualAddr(memberID, programId);
  }, [member, memberID, programId]);

  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: balanceKey ? [programId, balanceKey] : undefined,
    query: { enabled: !!balanceKey },
  });

  const parentAddr = member?.active ? (member.parent as `0x${string}`) : undefined;
  const { data: parentMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: parentAddr && parentAddr !== zeroAddress ? [programId, parentAddr] : undefined,
    query: { enabled: !!parentAddr && parentAddr !== zeroAddress && programId > 0 },
  });
  const parentMemberID = parentMember?.active
    ? fromBytes12(parentMember.memberID as `0x${string}`)
    : "";

  // --- PRESERVED INVARIANT ---
  // The following actForMember call is load-bearing for the legacy QR URL
  // contract: /redeem?member=X&claim=Y&code=Z. Event indexers and audit
  // trails may key on the exact memo string "Redeemed via portal".
  // Do not change: argument order, the action code (3 = Redeem-to-parent),
  // the zeroAddress recipient (contract routes to parent), or the note.
  const handleRedeem = () => {
    if (!memberID || !programId || !amount) return;
    setTransferredAmount(amount);
    actForMember(programId, memberID, 3, zeroAddress, amount, "Redeemed via portal");
  };
  // --- END INVARIANT ---

  useEffect(() => {
    if (isSuccess) setAmount("");
  }, [isSuccess]);

  const loading = memberLoading || balanceLoading;
  const parsedAmount = safeParseAmount(amount);
  const canTransfer =
    isConnected &&
    !!memberID &&
    programId > 0 &&
    !!parsedAmount &&
    parsedAmount > BigInt(0) &&
    !isPending &&
    !isConfirming &&
    member?.active;

  return (
    <Stack spacing={1.5}>
      {!programId && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No program specified. Open this page by scanning a member QR code, or
          pass <code>?claim=ID&member=CODE&code=0x…</code> in the URL.
        </Alert>
      )}

      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            label="Member code"
            value={memberID}
            onChange={(e) => handleMemberChange(e.target.value)}
            size="small"
            fullWidth
            inputProps={{ maxLength: 12, style: { textTransform: "uppercase" } }}
          />
          {!editingCode && editCode ? (
            <Tooltip title={codeFromUrl ? "Claim code verified from link" : "Claim code saved"}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <CheckCircleIcon sx={{ color: "success.main", fontSize: 28 }} />
                <IconButton size="small" onClick={() => { setEditingCode(true); setCodeInput(editCode); }}>
                  <EditIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Box>
            </Tooltip>
          ) : (
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", minWidth: 0, flexShrink: 1 }}>
              <TextField
                label="Claim code"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                size="small"
                placeholder="0x..."
                sx={{ width: 140, "& input": { fontFamily: "monospace", fontSize: 12 } }}
              />
              <IconButton size="small" color="primary" onClick={handleSaveCode} disabled={!codeInput.trim()}>
                <SaveIcon />
              </IconButton>
            </Box>
          )}
        </Box>
      </Paper>

      {loading && memberID && programId > 0 && (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {!loading && memberID && programId > 0 && (!member || !member.active) && (
        <Alert severity="warning" sx={{ borderRadius: 2 }}>
          Member &quot;{memberID}&quot; not found in program {programId}.
        </Alert>
      )}

      {member?.active && balance && (
        <>
          <BalanceHero
            available={balance[0] as bigint}
            unlocking={balance[2] as bigint}
            locked={balance[1] as bigint}
            title={`Balance — ${memberID}`}
            subtitle={`Program ${programId}${parentMemberID ? ` · Parent ${parentMemberID}` : ""}`}
          />

          {!isConnected && (
            <Paper sx={{ p: 2, textAlign: "center" }}>
              <Typography sx={{ color: "text.secondary", mb: 1.5, fontSize: 14 }}>
                Connect your wallet to redeem tokens
              </Typography>
              <ConnectButton />
            </Paper>
          )}

          {isConnected && (
            <Paper sx={{ p: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
              <TextField
                label="Amount (FULA)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                size="small"
                type="number"
                inputProps={{ min: 0, step: "any" }}
              />
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleRedeem}
                disabled={!canTransfer}
                sx={{ py: 1.25, fontWeight: 700 }}
              >
                {isPending || isConfirming ? (
                  <CircularProgress size={24} color="inherit" />
                ) : parentMemberID ? (
                  `Redeem to ${parentMemberID}`
                ) : (
                  "Redeem to parent"
                )}
              </Button>
            </Paper>
          )}

          {isSuccess && (
            <Alert severity="success" sx={{ borderRadius: 2 }}>
              Transferred {transferredAmount} FULA from {memberID} to {parentMemberID || "parent"}.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {formatContractError(error)}
            </Alert>
          )}
        </>
      )}
    </Stack>
  );
}
