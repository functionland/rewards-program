"use client";

import { Suspense, useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import SwapVertIcon from "@mui/icons-material/SwapVert";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AddCardOutlinedIcon from "@mui/icons-material/AddCardOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter, useSearchParams } from "next/navigation";
import { ActionTaxonomyCard } from "@/components/rewards/ActionTaxonomyCard";
import { RedeemBranch } from "@/components/redeem/RedeemBranch";
import { SendSubBranch } from "@/components/redeem/SendSubBranch";
import { SendUpBranch } from "@/components/redeem/SendUpBranch";
import { DepositBranch } from "@/components/redeem/DepositBranch";
import { WithdrawBranch } from "@/components/redeem/WithdrawBranch";

type ActionKey = "redeem" | "send-sub" | "send-up" | "deposit" | "withdraw";

const ACTIONS: Array<{
  key: ActionKey;
  title: string;
  description: string;
  icon: React.ReactNode;
}> = [
  {
    key: "redeem",
    title: "Redeem",
    description: "Cash out member → parent.",
    icon: <SwapVertIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "send-sub",
    title: "Send to sub-member",
    description: "Distribute points to a team member.",
    icon: <ArrowDownwardIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "send-up",
    title: "Send up",
    description: "Transfer to your parent.",
    icon: <ArrowUpwardIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "deposit",
    title: "Deposit",
    description: "Add FULA to a program.",
    icon: <AddCardOutlinedIcon sx={{ fontSize: 18 }} />,
  },
  {
    key: "withdraw",
    title: "Withdraw",
    description: "Move balance to your wallet.",
    icon: <LogoutIcon sx={{ fontSize: 18 }} />,
  },
];

function normalizeAction(raw: string | null, hasClaim: boolean): ActionKey {
  switch (raw) {
    case "send-sub":
    case "transfer": // legacy alias from /tokens shim
      return "send-sub";
    case "send-up":
      return "send-up";
    case "deposit":
      return "deposit";
    case "withdraw":
      return "withdraw";
    case "redeem":
      return "redeem";
    default:
      // Default: if user arrived with claim/code triple, treat as Redeem
      // (preserves legacy QR link behavior). Otherwise, Redeem is still a
      // safe landing even for admins — the form guides to other actions.
      return hasClaim ? "redeem" : "redeem";
  }
}

function RedeemContent() {
  const router = useRouter();
  const params = useSearchParams();

  const memberParam = (params.get("member") || "").toUpperCase();
  const claimParam = params.get("claim") || params.get("program") || "";
  const codeParam = params.get("code") || "";
  const actionRaw = params.get("action");
  const action = normalizeAction(actionRaw, !!codeParam);

  const setAction = (next: ActionKey) => {
    const current = new URLSearchParams(params.toString());
    current.set("action", next);
    router.replace(`/redeem?${current.toString()}`);
  };

  const body = useMemo(() => {
    switch (action) {
      case "redeem":
        return (
          <RedeemBranch
            initialMemberCode={memberParam}
            initialClaim={claimParam}
            initialCode={codeParam}
          />
        );
      case "send-sub":
        return <SendSubBranch programId={claimParam} memberCode={memberParam} />;
      case "send-up":
        return <SendUpBranch programId={claimParam} />;
      case "deposit":
        return <DepositBranch programId={claimParam} />;
      case "withdraw":
        return <WithdrawBranch programId={claimParam} />;
    }
  }, [action, memberParam, claimParam, codeParam]);

  return (
    <Stack spacing={{ xs: 1.5, sm: 2 }}>
      <Box>
        <Typography
          variant="serif"
          sx={{ fontSize: { xs: 22, sm: 28 }, display: "block", lineHeight: 1.15 }}
        >
          Move tokens,
        </Typography>
        <Typography
          sx={{ fontWeight: 700, fontSize: { xs: 22, sm: 28 }, letterSpacing: "-0.01em" }}
        >
          pick a direction.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
            md: "repeat(5, minmax(0, 1fr))",
          },
          gap: 1,
        }}
      >
        {ACTIONS.map((a) => (
          <ActionTaxonomyCard
            key={a.key}
            icon={a.icon}
            title={a.title}
            description={a.description}
            selected={action === a.key}
            onClick={() => setAction(a.key)}
          />
        ))}
      </Box>

      {body}
    </Stack>
  );
}

export default function RedeemPage() {
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
      <RedeemContent />
    </Suspense>
  );
}
