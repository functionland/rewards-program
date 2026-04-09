"use client";

import { useState, useEffect, Suspense, useCallback } from "react";
import {
  Typography, Box, Paper, Button, TextField, Grid, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress,
  Select, MenuItem, FormControl, InputLabel, IconButton, Tooltip,
  Accordion, AccordionSummary, AccordionDetails, useMediaQuery, useTheme,
  Tabs, Tab,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import BlockIcon from "@mui/icons-material/Block";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useAccount, useReadContract } from "wagmi";
import { useSearchParams } from "next/navigation";
import { keccak256 } from "viem";
import Link from "next/link";
import { useUserRole, useMemberRole } from "@/hooks/useUserRole";
import {
  useProgramCount, useProgram, useCreateProgram,
  useAssignProgramAdmin, useAddMember, useMemberBalance,
  useTransferLimit, useSetTransferLimit,
  useUpdateProgram, useDeactivateProgram,
  useAddRewardType, useRemoveRewardType, useRewardTypes,
  useAddSubType, useRemoveSubType, useSubTypes,
  useDepositTokens, useTransferToSubMember, useTransferToParent, useWithdraw,
  useTokenBalance, useProgramLogo, useSetProgramLogo,
} from "@/hooks/useRewardsProgram";
import { MemberRoleLabels, MemberRoleEnum, MemberTypeLabels, CONTRACTS, REWARDS_PROGRAM_ABI } from "@/config/contracts";
import { fromBytes8, fromBytes12, fromBytes16, toBytes12, shortenAddress, formatFula, isValidAddress, formatContractError, ipfsLogoUrl, parseCID } from "@/lib/utils";
import { OnChainDisclaimer } from "@/components/common/OnChainDisclaimer";
import { QRCodeDisplay } from "@/components/common/QRCodeDisplay";

function generateEditCode(): `0x${string}` {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return ("0x" + Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("")) as `0x${string}`;
}

/* -- Program List Row -- */

function ProgramRow({ programId, filterMine, wallet, isAdmin }: { programId: number; filterMine?: boolean; wallet?: `0x${string}`; isAdmin?: boolean }) {
  const { data: program } = useProgram(programId);
  const { role, isActive } = useMemberRole(programId);

  if (!program) return null;
  if (filterMine && !isAdmin && (!isActive || role === 0)) return null;

  return (
    <TableRow hover>
      <TableCell>{program.id}</TableCell>
      <TableCell>{fromBytes8(program.code as `0x${string}`)}</TableCell>
      <TableCell>
        <Link href={`/programs?id=${program.id}`} style={{ color: "#6366f1", textDecoration: "none" }}>
          {program.name}
        </Link>
      </TableCell>
      <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>{program.description}</TableCell>
      <TableCell>{program.active ? <Chip label="Active" color="success" size="small" /> : <Chip label="Inactive" size="small" />}</TableCell>
      <TableCell>
        <Button component={Link} href={`/programs?id=${program.id}`} size="small" variant="outlined">
          Open
        </Button>
      </TableCell>
    </TableRow>
  );
}

/* -- Reward Types Management (inline) -- */

