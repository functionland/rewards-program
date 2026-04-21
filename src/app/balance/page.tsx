"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import {
  Typography, Box, Paper, Grid, Stack, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button, Alert,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, useTheme, Tabs, Tab,
} from "@mui/material";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { useSearchParams } from "next/navigation";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { toBytes12, fromBytes12, fromBytes8, shortenAddress, formatFula, formatContractError, fromBytes16 } from "@/lib/utils";
import { virtualAddr } from "@/lib/memberKey";
import { useProgramCount, useProgram, useTransferToParent, useWithdraw, useDepositTokens, useRewardTypes, useTransferLimit, useClaimMember } from "@/hooks/useRewardsProgram";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRScannerButton } from "@/components/common/QRScannerButton";
import { RoleChip } from "@/components/rewards/RoleChip";
import { MemberTypeChip } from "@/components/rewards/MemberTypeChip";
import { BalanceHero } from "@/components/rewards/BalanceHero";
import { QuickActionCard } from "@/components/rewards/QuickActionCard";
import { QRFullscreenCard, type QRMode } from "@/components/rewards/QRFullscreenCard";
import QrCodeIcon from "@mui/icons-material/QrCode";
import QrCode2Icon from "@mui/icons-material/QrCode2";

/* -- Per-program membership row -- */

function MemberProgramCard({ memberID, programId, isMobile }: { memberID: string; programId: number; isMobile: boolean }) {
  const memberIDBytes = toBytes12(memberID);

  const { data: member } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: [memberIDBytes, programId],
    query: { enabled: !!memberID },
  });

  const { data: program } = useProgram(programId);

  // For walletless members, compute the virtual storage key to query balance
  const balanceKey: `0x${string}` | undefined = member?.active
    ? (member.wallet && member.wallet !== zeroAddress
        ? member.wallet as `0x${string}`
        : virtualAddr(memberID, programId))
    : undefined;

  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: balanceKey ? [programId, balanceKey] : undefined,
    query: { enabled: !!balanceKey },
  });

  if (!member || !member.active) return null;

  const programName = program ? program.name : `Program #${programId}`;
  const programCode = program ? fromBytes8(program.code as `0x${string}`) : "";

  if (isMobile) {
    return (
      <Paper sx={{ p: 2, mb: 1.5 }} variant="outlined">
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
          <Box>
            <Typography variant="subtitle2">{programName}</Typography>
            {programCode && <Typography variant="caption" color="text.secondary">{programCode} (P{programId})</Typography>}
          </Box>
          <Box sx={{ display: "flex", gap: 0.5 }}>
            <RoleChip role={Number(member.role)} />
            <MemberTypeChip type={Number(member.memberType)} />
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 2, mb: 1 }}>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" display="block">Withdrawable</Typography>
            <Typography variant="body2" sx={{ color: "success.main", fontWeight: 600 }}>
              {balance ? formatFula(balance[0]) : "-"}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" display="block">Locked</Typography>
            <Typography variant="body2" sx={{ color: "error.main", fontWeight: 600 }}>
              {balance ? formatFula(balance[1]) : "-"}
            </Typography>
          </Box>
          <Box sx={{ flex: 1, textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary" display="block">Unlocking</Typography>
            <Typography variant="body2" sx={{ color: "warning.main", fontWeight: 600 }}>
              {balance ? formatFula(balance[2]) : "-"}
            </Typography>
          </Box>
        </Box>
        <Typography variant="caption" color="text.secondary">
          Parent: {shortenAddress(member.parent)}
        </Typography>
      </Paper>
    );
  }

  return (
    <TableRow>
      <TableCell>{programName}</TableCell>
      <TableCell>{programCode || "-"}</TableCell>
      <TableCell>
        <RoleChip role={Number(member.role)} />
      </TableCell>
      <TableCell>
        <MemberTypeChip type={Number(member.memberType)} />
      </TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{shortenAddress(member.parent)}</TableCell>
      <TableCell sx={{ color: "success.main" }}>{balance ? formatFula(balance[0]) : "-"}</TableCell>
      <TableCell sx={{ color: "error.main" }}>{balance ? formatFula(balance[1]) : "-"}</TableCell>
      <TableCell sx={{ color: "warning.main" }}>{balance ? formatFula(balance[2]) : "-"}</TableCell>
      <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{member.active ? "Active" : "Inactive"}</TableCell>
    </TableRow>
  );
}

