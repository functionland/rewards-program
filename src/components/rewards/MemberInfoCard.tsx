"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import { useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import {
  CONTRACTS,
  REWARDS_PROGRAM_ABI,
  MemberRoleEnum,
} from "@/config/contracts";
import { formatFula, toBytes12 } from "@/lib/utils";
import { virtualAddr } from "@/lib/memberKey";
import { RoleChip } from "./RoleChip";
import { MemberTypeChip } from "./MemberTypeChip";
import { ProgramBadgeChip } from "./ProgramBadgeChip";

export function MemberInfoCard({
  memberID,
  programId,
  compact = false,
  showBalance = true,
}: {
  memberID: string;
  programId: number;
  compact?: boolean;
  showBalance?: boolean;
}) {
  const memberIDBytes = toBytes12(memberID);
  const { data: member, isLoading: memberLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: [memberIDBytes, programId],
    query: { enabled: !!memberID && programId > 0 },
  });

  const balanceKey = member
    ? member.wallet !== zeroAddress
      ? member.wallet
      : virtualAddr(memberID, programId)
    : null;

  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: balanceKey ? [programId, balanceKey] : undefined,
    query: { enabled: !!balanceKey && showBalance },
  });

  const available = balance ? balance[0] : BigInt(0);
  const role = member ? Number(member.role) : MemberRoleEnum.None;
  const memberType = member ? Number(member.memberType) : 0;
  const active = member?.active ?? false;

  return (
    <Paper sx={{ p: compact ? 1.5 : 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
        <ProgramBadgeChip code={memberID.slice(0, 2) || "??"} size={compact ? 36 : 44} />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          <Typography
            sx={{
              fontFamily: "var(--font-mono, 'JetBrains Mono'), monospace",
              fontWeight: 600,
              fontSize: compact ? 14 : 16,
              letterSpacing: "0.02em",
              lineHeight: 1.1,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {memberID || "—"}
          </Typography>
          <Typography
            variant="micro"
            sx={{ color: "text.tertiary", display: "block", mt: 0.25 }}
          >
            Program {programId}
            {!active && member && " · Inactive"}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
        {memberLoading ? (
          <>
            <Skeleton variant="rounded" width={72} height={22} />
            <Skeleton variant="rounded" width={56} height={22} />
          </>
        ) : member ? (
          <>
            <RoleChip role={role} size="small" />
            <MemberTypeChip type={memberType} size="small" />
          </>
        ) : (
          <Typography variant="caption" sx={{ color: "text.tertiary" }}>
            Member not found
          </Typography>
        )}
      </Box>

      {showBalance && (
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: 0.75,
            pt: 0.5,
            borderTop: "1px solid",
            borderColor: "border.default",
          }}
        >
          <Typography variant="micro" sx={{ color: "text.tertiary" }}>
            Available
          </Typography>
          <Typography
            sx={{
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              fontSize: compact ? 14 : 16,
            }}
          >
            {formatFula(available)}
          </Typography>
          <Typography sx={{ fontSize: 12, color: "text.tertiary" }}>FULA</Typography>
        </Box>
      )}
    </Paper>
  );
}
