"use client";

import { Box, Paper, Skeleton, Typography } from "@mui/material";
import CorporateFareOutlinedIcon from "@mui/icons-material/CorporateFareOutlined";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { useReadContract } from "wagmi";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleEnum } from "@/config/contracts";
import { fromBytes12, shortenAddress } from "@/lib/utils";
import { RoleChip } from "@/components/rewards/RoleChip";

const MAX_DEPTH = 10;

type MemberTuple = {
  memberID: `0x${string}`;
  role: number | bigint;
  wallet: `0x${string}`;
  parent: `0x${string}`;
  active: boolean;
};

function NodeRow({
  programId,
  member,
  address,
  loading,
  isOrigin,
  isTop,
}: {
  programId: number;
  member?: MemberTuple;
  address: `0x${string}`;
  loading: boolean;
  isOrigin: boolean;
  isTop: boolean;
}) {
  const memberID = member ? fromBytes12(member.memberID) : "";
  const role = member ? Number(member.role) : 0;
  const isTopOfChain = isTop || role === MemberRoleEnum.ProgramAdmin;
  const Icon = isTopOfChain ? CorporateFareOutlinedIcon : PersonOutlineIcon;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        p: 1.25,
        pl: 1.5,
        borderRadius: 2,
        border: "1px solid",
        borderColor: isOrigin ? "accent.main" : "border.default",
        bgcolor: isOrigin ? "surface.one" : "surface.two",
        position: "relative",
      }}
    >
      <Box
        sx={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: isOrigin ? "accent.main" : "text.secondary",
          bgcolor: isOrigin ? "rgba(155, 107, 245, 0.14)" : "surface.one",
          border: "1px solid",
          borderColor: isOrigin ? "accent.main" : "border.default",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ minWidth: 0, flex: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
          {loading ? (
            <Skeleton width={90} height={18} />
          ) : (
            <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
              {memberID || (isTopOfChain ? "Program admin" : "Member")}
            </Typography>
          )}
          {member && <RoleChip role={role} size="small" />}
          {isOrigin && (
            <Typography
              variant="micro"
              sx={{
                color: "accent.main",
                border: "1px solid",
                borderColor: "accent.main",
                borderRadius: 1,
                px: 0.75,
                py: 0.125,
              }}
            >
              You
            </Typography>
          )}
        </Box>
        <Typography
          variant="mono"
          sx={{ color: "text.tertiary", fontSize: 11.5, display: "block", mt: 0.25 }}
        >
          {address === zeroAddress ? "Walletless" : shortenAddress(address)}
          {" · "}Program {programId}
        </Typography>
      </Box>
    </Box>
  );
}

function Connector() {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 0.25,
        py: 0.25,
        color: "text.tertiary",
      }}
    >
      <ArrowUpwardIcon sx={{ fontSize: 14 }} />
      <Box sx={{ width: 1, height: 10, bgcolor: "border.default" }} />
    </Box>
  );
}

function ChainNode({
  programId,
  address,
  depth,
  isOrigin,
}: {
  programId: number;
  address: `0x${string}`;
  depth: number;
  isOrigin: boolean;
}) {
  const enabled = address !== zeroAddress && depth <= MAX_DEPTH;
  const { data: member, isLoading } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: enabled ? [programId, address] : undefined,
    query: { enabled },
  });

  const tuple = member as MemberTuple | undefined;
  const parent = tuple?.parent as `0x${string}` | undefined;
  const hasParent = !!parent && parent !== zeroAddress && depth < MAX_DEPTH;

  return (
    <>
      {hasParent && (
        <>
          <ChainNode
            programId={programId}
            address={parent as `0x${string}`}
            depth={depth + 1}
            isOrigin={false}
          />
          <Connector />
        </>
      )}
      <NodeRow
        programId={programId}
        member={tuple}
        address={address}
        loading={isLoading}
        isOrigin={isOrigin}
        isTop={depth > 0 && !hasParent}
      />
    </>
  );
}

export function MemberChainTree({
  programId,
  originAddress,
  title = "Upline",
  subtitle,
}: {
  programId: number;
  originAddress: `0x${string}`;
  title?: string;
  subtitle?: string;
}) {
  if (!programId || originAddress === zeroAddress) {
    return null;
  }
  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="micro" sx={{ color: "text.tertiary", display: "block" }}>
          {title}
        </Typography>
        <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 16 } }}>
          {subtitle || "Who the points flow through"}
        </Typography>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <ChainNode
          programId={programId}
          address={originAddress}
          depth={0}
          isOrigin
        />
      </Box>
    </Paper>
  );
}
