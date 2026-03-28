"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, Button,
  Select, MenuItem, FormControl, InputLabel, Alert, Chip,
} from "@mui/material";
import { usePublicClient } from "wagmi";
import { parseAbiItem } from "viem";
import { CONTRACTS, MemberTypeLabels } from "@/config/contracts";
import { useProgramCount, useRewardTypes } from "@/hooks/useRewardsProgram";
import { formatFula, shortenAddress, fromBytes16 } from "@/lib/utils";

type EventRow = {
  type: string;
  depositId?: string;
  programId: number;
  wallet: string;
  amount: bigint;
  rewardType?: number;
  note?: string;
  blockNumber: bigint;
  txHash: string;
};

export default function ReportsPage() {
  const publicClient = usePublicClient();
  const { data: programCount } = useProgramCount();
  const { data: rewardTypesData } = useRewardTypes();

  const [filterProgramId, setFilterProgramId] = useState("");
  const [filterMemberType, setFilterMemberType] = useState<number | "">("");
  const [filterRewardType, setFilterRewardType] = useState<number | "">("");
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fetched, setFetched] = useState(false);

  // Summary stats
  const totalDeposits = events.filter(e => e.type === "Deposit").reduce((s, e) => s + e.amount, BigInt(0));
  const totalTransfers = events.filter(e => e.type === "Transfer" || e.type === "TransferToParent").reduce((s, e) => s + e.amount, BigInt(0));
  const totalWithdrawals = events.filter(e => e.type === "Withdrawal").reduce((s, e) => s + e.amount, BigInt(0));

  const fetchEvents = useCallback(async () => {
    if (!publicClient) return;
    setLoading(true);
    setError("");
    setFetched(true);

    try {
      const pid = filterProgramId ? BigInt(filterProgramId) : undefined;
      const address = CONTRACTS.rewardsProgram;

      // Fetch all event types in parallel
      const [deposits, transfers, parentTransfers, withdrawals] = await Promise.all([
        publicClient.getLogs({
          address,
          event: parseAbiItem("event TokensDeposited(uint256 indexed depositId, uint32 indexed programId, address indexed wallet, uint256 amount, uint8 rewardType, string note)"),
          args: pid ? { programId: Number(pid) } : undefined,
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address,
          event: parseAbiItem("event TokensTransferredToMember(uint32 indexed programId, address indexed from, address indexed to, uint256 amount, bool locked, uint32 lockTimeDays)"),
          args: pid ? { programId: Number(pid) } : undefined,
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address,
          event: parseAbiItem("event TokensTransferredToParent(uint32 indexed programId, address indexed from, address indexed to, uint256 amount)"),
          args: pid ? { programId: Number(pid) } : undefined,
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
        publicClient.getLogs({
          address,
          event: parseAbiItem("event TokensWithdrawn(uint32 indexed programId, address indexed wallet, uint256 amount)"),
          args: pid ? { programId: Number(pid) } : undefined,
          fromBlock: BigInt(0),
          toBlock: "latest",
        }),
      ]);

      const rows: EventRow[] = [];

      for (const log of deposits) {
        if (!log.args) continue;
        rows.push({
          type: "Deposit",
          depositId: log.args.depositId?.toString(),
          programId: Number(log.args.programId),
          wallet: log.args.wallet || "",
          amount: log.args.amount || BigInt(0),
          rewardType: log.args.rewardType,
          note: log.args.note,
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }

      for (const log of transfers) {
        if (!log.args) continue;
        rows.push({
          type: "Transfer",
          programId: Number(log.args.programId),
          wallet: log.args.from || "",
          amount: log.args.amount || BigInt(0),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }

      for (const log of parentTransfers) {
        if (!log.args) continue;
        rows.push({
          type: "TransferToParent",
          programId: Number(log.args.programId),
          wallet: log.args.from || "",
          amount: log.args.amount || BigInt(0),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }

      for (const log of withdrawals) {
        if (!log.args) continue;
        rows.push({
          type: "Withdrawal",
          programId: Number(log.args.programId),
          wallet: log.args.wallet || "",
          amount: log.args.amount || BigInt(0),
          blockNumber: log.blockNumber,
          txHash: log.transactionHash,
        });
      }

      // Filter by reward type
      let filtered = rows;
      if (filterRewardType !== "") {
        filtered = filtered.filter(r => r.type !== "Deposit" || r.rewardType === filterRewardType);
      }

      // Sort by block number descending
      filtered.sort((a, b) => Number(b.blockNumber - a.blockNumber));

      setEvents(filtered);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }, [publicClient, filterProgramId, filterRewardType]);

  const rewardTypeNames: Record<number, string> = {};
  if (rewardTypesData) {
    const data = rewardTypesData as [number[], `0x${string}`[]];
    data[0]?.forEach((id: number, idx: number) => {
      rewardTypeNames[id] = fromBytes16(data[1][idx]) || `Type ${id}`;
    });
  }

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
              <InputLabel>Member Type</InputLabel>
              <Select value={filterMemberType} onChange={(e) => setFilterMemberType(e.target.value as number | "")} label="Member Type">
                <MenuItem value="">All</MenuItem>
                {Object.entries(MemberTypeLabels).map(([k, v]) => (
                  <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
                ))}
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
            <Button variant="contained" onClick={fetchEvents} disabled={loading} fullWidth>
              {loading ? "Loading..." : "Generate Report"}
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {fetched && events.length > 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Deposits</Typography>
                <Typography variant="h6" color="success.main">{formatFula(totalDeposits)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">{events.filter(e => e.type === "Deposit").length} transactions</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Transfers</Typography>
                <Typography variant="h6" color="info.main">{formatFula(totalTransfers)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">{events.filter(e => e.type === "Transfer" || e.type === "TransferToParent").length} transactions</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Paper sx={{ p: 2, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Total Withdrawals</Typography>
                <Typography variant="h6" color="warning.main">{formatFula(totalWithdrawals)} FULA</Typography>
                <Typography variant="caption" color="text.secondary">{events.filter(e => e.type === "Withdrawal").length} transactions</Typography>
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
                  <TableCell>Note</TableCell>
                  <TableCell>Block</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.slice(0, 100).map((row, i) => (
                  <TableRow key={i} hover>
                    <TableCell>
                      <Chip
                        label={row.type}
                        size="small"
                        color={row.type === "Deposit" ? "success" : row.type === "Withdrawal" ? "warning" : "info"}
                      />
                    </TableCell>
                    <TableCell>{row.programId}</TableCell>
                    <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{shortenAddress(row.wallet)}</TableCell>
                    <TableCell>{formatFula(row.amount)}</TableCell>
                    <TableCell>{row.rewardType !== undefined ? (rewardTypeNames[row.rewardType] || row.rewardType) : "-"}</TableCell>
                    <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {row.note || "-"}
                    </TableCell>
                    <TableCell>{row.blockNumber.toString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {events.length > 100 && (
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
              Showing first 100 of {events.length} events.
            </Typography>
          )}
        </>
      )}

      {fetched && events.length === 0 && !loading && !error && (
        <Alert severity="info">No events found for the selected filters.</Alert>
      )}
    </Box>
  );
}
