// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { useContractRead, useContractReads } from "wagmi";
import { base } from "viem/chains";
import contractABIJson from "../../utils/abi.json";
import { formatEther } from "viem";
import AppList, { CryptoApp } from "@/components/AppList";
import clsx from "clsx";

const contractABI = contractABIJson.abi;

const JokeRaceLeaderboard = () => {
  const [contractAddress, setContractAddress] = useState("");
  const [leaderboardData, setLeaderboardData] = useState<CryptoApp[]>([]);
  const [view, setView] = useState<"list" | "card">("list");

  const { data: proposalIds, isLoading: isLoadingProposalIds, isError: isProposalIdsError } = useContractRead({
    address: contractAddress as `0x${string}`,
    abi: contractABI,
    functionName: "getAllProposalIds",
    chainId: base.id,
    enabled: contractAddress !== "",
  });

  const { data: proposalsData, isLoading: isLoadingProposals } = useContractReads({
    contracts: proposalIds
      ? proposalIds.map((id) => ({
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: "getProposal",
          args: [id],
          chainId: base.id,
        }))
      : [],
    enabled: !!proposalIds,
  });

  const { data: votesData, isLoading: isLoadingVotes } = useContractReads({
    contracts: proposalIds
      ? proposalIds.map((id) => ({
          address: contractAddress as `0x${string}`,
          abi: contractABI,
          functionName: "proposalVotes",
          args: [id],
          chainId: base.id,
        }))
      : [],
    enabled: !!proposalIds,
  });

  useEffect(() => {
    if (proposalsData && votesData && proposalIds) {
      const leaderboard = proposalIds.map((id, index) => {
        const proposal = proposalsData[index].result;
        const votes = votesData[index].result;
        return {
          id: id.toString(),
          name: proposal.description.split('\n')[0] || 'Untitled Proposal',
          description: proposal.description,
          descriptionHTML: proposal.description,
          logo: "/Placeholder.png",
          likes: votes ? formatEther(votes[0]) : "0",
          dislikes: votes ? formatEther(votes[1]) : "0",
          screenshot: ["/Placeholder.png"],
          liked: false,
          comments: [],
          author: proposal.author,
          exists: true,
          targetAddress: "",
          safeSigners: [],
          safeThreshold: "0",
          fieldsMetadata: {},
        };
      });
      setLeaderboardData(leaderboard);
    }
  }, [proposalsData, votesData, proposalIds]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // The data will be fetched automatically when contractAddress changes
  };

  const handleLike = (id: string) => {
    // Implement like functionality here
    console.log(`Liked proposal with id: ${id}`);
    window.location.href = `https://jokerace.io/contest/base/${contractAddress}`;
  };

  const handleSortChange = (order: "asc" | "desc") => {
    // Implement sort change functionality if needed
    console.log(`Sort order changed to: ${order}`);
  };

  const isLoading = isLoadingProposalIds || isLoadingProposals || isLoadingVotes;
  const error = isProposalIdsError ? "Error loading data. Please check the contract address." : null;

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">JokeRace Leaderboard</h1>
      <form onSubmit={handleSubmit} className="mb-6">
        <input
          type="text"
          value={contractAddress}
          onChange={(e) => setContractAddress(e.target.value)}
          placeholder="Enter JokeRace contract address"
          className="w-full p-2 border rounded text-white"
        />
       
      </form>
      <div className="mb-4 flex justify-between items-center">
        <div className="flex space-x-2">
          <button
            onClick={() => setView("list")}
            className={clsx(
              "px-3 py-2 rounded-[38px] cursor-pointer transition-all",
              view === "list" ? "sign-in-button" : "hover:bg-[#f5f5f5]"
            )}
          >
            List
          </button>
          <button
            onClick={() => setView("card")}
            className={clsx(
              "px-3 py-2 rounded-[38px] cursor-pointer transition-all",
              view === "card" ? "sign-in-button" : "hover:bg-[#f5f5f5]"
            )}
          >
            Card
          </button>
        </div>
      </div>
      <AppList view={view} contractAddress={contractAddress} onLike={handleLike} />
    </div>
  );
};

export default JokeRaceLeaderboard;