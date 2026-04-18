"use client";

import { useState, useMemo } from "react";
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Alert, Chip,
  LinearProgress, TablePagination, useMediaQuery, useTheme,
  InputAdornment, ListSubheader, Checkbox, ListItemText,
  Accordion, AccordionSummary, AccordionDetails, Card, CardContent,
  Stack, Tooltip, IconButton, Autocomplete,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FilterListIcon from "@mui/icons-material/FilterList";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import CachedIcon from "@mui/icons-material/Cached";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { parseUnits } from "viem";
import { useReadContract, useReadContracts, useChainId, useChains } from "wagmi";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { useRewardTypes, useProgramCodeToId, useProgram, useProgramLogo, useProgramCount } from "@/hooks/useRewardsProgram";
import { useChunkedEventLogs, type TimeRange } from "@/hooks/useChunkedEventLogs";
import { formatFula, shortenAddress, fromBytes8, fromBytes16, toBytes12, ipfsLogoUrl } from "@/lib/utils";

// Event type → chip color
type ChipColor = "success" | "info" | "warning" | "secondary" | "primary" | "default" | "error";
const EVENT_CHIP_COLOR: Record<string, ChipColor> = {
  Deposit: "success", Transfer: "info", TransferToParent: "info", Withdrawal: "warning", TimeLockResolved: "warning",
  MemberAdded: "secondary", PAAssigned: "secondary", MemberRemoved: "error", MemberClaimed: "secondary",
  WalletChanged: "secondary", MemberIDUpdated: "secondary", TypeChanged: "secondary",
  ProgramCreated: "primary", ProgramUpdated: "primary", ProgramDeactivated: "error", LimitUpdated: "primary",
  RewardTypeAdded: "default", RewardTypeRemoved: "default", SubTypeAdded: "default", SubTypeRemoved: "default",
};

// Friendly labels for the filter dropdown
const EVENT_LABELS: Record<string, string> = {
  Deposit: "Deposit", Transfer: "Transfer to Member", TransferToParent: "Transfer to Parent",
  Withdrawal: "Withdrawal", TimeLockResolved: "Time Lock Resolved",
  MemberAdded: "Member Added", PAAssigned: "PA Assigned", MemberRemoved: "Member Removed",
  MemberClaimed: "Member Claimed", WalletChanged: "Wallet Changed",
  MemberIDUpdated: "Member ID Updated", TypeChanged: "Member Type Changed",
  ProgramCreated: "Program Created", ProgramUpdated: "Program Updated",
  ProgramDeactivated: "Program Deactivated", LimitUpdated: "Transfer Limit Updated",
  RewardTypeAdded: "Reward Type Added", RewardTypeRemoved: "Reward Type Removed",
  SubTypeAdded: "Sub-Type Added", SubTypeRemoved: "Sub-Type Removed",
};

// Grouped event types for multi-select dropdown
const EVENT_GROUPS = [
  { label: "Token Events", types: ["Deposit", "Transfer", "TransferToParent", "Withdrawal", "TimeLockResolved"] },
  { label: "Member Events", types: ["MemberAdded", "PAAssigned", "MemberRemoved", "MemberClaimed", "WalletChanged", "MemberIDUpdated", "TypeChanged"] },
  { label: "Program / Admin", types: ["ProgramCreated", "ProgramUpdated", "ProgramDeactivated", "LimitUpdated", "RewardTypeAdded", "RewardTypeRemoved", "SubTypeAdded", "SubTypeRemoved"] },
];

// Token events have amounts
const TOKEN_EVENTS = new Set(["Deposit", "Transfer", "TransferToParent", "Withdrawal", "TimeLockResolved"]);

