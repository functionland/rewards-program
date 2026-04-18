"use client";

import { useState, useEffect } from "react";
import {
  Typography, Box, Paper, TextField, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Button, ToggleButtonGroup,
  ToggleButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions,
  CircularProgress, Select, MenuItem, FormControl, InputLabel,
  useMediaQuery, useTheme, Divider,
} from "@mui/material";
import { useAccount, useReadContract } from "wagmi";
import { keccak256 } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels, MemberTypeLabels, MemberRoleEnum } from "@/config/contracts";
import { toBytes12, toBytes8, fromBytes12, shortenAddress, formatFula, formatContractError, isValidAddress } from "@/lib/utils";
import { useProgramCodeToId, useSetMemberWallet, useSetEditCodeHash, useSetMemberType, useRemoveMember, useUpdateMemberID, useProgram } from "@/hooks/useRewardsProgram";
import { useUserRole, useMemberRole } from "@/hooks/useUserRole";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";
import { QRScannerButton } from "@/components/common/QRScannerButton";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";

function generateEditCode(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return ("0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

export default function MembersPage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { address } = useAccount();
  const { isAdmin } = useUserRole();

  const [searchType, setSearchType] = useState<"memberID" | "programCode">("memberID");
  const [searchValue, setSearchValue] = useState("");
  const [programId, setProgramId] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const pid = parseInt(programId) || 0;
  const { role: callerRole } = useMemberRole(pid);

  // Search by memberID
  const { data: memberByID, error: memberError } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: searchTriggered && searchType === "memberID" && searchValue && programId
      ? [toBytes12(searchValue), pid] : undefined,
    query: { enabled: searchTriggered && searchType === "memberID" && !!searchValue && !!programId },
  });

  // Search by program code
  const { data: programIdByCode, error: programError } = useProgramCodeToId(
    searchTriggered && searchType === "programCode" ? searchValue : ""
  );

  const { data: programByCode } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getProgram",
    args: programIdByCode && Number(programIdByCode) > 0 ? [Number(programIdByCode)] : undefined,
    query: { enabled: !!programIdByCode && Number(programIdByCode) > 0 },
  });

  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: memberByID?.wallet && memberByID.wallet !== "0x0000000000000000000000000000000000000000"
      ? [Number(memberByID.programId), memberByID.wallet as `0x${string}`] : undefined,
    query: { enabled: !!memberByID?.wallet && memberByID.wallet !== "0x0000000000000000000000000000000000000000" },
  });

  // Action hooks
  const { setMemberWallet, isPending: isSetWallet, isConfirming: isConfWallet, isSuccess: successWallet, error: errWallet } = useSetMemberWallet();
  const { setEditCodeHash, isPending: isSetCode, isConfirming: isConfCode, isSuccess: successCode, error: errCode } = useSetEditCodeHash();
  const { setMemberType, isPending: isSetType, isConfirming: isConfType, isSuccess: successType, error: errType } = useSetMemberType();
  const { removeMember, isPending: isRemoving, isConfirming: isConfRemove, isSuccess: successRemove, error: errRemove } = useRemoveMember();
  const { updateMemberID, isPending: isUpdatingID, isConfirming: isConfUpdateID, isSuccess: successUpdateID, error: errUpdateID } = useUpdateMemberID();

  // Dialog state
  const [activeDialog, setActiveDialog] = useState<"wallet" | "editCode" | "type" | "remove" | "updateID" | null>(null);
  const [newWallet, setNewWallet] = useState("");
  const [newType, setNewType] = useState(0);
  const [newMemberID, setNewMemberID] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [disclaimer, setDisclaimer] = useState(false);
  const [copied, setCopied] = useState(false);

  const memberIdStr = memberByID ? fromBytes12(memberByID.memberID as `0x${string}`) : "";
  const memberProgramId = memberByID ? Number(memberByID.programId) : 0;
  const { data: memberProgram } = useProgram(memberProgramId);
  const memberFound = searchTriggered && searchType === "memberID" && memberByID && memberByID.active;

  // Determine if connected user can manage this member
  const isParent = !!address && memberByID?.parent?.toLowerCase() === address.toLowerCase();
  const isCallerPA = callerRole === MemberRoleEnum.ProgramAdmin;
  const canManage = isAdmin || isParent || isCallerPA;
  const canRemove = isAdmin || (isCallerPA && Number(memberByID?.role) !== MemberRoleEnum.ProgramAdmin);
  const canUpdateID = isAdmin;

  // Close dialogs on success
  useEffect(() => { if (successWallet) { const t = setTimeout(() => { setActiveDialog(null); setSearchTriggered(false); setTimeout(() => setSearchTriggered(true), 100); }, 1200); return () => clearTimeout(t); } }, [successWallet]);
  useEffect(() => { if (successCode) { const t = setTimeout(() => setActiveDialog(null), 1200); return () => clearTimeout(t); } }, [successCode]);
  useEffect(() => { if (successType) { const t = setTimeout(() => { setActiveDialog(null); setSearchTriggered(false); setTimeout(() => setSearchTriggered(true), 100); }, 1200); return () => clearTimeout(t); } }, [successType]);
  useEffect(() => { if (successRemove) { const t = setTimeout(() => { setActiveDialog(null); setSearchTriggered(false); }, 1200); return () => clearTimeout(t); } }, [successRemove]);
  useEffect(() => { if (successUpdateID) { const t = setTimeout(() => { setActiveDialog(null); setSearchTriggered(false); }, 1200); return () => clearTimeout(t); } }, [successUpdateID]);

  const handleSearch = () => setSearchTriggered(true);

  const handleQRScan = ({ programId: p, memberID }: { programId: number; memberID: string }) => {
    setSearchType("memberID");
    setSearchValue(memberID);
    setProgramId(String(p));
    setSearchTriggered(true);
  };

  const openSetWallet = () => { setNewWallet(""); setDisclaimer(false); setActiveDialog("wallet"); };
  const openSetEditCode = () => {
    setGeneratedCode(generateEditCode());
    setDisclaimer(false);
    setCopied(false);
    setActiveDialog("editCode");
  };
  const openSetType = () => { setNewType(Number(memberByID?.memberType || 0)); setDisclaimer(false); setActiveDialog("type"); };
  const openRemove = () => { setDisclaimer(false); setActiveDialog("remove"); };
  const openUpdateID = () => { setNewMemberID(""); setDisclaimer(false); setActiveDialog("updateID"); };

  const handleSetWallet = () => {
    if (!memberIdStr || !pid) return;
    setMemberWallet(pid, memberIdStr, (newWallet || "0x0000000000000000000000000000000000000000") as `0x${string}`);
  };

  const handleSetEditCode = () => {
    if (!memberIdStr || !pid || !generatedCode) return;
    const hash = keccak256(generatedCode as `0x${string}`);
    setEditCodeHash(pid, memberIdStr, hash);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isWalletless = memberByID?.wallet === "0x0000000000000000000000000000000000000000";

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Search Members</Typography>

      <Paper sx={{ p: 3, mb: 3 }}>
        <ToggleButtonGroup value={searchType} exclusive
          onChange={(_, v) => { if (v) { setSearchType(v); setSearchTriggered(false); } }}
          sx={{ mb: 2 }} size={isMobile ? "small" : "medium"}>
          <ToggleButton value="memberID">By Member ID</ToggleButton>
          <ToggleButton value="programCode">By Program Code</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
          <TextField
            label={searchType === "memberID" ? "Member ID (= Reward ID)" : "Program Code"}
            value={searchValue}
            onChange={(e) => { setSearchValue(e.target.value.toUpperCase()); setSearchTriggered(false); }}
            sx={{ flexGrow: 1, minWidth: 150 }}
            inputProps={{ maxLength: searchType === "memberID" ? 12 : 8 }}
          />
          {searchType === "memberID" && (
            <TextField label="Program ID" value={programId}
              onChange={(e) => { setProgramId(e.target.value); setSearchTriggered(false); }}
              type="number" sx={{ width: 120 }} />
          )}
          <QRScannerButton tooltip="Scan member QR to search" onScan={handleQRScan} />
          <Button variant="contained" onClick={handleSearch} disabled={!searchValue}>Search</Button>
        </Box>
      </Paper>

      {/* Results - Member by ID */}
      {memberFound && (
        <Paper sx={{ p: { xs: 1, sm: 2 } }}>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Member ID</TableCell>
                  <TableCell>Wallet</TableCell>
                  <TableCell>Role</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Program</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Parent</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Balance (FULA)</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>QR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell>{memberIdStr}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>
                    {isWalletless ? <Chip label="Walletless" size="small" color="warning" /> : shortenAddress(memberByID.wallet)}
                  </TableCell>
                  <TableCell>
                    <Chip label={MemberRoleLabels[Number(memberByID.role)]} size="small"
                      color={Number(memberByID.role) === 3 ? "primary" : Number(memberByID.role) === 2 ? "secondary" : "default"} />
                  </TableCell>
                  <TableCell>
                    <Chip label={MemberTypeLabels[Number(memberByID.memberType)] || "Free"} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{memberByID.programId}</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{shortenAddress(memberByID.parent)}</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                    {balance ? `${formatFula(balance[0])} / ${formatFula(balance[1])} / ${formatFula(balance[2])}` : "-"}
                  </TableCell>
                  <TableCell>{memberByID.active ? "Active" : "Inactive"}</TableCell>
                  <TableCell>
                    <QRCodeDisplay programId={memberProgramId} memberID={memberIdStr} programName={memberProgram?.name} size={64} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>

          {/* Management Actions */}
          {canManage && address && (
            <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: "divider" }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Member Actions</Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button size="small" variant="outlined" onClick={openSetWallet}>
                  {isWalletless ? "Link Wallet" : "Change Wallet"}
                </Button>
                <Button size="small" variant="outlined" onClick={openSetEditCode}>
                  Set Edit Code
                </Button>
                <Button size="small" variant="outlined" onClick={openSetType}>
                  Change Type
                </Button>
                {canUpdateID && (
                  <Button size="small" variant="outlined" onClick={openUpdateID}>
                    Update Member ID
                  </Button>
                )}
                {canRemove && (
                  <Button size="small" variant="outlined" color="error" onClick={openRemove}>
                    Remove Member
                  </Button>
                )}
              </Box>
            </Box>
          )}
        </Paper>
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

      {/* Set Wallet Dialog */}
      <Dialog open={activeDialog === "wallet"} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>{isWalletless ? "Link Wallet" : "Change Wallet"}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Member: <strong>{memberIdStr}</strong> (Program {memberProgramId})
          </Typography>
          <TextField label="New Wallet Address" value={newWallet} onChange={(e) => setNewWallet(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!newWallet && !isValidAddress(newWallet)}
            helperText={!newWallet ? "Leave empty to unclaim (set to address(0))" : newWallet && !isValidAddress(newWallet) ? "Invalid address" : ""} />
          {errWallet && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errWallet)}</Alert>}
          {successWallet && <Alert severity="success" sx={{ mt: 2 }}>Wallet updated!</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSetWallet}
            disabled={isSetWallet || isConfWallet || !disclaimer || (!!newWallet && !isValidAddress(newWallet))}>
            {isSetWallet || isConfWallet ? <CircularProgress size={20} /> : "Set Wallet"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Edit Code Dialog */}
      <Dialog open={activeDialog === "editCode"} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Set Edit Code</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Member: <strong>{memberIdStr}</strong> (Program {memberProgramId})
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            A new edit code will be generated. Share it with the member so they can claim/reclaim their wallet. The old edit code will be replaced.
          </Alert>
          <Paper sx={{ p: 2, bgcolor: "background.default", display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flexGrow: 1 }}>
              {generatedCode}
            </Typography>
            <Button size="small" onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</Button>
          </Paper>
          {errCode && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errCode)}</Alert>}
          {successCode && <Alert severity="success" sx={{ mt: 2 }}>Edit code hash updated! Share the code above with the member.</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSetEditCode}
            disabled={isSetCode || isConfCode || !disclaimer}>
            {isSetCode || isConfCode ? <CircularProgress size={20} /> : "Set Code"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Member Type Dialog */}
      <Dialog open={activeDialog === "type"} onClose={() => setActiveDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change Member Type</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Member: <strong>{memberIdStr}</strong> (Program {memberProgramId})
          </Typography>
          <FormControl fullWidth margin="normal">
            <InputLabel>New Type</InputLabel>
            <Select value={newType} onChange={(e) => setNewType(Number(e.target.value))} label="New Type">
              {Object.entries(MemberTypeLabels).map(([k, v]) => (
                <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {errType && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errType)}</Alert>}
          {successType && <Alert severity="success" sx={{ mt: 2 }}>Member type updated!</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => setMemberType(memberProgramId, memberIdStr, newType)}
            disabled={isSetType || isConfType || !disclaimer}>
            {isSetType || isConfType ? <CircularProgress size={20} /> : "Change Type"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Member Dialog */}
      <Dialog open={activeDialog === "remove"} onClose={() => setActiveDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Remove Member</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to remove &quot;{memberIdStr}&quot; from Program {memberProgramId}?
            The member must have zero balance to be removed.
          </Alert>
          {errRemove && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errRemove)}</Alert>}
          {successRemove && <Alert severity="success" sx={{ mt: 2 }}>Member removed.</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Cancel</Button>
          <Button variant="contained" color="error"
            onClick={() => {
              const key = memberByID?.wallet === "0x0000000000000000000000000000000000000000"
                ? undefined : memberByID?.wallet as `0x${string}`;
              if (key) removeMember(memberProgramId, key);
            }}
            disabled={isRemoving || isConfRemove || !disclaimer || isWalletless}>
            {isRemoving || isConfRemove ? <CircularProgress size={20} /> : "Remove"}
          </Button>
        </DialogActions>
        {isWalletless && (
          <Box sx={{ px: 3, pb: 2 }}>
            <Alert severity="info">Walletless members need a wallet linked before they can be removed via storage key lookup. Use the contract directly.</Alert>
          </Box>
        )}
      </Dialog>

      {/* Update Member ID Dialog */}
      <Dialog open={activeDialog === "updateID"} onClose={() => setActiveDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Member ID</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Current Member ID: <strong>{memberIdStr}</strong> (Program {memberProgramId})
          </Typography>
          <TextField label="New Member ID" value={newMemberID} onChange={(e) => setNewMemberID(e.target.value.toUpperCase())}
            fullWidth margin="normal" inputProps={{ maxLength: 12 }} />
          {errUpdateID && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errUpdateID)}</Alert>}
          {successUpdateID && <Alert severity="success" sx={{ mt: 2 }}>Member ID updated!</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActiveDialog(null)}>Cancel</Button>
          <Button variant="contained" onClick={() => updateMemberID(memberProgramId, memberIdStr, newMemberID)}
            disabled={isUpdatingID || isConfUpdateID || !newMemberID || !disclaimer}>
            {isUpdatingID || isConfUpdateID ? <CircularProgress size={20} /> : "Update ID"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