function RewardTypesSection({ programId, isAdmin }: { programId: number; isAdmin: boolean }) {
  const { data: rewardTypesData } = useRewardTypes(programId);
  const { addRewardType, isPending: isAddingRT, isConfirming: isConfirmingRT, isSuccess: addRTSuccess, error: addRTError } = useAddRewardType();
  const { removeRewardType, isPending: isRemovingRT, isConfirming: isConfirmingRemRT } = useRemoveRewardType();
  const [rtId, setRtId] = useState("");
  const [rtName, setRtName] = useState("");

  useEffect(() => {
    if (addRTSuccess) { setRtId(""); setRtName(""); }
  }, [addRTSuccess]);

  const ids = rewardTypesData ? (rewardTypesData as [number[], `0x${string}`[]])[0] : [];
  const names = rewardTypesData ? (rewardTypesData as [number[], `0x${string}`[]])[1] : [];

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Reward Types ({ids.length})</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              {isAdmin && <TableCell width={60}>Remove</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {ids.map((id: number, idx: number) => (
              <TableRow key={id}>
                <TableCell>{id}</TableCell>
                <TableCell>{fromBytes16(names[idx])}</TableCell>
                {isAdmin && (
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => removeRewardType(programId, id)}
                      disabled={isRemovingRT || isConfirmingRemRT}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {ids.length === 0 && (
              <TableRow><TableCell colSpan={isAdmin ? 3 : 2} align="center"><Typography variant="body2" color="text.secondary">No reward types defined.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        {isAdmin && (
          <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap", alignItems: "center" }}>
            <TextField label="Type ID" value={rtId} onChange={(e) => setRtId(e.target.value)}
              size="small" type="number" sx={{ width: 100 }} inputProps={{ min: 0, max: 255 }} />
            <TextField label="Name" value={rtName} onChange={(e) => setRtName(e.target.value)}
              size="small" sx={{ flexGrow: 1, minWidth: 120 }} inputProps={{ maxLength: 16 }} />
            <Button variant="outlined" size="small"
              onClick={() => addRewardType(programId, parseInt(rtId), rtName)}
              disabled={isAddingRT || isConfirmingRT || !rtId || !rtName}>
              {isAddingRT || isConfirmingRT ? <CircularProgress size={16} /> : "Add"}
            </Button>
          </Box>
        )}
        {addRTError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(addRTError)}</Alert>}
        {addRTSuccess && <Alert severity="success" sx={{ mt: 1 }}>Reward type added!</Alert>}
      </AccordionDetails>
    </Accordion>
  );
}

/* -- Sub-Types Management (inline) -- */

function SubTypesSection({ programId, canManage }: { programId: number; canManage: boolean }) {
  const { data: rewardTypesData } = useRewardTypes(programId);
  const [selectedRT, setSelectedRT] = useState(0);
  const { data: subTypesData } = useSubTypes(programId, selectedRT);
  const { addSubType, isPending: isAddingST, isConfirming: isConfirmingST, isSuccess: addSTSuccess, error: addSTError } = useAddSubType();
  const { removeSubType, isPending: isRemovingST, isConfirming: isConfirmingRemST } = useRemoveSubType();
  const [stId, setStId] = useState("");
  const [stName, setStName] = useState("");

  useEffect(() => {
    if (addSTSuccess) { setStId(""); setStName(""); }
  }, [addSTSuccess]);

  const rtIds = rewardTypesData ? (rewardTypesData as [number[], `0x${string}`[]])[0] : [];
  const rtNames = rewardTypesData ? (rewardTypesData as [number[], `0x${string}`[]])[1] : [];
  const stIds = subTypesData ? (subTypesData as [number[], `0x${string}`[]])[0] : [];
  const stNames = subTypesData ? (subTypesData as [number[], `0x${string}`[]])[1] : [];

  return (
    <Accordion>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle1">Sub-Types</Typography>
      </AccordionSummary>
      <AccordionDetails>
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Reward Type</InputLabel>
          <Select value={selectedRT} onChange={(e) => setSelectedRT(Number(e.target.value))} label="Reward Type">
            <MenuItem value={0}>-- Select --</MenuItem>
            {rtIds.map((id: number, idx: number) => (
              <MenuItem key={id} value={id}>{fromBytes16(rtNames[idx]) || `Type ${id}`}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {selectedRT > 0 && (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>ID</TableCell>
                  <TableCell>Name</TableCell>
                  {canManage && <TableCell width={60}>Remove</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {stIds.map((id: number, idx: number) => (
                  <TableRow key={id}>
                    <TableCell>{id}</TableCell>
                    <TableCell>{fromBytes16(stNames[idx])}</TableCell>
                    {canManage && (
                      <TableCell>
                        <IconButton size="small" color="error"
                          onClick={() => removeSubType(programId, selectedRT, id)}
                          disabled={isRemovingST || isConfirmingRemST}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {stIds.length === 0 && (
                  <TableRow><TableCell colSpan={canManage ? 3 : 2} align="center"><Typography variant="body2" color="text.secondary">No sub-types for this reward type.</Typography></TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {canManage && (
              <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap", alignItems: "center" }}>
                <TextField label="Sub-type ID" value={stId} onChange={(e) => setStId(e.target.value)}
                  size="small" type="number" sx={{ width: 110 }} inputProps={{ min: 0, max: 255 }} />
                <TextField label="Name" value={stName} onChange={(e) => setStName(e.target.value)}
                  size="small" sx={{ flexGrow: 1, minWidth: 120 }} inputProps={{ maxLength: 16 }} />
                <Button variant="outlined" size="small"
                  onClick={() => addSubType(programId, selectedRT, parseInt(stId), stName)}
                  disabled={isAddingST || isConfirmingST || !stId || !stName}>
                  {isAddingST || isConfirmingST ? <CircularProgress size={16} /> : "Add"}
                </Button>
              </Box>
            )}
            {addSTError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(addSTError)}</Alert>}
            {addSTSuccess && <Alert severity="success" sx={{ mt: 1 }}>Sub-type added!</Alert>}
          </>
        )}
      </AccordionDetails>
    </Accordion>
  );
}

/* -- Program Detail View -- */

function ProgramDetail({ programId }: { programId: number }) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { address } = useAccount();
  const { isAdmin } = useUserRole();
  const { role } = useMemberRole(programId);
  const { data: program, refetch: refetchProgram } = useProgram(programId);
  const { data: myBalance } = useMemberBalance(programId, address);
  const { data: transferLimit } = useTransferLimit(programId);

  // My member info (for parent detection)
  const { data: myMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMember",
    args: address ? [programId, address] : undefined,
    query: { enabled: !!address && programId > 0 },
  });
  const parentAddr = myMember?.parent && myMember.parent !== "0x0000000000000000000000000000000000000000" ? myMember.parent as string : "";

  const isPA = role === MemberRoleEnum.ProgramAdmin;
  const canManageProgram = isAdmin || isPA;
  const canManageSubTypes = isAdmin || isPA;
  const canSetTransferLimit = isAdmin || isPA;
  const canAddMembers = isAdmin || isPA || role === MemberRoleEnum.TeamLeader;

  // Assign PA
  const { assignProgramAdmin, isPending: isPendingPA, isConfirming: isConfirmingPA, isSuccess: isSuccessPA, error: errorPA } = useAssignProgramAdmin();
  const [openPA, setOpenPA] = useState(false);
  const [paWallet, setPaWallet] = useState("");
  const [paMemberId, setPaMemberId] = useState("");
  const [paMemberType, setPaMemberType] = useState(0);
  const [paDisclaimer, setPaDisclaimer] = useState(false);
  const [paEditCode, setPaEditCode] = useState<`0x${string}` | "">("");

  // Add Member
  const { addMember, isPending: isPendingM, isConfirming: isConfirmingM, isSuccess: isSuccessM, error: errorM } = useAddMember();
  const [openMember, setOpenMember] = useState(false);
  const [mWallet, setMWallet] = useState("");
  const [mMemberId, setMMemberId] = useState("");
  const [mRole, setMRole] = useState(1);
  const [mMemberType, setMMemberType] = useState(0);
  const [mDisclaimer, setMDisclaimer] = useState(false);
  const [mEditCode, setMEditCode] = useState<`0x${string}` | "">("");

  // Transfer Limit
  const { setTransferLimit, isPending: isPendingTL, isConfirming: isConfirmingTL, isSuccess: isSuccessTL, error: errorTL } = useSetTransferLimit();
  const [openTL, setOpenTL] = useState(false);
  const [tlValue, setTlValue] = useState("");

  // Edit Program
  const { updateProgram, isPending: isPendingEP, isConfirming: isConfirmingEP, isSuccess: isSuccessEP, error: errorEP } = useUpdateProgram();
  const [openEdit, setOpenEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");

  // Deactivate Program
  const { deactivateProgram, isPending: isPendingDP, isConfirming: isConfirmingDP, isSuccess: isSuccessDP, error: errorDP } = useDeactivateProgram();
  const [openDeactivate, setOpenDeactivate] = useState(false);

  // Program Logo
  const { data: logoCID } = useProgramLogo(programId);
  const logoUrl = logoCID ? ipfsLogoUrl(logoCID as string) : "";
  const { setProgramLogo, isPending: isPendingLogo, isConfirming: isConfirmingLogo, isSuccess: isSuccessLogo, error: errorLogo } = useSetProgramLogo();
  const [openLogo, setOpenLogo] = useState(false);
  const [logoCIDInput, setLogoCIDInput] = useState("");

  // Show generated editCode
  const [showEditCodeDialog, setShowEditCodeDialog] = useState(false);
  const [displayEditCode, setDisplayEditCode] = useState("");
  const [displayMemberId, setDisplayMemberId] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Token Operations
  const { data: walletBalance } = useTokenBalance(address);
  const { deposit: depositTokens, isApproving: isDepApproving, isDepositing: isDepDepositing, isPending: isDepPending, isSuccess: depSuccess, error: depError, reset: resetDep } = useDepositTokens();
  const { transfer, isPending: isTransPending, isConfirming: isTransConf, isSuccess: transSuccess, error: transError } = useTransferToSubMember();
  const { transferBack, isPending: isTransBackPending, isConfirming: isTransBackConf, isSuccess: transBackSuccess, error: transBackError } = useTransferToParent();
  const { withdraw, isPending: isWithPending, isConfirming: isWithConf, isSuccess: withSuccess, error: withError } = useWithdraw();
  const [depAmount, setDepAmount] = useState("");
  const [depNote, setDepNote] = useState("");
  const [depDisclaimer, setDepDisclaimer] = useState(false);
  const [depRewardType, setDepRewardType] = useState(0);
  const { data: rewardTypesForDep } = useRewardTypes(programId);
  const [transMemberCode, setTransMemberCode] = useState("");
  const [transTo, setTransTo] = useState("");
  const [transAmount, setTransAmount] = useState("");
  const [transLocked, setTransLocked] = useState(true);
  const [transLockDays, setTransLockDays] = useState("0");
  const [transNote, setTransNote] = useState("");
  const [transRewardType, setTransRewardType] = useState(0);
  const [transSubType, setTransSubType] = useState(0);
  const { data: rewardTypesForTrans } = useRewardTypes(programId);
  const { data: subTypesForTrans } = useSubTypes(programId, transRewardType);
  const [transDisclaimer, setTransDisclaimer] = useState(false);
  const [parentTo, setParentTo] = useState("");
  const [parentAmount, setParentAmount] = useState("");
  const [parentNote, setParentNote] = useState("");
  const [parentDisclaimer, setParentDisclaimer] = useState(false);
  const [withAmount, setWithAmount] = useState("");
  const [withDisclaimer, setWithDisclaimer] = useState(false);
  const [tokenTab, setTokenTab] = useState(0);
  const canTransferSub = isAdmin || isPA || role === MemberRoleEnum.TeamLeader;
  const isMember = role > 0 || isAdmin;

  // Resolve member code → storage key for transfers
  const transMemberCodeBytes = transMemberCode.length > 0 ? toBytes12(transMemberCode) : undefined;
  const { data: transResolvedKey } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "memberIDLookup",
    args: transMemberCodeBytes ? [transMemberCodeBytes, programId] : undefined,
    query: { enabled: !!transMemberCodeBytes && programId > 0 },
  });
  const { data: transResolvedMember } = useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getMemberByID",
    args: transMemberCodeBytes ? [transMemberCodeBytes, programId] : undefined,
    query: { enabled: !!transMemberCodeBytes && programId > 0 },
  });
  const transResolvedAddr = transResolvedKey && transResolvedKey !== "0x0000000000000000000000000000000000000000" ? transResolvedKey as string : "";
  const transTarget = transResolvedAddr || transTo;

  const paWalletValid = !paWallet || isValidAddress(paWallet);
  const mWalletValid = !mWallet || isValidAddress(mWallet);

  // Generate editCode when creating walletless member
  const openPADialog = useCallback(() => {
    setPaWallet(""); setPaMemberId(""); setPaMemberType(0); setPaDisclaimer(false);
    const code = generateEditCode();
    setPaEditCode(code);
    setOpenPA(true);
  }, []);

  const openMemberDialog = useCallback(() => {
    setMWallet(""); setMMemberId(""); setMRole(1); setMMemberType(0); setMDisclaimer(false);
    const code = generateEditCode();
    setMEditCode(code);
    setOpenMember(true);
  }, []);

  // After PA assigned
  useEffect(() => {
    if (isSuccessPA) {
      if (!paWallet && paEditCode) {
        setDisplayEditCode(paEditCode);
        setDisplayMemberId(paMemberId);
      }
      const t = setTimeout(() => {
        setOpenPA(false);
        if (!paWallet && paEditCode) setShowEditCodeDialog(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isSuccessPA, paWallet, paEditCode, paMemberId]);

  // After member added
  useEffect(() => {
    if (isSuccessM) {
      if (!mWallet && mEditCode) {
        setDisplayEditCode(mEditCode);
        setDisplayMemberId(mMemberId);
      }
      const t = setTimeout(() => {
        setOpenMember(false);
        if (!mWallet && mEditCode) setShowEditCodeDialog(true);
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isSuccessM, mWallet, mEditCode, mMemberId]);

  // After program edited
  useEffect(() => {
    if (isSuccessEP) {
      refetchProgram();
      const t = setTimeout(() => setOpenEdit(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isSuccessEP, refetchProgram]);

  // After program deactivated
  useEffect(() => {
    if (isSuccessDP) {
      refetchProgram();
      const t = setTimeout(() => setOpenDeactivate(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isSuccessDP, refetchProgram]);

  // After logo set
  useEffect(() => {
    if (isSuccessLogo) {
      const t = setTimeout(() => setOpenLogo(false), 1200);
      return () => clearTimeout(t);
    }
  }, [isSuccessLogo]);

  const handleAssignPA = () => {
    const wallet = (paWallet || "0x0000000000000000000000000000000000000000") as `0x${string}`;
    let hash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (!paWallet && paEditCode) {
      hash = keccak256(paEditCode);
    }
    assignProgramAdmin(programId, wallet, paMemberId, hash, paMemberType);
  };

  const handleAddMember = () => {
    const wallet = (mWallet || "0x0000000000000000000000000000000000000000") as `0x${string}`;
    let hash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000";
    if (!mWallet && mEditCode) {
      hash = keccak256(mEditCode);
    }
    addMember(programId, wallet, mMemberId, mRole, hash, mMemberType);
  };

  const claimUrl = displayEditCode && displayMemberId
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/balance?member=${encodeURIComponent(displayMemberId)}&claim=${programId}&code=${encodeURIComponent(displayEditCode)}`
    : "";

  const handleCopyEditCode = () => {
    navigator.clipboard.writeText(displayEditCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(claimUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!program) return <Typography>Loading...</Typography>;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "space-between", mb: 3, gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <IconButton component={Link} href="/programs" sx={{ mt: 0.5 }} aria-label="Back to programs">
            <ArrowBackIcon />
          </IconButton>
          {logoUrl && (
            <Box
              component="img"
              src={logoUrl}
              alt={`${program.name} logo`}
              sx={{
                width: { xs: 56, sm: 72 },
                height: { xs: 56, sm: 72 },
                borderRadius: 2,
                objectFit: "contain",
                flexShrink: 0,
              }}
            />
          )}
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
              <Typography variant="h5">{program.name}</Typography>
              {!program.active && <Chip label="Inactive" color="error" size="small" />}
            </Box>
            <Typography variant="body2" color="text.secondary">
              Code: {fromBytes8(program.code as `0x${string}`)} | ID: {program.id} | Transfer Limit: {transferLimit && Number(transferLimit) > 0 ? `${transferLimit}%` : "None"}
            </Typography>
            <Typography variant="body2" color="text.secondary">{program.description}</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "flex-start" }}>
          {canManageProgram && program.active && (
            <>
              <Tooltip title="Edit program name/description">
                <Button size="small" variant="outlined" startIcon={<EditIcon />}
                  onClick={() => { setEditName(program.name); setEditDesc(program.description); setOpenEdit(true); }}>
                  Edit
                </Button>
              </Tooltip>
              <Tooltip title="Deactivate program">
                <Button size="small" variant="outlined" color="error" startIcon={<BlockIcon />}
                  onClick={() => setOpenDeactivate(true)}>
                  Deactivate
                </Button>
              </Tooltip>
            </>
          )}
          {canManageProgram && program.active && (
            <Button size="small" variant="outlined"
              onClick={() => { setLogoCIDInput((logoCID as string) || ""); setOpenLogo(true); }}>
              {logoUrl ? "Change Logo" : "Set Logo"}
            </Button>
          )}
          {canSetTransferLimit && program.active && (
            <Button size="small" variant="outlined"
              onClick={() => { setTlValue(String(transferLimit && Number(transferLimit) > 0 ? transferLimit : "")); setOpenTL(true); }}>
              Transfer Limit
            </Button>
          )}
          {isAdmin && program.active && (
            <Button size="small" variant="contained" onClick={openPADialog}>
              Add Program Admin
            </Button>
          )}
          {canAddMembers && program.active && (
            <Button size="small" variant="outlined" onClick={openMemberDialog}>
              Add Member
            </Button>
          )}
        </Box>
      </Box>

      {/* My Balance */}
      {myBalance && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>My Balance in this Program</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary" variant="body2">Available</Typography>
              <Typography variant="h6" color="success.main">{formatFula(myBalance[0])} FULA</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary" variant="body2">Permanently Locked</Typography>
              <Typography variant="h6" color="error.main">{formatFula(myBalance[1])} FULA</Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography color="text.secondary" variant="body2">Time-Locked</Typography>
              <Typography variant="h6" color="warning.main">{formatFula(myBalance[2])} FULA</Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Token Actions */}
      {isMember && program.active && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
            <Typography variant="h6">Token Actions</Typography>
            {walletBalance != null && (
              <Typography variant="body2" color="text.secondary">
                Wallet: {formatFula(walletBalance)} FULA
              </Typography>
            )}
          </Box>
          <Tabs value={tokenTab} onChange={(_, v) => setTokenTab(v)} variant="scrollable" scrollButtons="auto">
            <Tab label="Deposit" />
            {canTransferSub && <Tab label="Transfer to Sub-Member" />}
            <Tab label="Transfer to Parent" />
            <Tab label="Withdraw" />
          </Tabs>

          {/* Deposit */}
          {tokenTab === 0 && (
            <Box sx={{ pt: 2, maxWidth: 480 }}>
              <TextField label="Amount (FULA)" value={depAmount} onChange={(e) => setDepAmount(e.target.value)}
                fullWidth size="small" type="number" />
              {rewardTypesForDep && (rewardTypesForDep as [number[], `0x${string}`[]])[0]?.length > 0 && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Reward Type</InputLabel>
                  <Select value={depRewardType} onChange={(e) => setDepRewardType(Number(e.target.value))} label="Reward Type">
                    <MenuItem value={0}>None</MenuItem>
                    {(rewardTypesForDep as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                      <MenuItem key={id} value={id}>
                        {fromBytes16((rewardTypesForDep as [number[], `0x${string}`[]])[1][idx]) || `Type ${id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField label="Note (max 128)" value={depNote}
                onChange={(e) => setDepNote(e.target.value.slice(0, 128))}
                fullWidth size="small" sx={{ mt: 1 }} inputProps={{ maxLength: 128 }} />
              <OnChainDisclaimer accepted={depDisclaimer} onChange={setDepDisclaimer} />
              <Button variant="contained" fullWidth sx={{ mt: 1 }}
                onClick={() => depositTokens(programId, depAmount, depRewardType, depNote)}
                disabled={isDepPending || !depAmount || !depDisclaimer}>
                {isDepApproving ? <><CircularProgress size={16} sx={{ mr: 0.5 }} /> Approving...</>
                  : isDepDepositing ? <><CircularProgress size={16} sx={{ mr: 0.5 }} /> Depositing...</>
                  : "Deposit"}
              </Button>
              {depSuccess && <Alert severity="success" sx={{ mt: 1 }}>Deposited!</Alert>}
              {depError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(depError)}</Alert>}
            </Box>
          )}

          {/* Transfer to Sub-Member */}
          {canTransferSub && tokenTab === 1 && (
            <Box sx={{ pt: 2, maxWidth: 480 }}>
              <TextField label="Recipient Member Code" value={transMemberCode}
                onChange={(e) => setTransMemberCode(e.target.value.toUpperCase().slice(0, 12))}
                fullWidth size="small" placeholder="e.g. ALICE01"
                inputProps={{ maxLength: 12 }} />
              {transMemberCode && transResolvedAddr && transResolvedMember && (
                <Alert severity="success" sx={{ mt: 1 }}>
                  Resolved: <strong>{fromBytes12(transResolvedMember.memberID)}</strong> — {MemberRoleLabels[transResolvedMember.role] || "Unknown"}
                  {transResolvedMember.wallet && transResolvedMember.wallet !== "0x0000000000000000000000000000000000000000"
                    ? ` (${shortenAddress(transResolvedMember.wallet)})`
                    : " (walletless member)"}
                </Alert>
              )}
              {transMemberCode && !transResolvedAddr && transMemberCodeBytes && (
                <Alert severity="warning" sx={{ mt: 1 }}>Member not found in this program.</Alert>
              )}
              <TextField label="Override Wallet (optional)" value={transTo} onChange={(e) => setTransTo(e.target.value)}
                fullWidth size="small" sx={{ mt: 1 }} placeholder="0x... (only if member code is empty)"
                error={!!transTo && !isValidAddress(transTo)}
                helperText="Used only when member code is empty"
                disabled={!!transResolvedAddr} />
              <TextField label="Amount (FULA)" value={transAmount} onChange={(e) => setTransAmount(e.target.value)}
                fullWidth size="small" type="number" sx={{ mt: 1 }} />
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Lock</InputLabel>
                  <Select value={transLocked ? "locked" : "unlocked"}
                    onChange={(e) => { setTransLocked(e.target.value === "locked"); if (e.target.value === "locked") setTransLockDays("0"); }} label="Lock">
                    <MenuItem value="locked">Permanently Locked</MenuItem>
                    <MenuItem value="unlocked">Unlocked / Time-locked</MenuItem>
                  </Select>
                </FormControl>
                <Tooltip title="If you check Permanently Locked, the recipient can only transfer the tokens back to sender and cannot withdraw to their wallet" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
                </Tooltip>
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
                <TextField label="Lock Days (0 = unlocked)" value={transLockDays}
                  onChange={(e) => setTransLockDays(e.target.value)}
                  fullWidth size="small" type="number" disabled={transLocked} />
                <Tooltip title="If you set a time, the user needs to wait for that number of days before they can withdraw tokens to their wallet. They can still transfer tokens back to sender at any time without waiting" arrow>
                  <InfoOutlinedIcon sx={{ fontSize: 16, color: "text.secondary", cursor: "help" }} />
                </Tooltip>
              </Box>
              {rewardTypesForTrans && (rewardTypesForTrans as [number[], `0x${string}`[]])[0]?.length > 0 && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Reward Type</InputLabel>
                  <Select value={transRewardType} onChange={(e) => { setTransRewardType(Number(e.target.value)); setTransSubType(0); }} label="Reward Type">
                    <MenuItem value={0}>None</MenuItem>
                    {(rewardTypesForTrans as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                      <MenuItem key={id} value={id}>
                        {fromBytes16((rewardTypesForTrans as [number[], `0x${string}`[]])[1][idx]) || `Type ${id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {transRewardType > 0 && subTypesForTrans && (subTypesForTrans as [number[], `0x${string}`[]])[0]?.length > 0 && (
                <FormControl fullWidth size="small" sx={{ mt: 1 }}>
                  <InputLabel>Sub-Type</InputLabel>
                  <Select value={transSubType} onChange={(e) => setTransSubType(Number(e.target.value))} label="Sub-Type">
                    <MenuItem value={0}>None</MenuItem>
                    {(subTypesForTrans as [number[], `0x${string}`[]])[0].map((id: number, idx: number) => (
                      <MenuItem key={id} value={id}>
                        {fromBytes16((subTypesForTrans as [number[], `0x${string}`[]])[1][idx]) || `Sub-Type ${id}`}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <TextField label="Note (optional, max 128)" value={transNote}
                onChange={(e) => setTransNote(e.target.value.slice(0, 128))}
                fullWidth size="small" sx={{ mt: 1 }} inputProps={{ maxLength: 128 }}
                helperText={`${transNote.length}/128`} />
              <OnChainDisclaimer accepted={transDisclaimer} onChange={setTransDisclaimer} />
              <Button variant="contained" fullWidth sx={{ mt: 1 }}
                onClick={() => transfer(programId, transTarget as `0x${string}`, transAmount, transLocked, parseInt(transLockDays) || 0, transRewardType, transSubType, transNote)}
                disabled={isTransPending || isTransConf || !transTarget || !transAmount || (!transResolvedAddr && !!transTo && !isValidAddress(transTo)) || !transDisclaimer}>
                {isTransPending || isTransConf ? <CircularProgress size={16} /> : "Transfer"}
              </Button>
              {transSuccess && <Alert severity="success" sx={{ mt: 1 }}>Transferred!</Alert>}
              {transError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(transError)}</Alert>}
            </Box>
          )}

          {/* Transfer to Parent */}
          {tokenTab === (canTransferSub ? 2 : 1) && (
            <Box sx={{ pt: 2, maxWidth: 480 }}>
              {parentAddr && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  Your parent: <strong>{shortenAddress(parentAddr)}</strong>. Leave wallet empty to transfer directly to them.
                </Alert>
              )}
              {transferLimit != null && Number(transferLimit) > 0 && (
                <Alert severity="info" sx={{ mb: 1 }}>Limit: {String(transferLimit)}% of total balance</Alert>
              )}
              <TextField label="Override Parent Wallet (optional)" value={parentTo}
                onChange={(e) => setParentTo(e.target.value)}
                fullWidth size="small" error={!!parentTo && !isValidAddress(parentTo)}
                helperText="Leave empty to transfer to your direct parent" />
              <TextField label="Amount (FULA)" value={parentAmount} onChange={(e) => setParentAmount(e.target.value)}
                fullWidth size="small" type="number" sx={{ mt: 1 }} />
              <TextField label="Note (optional, max 128)" value={parentNote}
                onChange={(e) => setParentNote(e.target.value.slice(0, 128))}
                fullWidth size="small" sx={{ mt: 1 }} inputProps={{ maxLength: 128 }}
                helperText={`${parentNote.length}/128`} />
              <OnChainDisclaimer accepted={parentDisclaimer} onChange={setParentDisclaimer} />
              <Button variant="contained" fullWidth sx={{ mt: 1 }}
                onClick={() => transferBack(programId, (parentTo || "0x0000000000000000000000000000000000000000") as `0x${string}`, parentAmount, parentNote)}
                disabled={isTransBackPending || isTransBackConf || !parentAmount || !parentDisclaimer}>
                {isTransBackPending || isTransBackConf ? <CircularProgress size={16} /> : "Transfer to Parent"}
              </Button>
              {transBackSuccess && <Alert severity="success" sx={{ mt: 1 }}>Transferred!</Alert>}
              {transBackError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(transBackError)}</Alert>}
            </Box>
          )}

          {/* Withdraw */}
          {tokenTab === (canTransferSub ? 3 : 2) && (
            <Box sx={{ pt: 2, maxWidth: 480 }}>
              <TextField label="Amount (FULA)" value={withAmount} onChange={(e) => setWithAmount(e.target.value)}
                fullWidth size="small" type="number" />
              <OnChainDisclaimer accepted={withDisclaimer} onChange={setWithDisclaimer} />
              <Button variant="contained" fullWidth sx={{ mt: 1 }}
                onClick={() => withdraw(programId, withAmount)}
                disabled={isWithPending || isWithConf || !withAmount || !withDisclaimer}>
                {isWithPending || isWithConf ? <CircularProgress size={16} /> : "Withdraw"}
              </Button>
              {withSuccess && <Alert severity="success" sx={{ mt: 1 }}>Withdrawn!</Alert>}
              {withError && <Alert severity="error" sx={{ mt: 1 }}>{formatContractError(withError)}</Alert>}
            </Box>
          )}
        </Paper>
      )}

      {/* Reward Types & Sub-Types */}
      {(isAdmin || canManageSubTypes) && program.active && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Reward Configuration</Typography>
          <RewardTypesSection programId={programId} isAdmin={isAdmin || isPA} />
          <SubTypesSection programId={programId} canManage={canManageSubTypes} />
        </Paper>
      )}

      {/* Members info */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>Members</Typography>
        <Alert severity="info">
          Use the <Link href="/members" style={{ color: "#6366f1" }}>Members search page</Link> to look up and manage specific members by ID.
        </Alert>
      </Paper>

      {/* Assign ProgramAdmin Dialog */}
      <Dialog open={openPA} onClose={() => setOpenPA(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Assign Program Admin</DialogTitle>
        <DialogContent>
          <TextField label="Wallet Address (leave empty for walletless)" value={paWallet}
            onChange={(e) => setPaWallet(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!paWallet && !paWalletValid}
            helperText={paWallet && !paWalletValid ? "Invalid wallet address" : !paWallet ? "Walletless: an edit code will be generated for claiming" : ""} />
          <TextField label="Member ID" value={paMemberId} onChange={(e) => setPaMemberId(e.target.value.toUpperCase())}
            fullWidth margin="normal" inputProps={{ maxLength: 12 }} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Member Type</InputLabel>
            <Select value={paMemberType} onChange={(e) => setPaMemberType(Number(e.target.value))} label="Member Type">
              {Object.entries(MemberTypeLabels).map(([k, v]) => (
                <MenuItem key={k} value={Number(k)}>{v}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {!paWallet && (
            <Alert severity="info" sx={{ mt: 1 }}>
              An edit code will be generated automatically. Share it with the Program Admin so they can claim their membership and link their wallet.
            </Alert>
          )}
          {errorPA && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorPA)}</Alert>}
          {isSuccessPA && <Alert severity="success" sx={{ mt: 2 }}>Program Admin assigned!</Alert>}
          <OnChainDisclaimer accepted={paDisclaimer} onChange={setPaDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPA(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAssignPA}
            disabled={isPendingPA || isConfirmingPA || !paMemberId || !paDisclaimer || (!!paWallet && !paWalletValid)}>
            {isPendingPA || isConfirmingPA ? <CircularProgress size={20} /> : "Assign"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={openMember} onClose={() => setOpenMember(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Add Member</DialogTitle>
        <DialogContent>
          <TextField label="Wallet Address (leave empty for walletless)" value={mWallet}
            onChange={(e) => setMWallet(e.target.value)}
            fullWidth margin="normal" placeholder="0x..."
            error={!!mWallet && !mWalletValid}
            helperText={mWallet && !mWalletValid ? "Invalid wallet address" : !mWallet ? "Walletless: an edit code will be generated for claiming" : ""} />
          <TextField label="Member ID" value={mMemberId} onChange={(e) => setMMemberId(e.target.value.toUpperCase())}
            fullWidth margin="normal" inputProps={{ maxLength: 12 }} />
          <FormControl fullWidth margin="normal">
            <InputLabel>Role</InputLabel>
            <Select value={mRole} onChange={(e) => setMRole(Number(e.target.value))} label="Role">
              {role === MemberRoleEnum.TeamLeader ? (
                <MenuItem value={1}>Client</MenuItem>
              ) : (
                [<MenuItem key={2} value={2}>Team Leader</MenuItem>, <MenuItem key={1} value={1}>Client</MenuItem>]
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
          {!mWallet && (
            <Alert severity="info" sx={{ mt: 1 }}>
              An edit code will be generated automatically. Share it with the member so they can claim and link their wallet.
            </Alert>
          )}
          {errorM && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorM)}</Alert>}
          {isSuccessM && <Alert severity="success" sx={{ mt: 2 }}>Member added!</Alert>}
          <OnChainDisclaimer accepted={mDisclaimer} onChange={setMDisclaimer} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMember(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddMember}
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
          <Button onClick={() => setOpenTL(false)}>{isSuccessTL ? "Close" : "Cancel"}</Button>
          {!isSuccessTL && (
            <Button variant="contained" onClick={() => setTransferLimit(programId, parseInt(tlValue) || 0)}
              disabled={isPendingTL || isConfirmingTL}>
              {isPendingTL || isConfirmingTL ? <CircularProgress size={20} /> : "Set Limit"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Edit Program Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
        <DialogTitle>Edit Program</DialogTitle>
        <DialogContent>
          <TextField label="Program Name" value={editName} onChange={(e) => setEditName(e.target.value)}
            fullWidth margin="normal" />
          <TextField label="Description" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
            fullWidth margin="normal" multiline rows={3} />
          {errorEP && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorEP)}</Alert>}
          {isSuccessEP && <Alert severity="success" sx={{ mt: 2 }}>Program updated!</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => updateProgram(programId, editName, editDesc)}
            disabled={isPendingEP || isConfirmingEP || !editName}>
            {isPendingEP || isConfirmingEP ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Deactivate Confirm Dialog */}
      <Dialog open={openDeactivate} onClose={() => setOpenDeactivate(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Deactivate Program</DialogTitle>
        <DialogContent>
          <Alert severity="warning">
            Are you sure you want to deactivate &quot;{program.name}&quot;? This will prevent all operations on the program. This action cannot be undone.
          </Alert>
          {errorDP && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorDP)}</Alert>}
          {isSuccessDP && <Alert severity="success" sx={{ mt: 2 }}>Program deactivated.</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeactivate(false)}>Cancel</Button>
          <Button variant="contained" color="error" onClick={() => deactivateProgram(programId)}
            disabled={isPendingDP || isConfirmingDP}>
            {isPendingDP || isConfirmingDP ? <CircularProgress size={20} /> : "Deactivate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Set Logo Dialog */}
      <Dialog open={openLogo} onClose={() => setOpenLogo(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Set Program Logo</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Enter an IPFS CID for the program logo image (recommended 256x256px or larger, square).
          </Typography>
          <TextField
            label="IPFS CID or Gateway URL"
            value={logoCIDInput}
            onChange={(e) => setLogoCIDInput(parseCID(e.target.value))}
            fullWidth
            margin="normal"
            placeholder="bafkr4i... or https://ipfs.cloud.fx.land/gateway/bafkr4i..."
            inputProps={{ maxLength: 256 }}
            InputProps={{
              endAdornment: (
                <Tooltip title="Paste from clipboard">
                  <IconButton size="small" onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText();
                      if (text) setLogoCIDInput(parseCID(text));
                    } catch { /* clipboard permission denied */ }
                  }}>
                    <ContentPasteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              ),
            }}
          />
          {logoCIDInput && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>Preview:</Typography>
              <Box
                component="img"
                src={ipfsLogoUrl(logoCIDInput)}
                alt="Logo preview"
                sx={{ maxWidth: 128, maxHeight: 128, borderRadius: 2 }}
                onError={(e: React.SyntheticEvent<HTMLImageElement>) => { e.currentTarget.style.display = "none"; }}
              />
            </Box>
          )}
          {errorLogo && <Alert severity="error" sx={{ mt: 2 }}>{formatContractError(errorLogo)}</Alert>}
          {isSuccessLogo && <Alert severity="success" sx={{ mt: 2 }}>Logo updated!</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLogo(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setProgramLogo(programId, logoCIDInput)}
            disabled={isPendingLogo || isConfirmingLogo || !logoCIDInput}>
            {isPendingLogo || isConfirmingLogo ? <CircularProgress size={20} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Code Display Dialog (shown after walletless member creation) */}
      <Dialog open={showEditCodeDialog} onClose={() => setShowEditCodeDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Code Generated</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Save this edit code now. It cannot be retrieved later. Share it with &quot;{displayMemberId}&quot; so they can claim their membership.
          </Alert>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Edit Code</Typography>
          <Paper sx={{ p: 2, bgcolor: "background.default", display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flexGrow: 1 }}>
              {displayEditCode}
            </Typography>
            <Tooltip title={copied ? "Copied!" : "Copy code"}>
              <IconButton onClick={handleCopyEditCode} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>Claim URL (share with member)</Typography>
          <Paper sx={{ p: 2, bgcolor: "background.default", display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="body2" sx={{ fontFamily: "monospace", wordBreak: "break-all", flexGrow: 1, fontSize: "0.75rem" }}>
              {claimUrl}
            </Typography>
            <Tooltip title={copiedUrl ? "Copied!" : "Copy URL"}>
              <IconButton onClick={handleCopyUrl} size="small">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Member ID: {displayMemberId} | Program ID: {programId}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowEditCodeDialog(false)}>
            I&apos;ve Saved the Code
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* -- Program List View -- */

function ProgramList() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const { address } = useAccount();
  const { isAdmin } = useUserRole();
  const { data: programCount, refetch: refetchCount } = useProgramCount();
  const { createProgram, isPending, isConfirming, isSuccess, error } = useCreateProgram();

  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [disclaimer, setDisclaimer] = useState(false);

  // Filters
  const [filterMode, setFilterMode] = useState<"all" | "mine">("all");
  const [searchId, setSearchId] = useState("");

  useEffect(() => {
    if (isSuccess) {
      refetchCount();
      const t = setTimeout(() => { setOpen(false); setCode(""); setName(""); setDescription(""); setDisclaimer(false); }, 1500);
      return () => clearTimeout(t);
    }
  }, [isSuccess, refetchCount]);

  const count = Number(programCount || 0);
  const searchProgramId = searchId ? parseInt(searchId) : 0;

  // Build list of program IDs to show
  let programIds: number[];
  if (searchProgramId > 0 && searchProgramId <= count) {
    programIds = [searchProgramId];
  } else {
    programIds = Array.from({ length: count }, (_, i) => i + 1);
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Typography variant="h4">Programs</Typography>
        {isAdmin && (
          <Button variant="contained" onClick={() => setOpen(true)}>
            Create Program
          </Button>
        )}
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={4}>
            <TextField label="Search by Program ID" value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              type="number" fullWidth size="small" placeholder="All programs"
              helperText={searchProgramId > count ? `Max ID is ${count}` : undefined}
              error={searchProgramId > count} />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Show</InputLabel>
              <Select value={filterMode} onChange={(e) => setFilterMode(e.target.value as "all" | "mine")} label="Show">
                <MenuItem value="all">All Programs</MenuItem>
                <MenuItem value="mine" disabled={!address}>My Programs</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Typography variant="body2" color="text.secondary">
              {count} program{count !== 1 ? "s" : ""} total
            </Typography>
          </Grid>
        </Grid>
      </Paper>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Name</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Description</TableCell>
              <TableCell>Status</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {programIds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">No programs yet.</TableCell>
              </TableRow>
            ) : (
              programIds.map(id => (
                <ProgramRow key={id} programId={id}
                  filterMine={filterMode === "mine"}
                  wallet={address}
                  isAdmin={isAdmin} />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
          <Button variant="contained" onClick={() => createProgram(code, name, description)}
            disabled={isPending || isConfirming || !code || !name || !disclaimer}>
            {isPending || isConfirming ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

/* -- Router -- */

function ProgramsContent() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const programId = idParam ? parseInt(idParam) : 0;

  if (programId > 0) return <ProgramDetail programId={programId} />;
  return <ProgramList />;
}

export default function ProgramsPage() {
  return (
    <Suspense fallback={<Typography>Loading...</Typography>}>
      <ProgramsContent />
    </Suspense>
  );
}
