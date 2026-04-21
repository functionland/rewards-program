"use client";

import { Box, Button } from "@mui/material";
import Link from "next/link";
import QrCodeIcon from "@mui/icons-material/QrCode";
import QrCode2Icon from "@mui/icons-material/QrCode2";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import { MemberRoleEnum } from "@/config/contracts";

export function ProgramActionsFooter({
  programId,
  role,
  onReceive,
  onRedeem,
}: {
  programId: number;
  memberID?: string;
  role: number;
  onReceive: () => void;
  onRedeem: () => void;
}) {
  const canTransferSub = role >= MemberRoleEnum.TeamLeader;

  return (
    <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", pt: 0.5 }}>
      <Button
        size="small"
        variant="pill"
        startIcon={<QrCodeIcon sx={{ fontSize: 14 }} />}
        onClick={(e) => {
          e.preventDefault();
          onReceive();
        }}
      >
        Receive
      </Button>
      <Button
        size="small"
        variant="pill"
        startIcon={<QrCode2Icon sx={{ fontSize: 14 }} />}
        onClick={(e) => {
          e.preventDefault();
          onRedeem();
        }}
      >
        Redeem
      </Button>
      {canTransferSub && (
        <Button
          size="small"
          variant="pill"
          component={Link}
          href={`/programs?id=${programId}&action=transfer`}
          startIcon={<SendOutlinedIcon sx={{ fontSize: 14 }} />}
          onClick={(e) => e.stopPropagation()}
        >
          Transfer to sub
        </Button>
      )}
    </Box>
  );
}