/* -- Claim Member Section -- */

function ClaimMemberSection({ memberID, programCount, initialProgramId, initialEditCode, onClaimed }: {
  memberID: string; programCount: number; initialProgramId?: string; initialEditCode?: string; onClaimed?: (programId: number) => void;
}) {
  const { address, isConnected } = useAccount();
  const { claimMember, isPending, isConfirming, isSuccess, error } = useClaimMember();
  const [editCode, setEditCode] = useState(initialEditCode || "");
  const [claimProgramId, setClaimProgramId] = useState(initialProgramId || "1");
  const [disclaimer, setDisclaimer] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      setEditCode("");
      setDisclaimer(false);
      onClaimed?.(parseInt(claimProgramId) || 1);
    }
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

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

function OwnerActions({ memberWallet, initialProgramId }: { memberWallet: string; initialProgramId?: number }) {
  const { address } = useAccount();
  const isOwner = address?.toLowerCase() === memberWallet.toLowerCase();

  const [actionProgramId, setActionProgramId] = useState(String(initialProgramId || 1));
  const pid = parseInt(actionProgramId) || 0;

  // Transfer to Parent
  const [parentTo, setParentTo] = useState("");
  const [parentAmount, setParentAmount] = useState("");
  const [parentNote, setParentNote] = useState("");
  const { transferBack, isPending: isTransBack, isConfirming: isTransBackConf, isSuccess: transBackSuccess, error: transBackError } = useTransferToParent();
  const { data: transferLimitData } = useTransferLimit(pid);
  const { data: myMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address ? [pid, address] : undefined,
    query: { enabled: !!address && pid > 0 },
  });
  const parentAddr = myMember?.parent && myMember.parent !== zeroAddress ? myMember.parent as string : "";

  // Withdraw
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const { withdraw, isPending: isWithdrawing, isConfirming: isWithConf, isSuccess: withdrawSuccess, error: withdrawError } = useWithdraw();

  // Deposit
  const [depositAmount, setDepositAmount] = useState("");
  const [depositRewardType, setDepositRewardType] = useState(0);
  const [depositNote, setDepositNote] = useState("");
  const { deposit: depositTokens, isApproving, isDepositing, isPending: isDepPending, isSuccess: depositSuccess, error: depositError } = useDepositTokens();
  const { data: rewardTypesData } = useRewardTypes(pid);

  const [disclaimer, setDisclaimer] = useState(false);
  const [actionTab, setActionTab] = useState(0);

  if (!isOwner) return null;

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h6" gutterBottom>Actions</Typography>
      <TextField label="Program ID" value={actionProgramId} onChange={(e) => setActionProgramId(e.target.value)}
        type="number" size="small" sx={{ width: 150, mb: 2 }} />

      <Tabs value={actionTab} onChange={(_, v) => setActionTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tab label="Deposit" />
        <Tab label="Transfer to Parent" />
        <Tab label="Withdraw" />
      </Tabs>

      {/* Deposit */}
      {actionTab === 0 && (
        <Box sx={{ pt: 2, maxWidth: 480 }}>
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
            <Button size="small" variant="contained" onClick={() => depositTokens(pid, depositAmount, depositRewardType, depositNote)}
              disabled={isDepPending || !depositAmount || !disclaimer}>
              {isApproving ? <><CircularProgress size={16} sx={{ mr: 0.5 }} /> Approving...</>
                : isDepositing ? <><CircularProgress size={16} sx={{ mr: 0.5 }} /> Depositing...</>
                : "Deposit"}
            </Button>
          </Box>
          {depositSuccess && <Alert severity="success" sx={{ mt: 1 }}>Deposited!</Alert>}
          {depositError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(depositError)}</Alert>}
        </Box>
      )}

      {/* Transfer to Parent */}
      {actionTab === 1 && (
        <Box sx={{ pt: 2, maxWidth: 480 }}>
          {parentAddr && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Your parent in this program: <strong>{shortenAddress(parentAddr)}</strong>. Leave wallet empty to transfer directly to them.
            </Alert>
          )}
          {transferLimitData != null && Number(transferLimitData) > 0 && (
            <Alert severity="info" sx={{ mb: 1 }}>
              Transfer limit: <strong>{Number(transferLimitData)}%</strong> of total balance (Clients only).
            </Alert>
          )}
          <TextField label="Override Parent Wallet (optional)" value={parentTo} onChange={(e) => setParentTo(e.target.value)}
            fullWidth size="small" placeholder="0x..."
            helperText="Leave empty to transfer to your direct parent" />
          <TextField label="Amount (FULA)" value={parentAmount} onChange={(e) => setParentAmount(e.target.value)}
            fullWidth size="small" type="number" sx={{ mt: 1 }} />
          <TextField label="Note (optional, max 128)" value={parentNote}
            onChange={(e) => setParentNote(e.target.value.slice(0, 128))}
            fullWidth size="small" sx={{ mt: 1 }} inputProps={{ maxLength: 128 }}
            helperText={`${parentNote.length}/128`} />
          <Button size="small" variant="contained" sx={{ mt: 1 }}
            onClick={() => transferBack(pid, (parentTo || zeroAddress) as `0x${string}`, parentAmount, parentNote)}
            disabled={isTransBack || isTransBackConf || !parentAmount || !disclaimer}>
            {isTransBack || isTransBackConf ? <CircularProgress size={16} /> : "Transfer"}
          </Button>
          {transBackSuccess && <Alert severity="success" sx={{ mt: 1 }}>Transferred!</Alert>}
          {transBackError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(transBackError)}</Alert>}
        </Box>
      )}

      {/* Withdraw */}
      {actionTab === 2 && (
        <Box sx={{ pt: 2, maxWidth: 480 }}>
          <TextField label="Amount (FULA)" value={withdrawAmount} onChange={(e) => setWithdrawAmount(e.target.value)}
            fullWidth size="small" type="number" />
          <Button size="small" variant="contained" color="secondary" sx={{ mt: 1 }}
            onClick={() => withdraw(pid, withdrawAmount)}
            disabled={isWithdrawing || isWithConf || !withdrawAmount || !disclaimer}>
            {isWithdrawing || isWithConf ? <CircularProgress size={16} /> : "Withdraw"}
          </Button>
          {withdrawSuccess && <Alert severity="success" sx={{ mt: 1 }}>Withdrawn!</Alert>}
          {withdrawError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(withdrawError)}</Alert>}
        </Box>
      )}

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
  const claimParam = searchParams.get("claim") || "";
  const codeParam = searchParams.get("code") || "";
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

  const { data: multicallResults, refetch: refetchMulticall } = useReadContracts({
    contracts: contracts.length > 0 ? contracts : undefined,
    query: { enabled: !!searchID && count > 0 },
  });

  // Build balance-fetch contracts for every active membership so we can sum
  // the searched member's balance across all their programs and render it in
  // the top BalanceHero. Mirrors what /me does via useAggregatedMemberBalance,
  // but keyed off the walletless multicall shape here.
  const balanceContracts = useMemo(() => {
    if (!multicallResults || !searchID) return [];
    const out: Array<{
      address: typeof CONTRACTS.rewardsProgram;
      abi: typeof REWARDS_PROGRAM_ABI;
      functionName: "getBalance";
      args: readonly [number, `0x${string}`];
    }> = [];
    multicallResults.forEach((result, idx) => {
      if (result.status === "success" && result.result) {
        const member = result.result as { active: boolean; wallet: `0x${string}` };
        if (member.active) {
          const programId = idx + 1;
          const key =
            member.wallet && member.wallet !== zeroAddress
              ? member.wallet
              : virtualAddr(searchID, programId);
          out.push({
            address: CONTRACTS.rewardsProgram,
            abi: REWARDS_PROGRAM_ABI,
            functionName: "getBalance",
            args: [programId, key] as const,
          });
        }
      }
    });
    return out;
  }, [multicallResults, searchID]);

  const { data: balanceResults } = useReadContracts({
    contracts: balanceContracts.length > 0 ? balanceContracts : undefined,
    query: { enabled: balanceContracts.length > 0 },
  });

  const aggregate = useMemo(() => {
    let available = BigInt(0);
    let locked = BigInt(0);
    let timeLocked = BigInt(0);
    if (balanceResults) {
      for (const r of balanceResults) {
        if (r.status === "success" && r.result) {
          const tuple = r.result as readonly [bigint, bigint, bigint];
          available += tuple[0];
          locked += tuple[1];
          timeLocked += tuple[2];
        }
      }
    }
    return { available, locked, timeLocked, programCount: balanceContracts.length };
  }, [balanceResults, balanceContracts.length]);

  // After claim, refetch so OwnerActions appears without manual refresh
  const [claimedProgramId, setClaimedProgramId] = useState<number | null>(null);
  const handleClaimed = useCallback((programId: number) => {
    setClaimedProgramId(programId);
    refetchMulticall();
  }, [refetchMulticall]);

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

  const claimProgramId = claimParam ? parseInt(claimParam) : 0;

  // Persist the claim code so returning visitors can re-open the redeem QR
  // after closing the browser tab.
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      searchID &&
      codeParam &&
      claimProgramId &&
      memberExists
    ) {
      try {
        window.localStorage.setItem(
          `fula.rewards.claimCode.${claimProgramId}.${searchID}`,
          codeParam,
        );
      } catch {
        // localStorage may be unavailable (private mode, quota, etc.)
      }
    }
  }, [searchID, codeParam, claimProgramId, memberExists]);

  // Fullscreen QR state — opened by clicking a tile.
  const [qrMode, setQrMode] = useState<QRMode | null>(null);
  const openQR = (mode: QRMode) => setQrMode(mode);
  const closeQR = () => setQrMode(null);

  // A program ID to anchor the QR tiles against. Prefer the explicit `?claim=`
  // param; otherwise pick the first active membership we discovered.
  const activeProgramId = useMemo(() => {
    if (claimProgramId > 0) return claimProgramId;
    if (!multicallResults) return 0;
    for (let i = 0; i < multicallResults.length; i++) {
      const r = multicallResults[i];
      if (r.status === "success" && r.result) {
        const m = r.result as { active: boolean };
        if (m.active) return i + 1;
      }
    }
    return 0;
  }, [claimProgramId, multicallResults]);

  const hasClaimCode = !!codeParam;

  const heroSubtitle = memberExists
    ? `${searchID} · ${aggregate.programCount} program${aggregate.programCount === 1 ? "" : "s"}`
    : searchID
      ? `${searchID} · not found`
      : "Look up a member to see their balance";

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Box>
        <Typography
          variant="serif"
          sx={{ fontSize: { xs: 22, sm: 28 }, display: "block", lineHeight: 1.15 }}
        >
          My rewards,
        </Typography>
        <Typography
          sx={{ fontWeight: 700, fontSize: { xs: 22, sm: 28 }, letterSpacing: "-0.01em" }}
        >
          in one place.
        </Typography>
      </Box>

      <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "flex-end",
            flexWrap: "wrap",
          }}
        >
          <TextField
            label="Member code"
            value={memberID}
            onChange={(e) => setMemberID(e.target.value.toUpperCase())}
            sx={{ flexGrow: 1, minWidth: 150 }}
            inputProps={{ maxLength: 12 }}
            placeholder="Enter your member code…"
            size="small"
          />
          <QRScannerButton tooltip="Scan member QR to search" onScan={handleQRScan} />
          <Button variant="contained" onClick={handleSearch} disabled={!memberID}>
            Look up
          </Button>
        </Box>
      </Paper>

      <BalanceHero
        available={aggregate.available}
        unlocking={aggregate.timeLocked}
        locked={aggregate.locked}
        title="Member balance"
        subtitle={heroSubtitle}
      />

      {memberExists && activeProgramId > 0 && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)" },
            gap: 1.25,
          }}
        >
          <QuickActionCard
            action={{
              key: "receive",
              icon: <QrCodeIcon sx={{ fontSize: 20 }} />,
              title: "Show receive QR",
              subtitle: "Let someone send points to you",
              onClick: () => openQR("receive"),
              accent: true,
            }}
          />
          <QuickActionCard
            action={{
              key: "redeem-qr",
              icon: <QrCode2Icon sx={{ fontSize: 20 }} />,
              title: "Show redeem QR",
              subtitle: hasClaimCode
                ? "Cash out at a clerk"
                : "Sign in with your claim code first",
              onClick: () => openQR("redeem"),
              disabled: !hasClaimCode,
              disabledReason: "Open this page with ?code=… or sign in with your claim code",
            }}
          />
        </Box>
      )}

      {searchID && count > 0 && (
        <>
          {memberWallet && (
            <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
              <Typography variant="micro" sx={{ color: "text.tertiary", display: "block", mb: 0.25 }}>
                Linked wallet
              </Typography>
              <Typography variant="mono" sx={{ fontSize: 13 }}>
                {isMobile ? shortenAddress(memberWallet) : memberWallet}
              </Typography>
            </Paper>
          )}

          {!memberExists && (
            <Alert severity="warning">No member found with ID &quot;{searchID}&quot; in any program.</Alert>
          )}

          {memberExists && !memberWallet && (
            <>
              <Alert severity="info">Member &quot;{searchID}&quot; exists but has no linked wallet (walletless member).</Alert>
              <ClaimMemberSection
                memberID={searchID}
                programCount={count}
                initialProgramId={claimParam}
                initialEditCode={codeParam}
                onClaimed={handleClaimed}
              />
            </>
          )}

          {memberExists && (
            <>
              <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
                <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 1 }}>
                  <Box>
                    <Typography variant="micro" sx={{ color: "text.tertiary", display: "block" }}>
                      Programs
                    </Typography>
                    <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 16 } }}>
                      Your memberships &amp; balances
                    </Typography>
                  </Box>
                  <Typography variant="micro" sx={{ color: "text.tertiary" }}>
                    Available · Locked · Unlocking
                  </Typography>
                </Box>

                {isMobile && (
                  <Stack spacing={1}>
                    {Array.from({ length: count }, (_, i) => (
                      <MemberProgramCard key={i + 1} memberID={searchID} programId={i + 1} isMobile />
                    ))}
                  </Stack>
                )}

                {!isMobile && (
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Program</TableCell>
                          <TableCell>Code</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Parent</TableCell>
                          <TableCell>Withdrawable</TableCell>
                          <TableCell>Locked</TableCell>
                          <TableCell>Unlocking</TableCell>
                          <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {Array.from({ length: count }, (_, i) => (
                          <MemberProgramCard key={i + 1} memberID={searchID} programId={i + 1} isMobile={false} />
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>

              {memberWallet && <OwnerActions memberWallet={memberWallet} initialProgramId={claimedProgramId ?? undefined} />}
            </>
          )}
        </>
      )}

      {searchID && count === 0 && (
        <Alert severity="info">No programs exist yet.</Alert>
      )}

      {memberExists && activeProgramId > 0 && searchID && qrMode && (
        <QRFullscreenCard
          open={!!qrMode}
          onClose={closeQR}
          memberID={searchID}
          programId={activeProgramId}
          mode={qrMode}
          claimCode={qrMode === "redeem" ? codeParam || undefined : undefined}
        />
      )}
    </Stack>
  );
}

export default function BalancePage() {
  return (
    <Suspense fallback={<Typography>Loading...</Typography>}>
      <BalanceContent />
    </Suspense>
  );
}
