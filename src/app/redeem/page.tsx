"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Typography, Box, Paper, TextField, Button, Alert,
  CircularProgress, IconButton, Tooltip,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EditIcon from "@mui/icons-material/Edit";
import SaveIcon from "@mui/icons-material/Save";
import { useAccount, useReadContract } from "wagmi";
import { useSearchParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { zeroAddress, encodePacked, keccak256, getAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { toBytes12, fromBytes12, formatFula, formatContractError, safeParseAmount } from "@/lib/utils";
import { useActForMember } from "@/hooks/useRewardsProgram";

function virtualAddr(memberID: string, programId: number): `0x${string}` {
  const memberIDBytes = toBytes12(memberID);
  const hash = keccak256(encodePacked(["bytes12", "uint32"], [memberIDBytes, programId]));
  return getAddress("0x" + hash.slice(-40)) as `0x${string}`;
}

function RedeemContent() {
  const searchParams = useSearchParams();
  const memberParam = (searchParams.get("member") || "").toUpperCase();
  const claimParam = searchParams.get("claim") || "";
  const codeParam = searchParams.get("code") || "";

  const { isConnected } = useAccount();
  const programId = parseInt(claimParam) || 0;

  // Member code state
  const [memberID, setMemberID] = useState(memberParam);
  const [codeFromUrl, setCodeFromUrl] = useState(!!codeParam);
  const [editCode, setEditCode] = useState(codeParam);
  const [editingCode, setEditingCode] = useState(!codeParam);
  const [codeInput, setCodeInput] = useState("");

  // Transfer state
  const [amount, setAmount] = useState("");
  const { actForMember, isPending, isConfirming, isSuccess, error, hash } = useActForMember();
  const [transferredAmount, setTransferredAmount] = useState("");

  // When member ID changes manually, invalidate the code
  const handleMemberChange = (val: string) => {
    const upper = val.toUpperCase();
    setMemberID(upper);
    if (upper !== memberParam) {
      setCodeFromUrl(false);
      setEditCode("");
      setEditingCode(true);
      setCodeInput("");
    } else if (codeParam) {
      setCodeFromUrl(true);
      setEditCode(codeParam);
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

  // Read member info
  const memberIDBytes = toBytes12(memberID);
  const { data: member, isLoading: memberLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: [memberIDBytes, programId],
    query: { enabled: !!memberID && programId > 0 },
  });

  // Compute balance key (virtual address for walletless)
  const balanceKey: `0x${string}` | undefined = member?.active
    ? (member.wallet && member.wallet !== zeroAddress
        ? member.wallet as `0x${string}`
        : virtualAddr(memberID, programId))
    : undefined;

  // Read balance
  const { data: balance, isLoading: balanceLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: balanceKey ? [programId, balanceKey] : undefined,
    query: { enabled: !!balanceKey },
  });

  // Read parent info to get parent's memberID
  const parentAddr = member?.active ? member.parent as `0x${string}` : undefined;
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

  const totalBalance = balance
    ? (balance[0] as bigint) + (balance[1] as bigint) + (balance[2] as bigint)
    : BigInt(0);

  const handleRedeem = () => {
    if (!memberID || !programId || !amount) return;
    setTransferredAmount(amount);
    actForMember(programId, memberID, 3, zeroAddress, amount, "Redeemed via portal");
  };

  // Reset success state on new transfer
  useEffect(() => {
    if (isSuccess) {
      setAmount("");
    }
  }, [isSuccess]);

  const loading = memberLoading || balanceLoading;
  const parsedAmount = safeParseAmount(amount);
  const canTransfer = isConnected && memberID && programId > 0 && parsedAmount && parsedAmount > BigInt(0) && !isPending && !isConfirming && member?.active;

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", px: 2, py: 3 }}>
      <Typography variant="h4" sx={{ textAlign: "center", mb: 3, fontWeight: 700 }}>
        Redeem Rewards
      </Typography>

      {/* Member code row */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <TextField
            label="Member Code"
            value={memberID}
            onChange={(e) => handleMemberChange(e.target.value)}
            size="small"
            sx={{ flexGrow: 1 }}
            inputProps={{ maxLength: 12, style: { textTransform: "uppercase" } }}
          />
          {!editingCode && editCode ? (
            <Tooltip title="Edit code verified from link">
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
                label="Edit Code"
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

      {/* Loading */}
      {loading && memberID && programId > 0 && (
        <Box sx={{ textAlign: "center", py: 3 }}>
          <CircularProgress size={32} />
        </Box>
      )}

      {/* Member not found */}
      {!loading && memberID && programId > 0 && (!member || !member.active) && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Member &quot;{memberID}&quot; not found in program {programId}.
        </Alert>
      )}

      {/* Balance display */}
      {member?.active && balance && (
        <>
          <Paper sx={{ p: 3, mb: 2, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
              Total Balance
            </Typography>
            <Typography variant="h3" sx={{ color: "success.main", fontWeight: 700, lineHeight: 1.2 }}>
              {formatFula(totalBalance)}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
              FULA
            </Typography>
            <Box sx={{ display: "flex", justifyContent: "center", gap: 2, mt: 1.5 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Available</Typography>
                <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
                  {formatFula(balance[0] as bigint)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Locked</Typography>
                <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
                  {formatFula(balance[1] as bigint)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Time-Locked</Typography>
                <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 600 }}>
                  {formatFula(balance[2] as bigint)}
                </Typography>
              </Box>
            </Box>
          </Paper>

          {/* Wallet connection */}
          {!isConnected && (
            <Paper sx={{ p: 2, mb: 2, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Connect your wallet to redeem tokens
              </Typography>
              <ConnectButton />
            </Paper>
          )}

          {/* Transfer section */}
          {isConnected && (
            <Paper sx={{ p: 2, mb: 2 }}>
              <TextField
                label="Amount (FULA)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                fullWidth
                size="small"
                type="number"
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: "any" }}
              />
              <Button
                variant="contained"
                fullWidth
                size="large"
                onClick={handleRedeem}
                disabled={!canTransfer}
                sx={{ py: 1.5, fontWeight: 700, fontSize: "1rem" }}
              >
                {isPending || isConfirming ? (
                  <CircularProgress size={24} color="inherit" />
                ) : parentMemberID ? (
                  `Redeem to ${parentMemberID}`
                ) : (
                  "Redeem to Parent"
                )}
              </Button>
            </Paper>
          )}

          {/* Success */}
          {isSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Transferred {transferredAmount} FULA from {memberID} to {parentMemberID || "parent"}.
            </Alert>
          )}

          {/* Error */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formatContractError(error)}
            </Alert>
          )}
        </>
      )}

      {/* No program ID */}
      {!programId && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No program specified. This page should be opened by scanning a member QR code.
        </Alert>
      )}
    </Box>
  );
}

export default function RedeemPage() {
  return (
    <Suspense fallback={<Box sx={{ textAlign: "center", py: 4 }}><CircularProgress /></Box>}>
      <RedeemContent />
    </Suspense>
  );
}
