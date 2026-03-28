"use client";

import { useState, useEffect, Suspense } from "react";
import {
  Typography, Box, Paper, Button, TextField, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useAccount, useReadContract } from "wagmi";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useUserRole, useMemberRole } from "@/hooks/useUserRole";
import {
  useProgramCount, useProgram, useCreateProgram,
  useAssignProgramAdmin, useAddMember, useMemberBalance,
  useTransferLimit, useSetTransferLimit,
} from "@/hooks/useRewardsProgram";
import { CONTRACTS, REWARDS_PROGRAM_ABI, MemberRoleLabels, MemberRoleEnum, MemberTypeLabels } from "@/config/contracts";
import { fromBytes8, fromBytes12, shortenAddress, formatFula, isValidAddress, formatContractError } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";

/* -- Program List Row -- */

function ProgramRow({ programId }: { programId: number }) {
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
      <TableCell>{program.description}</TableCell>
      <TableCell>{program.active ? "Active" : "Inactive"}</TableCell>
    </TableRow>
  );
}

/* -- Member Row (for detail view) -- */

function MemberRow({ programId, wallet }: { programId: number; wallet: `0x${string}` }) {
  const { data: member } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: [programId, wallet],
  });
  const { data: balance } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: [programId, wallet],
  });

  if (!member) return null;

  const memberIdStr = fromBytes12(member.memberID as `0x${string}`);

  return (
    <TableRow hover>
      <TableCell>{memberIdStr}</TableCell>
      <TableCell sx={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{shortenAddress(member.wallet)}</TableCell>
      <TableCell>
        <Chip
          label={MemberRoleLabels[Number(member.role)] || "Unknown"}
          color={Number(member.role) === 3 ? "primary" : Number(member.role) === 2 ? "secondary" : "default"}
          size="small"
        />
      </TableCell>
      <TableCell>
        <Chip label={MemberTypeLabels[Number(member.memberType)] || "Free"} size="small" variant="outlined" />
      </TableCell>
      <TableCell>{shortenAddress(member.parent)}</TableCell>
      <TableCell>
        {balance ? `${formatFula(balance[0])} / ${formatFula(balance[1])} / ${formatFula(balance[2])}` : "-"}
      </TableCell>
      <TableCell>{member.active ? "Active" : "Inactive"}</TableCell>
      <TableCell>
        <QRCodeDisplay programId={programId} memberID={memberIdStr} size={64} />
      </TableCell>
    </TableRow>
  );
}

/* -- Program Detail View -- */

