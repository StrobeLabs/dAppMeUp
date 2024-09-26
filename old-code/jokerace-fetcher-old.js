const ethers = require('ethers');
const fs = require('fs');

// ANSI color codes
const colors = {
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  reset: '\x1b[0m'
};

const colorize = (color, text) => `${colors[color]}${text}${colors.reset}`;

const formatNumber = (n) => {
  if (typeof n === 'bigint') {
    // Convert to regular number and divide by 10^18 for ether values
    return (Number(n) / 1e18).toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
  return n.toLocaleString('en-US');
};

const formatDate = (timestamp) => new Date(Number(timestamp) * 1000).toLocaleString();

const logProposalDetails = async (contract, proposalId, index) => {
  try {
    const proposal = await contract.getProposal(proposalId);
    console.log(colorize('cyan', `\nProposal ${index + 1}:`));
    console.log(colorize('yellow', `  ID: ${formatNumber(proposalId)}`));
    console.log(colorize('yellow', `  Author: ${proposal.author}`));
    console.log(colorize('yellow', `  Description: ${proposal.description}`));
    console.log(colorize('yellow', `  Exists: ${proposal.exists}`));
    console.log(colorize('yellow', `  Target Address: ${proposal.targetMetadata.targetAddress}`));
    console.log(colorize('yellow', `  Safe Signers: ${proposal.safeMetadata.signers.join(', ')}`));
    console.log(colorize('yellow', `  Safe Threshold: ${proposal.safeMetadata.threshold}`));
    console.log(colorize('yellow', `  Fields Metadata:`));
    console.log(colorize('yellow', `    Addresses: ${proposal.fieldsMetadata.addressArray.join(', ')}`));
    console.log(colorize('yellow', `    Strings: ${proposal.fieldsMetadata.stringArray.join(', ')}`));
    console.log(colorize('yellow', `    Uints: ${proposal.fieldsMetadata.uintArray.map(formatNumber).join(', ')}`));

    if (contract.proposalVotes) {
      const votes = await contract.proposalVotes(proposalId);
      console.log(colorize('yellow', `  For Votes: ${formatNumber(votes.forVotes)}`));
      console.log(colorize('yellow', `  Against Votes: ${formatNumber(votes.againstVotes)}`));
    }
  } catch (error) {
    console.error(colorize('red', `Error fetching proposal ${proposalId}:`), colorize('red', error.message));
  }
};

const logComments = async (contract, proposalId, index) => {
  try {
    const commentIds = await contract.getProposalComments(proposalId);
    console.log(colorize('cyan', `  Comments for Proposal ${index + 1}:`));
    for (let j = 0; j < commentIds.length; j++) {
      try {
        const comment = await contract.getComment(commentIds[j]);
        console.log(colorize('yellow', `    Comment ${j + 1}:`));
        console.log(colorize('yellow', `      ID: ${formatNumber(commentIds[j])}`));
        console.log(colorize('yellow', `      Author: ${comment.author}`));
        console.log(colorize('yellow', `      Timestamp: ${formatDate(comment.timestamp)}`));
        console.log(colorize('yellow', `      Proposal ID: ${formatNumber(comment.proposalId)}`));
        console.log(colorize('yellow', `      Content: ${comment.commentContent}`));
      } catch (error) {
        console.error(colorize('red', `Error fetching comment ${commentIds[j]}:`), colorize('red', error.message));
      }
    }
  } catch (error) {
    console.error(colorize('red', `Error fetching comments for proposal ${proposalId}:`), colorize('red', error.message));
  }
};

const interactWithContract = async () => {
  // Read the ABI from the local file
  const rawdata = fs.readFileSync('abi.json');
  const { abi } = JSON.parse(rawdata);

  const contractAddress = '0x7f4e1f8d7b626d5120008daedcea921060ebfb68';
  const provider = new ethers.JsonRpcProvider("https://mainnet.base.org");
  const contract = new ethers.Contract(contractAddress, abi, provider);

  // Get all readable functions from the ABI
  const readableFunctions = abi.filter(item => 
    item.type === 'function' && 
    (item.stateMutability === 'view' || item.stateMutability === 'pure') &&
    item.inputs.length === 0  // Only get functions with no inputs for simplicity
  );

  console.log(colorize('cyan', 'Contract Information:'));
  // Call each readable function and log the results
  for (const func of readableFunctions) {
    try {
      const result = await contract[func.name]();
      const formattedResult = func.name.toLowerCase().includes('time') || func.name.toLowerCase().includes('date')
        ? formatDate(result)
        : formatNumber(result);
      console.log(colorize('cyan', `${func.name}:`), colorize('yellow', formattedResult));
    } catch (error) {
      console.error(colorize('red', `Error calling ${func.name}:`), colorize('red', error.message));
    }
  }

  console.log('\n' + colorize('cyan', 'Detailed Information:'));
  try {
    if (contract.getAllProposalIds) {
      const proposalIds = await contract.getAllProposalIds();
      console.log(colorize('cyan', 'Number of proposals:'), colorize('yellow', proposalIds.length));

      // Get details for the first 5 proposals (or all if less than 5)
      const proposalsToFetch = proposalIds.length
      for (let i = 0; i < proposalsToFetch; i++) {
        const proposalId = proposalIds[i];
        if (contract.getProposal) {
          await logProposalDetails(contract, proposalId, i);
        }
        if (contract.getProposalComments) {
          await logComments(contract, proposalId, i);
        }
      }
    }

    if (contract.getAllAddressesThatHaveVoted) {
      const votedAddresses = await contract.getAllAddressesThatHaveVoted();
      console.log(colorize('cyan', '\nNumber of addresses that voted:'), colorize('yellow', votedAddresses.length));
    }

    if (contract.getAllCommentIds) {
      const commentIds = await contract.getAllCommentIds();
      console.log(colorize('cyan', '\nNumber of comments:'), colorize('yellow', commentIds.length));
    }

    if (contract.getSortedRanks) {
      const sortedRanks = await contract.getSortedRanks();
      console.log(colorize('cyan', '\nTop 5 sorted ranks:'), colorize('yellow', sortedRanks.slice(0, 5).map(formatNumber).join(', ')));
    }

  } catch (error) {
    console.error(colorize('red', 'Error interacting with contract:'), colorize('red', error));
  }
};

interactWithContract();