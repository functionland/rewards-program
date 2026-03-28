"use client";

import { useState } from "react";
import {
  Typography, Box, Paper, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, ToggleButtonGroup,
  ToggleButton, Alert,
} from "@mui/material";
import { useReadContract } from "wagmi";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels, MemberTypeLabels } from "@/config/contracts";
import { toBytes12, toBytes8, fromBytes12, shortenAddress, formatFula } from "@/lib/utils";
import { useProgramCodeToId } from "@/hooks/useRewardsProgram";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";
import { QRScannerButton } from "@/components/common/QRScannerButton";

export default function MembersPage() {
  const [searchType, setSearchType] = useState<"memberID" | "programCode">("memberID");
  const [searchValue, setSearchValue] = useState("");
  const [programId, setProgramId] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Search by memberID
  const { data: memberByID, error: memberError } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: searchTriggered && searchType === "memberID" && searchValue && programId
      ? [toBytes12(searchValue), parseInt(programId)]
      : undefined,
    query: { enabled: searchTriggered && searchType === "memberID" && !!searchValue && !!programId },
  });

  // Search by program code → get programId
  const { data: programIdByCode, error: programError } = useProgramCodeToId(
    searchTriggered && searchType === "programCode" ? searchValue : ""
  );

  // Get program details for program code search
  const { data: programByCode } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getProgram",
    args: programIdByCode && Number(programIdByCode) > 0 ? [Number(programIdByCode)] : undefined,
    query: { enabled: !!programIdByCode && Number(programIdByCode) > 0 },
  });

  // Get balance for found member
  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: memberByID?.wallet && memberByID.wallet !== "0x0000000000000000000000000000000000000000"
      ? [Number(memberByID.programId), memberByID.wallet as `0x${string}`]
      : undefined,
    query: { enabled: !!memberByID?.wallet && memberByID.wallet !== "0x0000000000000000000000000000000000000000" },
  });

  const handleSearch = () => {
    setSearchTriggered(true);
  };

  const handleQRScan = ({ programId: p, memberID }: { programId: number; memberID: string }) => {
    setSearchType("memberID");
    setSearchValue(memberID);
    setProgramId(String(p));
    setSearchTriggered(true);
  };

  const memberIdStr = memberByID ? fromBytes12(memberByID.memberID as `0x${string}`) : "";
  const memberProgramId = memberByID ? Number(memberByID.programId) : 0;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Search Members</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <ToggleButtonGroup
          value={searchType}
          exclusive
          onChange={(_, v) => { if (v) { setSearchType(v); setSearchTriggered(false); } }}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="memberID">By Member ID</ToggleButton>
          <ToggleButton value="programCode">By Program Code</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          <TextField
            label={searchType === "memberID" ? "Member ID (= Reward ID)" : "Program Code"}
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value); setSearchTriggered(false); }}
            sx={{ flexGrow: 1 }}
            inputProps={{ maxLength: searchType === "memberID" ? 12 : 8 }}
          />
          {searchType === "memberID" && (
            <TextField
              label="Program ID"
              value={programId}
              onChange={(e) => { setProgramId(e.target.value); setSearchTriggered(false); }}
              type="number"
              sx={{ width: 150 }}
            />
          )}
          <QRScannerButton
            tooltip="Scan member QR to search"
            onScan={handleQRScan}
          />
          <Button variant="contained" onClick={handleSearch} disabled={!searchValue}>
            Search
          </Button>
        </Box>
      </Paper>

      {/* Results - Member by ID */}
      {searchTriggered && searchType === "memberID" && memberByID && memberByID.active && (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Member ID</TableCell>
                <TableCell>Wallet</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Program</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Balance (FULA)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>QR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>{memberIdStr}</TableCell>
                <TableCell sx={{ fontFamily: "monospace" }}>
                  {memberByID.wallet === "0x0000000000000000000000000000000000000000"
                    ? "Walletless"
                    : shortenAddress(memberByID.wallet)}
                </TableCell>
                <TableCell>
                  <Chip label={MemberRoleLabels[Number(memberByID.role)]} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={MemberTypeLabels[Number(memberByID.memberType)] || "Free"} size="small" variant="outlined" />
                </TableCell>
                <TableCell>{memberByID.programId}</TableCell>
                <TableCell>{shortenAddress(memberByID.parent)}</TableCell>
                <TableCell>
                  {balance ? `${formatFula(balance[0])} / ${formatFula(balance[1])} / ${formatFula(balance[2])}` : "-"}
                </TableCell>
                <TableCell>{memberByID.active ? "Active" : "Inactive"}</TableCell>
                <TableCell>
                  <QRCodeDisplay programId={memberProgramId} memberID={memberIdStr} size={64} />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Results - Program by code */}
      {searchTriggered && searchType === "programCode" && programByCode && Number(programIdByCode) > 0 && (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Program Found</Typography>
          <Typography>ID: {programByCode.id}</Typography>
          <Typography>Name: {programByCode.name}</Typography>
          <Typography>Description: {programByCode.description}</Typography>
          <Typography>Active: {programByCode.active ? "Yes" : "No"}</Typography>
          <Button component="a" href={`/programs?id=${programByCode.id}`} sx={{ mt: 2 }} variant="outlined">
            View Program Details
          </Button>
        </Paper>
      )}

      {searchTriggered && searchType === "memberID" && memberError && (
        <Alert severity="warning" sx={{ mt: 2 }}>No member found with that ID in the specified program.</Alert>
      )}
      {searchTriggered && searchType === "programCode" && (programError || (programIdByCode !== undefined && Number(programIdByCode) === 0)) && (
        <Alert severity="warning" sx={{ mt: 2 }}>No program found with that code.</Alert>
      )}
    </Box>
  );
}
