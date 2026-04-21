"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  Pagination,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import LaunchIcon from "@mui/icons-material/Launch";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import Link from "next/link";
import { useReadContracts } from "wagmi";
import { zeroAddress } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { useChunkedEventLogs } from "@/hooks/useChunkedEventLogs";
import { fromBytes12, shortenAddress, toBytes12 } from "@/lib/utils";
import { RoleChip } from "@/components/rewards/RoleChip";
import { MemberTypeChip } from "@/components/rewards/MemberTypeChip";

const PAGE_SIZE = 20;

type ResolvedMember = {
  memberID: string;
  wallet: `0x${string}`;
  role: number;
  memberType: number;
  parent: `0x${string}`;
  active: boolean;
};

export function ProgramMembersList({
  programId,
  canManage,
}: {
  programId: number;
  canManage: boolean;
}) {
  const [trigger, setTrigger] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setTrigger(1);
  }, [programId]);

  const { events, loading, error, cacheStatus } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    programId,
    timeRange: "all",
    trigger,
  });

  // Collect unique member codes from member-related events for this program.
  const memberCodes = useMemo(() => {
    const seen = new Set<string>();
    for (const e of events) {
      if (e.programId !== programId) continue;
      if (
        (e.type === "MemberAdded" ||
          e.type === "PAAssigned" ||
          e.type === "MemberIDUpdated" ||
          e.type === "MemberClaimed") &&
        e.memberCode
      ) {
        seen.add(e.memberCode);
      }
    }
    return Array.from(seen);
  }, [events, programId]);

  // Resolve current on-chain state for each member code.
  const memberContracts = useMemo(
    () =>
      memberCodes.map((code) => ({
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "getMemberByID" as const,
        args: [toBytes12(code), programId] as const,
      })),
    [memberCodes, programId],
  );

  const { data: memberResults, isLoading: resolvingMembers } = useReadContracts({
    contracts: memberContracts.length > 0 ? memberContracts : undefined,
    query: { enabled: memberContracts.length > 0 },
  });

  const resolved = useMemo<ResolvedMember[]>(() => {
    if (!memberResults) return [];
    const out: ResolvedMember[] = [];
    memberResults.forEach((res, idx) => {
      if (res.status !== "success" || !res.result) return;
      const m = res.result as {
        wallet: `0x${string}`;
        memberID: `0x${string}`;
        role: number;
        memberType: number;
        parent: `0x${string}`;
        active: boolean;
      };
      const role = Number(m.role);
      if (role === 0) return;
      out.push({
        memberID: fromBytes12(m.memberID) || memberCodes[idx],
        wallet: m.wallet,
        role,
        memberType: Number(m.memberType),
        parent: m.parent,
        active: m.active,
      });
    });
    return out.sort((a, b) => {
      if (b.role !== a.role) return b.role - a.role;
      return a.memberID.localeCompare(b.memberID);
    });
  }, [memberResults, memberCodes]);

  const filtered = useMemo(() => {
    if (!search.trim()) return resolved;
    const q = search.trim().toUpperCase();
    return resolved.filter(
      (m) =>
        m.memberID.toUpperCase().includes(q) ||
        m.wallet.toLowerCase().includes(q.toLowerCase()),
    );
  }, [resolved, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const isBusy = loading || resolvingMembers;

  return (
    <Paper sx={{ p: { xs: 1.5, sm: 2 }, mb: 3 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1}
        sx={{ alignItems: { sm: "center" }, justifyContent: "space-between", mb: 1.5 }}
      >
        <Box>
          <Typography variant="micro" sx={{ color: "text.tertiary", display: "block" }}>
            Program members
          </Typography>
          <Typography sx={{ fontWeight: 600, fontSize: { xs: 15, sm: 16 } }}>
            {resolved.length > 0
              ? `${resolved.length} member${resolved.length === 1 ? "" : "s"}`
              : "People in this program"}
          </Typography>
        </Box>
        <TextField
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search ID or address"
          size="small"
          sx={{ minWidth: { xs: "100%", sm: 240 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 18, color: "text.tertiary" }} />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch("")}>
                  <ClearIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Stack>

      {error && (
        <Alert severity="warning" sx={{ mb: 1 }}>
          Couldn&apos;t load all members: {error}
        </Alert>
      )}

      {isBusy && resolved.length === 0 ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 2 }}>
          <CircularProgress size={18} />
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            {cacheStatus === "loading-cache"
              ? "Loading cached members…"
              : cacheStatus === "syncing"
                ? "Scanning recent blocks…"
                : "Loading members…"}
          </Typography>
        </Box>
      ) : resolved.length === 0 ? (
        <Typography variant="body2" sx={{ color: "text.tertiary", py: 1 }}>
          No members yet. Add a program admin or member to populate this list.
        </Typography>
      ) : (
        <>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>
                    Wallet
                  </TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paged.map((m) => {
                  const openHref = `/members?program=${programId}&id=${encodeURIComponent(
                    m.memberID,
                  )}`;
                  const transferHref = `/programs?id=${programId}&action=transfer&member=${encodeURIComponent(
                    m.memberID,
                  )}`;
                  return (
                    <TableRow key={m.memberID} hover>
                      <TableCell>
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.25,
                          }}
                        >
                          <Typography
                            component={Link}
                            href={openHref}
                            sx={{
                              fontFamily: "var(--font-mono, monospace)",
                              fontSize: 13,
                              fontWeight: 600,
                              color: "accent.main",
                              textDecoration: "none",
                              "&:hover": { textDecoration: "underline" },
                            }}
                          >
                            {m.memberID}
                          </Typography>
                          {!m.active && (
                            <Typography
                              variant="micro"
                              sx={{ color: "error.main", display: "block" }}
                            >
                              Inactive
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <RoleChip role={m.role} size="small" />
                      </TableCell>
                      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                        <MemberTypeChip type={m.memberType} size="small" />
                      </TableCell>
                      <TableCell
                        sx={{
                          display: { xs: "none", md: "table-cell" },
                          color: "text.tertiary",
                          fontFamily: "var(--font-mono, monospace)",
                          fontSize: 12,
                        }}
                      >
                        {m.wallet === zeroAddress
                          ? "Walletless"
                          : shortenAddress(m.wallet)}
                      </TableCell>
                      <TableCell align="right">
                        <Box
                          sx={{
                            display: "inline-flex",
                            gap: 0.5,
                            justifyContent: "flex-end",
                          }}
                        >
                          <Tooltip title="Open member details">
                            <IconButton
                              size="small"
                              component={Link}
                              href={openHref}
                            >
                              <LaunchIcon sx={{ fontSize: 16 }} />
                            </IconButton>
                          </Tooltip>
                          {canManage && (
                            <Tooltip title="Transfer tokens to this member">
                              <Button
                                size="small"
                                variant="pill"
                                component={Link}
                                href={transferHref}
                                startIcon={
                                  <SendOutlinedIcon sx={{ fontSize: 14 }} />
                                }
                              >
                                Transfer
                              </Button>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          {pageCount > 1 && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 1.5 }}>
              <Pagination
                count={pageCount}
                page={currentPage}
                onChange={(_, v) => setPage(v)}
                size="small"
                color="primary"
              />
            </Box>
          )}
        </>
      )}
    </Paper>
  );
}
