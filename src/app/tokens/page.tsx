"use client";

// Back-compat shim: the /tokens route used to host the admin token operations
// (deposit / transfer / withdraw). Those flows now live on /redeem under the
// "Move tokens" taxonomy. Printed member QR codes still point at
//   /tokens?program=X&member=CODE&action=transfer
// (emitted by src/components/common/QRCodeDisplay.tsx), so this page rewrites
// every legacy URL to the equivalent /redeem branch and router.replaces.

import { Suspense, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { useRouter, useSearchParams } from "next/navigation";

const ACTION_MAP: Record<string, string> = {
  transfer: "send-sub",
  "send-sub": "send-sub",
  "send-up": "send-up",
  deposit: "deposit",
  withdraw: "withdraw",
};

function TokensRedirect() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    const next = new URLSearchParams();
    const program = params.get("program");
    const member = params.get("member");
    const action = params.get("action");
    if (program) next.set("claim", program);
    if (member) next.set("member", member.toUpperCase());
    next.set("action", (action && ACTION_MAP[action]) || "send-sub");
    router.replace(`/redeem?${next.toString()}`);
  }, [router, params]);

  return (
    <Box sx={{ p: 3, textAlign: "center" }}>
      <Typography variant="micro" sx={{ color: "text.tertiary" }}>
        Redirecting to Move tokens…
      </Typography>
    </Box>
  );
}

export default function TokensPage() {
  return (
    <Suspense fallback={null}>
      <TokensRedirect />
    </Suspense>
  );
}
