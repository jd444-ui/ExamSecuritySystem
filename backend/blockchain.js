const { ethers } = require("ethers");

const abi = require("./ExamPaperSecurityABI.json");

const getContractAddress = () => {
  if (process.env.CONTRACT_ADDRESS) {
    return process.env.CONTRACT_ADDRESS;
  }

  try {
    const savedAddress = require("./contractAddress.json");
    return savedAddress.address;
  } catch (error) {
    return null;
  }
};

const getContract = () => {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const contractAddress = getContractAddress();

  if (!rpcUrl) {
    throw new Error("BLOCKCHAIN_RPC_URL missing");
  }

  if (!privateKey) {
    throw new Error("BLOCKCHAIN_PRIVATE_KEY missing");
  }

  if (!contractAddress) {
    throw new Error("CONTRACT_ADDRESS missing");
  }

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = new ethers.Wallet(privateKey, provider);

  return new ethers.Contract(contractAddress, abi, wallet);
};

const storeHashOnBlockchain = async (fileName, hash) => {
  const contract = getContract();

  const tx = await contract.storePaper(fileName, hash);
  const receipt = await tx.wait();

  let paperId = null;

  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);

      if (parsedLog && parsedLog.name === "PaperStored") {
        paperId = parsedLog.args.id.toString();
      }
    } catch (error) {}
  }

  return {
    transactionHash: tx.hash,
    paperId: paperId,
    blockchainStored: true
  };
};

const verifyHashOnBlockchain = async (paperId, hash) => {
  const contract = getContract();
  const result = await contract.verifyPaper(paperId, hash);
  return result;
};

const getPaperFromBlockchain = async (paperId) => {
  const contract = getContract();
  const paper = await contract.getPaper(paperId);

  return {
    id: paper[0].toString(),
    fileName: paper[1],
    paperHash: paper[2],
    uploadedBy: paper[3],
    timestamp: paper[4].toString(),
    exists: paper[5]
  };
};

module.exports = {
  storeHashOnBlockchain,
  verifyHashOnBlockchain,
  getPaperFromBlockchain
};