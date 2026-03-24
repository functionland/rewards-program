"use client";

import { Typography, Grid, Paper, Box, Alert } from "@mui/material";
import { useAccount } from "wagmi";
import { useUserRole } from "@/hooks/useUserRole";
import { useProgramCount, useTokenBalance } from "@/hooks/useRewardsProgram";
import { formatFula } from "@/lib/utils";

export default function Dashboard() {
  const { address } = useAccount();
  const { isAdmin, memberPrograms, isConnected } = useUserRole();
  const { data: programCount } = useProgramCount();
  const { data: walletBalance } = useTokenBalance(address);

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

      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 3, textAlign: "center" }}>
            <Typography color="text.secondary" variant="body2">Total Programs</Typography>
            <Typography variant="h3">{programCount?.toString() || "0"}</Typography>
          </Paper>
        </Grid>

        {isConnected && (
          <>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{ p: 3, textAlign: "center" }}>
                <Typography color="text.secondary" variant="body2">Your Programs</Typography>
                <Typography variant="h3">{isAdmin ? "All" : memberPrograms.length.toString()}</Typography>
              </Paper>
            </Grid>

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
    </Box>
  );
}
