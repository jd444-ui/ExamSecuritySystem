const { ethers } = require("ethers");

const contractAddress = require("./contractAddress.json");

const artifact = require("../artifacts/contracts/ExamPaperSecurity.sol/ExamPaperSecurity.json");

const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

const privateKey =
  "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

const wallet = new ethers.Wallet(privateKey, provider);

const contract = new ethers.Contract(
  contractAddress.address,
  artifact.abi,
  wallet
);

const storeHashOnBlockchain = async (fileName, hash) => {
  const tx = await contract.storePaper(fileName, hash);

  const receipt = await tx.wait();

  let paperId = null;

  for (const log of receipt.logs) {
    try {
      const parsedLog = contract.interface.parseLog(log);

      if (parsedLog.name === "PaperStored") {
        paperId = parsedLog.args.id.toString();
      }
    } catch (error) {}
  }

  return {
    transactionHash: tx.hash,
    paperId: paperId
  };
};

const verifyHashOnBlockchain = async (paperId, hash) => {
  const result = await contract.verifyPaper(paperId, hash);

  return result;
};

const getPaperFromBlockchain = async (paperId) => {
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