"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import {
  Alert, Box, Button, Divider, InputAdornment, Paper,
  Skeleton, Stack, Tab, Tabs, TextField, Typography,
} from "@mui/material";
import BoltIcon from "@mui/icons-material/Bolt";
import SendIcon from "@mui/icons-material/Send";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useUserRole } from "@/hooks/useUserRole";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import { useProgramCount, useProgram, useTokenBalance } from "@/hooks/useRewardsProgram";
import { formatFula, fromBytes8 } from "@/lib/utils";
import { KPIRow } from "@/components/rewards/KPIRow";
import { KPI } from "@/components/rewards/KPI";
import { StatBar, type StatBarColumn } from "@/components/rewards/StatBar";
import { ActivityFeed } from "@/components/rewards/ActivityFeed";
import { ProgramBadgeChip } from "@/components/rewards/ProgramBadgeChip";
import { BalanceHero } from "@/components/rewards/BalanceHero";

function GuestSplitScreen() {
  const [tab, setTab] = useState(0);
  const [memberCode, setMemberCode] = useState("");
  const [program, setProgram] = useState("");
  const [claimCode, setClaimCode] = useState("");

  const href = useMemo(() => {
    if (!memberCode.trim()) return "/balance";
    const params = new URLSearchParams({ member: memberCode.trim().toUpperCase() });
    if (program.trim()) params.set("claim", program.trim());
    if (claimCode.trim()) {
      const raw = claimCode.trim();
      params.set("code", raw.startsWith("0x") ? raw : `0x${raw}`);
    }
    return `/balance?${params.toString()}`;
  }, [memberCode, program, claimCode]);

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1.1fr 1fr" },
        gap: { xs: 2, md: 3 },
        alignItems: "stretch",
      }}
    >
      <Paper
        variant="hero"
        sx={{
          p: { xs: 3, md: 4 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: 2,
          minHeight: { xs: 240, md: 460 },
        }}
      >
        <Stack spacing={1}>
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            FULA Rewards Portal
          </Typography>
          <Typography
            sx={{
              fontSize: { xs: 28, md: 38 },
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            Rewards,{" "}
            <Typography
              component="span"
              variant="serif"
              sx={{ fontSize: "inherit", color: "accent.main" }}
            >
              your way.
            </Typography>
          </Typography>
          <Typography sx={{ color: "text.secondary", maxWidth: 440, mt: 1 }}>
            A small, fast portal for sending points, redeeming balances, and
            running reward programs on-chain — built for phones and counters.
          </Typography>
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
          <FeatureCell
            icon={<BoltIcon sx={{ fontSize: 18 }} />}
            title="Instant redeem"
            body="Members show a QR, clerks scan — balance moves in seconds."
          />
          <FeatureCell
            icon={<SendIcon sx={{ fontSize: 18 }} />}
            title="Send to sub-members"
            body="Distribute to crews, teams, and loyalty groups."
          />
          <FeatureCell
            icon={<HandshakeOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Walletless by default"
            body="Members don’t need a wallet — a code and a claim are enough."
          />
          <FeatureCell
            icon={<DescriptionOutlinedIcon sx={{ fontSize: 18 }} />}
            title="Verified on-chain"
            body="Every balance and transfer is public and auditable."
          />
        </Box>
      </Paper>

      <Paper sx={{ p: { xs: 2.5, md: 3 }, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography variant="h2">Sign in</Typography>
        <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
          Check a balance with a member code, or connect a wallet to manage
          programs.
        </Typography>

        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36, textTransform: "none" } }}
        >
          <Tab label="Member code" />
          <Tab label="Wallet" />
        </Tabs>

        {tab === 0 && (
          <Stack spacing={1.5}>
            <TextField
              label="Member code"
              placeholder="e.g. ALICE01"
              value={memberCode}
              onChange={(e) => setMemberCode(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="mono" sx={{ color: "text.tertiary", fontSize: 13 }}>
                      #
                    </Typography>
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              label="Program ID"
              placeholder="e.g. 1"
              value={program}
              onChange={(e) => setProgram(e.target.value.replace(/[^0-9]/g, ""))}
              helperText="Required to show your balance."
            />
            <TextField
              label="Claim code (optional)"
              placeholder="0x…"
              value={claimCode}
              onChange={(e) => setClaimCode(e.target.value)}
              helperText="Unlocks your redeem QR so a clerk can cash you out."
              InputProps={{
                sx: { fontFamily: "var(--font-mono)", fontSize: 13 },
              }}
            />
            <Button
              component={Link}
              href={href}
              variant="contained"
              color="primary"
              disabled={!memberCode.trim()}
            >
              Open my rewards
            </Button>
            <Typography variant="micro" sx={{ color: "text.tertiary" }}>
              No account required. Public data only.
            </Typography>
          </Stack>
        )}

        {tab === 1 && (
          <Stack spacing={1.5}>
            <Typography sx={{ color: "text.secondary", fontSize: 14 }}>
              Connect a wallet to see memberships, receive points, or manage
              programs you administer.
            </Typography>
            <Box>
              <ConnectButton />
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Typography variant="micro" sx={{ color: "text.tertiary" }}>
              Tip: you can always use the member-code tab without connecting.
            </Typography>
          </Stack>
        )}
      </Paper>
    </Box>
  );
}

function FeatureCell({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        p: 1.25,
        borderRadius: 2,
        bgcolor: "surface.two",
        border: "1px solid",
        borderColor: "border.default",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, color: "accent.main" }}>
        {icon}
        <Typography sx={{ fontWeight: 600, fontSize: 13 }}>{title}</Typography>
      </Box>
      <Typography sx={{ color: "text.tertiary", fontSize: 12.5, lineHeight: 1.4 }}>
        {body}
      </Typography>
    </Box>
  );
}

function AdminOverview() {
  const { address } = useAccount();
  const { data: programCount } = useProgramCount();
  const { data: walletBalance } = useTokenBalance(address);
  const count = Number(programCount || 0);

  const programIds = useMemo(() => Array.from({ length: count }, (_, i) => i + 1), [count]);

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Box>
        <Typography variant="serif" sx={{ fontSize: { xs: 22, sm: 28 }, display: "block", lineHeight: 1.15 }}>
          Overview,
        </Typography>
        <Typography sx={{ fontWeight: 700, fontSize: { xs: 22, sm: 28 }, letterSpacing: "-0.01em" }}>
          programs at a glance.
        </Typography>
      </Box>

      <KPIRow>
        <KPI label="Total programs" value={count.toString()} />
        <KPI
          label="Wallet FULA"
          value={walletBalance ? formatFula(walletBalance) : "—"}
          unit="FULA"
        />
        <KPI label="Active programs" value="—" />
        <KPI label="Your role" value="Admin" />
      </KPIRow>

      <Paper sx={{ p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box>
            <Typography variant="micro" sx={{ color: "text.tertiary" }}>
              Programs
            </Typography>
            <Typography sx={{ fontWeight: 600 }}>All registered programs</Typography>
          </Box>
          <Button variant="outlined" size="small" component={Link} href="/programs">
            Manage
          </Button>
        </Box>
        {count === 0 ? (
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            No programs yet. Create one from the Programs page.
          </Alert>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(3, 1fr)" },
              gap: 1.25,
            }}
          >
            {programIds.map((id) => (
              <AdminProgramCard key={id} programId={id} />
            ))}
          </Box>
        )}
      </Paper>

      <AdminStatBarContainer programIds={programIds} />

      <ActivityFeed
        max={8}
        timeRange="30d"
        showProgram
        emptyTitle="No recent events"
        emptyMessage="Program-wide events will show up here."
      />
    </Stack>
  );
}

