"use client";

import { useState, useCallback, useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { readContract, writeContract as writeContractAction, waitForTransactionReceipt } from "wagmi/actions";
import { keccak256, encodePacked } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, ERC20_ABI } from "@/config/contracts";
import { toBytes8, toBytes12, toBytes16, safeParseAmount } from "@/lib/utils";
import { wagmiConfig } from "@/lib/wagmi";

// === READ HOOKS ===

export function useProgramCount() {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "programCount",
  });
}

export function useProgram(programId: number) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getProgram",
    args: [programId],
    query: { enabled: programId > 0 },
  });
}

export function useMemberBalance(programId: number, wallet?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getBalance",
    args: wallet ? [programId, wallet] : undefined,
    query: { enabled: !!wallet && programId > 0 },
  });
}

export function useTokenBalance(wallet?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.fulaToken,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: wallet ? [wallet] : undefined,
    query: { enabled: !!wallet },
  });
}

export function useProgramCodeToId(code: string) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "programCodeToId",
    args: code ? [toBytes8(code)] : undefined,
    query: { enabled: !!code },
  });
}

export function useRewardTypes(programId: number) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getRewardTypes",
    args: [programId],
    query: { enabled: programId > 0 },
  });
}

export function useSubTypes(programId: number, rewardType: number) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getSubTypes",
    args: [programId, rewardType],
    query: { enabled: programId > 0 },
  });
}

// === WRITE HOOKS ===

function useRefetchOnSuccess(isSuccess: boolean) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (isSuccess) {
      queryClient.invalidateQueries();
    }
  }, [isSuccess, queryClient]);
}

export function useCreateProgram() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const createProgram = (code: string, name: string, description: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "createProgram",
      args: [toBytes8(code), name, description],
    });
  };

  return { createProgram, isPending, isConfirming, isSuccess, error, hash };
}

export function useAssignProgramAdmin() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const assignProgramAdmin = (programId: number, wallet: `0x${string}`, memberID: string, editCodeHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000", memberType: number = 0) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "assignProgramAdmin",
      args: [programId, wallet, toBytes12(memberID), editCodeHash, memberType],
    });
  };

  return { assignProgramAdmin, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addMember = (programId: number, wallet: `0x${string}`, memberID: string, role: number, editCodeHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000", memberType: number = 0) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addMember",
      args: [programId, wallet, toBytes12(memberID), role, editCodeHash, memberType],
    });
  };

  return { addMember, isPending, isConfirming, isSuccess, error, hash };
}

export function useDepositTokens() {
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<"idle" | "approving" | "depositing" | "success">("idle");
  const [error, setError] = useState<Error | null>(null);

  const deposit = useCallback(async (programId: number, amount: string, rewardType: number = 0, note: string = "") => {
    const parsed = safeParseAmount(amount);
    if (!parsed || !address) return;

    setStatus("approving");
    setError(null);

    try {
      // Check current allowance
      const allowance = await readContract(wagmiConfig, {
        address: CONTRACTS.fulaToken,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [address, CONTRACTS.rewardsProgram],
      });

      // Approve if needed
      if (allowance < parsed) {
        const approveHash = await writeContractAction(wagmiConfig, {
          address: CONTRACTS.fulaToken,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CONTRACTS.rewardsProgram, parsed],
        });
        await waitForTransactionReceipt(wagmiConfig, { hash: approveHash });
      }

      // Deposit
      setStatus("depositing");
      const depositHash = await writeContractAction(wagmiConfig, {
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "addTokens",
        args: [programId, parsed, rewardType, note],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: depositHash });

      setStatus("success");
      queryClient.invalidateQueries();
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
      setStatus("idle");
    }
  }, [address, queryClient]);

  return {
    deposit,
    isApproving: status === "approving",
    isDepositing: status === "depositing",
    isPending: status === "approving" || status === "depositing",
    isSuccess: status === "success",
    error,
    reset: () => { setStatus("idle"); setError(null); },
  };
}

export function useTransferToSubMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const transfer = (
    programId: number,
    to: `0x${string}`,
    amount: string,
    locked: boolean,
    lockTimeDays: number,
    rewardType: number = 0,
    subTypeId: number = 0,
    note: string = ""
  ) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToSubMember",
      args: [programId, to, parsed, locked, lockTimeDays, rewardType, subTypeId, note],
    });
  };

  return { transfer, isPending, isConfirming, isSuccess, error, hash };
}

export function useTransferToParent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const transferBack = (programId: number, to: `0x${string}`, amount: string, note: string = "") => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToParent",
      args: [programId, to, parsed, note],
    });
  };

  return { transferBack, isPending, isConfirming, isSuccess, error, hash };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const withdraw = (programId: number, amount: string) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "withdraw",
      args: [programId, parsed],
    });
  };

  return { withdraw, isPending, isConfirming, isSuccess, error, hash };
}

