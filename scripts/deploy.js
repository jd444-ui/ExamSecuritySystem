const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Deploying ExamPaperSecurity contract to Sepolia...");

  const ExamPaperSecurity = await ethers.getContractFactory(
    "ExamPaperSecurity"
  );

  const contract = await ExamPaperSecurity.deploy();

  if (contract.waitForDeployment) {
    await contract.waitForDeployment();
  } else {
    await contract.deployed();
  }

  const contractAddress =
    contract.target ||
    contract.address ||
    (await contract.getAddress());

  console.log("Contract deployed to:", contractAddress);

  const addressFilePath = path.join(
    __dirname,
    "../backend/contractAddress.json"
  );

  fs.writeFileSync(
    addressFilePath,
    JSON.stringify({ address: contractAddress }, null, 2)
  );

  console.log("Contract address saved to backend/contractAddress.json");
  console.log("View on Sepolia Etherscan:");
  console.log(`https://sepolia.etherscan.io/address/${contractAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});