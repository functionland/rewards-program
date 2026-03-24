"use client";

import { FormControlLabel, Checkbox, Typography } from "@mui/material";

const DISCLAIMER_TEXT =
  "I understand that the information I enter here is on-chain, publicly visible, and verifiable. I confirm that I am not entering personal or protected information.";

export function OnChainDisclaimer({
  accepted,
  onChange,
}: {
  accepted: boolean;
  onChange: (accepted: boolean) => void;
}) {
  return (
    <FormControlLabel
      sx={{ mt: 2, alignItems: "flex-start" }}
      control={
        <Checkbox
          checked={accepted}
          onChange={(e) => onChange(e.target.checked)}
          sx={{ pt: 0 }}
        />
      }
      label={
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
          {DISCLAIMER_TEXT}
        </Typography>
      }
    />
  );
}
