"use client";

import { Typography, Box, Button, Paper } from "@mui/material";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
      <Paper sx={{ p: 4, maxWidth: 500, textAlign: "center" }}>
        <Typography variant="h5" gutterBottom>Something went wrong</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          An unexpected error occurred. Please try again or refresh the page.
        </Typography>
        <Button variant="contained" onClick={reset}>Try Again</Button>
      </Paper>
    </Box>
  );
}