export default function ReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterProgramCode, setFilterProgramCode] = useState("");
  const { data: programIdFromCode } = useProgramCodeToId(filterProgramCode);
  const resolvedProgramId = filterProgramId ? Number(filterProgramId) : (programIdFromCode ? Number(programIdFromCode) : 0);

  // Fetch all programs for the filterable dropdown. If the count call or the
  // multicall fails, the UI falls back to a plain Program Code input.
  const { data: programCountData, isError: programCountError } = useProgramCount();
  const programCount = Number(programCountData || 0);
  const programContracts = useMemo(
    () => Array.from({ length: programCount }, (_, i) => ({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "getProgram" as const,
      args: [i + 1] as const,
    })),
    [programCount]
  );
  const { data: programsMulticall, isError: programsMulticallError } = useReadContracts({
    contracts: programContracts.length > 0 ? programContracts : undefined,
    query: { enabled: programContracts.length > 0 },
  });
  const programOptions = useMemo(() => {
    if (!programsMulticall) return [] as { id: number; code: string; name: string }[];
    const opts: { id: number; code: string; name: string }[] = [];
    programsMulticall.forEach((result, idx) => {
      if (result.status !== "success" || !result.result) return;
      const p = result.result as { id: number; code: `0x${string}`; name: string };
      opts.push({
        id: Number(p.id) || idx + 1,
        code: fromBytes8(p.code),
        name: p.name || "",
      });
    });
    return opts;
  }, [programsMulticall]);
  const programDropdownFailed = programCountError || (programCount > 0 && programsMulticallError);
  const programDropdownAvailable = !programDropdownFailed && programOptions.length > 0;
  const selectedProgramOption = programOptions.find(o => o.id === resolvedProgramId) || null;
  const { data: rewardTypesData } = useRewardTypes(resolvedProgramId);
  const { data: selectedProgram } = useProgram(resolvedProgramId);
  const { data: selectedProgramLogoCID } = useProgramLogo(resolvedProgramId);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [trigger, setTrigger] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Client-side filters
  const [filterEventTypes, setFilterEventTypes] = useState<string[]>([]);
  const [filterRewardType, setFilterRewardType] = useState<number | "">("");
  const [filterWallet, setFilterWallet] = useState("");
  const [filterMemberID, setFilterMemberID] = useState("");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");
  const [leaderboardTop, setLeaderboardTop] = useState<number>(0);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  // Resolve member ID -> storage key for filtering
  const filterMemberIDBytes = filterMemberID.length > 0 ? toBytes12(filterMemberID) : undefined;
  const { data: filterMemberKey } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "memberIDLookup",
    args: filterMemberIDBytes && resolvedProgramId ? [filterMemberIDBytes, resolvedProgramId] : undefined,
    query: { enabled: !!filterMemberIDBytes && resolvedProgramId > 0 },
  });
  const resolvedMemberAddr = filterMemberKey && filterMemberKey !== "0x0000000000000000000000000000000000000000" ? (filterMemberKey as string).toLowerCase() : "";

  const {
    events, loading, progress, totalChunks, completedChunks, error, cancel,
    cacheStatus, clearEventCache,
  } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    programId: resolvedProgramId || undefined,
    timeRange,
    trigger,
  });

  // Client-side filter chain
  let filteredEvents = events;
  if (filterEventTypes.length > 0) {
    const typeSet = new Set(filterEventTypes);
    filteredEvents = filteredEvents.filter(e => typeSet.has(e.type));
  }
  if (filterRewardType !== "") {
    filteredEvents = filteredEvents.filter(r => r.rewardType === undefined || r.rewardType === filterRewardType);
  }
  if (filterWallet) {
    const w = filterWallet.toLowerCase();
    filteredEvents = filteredEvents.filter(e =>
      e.wallet.toLowerCase().includes(w) || (e.toWallet?.toLowerCase().includes(w) ?? false)
    );
  }
  if (resolvedMemberAddr) {
    // Match events where the member is either sender (wallet) or recipient (toWallet).
    filteredEvents = filteredEvents.filter(e =>
      e.wallet.toLowerCase() === resolvedMemberAddr ||
      e.toWallet?.toLowerCase() === resolvedMemberAddr
    );
  }
  if (filterAmountMin) {
    try {
      const min = parseUnits(filterAmountMin, 18);
      filteredEvents = filteredEvents.filter(e => e.amount >= min);
    } catch { /* invalid input, skip */ }
  }
  if (filterAmountMax) {
    try {
      const max = parseUnits(filterAmountMax, 18);
      filteredEvents = filteredEvents.filter(e => e.amount <= max);
    } catch { /* invalid input, skip */ }
  }

  // Summary stats
  const totalDeposits = filteredEvents.filter(e => e.type === "Deposit").reduce((s, e) => s + e.amount, BigInt(0));
  const totalTransfers = filteredEvents.filter(e => e.type === "Transfer" || e.type === "TransferToParent").reduce((s, e) => s + e.amount, BigInt(0));
  const totalWithdrawals = filteredEvents.filter(e => e.type === "Withdrawal").reduce((s, e) => s + e.amount, BigInt(0));
  const memberEventCount = filteredEvents.filter(e => ["MemberAdded", "PAAssigned", "MemberRemoved", "MemberClaimed", "WalletChanged", "MemberIDUpdated", "TypeChanged"].includes(e.type)).length;
  const adminEventCount = filteredEvents.filter(e => ["ProgramCreated", "ProgramUpdated", "ProgramDeactivated", "LimitUpdated", "RewardTypeAdded", "RewardTypeRemoved", "SubTypeAdded", "SubTypeRemoved"].includes(e.type)).length;

  const { rewardTypeNames, rewardTypeIds } = useMemo(() => {
    const names: Record<number, string> = {};
    const ids: number[] = [];
    if (rewardTypesData) {
      const data = rewardTypesData as [number[], `0x${string}`[]];
      data[0]?.forEach((id: number, idx: number) => {
        names[id] = fromBytes16(data[1][idx]) || `Type ${id}`;
        ids.push(Number(id));
      });
    }
    return { rewardTypeNames: names, rewardTypeIds: ids };
  }, [rewardTypesData]);

  // Build per-program maps for reward type and sub-type names from RewardTypeAdded /
  // SubTypeAdded events already in memory. This works for events across multiple programs
  // and without a selected program — no extra chain call needed when the defining events
  // are in the time range. RewardTypeRemoved/SubTypeRemoved are not applied so historical
  // events keep their names.
  const { eventRewardTypeNames, eventSubTypeNames } = useMemo(() => {
    const rt: Record<number, Record<number, string>> = {};
    const st: Record<number, Record<number, Record<number, string>>> = {};
    const rtRe = /^#(\d+):\s*(.+)$/;
    const stRe = /^RT#(\d+)\s*→\s*Sub#(\d+):\s*(.+)$/;
    for (const e of events) {
      if (e.type === "RewardTypeAdded" && e.detail) {
        const m = e.detail.match(rtRe);
        if (m) {
          (rt[e.programId] ??= {})[Number(m[1])] = m[2];
        }
      } else if (e.type === "SubTypeAdded" && e.detail) {
        const m = e.detail.match(stRe);
        if (m) {
          const rtId = Number(m[1]);
          const stId = Number(m[2]);
          ((st[e.programId] ??= {})[rtId] ??= {})[stId] = m[3];
        }
      }
    }
    return { eventRewardTypeNames: rt, eventSubTypeNames: st };
  }, [events]);

  // Batch-fetch sub-type names for all reward types in one multicall (single RPC).
  // Skips entirely when no program is selected or no reward types are configured.
  const subTypeContracts = useMemo(
    () => (resolvedProgramId > 0 ? rewardTypeIds.map((rt) => ({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "getSubTypes" as const,
      args: [resolvedProgramId, rt] as const,
    })) : []),
    [resolvedProgramId, rewardTypeIds]
  );
  const { data: subTypesMulticall } = useReadContracts({
    contracts: subTypeContracts.length > 0 ? subTypeContracts : undefined,
    query: { enabled: subTypeContracts.length > 0 },
  });
  const subTypeNames = useMemo(() => {
    const map: Record<number, Record<number, string>> = {};
    if (!subTypesMulticall) return map;
    subTypesMulticall.forEach((result, idx) => {
      const rt = rewardTypeIds[idx];
      if (rt === undefined || result.status !== "success" || !result.result) return;
      const [ids, names] = result.result as [number[], `0x${string}`[]];
      map[rt] = {};
      ids?.forEach((id, i) => {
        map[rt][Number(id)] = fromBytes16(names[i]) || `Sub ${id}`;
      });
    });
    return map;
  }, [subTypesMulticall, rewardTypeIds]);

  // Map wallet → member code from events already in memory (no extra chain calls).
  // Uses MemberAdded / PAAssigned / MemberIDUpdated. Later updates override earlier ones
  // so wallet displays the current code if it was renamed within the time range.
  const walletCodeMap = useMemo(() => {
    const map: Record<string, string> = {};
    // Iterate oldest-first so the most recent rename wins
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (!e.memberCode || !e.wallet) continue;
      if (e.type === "MemberAdded" || e.type === "PAAssigned" || e.type === "MemberIDUpdated") {
        map[e.wallet.toLowerCase()] = e.memberCode;
      }
    }
    return map;
  }, [events]);

  // Leaderboard computation
  const leaderboardData = useMemo(() => {
    if (leaderboardTop === 0 || events.length === 0) return [];

    // Earliest join timestamp per wallet (for the Join Date column)
    const walletJoinTimestamp: Record<string, number> = {};
    for (const e of events) {
      if (e.type === "MemberAdded" || e.type === "PAAssigned") {
        const w = e.wallet.toLowerCase();
        if (!walletJoinTimestamp[w] || (e.timestamp > 0 && e.timestamp < walletJoinTimestamp[w])) {
          walletJoinTimestamp[w] = e.timestamp;
        }
      }
    }

    // Accumulated rewards = deposits to wallet + transfers received by wallet.
    // Without crediting transfer recipients, members who only received tokens (not deposited for
    // themselves) never appear — the most common case in a reward distribution flow.
    const totals: Record<string, bigint> = {};
    const matchesRewardFilter = (e: typeof events[number]) =>
      filterRewardType === "" || e.rewardType === filterRewardType;
    for (const e of events) {
      if (e.type === "Deposit" && matchesRewardFilter(e)) {
        const w = e.wallet.toLowerCase();
        totals[w] = (totals[w] || BigInt(0)) + e.amount;
      } else if (e.type === "Transfer" && e.toWallet && matchesRewardFilter(e)) {
        const w = e.toWallet.toLowerCase();
        totals[w] = (totals[w] || BigInt(0)) + e.amount;
      }
    }

    // Sort descending, take top N
    return Object.entries(totals)
      .sort(([, a], [, b]) => (b > a ? 1 : b < a ? -1 : 0))
      .slice(0, leaderboardTop)
      .map(([wallet, total], idx) => ({
        rank: idx + 1,
        memberCode: walletCodeMap[wallet] || shortenAddress(wallet),
        joinTimestamp: walletJoinTimestamp[wallet] || 0,
        total,
      }));
  }, [events, leaderboardTop, filterRewardType, walletCodeMap]);

  const formatTimestamp = (ts: number): string => {
    if (!ts) return "-";
    return new Date(ts * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  };

  const chainId = useChainId();
  const chains = useChains();
  const explorerUrl = chains.find(c => c.id === chainId)?.blockExplorers?.default?.url || "https://basescan.org";

  const handleGenerate = () => {
    if (loading) {
      cancel();
    } else {
      setPage(0);
      setTrigger(t => t + 1);
    }
  };

  const activeFilterCount = (filterEventTypes.length > 0 ? 1 : 0) + (filterRewardType !== "" ? 1 : 0)
    + (filterWallet ? 1 : 0) + (filterMemberID ? 1 : 0) + (filterAmountMin ? 1 : 0) + (filterAmountMax ? 1 : 0)
    + (leaderboardTop > 0 ? 1 : 0);

  const safePage = page * rowsPerPage >= filteredEvents.length && filteredEvents.length > 0 ? 0 : page;
  const paginatedEvents = filteredEvents.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage
  );

  // Multi-select event type render value
  const renderEventTypeValue = (selected: string[]) => {
    if (selected.length === 0) return "All";
    if (selected.length <= 2) return selected.map(s => EVENT_LABELS[s] || s).join(", ");
    return `${selected.length} types selected`;
  };

  const programLogoUrl = selectedProgramLogoCID ? ipfsLogoUrl(selectedProgramLogoCID as string) : "";

  return (
    <Box sx={{ px: { xs: 1, sm: 0 } }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, mb: 1 }}>
        <Typography variant="h4" sx={{ fontSize: { xs: "1.5rem", sm: "2.125rem" } }}>Reports</Typography>
        {programLogoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={programLogoUrl}
            alt={selectedProgram?.name || `Program ${resolvedProgramId}`}
            title={selectedProgram?.name || `Program ${resolvedProgramId}`}
            style={{ height: 40, maxWidth: 160, width: "auto", objectFit: "contain", borderRadius: 6 }}
          />
        )}
      </Box>

      {/* Fetch Settings */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, mb: 2 }}>
        <Typography variant="h6" gutterBottom sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>Fetch Settings</Typography>
        <Grid container spacing={1.5} alignItems="center">
          <Grid item xs={12} sm={4}>
            {programDropdownAvailable ? (
              <Autocomplete
                size="small"
                options={programOptions}
                getOptionLabel={(o) => `${o.id}: ${o.code}`}
                isOptionEqualToValue={(o, v) => o.id === v.id}
                value={selectedProgramOption}
                onChange={(_, v) => {
                  setFilterProgramId(v ? String(v.id) : "");
                  setFilterProgramCode("");
                }}
                filterOptions={(options, state) => {
                  const q = state.inputValue.trim().toLowerCase();
                  if (!q) return options;
                  return options.filter(o =>
                    String(o.id).includes(q) ||
                    o.code.toLowerCase().includes(q) ||
                    o.name.toLowerCase().includes(q)
                  );
                }}
                renderOption={(props, o) => (
                  <Box component="li" {...props} key={o.id} sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start !important", gap: 0 }}>
                    <Typography variant="body2">{o.id}: {o.code}</Typography>
                    {o.name && <Typography variant="caption" color="text.secondary">{o.name}</Typography>}
                  </Box>
                )}
                renderInput={(params) => <TextField {...params} label="Program" placeholder="All programs" />}
              />
            ) : (
              <TextField label="Program Code" value={filterProgramCode}
                onChange={(e) => { setFilterProgramCode(e.target.value.toUpperCase()); setFilterProgramId(""); }}
                fullWidth size="small" placeholder="e.g. Z8X"
                inputProps={{ maxLength: 8 }}
                helperText={filterProgramCode && !resolvedProgramId ? "Not found" : filterProgramCode && resolvedProgramId ? `ID: ${resolvedProgramId}` : ""} />
            )}
          </Grid>
          <Grid item xs={6} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Time Range</InputLabel>
              <Select value={timeRange} onChange={(e) => setTimeRange(e.target.value as TimeRange)} label="Time Range">
                <MenuItem value="7d">Last 7 days</MenuItem>
                <MenuItem value="30d">Last 30 days</MenuItem>
                <MenuItem value="90d">Last 90 days</MenuItem>
                <MenuItem value="all">All time</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={4}>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                onClick={handleGenerate}
                fullWidth
                color={loading ? "error" : "primary"}
                disabled={!loading && resolvedProgramId === 0}
              >
                {loading ? "Cancel" : "Generate Report"}
              </Button>
              <Tooltip title="Clear cached events (forces full re-scan)">
                <IconButton size="small" onClick={clearEventCache} disabled={loading}>
                  <CachedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Filters — collapsible on mobile */}
      {events.length > 0 && (
        <Accordion expanded={!isMobile || filtersExpanded} onChange={(_, expanded) => setFiltersExpanded(expanded)}
          sx={{ mb: 2, "&:before": { display: "none" } }} elevation={1}>
          <AccordionSummary
            expandIcon={isMobile ? <ExpandMoreIcon /> : undefined}
            sx={{ display: { sm: "none" }, minHeight: 48, "&.Mui-expanded": { minHeight: 48 } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterListIcon fontSize="small" />
              <Typography variant="subtitle2">Filters</Typography>
              {activeFilterCount > 0 && (
                <Chip label={activeFilterCount} size="small" color="primary" sx={{ height: 20, fontSize: "0.75rem" }} />
              )}
            </Box>
          </AccordionSummary>
          <AccordionDetails sx={{ p: { xs: 1.5, sm: 3 }, pt: { sm: 2 } }}>
            {!isMobile && <Typography variant="h6" gutterBottom>Filter Results</Typography>}
            <Grid container spacing={1.5} alignItems="center">
              <Grid item xs={12} sm={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event Types</InputLabel>
                  <Select
                    multiple
                    value={filterEventTypes}
                    onChange={(e) => { setFilterEventTypes(e.target.value as string[]); setPage(0); }}
                    label="Event Types"
                    renderValue={(selected) => renderEventTypeValue(selected as string[])}
                  >
                    {EVENT_GROUPS.map(group => [
                      <ListSubheader key={group.label}>{group.label}</ListSubheader>,
                      ...group.types.map(type => (
                        <MenuItem key={type} value={type} dense>
                          <Checkbox checked={filterEventTypes.includes(type)} size="small" />
                          <ListItemText primary={EVENT_LABELS[type]} primaryTypographyProps={{ variant: "body2" }} />
                        </MenuItem>
                      )),
                    ])}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Reward Type</InputLabel>
                  <Select value={filterRewardType} onChange={(e) => { setFilterRewardType(e.target.value as number | ""); setPage(0); }} label="Reward Type">
                    <MenuItem value="">All</MenuItem>
                    {Object.entries(rewardTypeNames).map(([k, v]) => (
                      <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>Leaderboard</InputLabel>
                  <Select value={leaderboardTop} onChange={(e) => { setLeaderboardTop(Number(e.target.value)); setPage(0); }} label="Leaderboard">
                    <MenuItem value={0}>Off</MenuItem>
                    <MenuItem value={10}>Top 10</MenuItem>
                    <MenuItem value={20}>Top 20</MenuItem>
                    <MenuItem value={50}>Top 50</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6} sm={2}>
                <TextField label="Wallet" value={filterWallet}
                  onChange={(e) => { setFilterWallet(e.target.value); setPage(0); }}
                  fullWidth size="small" placeholder="0x..." />
              </Grid>
              <Grid item xs={12} sm={2}>
                <TextField label="Member ID" value={filterMemberID}
                  onChange={(e) => { setFilterMemberID(e.target.value.toUpperCase().slice(0, 12)); setPage(0); }}
                  fullWidth size="small" placeholder="e.g. ALICE01"
                  inputProps={{ maxLength: 12 }}
                  helperText={!resolvedProgramId ? "Set Program ID or Code" : filterMemberID && !resolvedMemberAddr ? "Not found" : ""} />
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <TextField label="Min Amt" value={filterAmountMin}
                  onChange={(e) => { setFilterAmountMin(e.target.value); setPage(0); }}
                  type="number" fullWidth size="small"
                  InputProps={{ endAdornment: <InputAdornment position="end" sx={{ "& p": { fontSize: "0.75rem" } }}>FULA</InputAdornment> }} />
              </Grid>
              <Grid item xs={6} sm={1.5}>
                <TextField label="Max Amt" value={filterAmountMax}
                  onChange={(e) => { setFilterAmountMax(e.target.value); setPage(0); }}
                  type="number" fullWidth size="small"
                  InputProps={{ endAdornment: <InputAdornment position="end" sx={{ "& p": { fontSize: "0.75rem" } }}>FULA</InputAdornment> }} />
              </Grid>
            </Grid>
            {activeFilterCount > 0 && (
              <Box sx={{ mt: 1, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                {leaderboardTop > 0 && (
                  <Chip icon={<EmojiEventsIcon sx={{ fontSize: 16 }} />} label={`Top ${leaderboardTop}`} size="small" color="warning"
                    onDelete={() => { setLeaderboardTop(0); setPage(0); }} />
                )}
                {filterEventTypes.map(t => (
                  <Chip key={t} label={EVENT_LABELS[t]} size="small" color={EVENT_CHIP_COLOR[t] || "default"}
                    onDelete={() => { setFilterEventTypes(prev => prev.filter(x => x !== t)); setPage(0); }} />
                ))}
                {activeFilterCount > 0 && (
                  <Button size="small" onClick={() => {
                    setFilterEventTypes([]); setFilterRewardType(""); setFilterWallet("");
                    setFilterMemberID(""); setFilterAmountMin(""); setFilterAmountMax("");
                    setLeaderboardTop(0); setPage(0);
                  }}>Clear All</Button>
                )}
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      )}

      {/* Loading */}
      {loading && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2">
              {cacheStatus === "loading-cache" ? "Loading cached events..." :
               cacheStatus === "syncing" && totalChunks === 0 ? `Fetching events${completedChunks > 0 ? ` (page ${completedChunks})` : ""}...` :
               totalChunks > 0 ? "Syncing new events (RPC fallback)..." : "Checking for new events..."}
            </Typography>
            {totalChunks > 0 && (
              <Typography variant="body2" color="text.secondary">
                {completedChunks} / {totalChunks} chunks
              </Typography>
            )}
          </Box>
          <LinearProgress variant={totalChunks > 0 ? "determinate" : "indeterminate"} value={progress * 100} />
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {filteredEvents.length > 0 && (
        <>
          {/* Summary cards — horizontal scroll on mobile */}
          <Box sx={{ mb: 2, overflowX: "auto", pb: 1 }}>
            <Stack direction="row" spacing={1.5} sx={{ minWidth: { xs: 600, sm: "auto" } }}>
              <Card sx={{ flex: 1, minWidth: 110 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="caption">Deposits</Typography>
                  <Typography variant="subtitle1" color="success.main" sx={{ fontWeight: 600 }}>{formatFula(totalDeposits)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {filteredEvents.filter(e => e.type === "Deposit").length} txns
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 110 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="caption">Transfers</Typography>
                  <Typography variant="subtitle1" color="info.main" sx={{ fontWeight: 600 }}>{formatFula(totalTransfers)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {filteredEvents.filter(e => e.type === "Transfer" || e.type === "TransferToParent").length} txns
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 110 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="caption">Withdrawals</Typography>
                  <Typography variant="subtitle1" color="warning.main" sx={{ fontWeight: 600 }}>{formatFula(totalWithdrawals)}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {filteredEvents.filter(e => e.type === "Withdrawal").length} txns
                  </Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 110 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="caption">Member</Typography>
                  <Typography variant="subtitle1" color="secondary.main" sx={{ fontWeight: 600 }}>{memberEventCount}</Typography>
                  <Typography variant="caption" color="text.secondary">events</Typography>
                </CardContent>
              </Card>
              <Card sx={{ flex: 1, minWidth: 110 }}>
                <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 }, textAlign: "center" }}>
                  <Typography color="text.secondary" variant="caption">Admin</Typography>
                  <Typography variant="subtitle1" color="primary.main" sx={{ fontWeight: 600 }}>{adminEventCount}</Typography>
                  <Typography variant="caption" color="text.secondary">events</Typography>
                </CardContent>
              </Card>
            </Stack>
          </Box>

          {/* Leaderboard table */}
          {leaderboardTop > 0 ? (
          <TableContainer component={Paper} sx={{ overflowX: "auto" }}>
            <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <EmojiEventsIcon color="warning" />
              <Typography variant="h6" sx={{ fontSize: { xs: "1rem", sm: "1.25rem" } }}>
                Top {leaderboardTop} — Accumulated Rewards
                {filterRewardType !== "" && rewardTypeNames[filterRewardType as number] ? ` (${rewardTypeNames[filterRewardType as number]})` : ""}
              </Typography>
            </Box>
            <Table size="small" sx={{ minWidth: { xs: 360, sm: 500 } }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: "nowrap", width: 60 }}>Rank</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Member Code</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Join Date</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }} align="right">Accumulated Rewards</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leaderboardData.map((row) => (
                  <TableRow key={row.rank} hover>
                    <TableCell>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        {row.rank <= 3 ? (
                          <EmojiEventsIcon sx={{ fontSize: 18, color: row.rank === 1 ? "#FFD700" : row.rank === 2 ? "#C0C0C0" : "#CD7F32" }} />
                        ) : null}
                        <Typography variant="body2" sx={{ fontWeight: row.rank <= 3 ? 700 : 400 }}>{row.rank}</Typography>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{row.memberCode}</TableCell>
                    <TableCell>{formatTimestamp(row.joinTimestamp)}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                        {formatFula(row.total)} FULA
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
                {leaderboardData.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No deposit data found.</Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          ) : (
          /* Events table — horizontally scrollable on mobile so all columns stay reachable */
          <TableContainer component={Paper} sx={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
            <Table size="small" sx={{ minWidth: 960 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Type</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Prog</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Wallet</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Code</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Amount / Detail</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Reward Type</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>Note</TableCell>
                  <TableCell sx={{ whiteSpace: "nowrap" }} align="center">Tx</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedEvents.map((row, i) => {
                  const senderCode = row.memberCode || walletCodeMap[row.wallet.toLowerCase()] || "";
                  const recipientCode = row.toWallet ? walletCodeMap[row.toWallet.toLowerCase()] || "" : "";
                  const isTransferRow = row.type === "Transfer" || row.type === "TransferToParent";
                  // For transfers always show both sides ("sender → recipient"). When the full
                  // recipient address is missing (e.g. events loaded via the subgraph, which does
                  // not expose the `to` field), fall back to the truncated address prefix already
                  // embedded in `detail` (parser format: "…→ 0xabcd1234…").
                  let recipientDisplay = "";
                  if (recipientCode) {
                    recipientDisplay = recipientCode;
                  } else if (row.toWallet) {
                    recipientDisplay = shortenAddress(row.toWallet);
                  } else if (isTransferRow && row.detail) {
                    const m = row.detail.match(/→\s*(0x[a-fA-F0-9]+)/);
                    if (m) recipientDisplay = `${m[1]}…`;
                  }
                  const code = isTransferRow && recipientDisplay
                    ? `${senderCode || shortenAddress(row.wallet)} → ${recipientDisplay}`
                    : (senderCode || (row.wallet ? shortenAddress(row.wallet) : "-"));
                  // Prefer event-derived names (work per-program, no program selection required),
                  // then the live getRewardTypes/getSubTypes query (when a program is selected),
                  // then the numeric fallback.
                  const rewardName = row.rewardType !== undefined && row.rewardType > 0
                    ? (eventRewardTypeNames[row.programId]?.[row.rewardType]
                       || (row.programId === resolvedProgramId ? rewardTypeNames[row.rewardType] : undefined)
                       || `Type ${row.rewardType}`)
                    : "";
                  const subName = row.rewardType !== undefined && row.rewardType > 0 && row.subTypeId !== undefined && row.subTypeId > 0
                    ? (eventSubTypeNames[row.programId]?.[row.rewardType]?.[row.subTypeId]
                       || (row.programId === resolvedProgramId ? subTypeNames[row.rewardType]?.[row.subTypeId] : undefined)
                       || `Sub ${row.subTypeId}`)
                    : "";
                  return (
                  <TableRow key={`${row.txHash}-${i}`} hover>
                    <TableCell sx={{ py: 0.75 }}>
                      <Chip
                        label={isMobile ? (EVENT_LABELS[row.type] || row.type).split(" ")[0] : (EVENT_LABELS[row.type] || row.type)}
                        size="small"
                        color={EVENT_CHIP_COLOR[row.type] || "default"}
                        sx={{ fontSize: { xs: "0.7rem", sm: "0.8125rem" }, height: { xs: 22, sm: 24 } }}
                      />
                    </TableCell>
                    <TableCell>{row.programId}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                      {row.wallet ? shortenAddress(row.wallet) : "-"}
                    </TableCell>
                    <TableCell sx={{ fontWeight: code ? 600 : 400, fontSize: { xs: "0.75rem", sm: "0.85rem" } }}>
                      {code || "-"}
                    </TableCell>
                    <TableCell>
                      {TOKEN_EVENTS.has(row.type) && row.amount > BigInt(0) && (
                        <Typography variant="body2" sx={{ fontWeight: 500, fontSize: { xs: "0.8rem", sm: "0.875rem" } }}>
                          {formatFula(row.amount)}
                        </Typography>
                      )}
                      {row.detail && (
                        <Tooltip title={row.detail} arrow placement="top">
                          <Typography variant="caption" color="text.secondary" component="div"
                            sx={{ maxWidth: { xs: 140, sm: 220 }, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.detail}
                          </Typography>
                        </Tooltip>
                      )}
                    </TableCell>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>
                      {rewardName || "-"}
                      {subName && (
                        <Typography variant="caption" color="text.secondary" component="div">
                          {subName}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.note || "-"}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="View on explorer" arrow>
                        <IconButton
                          size="small"
                          component="a"
                          href={`${explorerUrl}/tx/${row.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={filteredEvents.length}
              page={safePage}
              onPageChange={(_, p) => setPage(p)}
              rowsPerPage={rowsPerPage}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 25, 50, 100]}
              sx={{
                "& .MuiTablePagination-toolbar": { flexWrap: "wrap", justifyContent: { xs: "center", sm: "flex-end" } },
                "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontSize: { xs: "0.75rem", sm: "0.875rem" } },
              }}
            />
          </TableContainer>
          )}
        </>
      )}

      {trigger > 0 && !loading && filteredEvents.length === 0 && !error && (
        <Alert severity="info">No events found for the selected filters.</Alert>
      )}
    </Box>
  );
}
