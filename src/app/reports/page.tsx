"use client";

import { useState } from "react";
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Alert, Chip,
  LinearProgress, TablePagination, useMediaQuery, useTheme,
  InputAdornment,
} from "@mui/material";
import { parseUnits } from "viem";
import { useReadContract } from "wagmi";
import { CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { useRewardTypes, useProgramCodeToId } from "@/hooks/useRewardsProgram";
import { useChunkedEventLogs, type TimeRange } from "@/hooks/useChunkedEventLogs";
import { formatFula, shortenAddress, fromBytes16, toBytes12 } from "@/lib/utils";

export default function ReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterProgramCode, setFilterProgramCode] = useState("");
  const { data: programIdFromCode } = useProgramCodeToId(filterProgramCode);
  const resolvedProgramId = filterProgramId ? Number(filterProgramId) : (programIdFromCode ? Number(programIdFromCode) : 0);
  const { data: rewardTypesData } = useRewardTypes(resolvedProgramId);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [trigger, setTrigger] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  // Client-side filters
  const [filterEventType, setFilterEventType] = useState<string>("");
  const [filterRewardType, setFilterRewardType] = useState<number | "">("");
  const [filterWallet, setFilterWallet] = useState("");
  const [filterMemberID, setFilterMemberID] = useState("");
  const [filterAmountMin, setFilterAmountMin] = useState("");
  const [filterAmountMax, setFilterAmountMax] = useState("");

  // Resolve member ID → storage key for filtering
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
  } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    programId: resolvedProgramId || undefined,
    timeRange,
    trigger,
  });

  // Client-side filter chain
  let filteredEvents = events;
  if (filterEventType) {
    filteredEvents = filteredEvents.filter(e => e.type === filterEventType);
  }
  if (filterRewardType !== "") {
    filteredEvents = filteredEvents.filter(r => r.rewardType === undefined || r.rewardType === filterRewardType);
  }
  if (filterWallet) {
    const w = filterWallet.toLowerCase();
    filteredEvents = filteredEvents.filter(e => e.wallet.toLowerCase().includes(w));
  }
  if (resolvedMemberAddr) {
    filteredEvents = filteredEvents.filter(e => e.wallet.toLowerCase() === resolvedMemberAddr);
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

  const rewardTypeNames: Record<number, string> = {};
  if (rewardTypesData) {
    const data = rewardTypesData as [number[], `0x${string}`[]];
    data[0]?.forEach((id: number, idx: number) => {
      rewardTypeNames[id] = fromBytes16(data[1][idx]) || `Type ${id}`;
    });
  }

  const handleGenerate = () => {
    if (loading) {
      cancel();
    } else {
      setPage(0);
      setTrigger(t => t + 1);
    }
  };

  // Pagination — clamp page if filters reduce result count
  const safePage = page * rowsPerPage >= filteredEvents.length && filteredEvents.length > 0 ? 0 : page;
  const paginatedEvents = filteredEvents.slice(
    safePage * rowsPerPage,
    safePage * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Reports</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Fetch Settings</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} sm={2}>
            <TextField label="Program ID" value={filterProgramId}
              onChange={(e) => { setFilterProgramId(e.target.value); if (e.target.value) setFilterProgramCode(""); }}
              type="number" fullWidth size="small" placeholder="All" />
          </Grid>
          <Grid item xs={6} sm={2}>
            <TextField label="Program Code" value={filterProgramCode}
              onChange={(e) => { setFilterProgramCode(e.target.value.toUpperCase()); if (e.target.value) setFilterProgramId(""); }}
              fullWidth size="small" placeholder="e.g. Z8X"
              inputProps={{ maxLength: 8 }}
              helperText={filterProgramCode && !resolvedProgramId ? "Not found" : filterProgramCode && resolvedProgramId ? `ID: ${resolvedProgramId}` : ""} />
          </Grid>
          <Grid item xs={12} sm={4}>
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
          <Grid item xs={12} sm={4}>
            <Button
              variant="contained"
              onClick={handleGenerate}
              fullWidth
              color={loading ? "error" : "primary"}
            >
              {loading ? "Cancel" : "Generate Report"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {events.length > 0 && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Filter Results</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Event Type</InputLabel>
                <Select value={filterEventType} onChange={(e) => { setFilterEventType(e.target.value); setPage(0); }} label="Event Type">
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="Deposit">Deposit</MenuItem>
                  <MenuItem value="Transfer">Transfer</MenuItem>
                  <MenuItem value="TransferToParent">To Parent</MenuItem>
                  <MenuItem value="Withdrawal">Withdrawal</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={2}>
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
            <Grid item xs={12} sm={2}>
              <TextField label="Wallet Address" value={filterWallet}
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
            <Grid item xs={6} sm={2}>
              <TextField label="Min Amount" value={filterAmountMin}
                onChange={(e) => { setFilterAmountMin(e.target.value); setPage(0); }}
                type="number" fullWidth size="small"
                InputProps={{ endAdornment: <InputAdornment position="end">FULA</InputAdornment> }} />
            </Grid>
            <Grid item xs={6} sm={2}>
              <TextField label="Max Amount" value={filterAmountMax}
                onChange={(e) => { setFilterAmountMax(e.target.value); setPage(0); }}
                type="number" fullWidth size="small"
                InputProps={{ endAdornment: <InputAdornment position="end">FULA</InputAdornment> }} />
            </Grid>
          </Grid>
        </Paper>
      )}

      {loading && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
            <Typography variant="body2">Fetching events...</Typography>
            <Typography variant="body2" color="text.secondary">
              {completedChunks} / {totalChunks} chunks
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={progress * 100} />
        </Paper>
      )}

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {filteredEvents.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Deposits</Typography>
                <Typography variant="h6" color="success.main">{formatFula(totalDeposits)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredEvents.filter(e => e.type === "Deposit").length} transactions
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Transfers</Typography>
                <Typography variant="h6" color="info.main">{formatFula(totalTransfers)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredEvents.filter(e => e.type === "Transfer" || e.type === "TransferToParent").length} transactions
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Withdrawals</Typography>
                <Typography variant="h6" color="warning.main">{formatFula(totalWithdrawals)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">
                  {filteredEvents.filter(e => e.type === "Withdrawal").length} transactions
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Program</TableCell>
                  <TableCell>Wallet</TableCell>
                  <TableCell>Amount (FULA)</TableCell>
                  <TableCell>Reward Type</TableCell>
                  {!isMobile && <TableCell>Note</TableCell>}
                  {!isMobile && <TableCell>Block</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedEvents.map((row, i) => (
                  <TableRow key={`${row.txHash}-${i}`} hover>
                    <TableCell>
                      <Chip
                        label={row.type}
                        size="small"
                        color={row.type === "Deposit" ? "success" : row.type === "Withdrawal" ? "warning" : "info"}
                      />
                    </TableCell>
                    <TableCell>{row.programId}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                      {shortenAddress(row.wallet)}
                    </TableCell>
                    <TableCell>{formatFula(row.amount)}</TableCell>
                    <TableCell>
                      {row.rewardType !== undefined ? (rewardTypeNames[row.rewardType] || row.rewardType) : "-"}
                    </TableCell>
                    {!isMobile && (
                      <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {row.note || "-"}
                      </TableCell>
                    )}
                    {!isMobile && <TableCell>{row.blockNumber.toString()}</TableCell>}
                  </TableRow>
                ))}
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
            />
          </TableContainer>
        </>
      )}

      {trigger > 0 && !loading && filteredEvents.length === 0 && !error && (
        <Alert severity="info">No events found for the selected filters.</Alert>
      )}
    </Box>
  );
}
