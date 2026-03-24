"use client";

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { CONTRACTS, REWARDS_PROGRAM_ABI, ERC20_ABI } from "@/config/contracts";
import { toBytes8, toBytes12 } from "@/lib/utils";

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
    functionName: "getEffectiveBalance",
    args: wallet ? [programId, wallet] : undefined,
    query: { enabled: !!wallet && programId > 0 },
  });
}

export function useDirectChildren(programId: number, wallet?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getDirectChildren",
    args: wallet ? [programId, wallet] : undefined,
    query: { enabled: !!wallet && programId > 0 },
  });
}

export function useTimeLocks(programId: number, wallet?: `0x${string}`) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getTimeLocks",
    args: wallet ? [programId, wallet] : undefined,
    query: { enabled: !!wallet && programId > 0 },
  });
}

export function useTransferCount() {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "transferCount",
  });
}

export function useTransferRecord(id: number) {
  return useReadContract({
    address: CONTRACTS.rewardsProgram,
    abi: REWARDS_PROGRAM_ABI,
    functionName: "getTransferRecord",
    args: [BigInt(id)],
    query: { enabled: id > 0 },
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

// === WRITE HOOKS ===

export function useCreateProgram() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

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

  const assignProgramAdmin = (programId: number, wallet: `0x${string}`, memberID: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "assignProgramAdmin",
      args: [programId, wallet, toBytes12(memberID)],
    });
  };

  return { assignProgramAdmin, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addMember = (programId: number, wallet: `0x${string}`, memberID: string, role: number) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addMember",
      args: [programId, wallet, toBytes12(memberID), role],
    });
  };

  return { addMember, isPending, isConfirming, isSuccess, error, hash };
}

export function useApproveToken() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: string) => {
    writeContract({
      address: CONTRACTS.fulaToken,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.rewardsProgram, parseUnits(amount, 18)],
    });
  };

  return { approve, isPending, isConfirming, isSuccess, error, hash };
}

export function useAddTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const addTokens = (programId: number, amount: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "addTokens",
      args: [programId, parseUnits(amount, 18)],
    });
  };

  return { addTokens, isPending, isConfirming, isSuccess, error, hash };
}

export function useTransferToSubMember() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transfer = (
    programId: number,
    to: `0x${string}`,
    amount: string,
    note: string,
    locked: boolean,
    lockTimeDays: number
  ) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToSubMember",
      args: [programId, to, parseUnits(amount, 18), note, locked, lockTimeDays],
    });
  };

  return { transfer, isPending, isConfirming, isSuccess, error, hash };
}

export function useTransferToParent() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const transferBack = (programId: number, to: `0x${string}`, amount: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "transferToParent",
      args: [programId, to, parseUnits(amount, 18)],
    });
  };

  return { transferBack, isPending, isConfirming, isSuccess, error, hash };
}

export function useWithdraw() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (programId: number, amount: string) => {
    writeContract({
      address: CONTRACTS.rewardsProgram,
      abi: REWARDS_PROGRAM_ABI,
      functionName: "withdraw",
      args: [programId, parseUnits(amount, 18)],
    });
  };

  return { withdraw, isPending, isConfirming, isSuccess, error, hash };
}