function ProgramDetail({ programId }: { programId: number }) {
  const { address } = useAccount();
  const { isAdmin } = useUserRole();
  const { role } = useMemberRole(programId);
  const { data: program } = useProgram(programId);
  const { data: myBalance } = useMemberBalance(programId, address);

  const { assignProgramAdmin, isPending: isPendingPA, isConfirming: isConfirmingPA, isSuccess: isSuccessPA, error: errorPA } = useAssignProgramAdmin();
  const { addMember, isPending: isPendingM, isConfirming: isConfirmingM, isSuccess: isSuccessM, error: errorM } = useAddMember();
  const { data: transferLimit } = useTransferLimit(programId);
  const { setTransferLimit, isPending: isPendingTL, isConfirming: isConfirmingTL, isSuccess: isSuccessTL, error: errorTL } = useSetTransferLimit();

  const [openPA, setOpenPA] = useState(false);
  const [openMember, setOpenMember] = useState(false);
  const [openTL, setOpenTL] = useState(false);
  const [tlValue, setTlValue] = useState("");
  const [paWallet, setPaWallet] = useState("");
  const [paMemberId, setPaMemberId] = useState("");
  const [mWallet, setMWallet] = useState("");
  const [mMemberId, setMMemberId] = useState("");
  const [mRole, setMRole] = useState(1);
  const [paMemberType, setPaMemberType] = useState(0);
  const [paDisclaimer, setPaDisclaimer] = useState(false);
  const [mMemberType, setMMemberType] = useState(0);
  const [mDisclaimer, setMDisclaimer] = useState(false);

  const canAddMembers = isAdmin || role === MemberRoleEnum.ProgramAdmin || role === MemberRoleEnum.TeamLeader;

  const paWalletValid = !paWallet || isValidAddress(paWallet);
  const mWalletValid = !mWallet || isValidAddress(mWallet);

  // Reset and close dialogs on success
  useEffect(() => {
    if (isSuccessPA) {
      const t = setTimeout(() => { setOpenPA(false); setPaWallet(""); setPaMemberId(""); setPaMemberType(0); setPaDisclaimer(false); }, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccessPA]);

  useEffect(() => {
    if (isSuccessM) {
      const t = setTimeout(() => { setOpenMember(false); setMWallet(""); setMMemberId(""); setMRole(1); setMMemberType(0); setMDisclaimer(false); }, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccessM]);

  if (!program) return <Typography>Loading...</Typography>;

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <IconButton component={Link} href="/programs" sx={{ mt: 0.5 }} aria-label="Back to programs">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h4">{program.name}</Typography>
            <Typography color="text.secondary">
              Code: {fromBytes8(program.code as `0x${string}`)} | ID: {program.id} | Transfer Limit: {transferLimit && Number(transferLimit) > 0 ? `${transferLimit}%` : "None"}
            </Typography>
            <Typography color="text.secondary">{program.description}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
          {isAdmin && (
            <Button variant="contained" onClick={() => setOpenPA(true)}>
              Add Program Admin
            </Button>
          )}
          {isAdmin && (
            <Button variant="outlined" onClick={() => { setTlValue(String(transferLimit && Number(transferLimit) > 0 ? transferLimit : "")); setOpenTL(true); }}>
              Set Transfer Limit
            </Button>
          )}
          {canAddMembers && (
            <Button variant="outlined" onClick={() => setOpenMember(true)}>
              Add Member
            </Button>
          )}
        </Box>
      </Box>

      {myBalance && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>My Balance in this Program</Typography>
          <Grid container spacing={2}>
            <Grid item xs={4}>
              <Typography color="text.secondary" variant="body2">Available</Typography>
              <Typography variant="h6" color="success.main">{formatFula(myBalance[0])} FULA</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography color="text.secondary" variant="body2">Permanently Locked</Typography>
              <Typography variant="h6" color="error.main">{formatFula(myBalance[1])} FULA</Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography color="text.secondary" variant="body2">Time-Locked</Typography>
              <Typography variant="h6" color="warning.main">{formatFula(myBalance[2])} FULA</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Members</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: "block" }}>
          Balance format: Available / Locked / Time-Locked
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Use the Members search page to look up specific members by ID.
        </Alert>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Member ID</TableCell>
                <TableCell>Wallet</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Parent</TableCell>
                <TableCell>Balance (FULA)</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>QR</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body2" color="text.secondary">
                    Search for members on the Members page by their Member ID.
                  </Typography>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Assign ProgramAdmin Dialog */}
      <Dialog open={openPA} onClose={() => setOpenPA(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Program Admin</DialogTitle>
        <DialogContent>
          <TextField label="Wallet Address (leave empty for walletless)" value={paWallet} onChange={(e) => setPaWallet(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!paWallet && !paWalletValid} helperText={paWallet && !paWalletValid ? "Invalid wallet address" : "Leave empty to create walletless member"} />
          <TextField label="Member ID" value={paMemberId} onChange={(e) => setPaMemberId(e.target.value)}
            fullWidth margin="normal" inputProps={{ maxLength: 12 }} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Member Type</InputLabel>
            <Select value={paMemberType} onChange={(e) => setPaMemberType(Number(e.target.value))} label="Member Type">
              {Object.entries(MemberTypeLabels).map(([k, v]) => (
                <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {errorPA && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorPA)}</Alert>}
          {isSuccessPA && <Alert severity="success" sx={{ mt: 2 }}>Program Admin assigned!</Alert>}
          <OnChainDisclaimer accepted={paDisclaimer} onChange={setPaDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPA(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => assignProgramAdmin(programId, (paWallet || "0x0000000000000000000000000000000000000000") as `0x${string}`, paMemberId, "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, paMemberType)}
            disabled={isPendingPA || isConfirmingPA || !paMemberId || !paDisclaimer || (!!paWallet && !paWalletValid)}>
            {isPendingPA || isConfirmingPA ? <CircularProgress size={20} /> : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={openMember} onClose={() => setOpenMember(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField label="Wallet Address (leave empty for walletless)" value={mWallet} onChange={(e) => setMWallet(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!mWallet && !mWalletValid} helperText={mWallet && !mWalletValid ? "Invalid wallet address" : "Leave empty to create walletless member"} />
          <TextField label="Member ID" value={mMemberId} onChange={(e) => setMMemberId(e.target.value)}
            fullWidth margin="normal" inputProps={{ maxLength: 12 }} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select value={mRole} onChange={(e) => setMRole(Number(e.target.value))} label="Role">
              {role === MemberRoleEnum.TeamLeader ? (
                <MenuItem value={1}>Client</MenuItem>
              ) : (
                [
                  <MenuItem key={2} value={2}>Team Leader</MenuItem>,
                  <MenuItem key={1} value={1}>Client</MenuItem>,
                ]
              )}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel>Member Type</InputLabel>
            <Select value={mMemberType} onChange={(e) => setMMemberType(Number(e.target.value))} label="Member Type">
              {Object.entries(MemberTypeLabels).map(([k, v]) => (
                <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {errorM && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorM)}</Alert>}
          {isSuccessM && <Alert severity="success" sx={{ mt: 2 }}>Member added!</Alert>}
          <OnChainDisclaimer accepted={mDisclaimer} onChange={setMDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMember(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => addMember(programId, (mWallet || "0x0000000000000000000000000000000000000000") as `0x${string}`, mMemberId, mRole, "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`, mMemberType)}
            disabled={isPendingM || isConfirmingM || !mMemberId || !mDisclaimer || (!!mWallet && !mWalletValid)}>
            {isPendingM || isConfirmingM ? <CircularProgress size={20} /> : "Add"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Transfer Limit Dialog */}
      <Dialog open={openTL} onClose={() => setOpenTL(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Set Transfer Limit</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Set the maximum percentage of balance a Client can transfer to their parent. Set to 0 for no limit.
          </Typography>
          <TextField label="Limit (%)" value={tlValue} onChange={(e) => setTlValue(e.target.value)}
            fullWidth margin="normal" type="number" inputProps={{ min: 0, max: 100 }}
            helperText="0 = no restriction, 50 = max 50% of balance" />
          {errorTL && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorTL)}</Alert>}
          {isSuccessTL && <Alert severity="success" sx={{ mt: 2 }}>Transfer limit updated!</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTL(false)}>Cancel</Button>
          <Button variant="contained"
            onClick={() => setTransferLimit(programId, parseInt(tlValue) || 0)}
            disabled={isPendingTL || isConfirmingTL}>
            {isPendingTL || isConfirmingTL ? <CircularProgress size={20} /> : "Set Limit"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* -- Program List View -- */

function ProgramList() {
  const { isAdmin } = useUserRole();
  const { data: programCount } = useProgramCount();
  const { createProgram, isPending, isConfirming, isSuccess, error } = useCreateProgram();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [disclaimer, setDisclaimer] = useState(false);

  // Reset and close dialog on success
  useEffect(() => {
    if (isSuccess) {
      const t = setTimeout(() => { setOpen(false); setCode(""); setName(""); setDescription(""); setDisclaimer(false); }, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess]);

  const handleCreate = () => {
    if (!code || !name) return;
    createProgram(code, name, description);
  };

  const count = Number(programCount || 0);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography variant="h4">Programs</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create Program
          </Button>
        )}
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {count === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">No programs yet.</TableCell>
              </TableRow>
            ) : (
              Array.from({ length: count }, (_, i) => (
                <ProgramRow key={i + 1} programId={i + 1} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Program</DialogTitle>
        <DialogContent>
          <TextField label="Program Code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
            fullWidth margin="normal" inputProps={{ maxLength: 8 }} helperText="Max 8 characters (e.g., SRP)" />
          <TextField label="Program Name" value={name} onChange={(e) => setName(e.target.value)}
            fullWidth margin="normal" />
          <TextField label="Description" value={description} onChange={(e) => setDescription(e.target.value)}
            fullWidth margin="normal" multiline rows={3} />
          {error && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(error)}</Alert>}
          {isSuccess && <Alert severity="success" sx={{ mt: 2 }}>Program created!</Alert>}
          <OnChainDisclaimer accepted={disclaimer} onChange={setDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={isPending || isConfirming || !code || !name || !disclaimer}>
            {isPending || isConfirming ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* -- Router: list vs detail based on ?id= -- */

function ProgramsContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const programId = idParam ? parseInt(idParam) : 0;

  if (programId > 0) {
    return <ProgramDetail programId={programId} />;
  }
  return <ProgramList />;
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<Typography>Loading...</Typography>}>
      <ProgramsContent />
    </Suspense>
  );
}
