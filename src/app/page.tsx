"use client";

import {
  Typography, Grid, Paper, Box, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip,
} from "@mui/material";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useUserRole } from "@/hooks/useUserRole";
import { useProgramCount, useProgram, useTokenBalance } from "@/hooks/useRewardsProgram";
import { formatFula, fromBytes8 } from "@/lib/utils";

function ProgramSummaryRow({ programId }: { programId: number }) {
  const { data: program } = useProgram(programId);
  if (!program) return null;

  return (
    <TableRow hover>
      <TableCell>{program.id}</TableCell>
      <TableCell>{fromBytes8(program.code as `0x${string}`)}</TableCell>
      <TableCell>
        <Link href={`/programs?id=${program.id}`} style={{ color: "#6366f1", textDecoration: "none" }}>
          {program.name}
        </Link>
      </TableCell>
      <TableCell>
        <Chip
          label={program.active ? "Active" : "Inactive"}
          color={program.active ? "success" : "default"}
          size="small"
        />
      </TableCell>
    </TableRow>
  );
}

export default function Dashboard() {
  const { address } = useAccount();
  const { isAdmin, isConnected } = useUserRole();
  const { data: programCount } = useProgramCount();
  const { data: walletBalance } = useTokenBalance(address);

  const count = Number(programCount || 0);

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      {!isConnected && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Connect your wallet to see your personal data and perform transactions.
        </Alert>
      )}

      {isConnected && isAdmin && (
        <Alert severity="info" sx={{ mb: 3 }}>
          You have Admin access. You can create programs, assign ProgramAdmins, and manage all members.
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2">Total Programs</Typography>
            <Typography variant="h3">{count}</Typography>
          </Paper>
        </Grid>

        {isConnected && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Wallet FULA</Typography>
                <Typography variant="h5">
                  {walletBalance ? formatFula(walletBalance) : "0"}
                </Typography>
              </Paper>
            </Grid>

            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Role</Typography>
                <Typography variant="h5">{isAdmin ? "Admin" : "Member"}</Typography>
              </Paper>
            </Grid>
          </>
        )}
      </Grid>

      {count > 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.from({ length: count }, (_, i) => (
                <ProgramSummaryRow key={i + 1} programId={i + 1} />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
