"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useAccount } from "wagmi";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { BalanceHero } from "@/components/rewards/BalanceHero";
import { ProgramCard } from "@/components/rewards/ProgramCard";
import { ActivityFeed } from "@/components/rewards/ActivityFeed";
import { RibbonNotice } from "@/components/rewards/RibbonNotice";
import { QRFullscreenCard, type QRMode } from "@/components/rewards/QRFullscreenCard";
import { ProgramActionsFooter } from "@/components/rewards/ProgramActionsFooter";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import { useAggregatedMemberBalance } from "@/hooks/useAggregatedMemberBalance";

const CLAIM_CODE_STORE_KEY = (memberID: string, programId: number) =>
  `fula.rewards.claimCode.${programId}.${memberID}`;

function readStoredClaimCode(memberID: string, programId: number): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(CLAIM_CODE_STORE_KEY(memberID, programId));
  } catch {
    return null;
  }
}

function MeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isConnected } = useAccount();
  const { memberships, primaryMembership, isLoading } = useHighestMemberRole();
  const balance = useAggregatedMemberBalance(memberships);

  const showQRParam = searchParams.get("showQR");
  const programParam = searchParams.get("program");
  const codeParam = searchParams.get("code") || undefined;

  const qrMode: QRMode | null = useMemo(() => {
    if (!showQRParam) return null;
    if (showQRParam === "redeem") return "redeem";
    return "receive";
  }, [showQRParam]);

  const activeProgramId = programParam ? Number(programParam) : null;
  const activeMembership =
    (activeProgramId && memberships.find((m) => m.programId === activeProgramId)) ||
    primaryMembership;

  const [claimCodeFromStore, setClaimCodeFromStore] = useState<string | null>(null);
  useEffect(() => {
    if (!activeMembership) return;
    setClaimCodeFromStore(
      readStoredClaimCode(activeMembership.memberID, activeMembership.programId),
    );
  }, [activeMembership]);

  const effectiveClaimCode = codeParam || claimCodeFromStore || undefined;

  const openQRForProgram = (programId: number, mode: QRMode) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("showQR", mode);
    next.set("program", String(programId));
    router.replace(`/me?${next.toString()}`);
  };

  const closeQR = () => {
    const next = new URLSearchParams(searchParams.toString());
    next.delete("showQR");
    const query = next.toString();
    router.replace(query ? `/me?${query}` : "/me");
  };

  const hasUnlockingSoon = balance.unlocking > BigInt(0);

  if (!isConnected) {
    return (
      <Stack spacing={2} sx={{ maxWidth: 520 }}>
        <Paper sx={{ p: 3, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Typography variant="h2">Sign in to see your rewards</Typography>
          <Typography sx={{ color: "text.secondary" }}>
            Connect a wallet, or use your member code at Balance lookup.
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <ConnectButton />
            <Button variant="outlined" component={Link} href="/balance">
              Use member code
            </Button>
          </Box>
        </Paper>
      </Stack>
    );
  }

  if (!isLoading && memberships.length === 0) {
    return (
      <Stack spacing={2}>
        <RibbonNotice tone="info">
          No memberships found for this wallet yet. Ask an admin to add you, or
          browse programs below.
        </RibbonNotice>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)" }, gap: 1.25 }}>
          <Paper sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Join a program</Typography>
            <Typography sx={{ color: "text.tertiary", fontSize: 13, mb: 1.5 }}>
              Browse available programs and look up the one you belong to.
            </Typography>
            <Button variant="contained" color="primary" component={Link} href="/programs">
              Browse programs
            </Button>
          </Paper>
          <Paper sx={{ p: 2 }}>
            <Typography sx={{ fontWeight: 600, mb: 0.75 }}>Look up a balance</Typography>
            <Typography sx={{ color: "text.tertiary", fontSize: 13, mb: 1.5 }}>
              Enter a member code to check a balance without connecting a wallet.
            </Typography>
            <Button variant="outlined" component={Link} href="/balance">
              Balance lookup
            </Button>
          </Paper>
        </Box>
      </Stack>
    );
  }

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      {hasUnlockingSoon && (
        <RibbonNotice tone="warn">
          You have unlocking tokens in one or more programs — check the breakdown below.
        </RibbonNotice>
      )}

      <BalanceHero
        available={balance.available}
        unlocking={balance.unlocking}
        locked={balance.locked}
        loading={isLoading || balance.isLoading}
        subtitle={
          memberships.length > 0
            ? `Across ${memberships.length} ${memberships.length === 1 ? "program" : "programs"}`
            : undefined
        }
      />

      {memberships.length > 0 && (
        <Box>
          <Typography variant="micro" sx={{ color: "text.tertiary", display: "block", mb: 1 }}>
            Your programs
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 1.25,
            }}
          >
            {memberships.map((m) => (
              <ProgramCard
                key={m.programId}
                programId={m.programId}
                href={`/programs?id=${m.programId}`}
                footer={
                  <ProgramActionsFooter
                    programId={m.programId}
                    memberID={m.memberID}
                    role={m.role}
                    onReceive={() => openQRForProgram(m.programId, "receive")}
                    onRedeem={() => openQRForProgram(m.programId, "redeem")}
                  />
                }
              />
            ))}
          </Box>
        </Box>
      )}

      <ActivityFeed
        perspective={primaryMembership?.balanceKey}
        max={5}
        showProgram
        timeRange="30d"
        emptyTitle="No recent activity"
        emptyMessage="Your last 30 days of transfers and deposits will appear here."
      />

      {activeMembership && qrMode && (
        <QRFullscreenCard
          open={!!qrMode}
          onClose={closeQR}
          memberID={activeMembership.memberID}
          programId={activeMembership.programId}
          mode={qrMode}
          claimCode={qrMode === "redeem" ? effectiveClaimCode : undefined}
        />
      )}
    </Stack>
  );
}

export default function MePage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ p: 2 }}>
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            Loading…
          </Typography>
        </Box>
      }
    >
      <MeContent />
    </Suspense>
  );
}
