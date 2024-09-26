import { createPublicClient, http, getContract } from "viem";
import { base } from "viem/chains";
import contractABIJson from './abi.json'
import { Proposal, Comment } from './jokerace-type';
import { formatEther } from 'viem';
import NodeCache from 'node-cache';
import pLimit from 'p-limit';

const cache = new NodeCache({ stdTTL: 300 }); // Cache for 5 minutes
const limit = pLimit(5); // Limit to 5 concurrent requests

const client = createPublicClient({
  chain: base,
  transport: http("https://base-mainnet.g.alchemy.com/v2/pF56wOs6oF91usuSZGeTeNNACoNIL_ga"),
});

const contractAddress = '0x7f4e1f8d7b626d5120008daedcea921060ebfb68';
const contractABI = contractABIJson.abi;

const contract = getContract({
  address: contractAddress,
  abi: contractABI,
  publicClient: client,
});

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  delay = 1000
): Promise<T> {
  let retries = 0;
  while (true) {
    try {
      return await fn();
    } catch (error) {
      if (retries >= maxRetries) {
        throw error;
      }
      await sleep(delay * Math.pow(2, retries));
      retries++;
    }
  }
}

export const getContractData = async () => {
  const cachedData = cache.get('contractData');
  if (cachedData) {
    return cachedData as any[];
  }

  try {
    const proposalIds = await retryWithBackoff(() => 
      client.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getAllProposalIds',
      })
    ) as bigint[];

    const proposals = await Promise.all(
      proposalIds.map(id => limit(() => getProposalData(id)))
    );
    
    const filteredProposals = proposals.filter(proposal => proposal !== null);
    cache.set('contractData', filteredProposals);
    return filteredProposals;
  } catch (error) {
    console.error('Error fetching contract data:', error);
    return [];
  }
};

const getProposalData = async (id: bigint) => {
  const cachedProposal = cache.get(`proposal_${id}`);
  if (cachedProposal) {
    return cachedProposal;
  }

  try {
    const [proposalData, votes, comments] = await Promise.all([
      retryWithBackoff(() => 
        client.readContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'getProposal',
          args: [id],
        })
      ) as Promise<Proposal>,
      retryWithBackoff(() => 
        client.readContract({
          address: contractAddress,
          abi: contractABI,
          functionName: 'proposalVotes',
          args: [id],
        })
      ) as Promise<bigint[]>,
      getComments(id),
    ]);

    const proposal = {
      id: id.toString(),
      name: proposalData.description,
      description: proposalData.description,
      logo: '/placeholder-logo.png',
      likes: votes[0] ? parseFloat(formatEther(votes[0])).toFixed(2) : '0',
      dislikes: votes[1] ? parseFloat(formatEther(votes[1])).toFixed(2) : '0',
      screenshot: ['/placeholder-screenshot.png'],
      liked: false,
      comments: comments,
      author: proposalData.author,
      exists: proposalData.exists,
      targetAddress: proposalData.targetMetadata.targetAddress,
      safeSigners: proposalData.safeMetadata.safeSigners,
      safeThreshold: proposalData.safeMetadata.safeThreshold?.toString(),
      fieldsMetadata: proposalData.fieldsMetadata,
    };

    cache.set(`proposal_${id}`, proposal);
    return proposal;
  } catch (error) {
    console.error(`Error fetching proposal data for ${id}:`, error);
    return null;
  }
};

const getComments = async (proposalId: bigint) => {
  const cachedComments = cache.get(`comments_${proposalId}`);
  if (cachedComments) {
    return cachedComments as any[];
  }

  try {
    const commentIds = await retryWithBackoff(() => 
      client.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getProposalComments',
        args: [proposalId],
      })
    ) as bigint[];

    const comments = await Promise.all(
      commentIds.map(id => limit(() => getCommentData(id, proposalId)))
    );

    const filteredComments = comments.filter(comment => comment !== null);
    cache.set(`comments_${proposalId}`, filteredComments);
    return filteredComments;
  } catch (error) {
    console.error(`Error fetching comments for proposal ${proposalId}:`, error);
    return [];
  }
};

const getCommentData = async (id: bigint, proposalId: bigint) => {
  try {
    const commentData = await retryWithBackoff(() => 
      client.readContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'getComment',
        args: [id],
      })
    ) as Comment;

    return {
      id: id.toString(),
      author: commentData.Author,
      content: commentData.Content,
      timestamp: new Date(Number(commentData.Timestamp) * 1000).toLocaleString(),
      proposalId: commentData.ProposalID ? commentData.ProposalID.toString() : proposalId.toString(),
    };
  } catch (error) {
    console.error(`Error fetching comment ${id}:`, error);
    return null;
  }
};

// Additional functions mentioned but not implemented in the original code

export const likeProposal = async (proposalId: string) => {
  // This is a placeholder implementation
  console.log(`Liked proposal ${proposalId}`);
  // In a real implementation, you'd need to send a transaction to vote for the proposal
  // This would involve interacting with the contract's voting function
};

export const getContractMetadata = async () => {
  try {
    const [name, prompt, costToPropose, costToVote, votingPeriod, contestStart, contestDeadline] = await Promise.all([
      retryWithBackoff(() => contract.name()),
      retryWithBackoff(() => contract.prompt()),
      retryWithBackoff(() => contract.costToPropose()),
      retryWithBackoff(() => contract.costToVote()),
      retryWithBackoff(() => contract.votingPeriod()),
      retryWithBackoff(() => contract.contestStart()),
      retryWithBackoff(() => contract.contestDeadline()),
    ]);

    return {
      name,
      prompt,
      costToPropose,
      costToVote,
      votingPeriod,
      contestStart,
      contestDeadline,
    };
  } catch (error) {
    console.error('Error fetching contract metadata:', error);
    return null;
  }
};

export const getTotalVotesCast = async () => {
  try {
    return await retryWithBackoff(() => contract.totalVotesCast());
  } catch (error) {
    console.error('Error fetching total votes cast:', error);
    return null;
  }
};

export const getContestState = async () => {
  try {
    return await retryWithBackoff(() => contract.state());
  } catch (error) {
    console.error('Error fetching contest state:', error);
    return null;
  }
};