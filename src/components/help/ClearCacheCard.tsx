"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Paper,
  Typography,
} from "@mui/material";
import DeleteSweepOutlinedIcon from "@mui/icons-material/DeleteSweepOutlined";
import { CONTRACTS } from "@/config/contracts";
import { openEventDB, clearCache } from "@/lib/eventCache";
import { useUserRole } from "@/hooks/useUserRole";
import { useHighestMemberRole } from "@/hooks/useHighestMemberRole";
import { MemberRoleEnum } from "@/config/contracts";

export function ClearCacheCard() {
  const { isConnected, isAdmin } = useUserRole();
  const { highestRole } = useHighestMemberRole();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isOperator =
    isConnected && (isAdmin || highestRole >= MemberRoleEnum.TeamLeader);
  if (!isOperator) return null;

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const db = await openEventDB();
      await clearCache(db, CONTRACTS.rewardsProgram);
      db.close();
      setDone(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to clear cache");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        mt: 2,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { sm: "center" },
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1 }}>
        <Typography sx={{ fontWeight: 600, fontSize: 14 }}>
          Clear local event cache
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "text.secondary", fontSize: 12.5, mt: 0.25 }}
        >
          Wipes cached blockchain events stored in your browser. Use this if your
          Activity page or summary counts look stale or incomplete. Events will
          re-sync from chain/subgraph on the next visit.
        </Typography>
        {done && (
          <Alert severity="success" sx={{ mt: 1 }}>
            Cache cleared. Reopen the Activity page to trigger a fresh sync.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
      </Box>
      <Button
        variant="outlined"
        color="warning"
        startIcon={<DeleteSweepOutlinedIcon />}
        onClick={() => setOpen(true)}
        disabled={busy}
        sx={{ flexShrink: 0 }}
      >
        Clear cache
      </Button>

      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Clear cached events?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ fontSize: 14 }}>
            This removes all locally cached blockchain events. The next Activity
            page visit will re-fetch them from scratch — this can take a moment on
            slow connections. Your on-chain data is not affected.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} color="warning" disabled={busy}>
            {busy ? "Clearing…" : "Clear cache"}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
