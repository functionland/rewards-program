"use client";

import { Box, Typography } from "@mui/material";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import PersonAddAltIcon from "@mui/icons-material/PersonAddAlt";
import SavingsOutlinedIcon from "@mui/icons-material/SavingsOutlined";
import SwapVertOutlinedIcon from "@mui/icons-material/SwapVertOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import type { ComponentType, ReactNode } from "react";
import { formatFula, shortenAddress } from "@/lib/utils";
import type { EventRow } from "@/hooks/useChunkedEventLogs";

type IconComp = ComponentType<{ sx?: object; fontSize?: "small" | "medium" | "large" }>;

function relativeTime(ts: number): string {
  if (!ts) return "";
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(ts * 1000).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

type ActivityView = {
  icon: IconComp;
  tone: "success" | "warning" | "info" | "neutral";
  title: string;
  subtitle?: string;
  amountLabel?: string;
  amountTone?: "positive" | "negative" | "neutral";
};

function describeEvent(
  event: EventRow,
  perspective?: string,
): ActivityView {
  const amount = event.amount > BigInt(0) ? formatFula(event.amount) : null;
  const isIncoming =
    perspective != null &&
    ((event.toWallet &&
      event.toWallet.toLowerCase() === perspective.toLowerCase()) ||
      (event.wallet &&
        event.wallet.toLowerCase() !== perspective.toLowerCase() &&
        event.toWallet == null &&
        (event.type === "Deposit" || event.type === "TimeLockResolved")));

  switch (event.type) {
    case "Deposit":
      return {
        icon: SavingsOutlinedIcon,
        tone: "info",
        title: "Points added",
        subtitle: event.note || undefined,
        amountLabel: amount ? `+${amount}` : undefined,
        amountTone: "positive",
      };
    case "Transfer":
      return {
        icon: isIncoming ? ArrowDownwardIcon : ArrowUpwardIcon,
        tone: isIncoming ? "success" : "neutral",
        title: isIncoming ? "Points received" : "Points sent",
        subtitle:
          event.note ||
          (event.toWallet
            ? isIncoming
              ? `from ${shortenAddress(event.wallet)}`
              : `to ${shortenAddress(event.toWallet)}`
            : undefined),
        amountLabel: amount
          ? isIncoming
            ? `+${amount}`
            : `-${amount}`
          : undefined,
        amountTone: isIncoming ? "positive" : "negative",
      };
    case "TransferToParent":
      return {
        icon: ArrowUpwardIcon,
        tone: "neutral",
        title: isIncoming ? "Received from team" : "Sent up",
        subtitle:
          event.note ||
          (event.toWallet
            ? isIncoming
              ? `from ${shortenAddress(event.wallet)}`
              : `to ${shortenAddress(event.toWallet)}`
            : undefined),
        amountLabel: amount
          ? isIncoming
            ? `+${amount}`
            : `-${amount}`
          : undefined,
        amountTone: isIncoming ? "positive" : "negative",
      };
    case "Withdrawal":
      return {
        icon: ArrowUpwardIcon,
        tone: "warning",
        title: "Withdrawn",
        amountLabel: amount ? `-${amount}` : undefined,
        amountTone: "negative",
      };
    case "TimeLockResolved":
      return {
        icon: LockOpenOutlinedIcon,
        tone: "success",
        title: "Unlocked",
        amountLabel: amount ? `+${amount}` : undefined,
        amountTone: "positive",
      };
    case "MemberAdded":
    case "PAAssigned":
      return {
        icon: PersonAddAltIcon,
        tone: "info",
        title: event.type === "PAAssigned" ? "Program admin assigned" : "Member added",
        subtitle: event.memberCode ? `Code: ${event.memberCode}` : undefined,
      };
    case "MemberClaimed":
      return {
        icon: LockOpenOutlinedIcon,
        tone: "success",
        title: "Member claimed wallet",
        subtitle: event.detail,
      };
    case "WalletChanged":
      return {
        icon: SwapVertOutlinedIcon,
        tone: "info",
        title: "Wallet changed",
        subtitle: event.detail,
      };
    case "MemberIDUpdated":
      return {
        icon: SwapVertOutlinedIcon,
        tone: "info",
        title: "Member code changed",
        subtitle: event.detail,
      };
    case "TypeChanged":
      return {
        icon: CategoryOutlinedIcon,
        tone: "info",
        title: "Tier changed",
        subtitle: event.detail,
      };
    case "MemberRemoved":
      return {
        icon: LockOutlinedIcon,
        tone: "warning",
        title: "Member removed",
        subtitle: event.detail,
      };
    default:
      return {
        icon: CategoryOutlinedIcon,
        tone: "neutral",
        title: event.type,
        subtitle: event.detail,
      };
  }
}

const TONE_COLOR: Record<ActivityView["tone"], string> = {
  success: "success.main",
  warning: "warning.main",
  info: "accent.main",
  neutral: "text.secondary",
};

export function ActivityRow({
  event,
  perspective,
  showProgram = false,
  right,
}: {
  event: EventRow;
  perspective?: string;
  showProgram?: boolean;
  right?: ReactNode;
}) {
  const view = describeEvent(event, perspective);
  const Icon = view.icon;
  const toneColor = TONE_COLOR[view.tone];

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 1.25,
        px: { xs: 1.25, sm: 1.5 },
        borderBottom: "1px solid",
        borderColor: "border.default",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box
        sx={{
          width: 36,
          height: 36,
          flexShrink: 0,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: `color-mix(in oklch, var(--mui-palette-${
            view.tone === "neutral" ? "text-secondary" : "accent-main"
          }) 12%, transparent)`,
          color: toneColor,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0, flexGrow: 1 }}>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: 14,
            lineHeight: 1.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {view.title}
          {showProgram && event.programId > 0 && (
            <Box
              component="span"
              sx={{
                ml: 0.75,
                color: "text.tertiary",
                fontWeight: 500,
                fontSize: 12,
              }}
            >
              · Program {event.programId}
            </Box>
          )}
        </Typography>
        {view.subtitle && (
          <Typography
            sx={{
              color: "text.tertiary",
              fontSize: 12.5,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              mt: 0.1,
            }}
          >
            {view.subtitle}
          </Typography>
        )}
      </Box>
      <Box sx={{ textAlign: "right", flexShrink: 0 }}>
        {view.amountLabel && (
          <Typography
            sx={{
              fontWeight: 600,
              fontVariantNumeric: "tabular-nums",
              fontSize: 14,
              color:
                view.amountTone === "positive"
                  ? "success.main"
                  : view.amountTone === "negative"
                  ? "error.main"
                  : "text.primary",
            }}
          >
            {view.amountLabel}
          </Typography>
        )}
        <Typography
          variant="micro"
          sx={{ color: "text.tertiary", display: "block", mt: 0.25 }}
        >
          {relativeTime(event.timestamp)}
        </Typography>
        {right}
      </Box>
    </Box>
  );
}