function AdminProgramCard({ programId }: { programId: number }) {
  const { data: program } = useProgram(programId);
  if (!program) {
    return (
      <Paper sx={{ p: 1.5, display: "flex", gap: 1, alignItems: "center" }}>
        <Skeleton variant="rectangular" width={32} height={32} sx={{ borderRadius: 1 }} />
        <Box sx={{ flex: 1 }}>
          <Skeleton width="60%" />
          <Skeleton width="40%" />
        </Box>
      </Paper>
    );
  }
  const code = fromBytes8(program.code as `0x${string}`);
  return (
    <Paper
      component={Link}
      href={`/programs?id=${program.id}`}
      sx={{
        p: 1.5,
        display: "flex",
        gap: 1.25,
        alignItems: "center",
        textDecoration: "none",
        color: "inherit",
        transition: "transform .15s ease, border-color .15s ease",
        "&:hover": { transform: "translateY(-1px)", borderColor: "accent.main" },
      }}
    >
      <ProgramBadgeChip code={code} size={36} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14, lineHeight: 1.25 }}>
          {program.name || `Program ${program.id}`}
        </Typography>
        <Typography
          variant="mono"
          sx={{ color: "text.tertiary", fontSize: 11, display: "block" }}
        >
          {code} · #{program.id}
        </Typography>
      </Box>
      <Typography
        variant="micro"
        sx={{
          color: program.active ? "success.main" : "text.tertiary",
          fontSize: 10,
        }}
      >
        {program.active ? "Active" : "Inactive"}
      </Typography>
    </Paper>
  );
}

function AdminStatBarContainer({ programIds }: { programIds: number[] }) {
  if (programIds.length === 0) return null;
  return (
    <AdminStatBarInner programIds={programIds.slice(0, 12)} />
  );
}

function AdminStatBarInner({ programIds }: { programIds: number[] }) {
  const columns: StatBarColumn[] = programIds.map((id) => ({
    label: `#${id}`,
    available: 0,
    unlocking: 0,
    locked: 0,
  }));
  return (
    <StatBar
      columns={columns}
      title="Distribution pulse"
      subtitle="On-chain totals per program (reads extend as you explore each program page)"
    />
  );
}

function MemberRedirectSkeleton() {
  return (
    <Stack spacing={2}>
      <BalanceHero available={BigInt(0)} unlocking={BigInt(0)} locked={BigInt(0)} loading />
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 1 }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} variant="rectangular" height={92} sx={{ borderRadius: 2 }} />
        ))}
      </Box>
    </Stack>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { isConnected, isAdmin } = useUserRole();
  const { memberships, isLoading: memberLoading } = useHighestMemberRole();

  const isMember = memberships.length > 0;
  const shouldRedirect = isConnected && !isAdmin && isMember;

  useEffect(() => {
    if (shouldRedirect) router.replace("/me");
  }, [shouldRedirect, router]);

  if (!isConnected) return <GuestSplitScreen />;
  if (memberLoading) return <MemberRedirectSkeleton />;
  if (shouldRedirect) return <MemberRedirectSkeleton />;
  if (isAdmin) return <AdminOverview />;

  return (
    <Stack spacing={2}>
      <Alert severity="info" sx={{ borderRadius: 2 }}>
        Connected, but no admin role or program memberships were found. Ask an
        admin to add you, or browse programs below.
      </Alert>
      <Button component={Link} href="/programs" variant="outlined" sx={{ alignSelf: "flex-start" }}>
        Browse programs
      </Button>
    </Stack>
  );
}

export default function Dashboard() {
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
      <DashboardContent />
    </Suspense>
  );
}
