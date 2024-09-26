import { useReadContract } from "wagmi";
import { formatEther } from "ethers";
import contractABIJson from "./abi.json";
import { base } from "viem/chains";
import { useState, useEffect } from "react";

const contractAddress = "0x7f4e1f8d7b626d5120008daedcea921060ebfb68";
const contractABI = contractABIJson.abi;

const useContractData = () => {
  const [proposalIds, setProposalIds] = useState<bigint[]>([]);
  const [isLoadingProposals, setIsLoadingProposals] = useState(true);
  const [proposalIdsError, setProposalIdsError] = useState<Error | null>(null);

  const {
    data: fetchedProposalIds,
    isLoading: isFetchingProposals,
    error: fetchProposalIdsError,
  } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: "getAllProposalIds",
    chainId: base.id,
  });

  useEffect(() => {
    if (!isFetchingProposals && fetchedProposalIds) {
      setProposalIds(fetchedProposalIds);
      setIsLoadingProposals(false);
    }
    if (fetchProposalIdsError) {
      setProposalIdsError(fetchProposalIdsError);
      setIsLoadingProposals(false);
    }
  }, [fetchedProposalIds, isFetchingProposals, fetchProposalIdsError]);

  const getProposalData = (id: bigint) => {
    const {
      data: proposal,
      error: proposalError,
    } = useReadContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "getProposal",
      args: [id],
      chainId: base.id,
    });

    const {
      data: votes,
      error: votesError,
    } = useReadContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "proposalVotes",
      args: [id],
      chainId: base.id,
    });

    const {
      data: comments,
      error: commentsError,
    } = useReadContract({
      address: contractAddress,
      abi: contractABI,
      functionName: "getProposalComments",
      args: [id],
      chainId: base.id,
    });

    if (proposalError || votesError || commentsError) {
      console.error(
        `Error fetching proposal data for ID ${id}:`,
        proposalError || votesError || commentsError
      );
      alert(
        `Error fetching proposal data for ID ${id}: ${proposalError || votesError || commentsError}`
      );
      return null;
    }

    return {
      id: id.toString(),
      name: proposal.description,
      description: proposal.description,
      logo: "/placeholder-logo.png",
      likes: votes[0] ? parseFloat(formatEther(votes[0])).toFixed(2) : "0",
      dislikes: votes[1] ? parseFloat(formatEther(votes[1])).toFixed(2) : "0",
      screenshot: ["/placeholder-screenshot.png"],
      liked: false,
      comments: comments.map((comment) => ({
        id: comment.id.toString(),
        author: comment.author,
        content: comment.content,
        timestamp: new Date(
          Number(comment.timestamp) * 1000
        ).toLocaleString(),
      })),
      author: proposal.author,
      exists: proposal.exists,
      targetAddress: proposal.targetMetadata.targetAddress,
      safeSigners: proposal.safeMetadata.safeSigners,
      safeThreshold: proposal.safeMetadata.safeThreshold?.toString(),
      fieldsMetadata: proposal.fieldsMetadata,
    };
  };

  return {
    proposalIds,
    getProposalData,
    isLoadingProposals,
    proposalIdsError,
  };
};

export default useContractData;