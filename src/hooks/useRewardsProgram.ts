"use client";

import { useEffect } from "react";
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { CONTRACTS, REWARDS_PROGRAM_ABI, ERC20_ABI } from "@/config/contracts";
import { toBytes8, toBytes12, safeParseAmount } from "@/lib/utils";

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

  const assignProgramAdmin = (programId: number, wallet: `0x${string}`, memberID: string, editCodeHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000") => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "assignProgramAdmin",
      args: [programId, wallet, toBytes12(memberID), editCodeHash],
    });
  };

  return { assignProgramAdmin, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addMember = (programId: number, wallet: `0x${string}`, memberID: string, role: number, editCodeHash: `0x${string}` = "0x0000000000000000000000000000000000000000000000000000000000000000") => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addMember",
      args: [programId, wallet, toBytes12(memberID), role, editCodeHash],
    });
  };

  return { addMember, isPending, isConfirming, isSuccess, error, hash };
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const approve = (amount: string) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.fulaToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.rewardsProgram, parsed],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const addTokens = (programId: number, amount: string) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addTokens",
      args: [programId, parsed],
    });
  };

  return { addTokens, isPending, isConfirming, isSuccess, error, hash };
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
    lockTimeDays: number
  ) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToSubMember",
      args: [programId, to, parsed, locked, lockTimeDays],
    });
  };

  return { transfer, isPending, isConfirming, isSuccess, error, hash };
}

export function useTransferToParent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const transferBack = (programId: number, to: `0x${string}`, amount: string) => {
    const parsed = safeParseAmount(amount);
    if (!parsed) return;
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToParent",
      args: [programId, to, parsed],
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
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  useRefetchOnSuccess(isSuccess);

  const claimMember = (programId: number, memberID: string, editCode: `0x${string}`) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "claimMember",
      args: [programId, toBytes12(memberID), editCode],
    });
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
