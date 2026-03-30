"use client";

import { useState } from "react";
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Alert, Chip,
  LinearProgress, TablePagination, useMediaQuery, useTheme,
} from "@mui/material";
import { CONTRACTS } from "@/config/contracts";
import { useRewardTypes } from "@/hooks/useRewardsProgram";
import { useChunkedEventLogs, type TimeRange } from "@/hooks/useChunkedEventLogs";
import { formatFula, shortenAddress, fromBytes16 } from "@/lib/utils";

export default function ReportsPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { data: rewardTypesData } = useRewardTypes();

  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterRewardType, setFilterRewardType] = useState<number | "">("");
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [trigger, setTrigger] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const {
    events, loading, progress, totalChunks, completedChunks, error, cancel,
  } = useChunkedEventLogs({
    address: CONTRACTS.rewardsProgram,
    programId: filterProgramId ? Number(filterProgramId) : undefined,
    timeRange,
    trigger,
  });

  // Client-side reward type filter
  const filteredEvents = filterRewardType !== ""
    ? events.filter(r => r.type !== "Deposit" || r.rewardType === filterRewardType)
    : events;

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

  // Pagination
  const paginatedEvents = filteredEvents.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Reports</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filters</Typography>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={3}>
            <TextField label="Program ID" value={filterProgramId}
              onChange={(e) => setFilterProgramId(e.target.value)}
              type="number" fullWidth size="small" placeholder="All programs" />
          </Grid>
          <Grid item xs={12} sm={3}>
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
          <Grid item xs={12} sm={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Reward Type</InputLabel>
              <Select value={filterRewardType} onChange={(e) => setFilterRewardType(e.target.value as number | "")} label="Reward Type">
                <MenuItem value="">All</MenuItem>
                {Object.entries(rewardTypeNames).map(([k, v]) => (
                  <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={3}>
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
              page={page}
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