export function useClaimMember() {
  const { address } = useAccount();
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hash, setHash] = useState<`0x${string}` | undefined>();
  useRefetchOnSuccess(isSuccess);

  const claimMember = async (programId: number, memberID: string, editCode: `0x${string}`) => {
    if (!address) return;
    setIsPending(true);
    setIsConfirming(false);
    setIsSuccess(false);
    setError(null);
    setHash(undefined);

    try {
      const memberIDBytes = toBytes12(memberID);
      const commitHash = keccak256(
        encodePacked(["bytes12", "bytes32", "address"], [memberIDBytes as `0x${string}`, editCode, address])
      );

      // Step 1: commitClaim
      const commitTx = await writeContractAction(wagmiConfig, {
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "commitClaim",
        args: [programId, commitHash],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash: commitTx });

      // Wait for MIN_COMMIT_DELAY (5 seconds) + buffer
      setIsConfirming(true);
      await new Promise((r) => setTimeout(r, 8000));

      // Step 2: claimMember
      const claimTx = await writeContractAction(wagmiConfig, {
        address: CONTRACTS.rewardsProgram,
        abi: REWARDS_PROGRAM_ABI,
        functionName: "claimMember",
        args: [programId, memberIDBytes, editCode],
      });
      setHash(claimTx);
      await waitForTransactionReceipt(wagmiConfig, { hash: claimTx });
      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
      setIsConfirming(false);
    }
  };

  return { claimMember, isPending, isConfirming, isSuccess, error, hash };
}

export function useSetMemberWallet() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const setMemberWallet = (programId: number, memberID: string, newWallet: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "setMemberWallet",
      args: [programId, toBytes12(memberID), newWallet],
    });
  };

  return { setMemberWallet, isPending, isConfirming, isSuccess, error, hash };
}

export function useRemoveMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const removeMember = (programId: number, memberKey: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "removeMember",
      args: [programId, memberKey],
    });
  };

  return { removeMember, isPending, isConfirming, isSuccess, error, hash };
}

export function useSetMemberType() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const setMemberType = (programId: number, memberID: string, newType: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "setMemberType",
      args: [programId, toBytes12(memberID), newType],
    });
  };

  return { setMemberType, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddRewardType() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addRewardType = (programId: number, typeId: number, name: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addRewardType",
      args: [programId, typeId, toBytes16(name)],
    });
  };

  return { addRewardType, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddSubType() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addSubType = (programId: number, rewardType: number, subTypeId: number, name: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addSubType",
      args: [programId, rewardType, subTypeId, toBytes16(name)],
    });
  };

  return { addSubType, isPending, isConfirming, isSuccess, error, hash };
}

export function useTransferLimit(programId: number) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getTransferLimit",
    args: [programId],
    query: { enabled: programId > 0 },
  });
}

export function useSetTransferLimit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const setTransferLimit = (programId: number, limitPercent: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "setTransferLimit",
      args: [programId, limitPercent],
    });
  };

  return { setTransferLimit, isPending, isConfirming, isSuccess, error, hash };
}

export function useUpdateProgram() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const updateProgram = (programId: number, name: string, description: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "updateProgram",
      args: [programId, name, description],
    });
  };

  return { updateProgram, isPending, isConfirming, isSuccess, error, hash };
}

export function useDeactivateProgram() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const deactivateProgram = (programId: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "deactivateProgram",
      args: [programId],
    });
  };

  return { deactivateProgram, isPending, isConfirming, isSuccess, error, hash };
}

export function useSetEditCodeHash() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const setEditCodeHash = (programId: number, memberID: string, newHash: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "setEditCodeHash",
      args: [programId, toBytes12(memberID), newHash],
    });
  };

  return { setEditCodeHash, isPending, isConfirming, isSuccess, error, hash };
}

export function useRemoveRewardType() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const removeRewardType = (programId: number, typeId: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "removeRewardType",
      args: [programId, typeId],
    });
  };

  return { removeRewardType, isPending, isConfirming, isSuccess, error, hash };
}

export function useRemoveSubType() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const removeSubType = (programId: number, rewardType: number, subTypeId: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "removeSubType",
      args: [programId, rewardType, subTypeId],
    });
  };

  return { removeSubType, isPending, isConfirming, isSuccess, error, hash };
}

export function useUpdateMemberID() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const updateMemberID = (programId: number, oldMemberID: string, newMemberID: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "updateMemberID",
      args: [programId, toBytes12(oldMemberID), toBytes12(newMemberID)],
    });
  };

  return { updateMemberID, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddTokensDetailed() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addTokensDetailed = (
    programId: number,
    amount: string,
    rewardType: number,
    note: string,
    subTypeIds: number[],
    subTypeQtys: bigint[]
  ) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addTokensDetailed",
      args: [programId, parsed, rewardType, note, subTypeIds, subTypeQtys],
    });
  };

  return { addTokensDetailed, isPending, isConfirming, isSuccess, error, hash };
}
