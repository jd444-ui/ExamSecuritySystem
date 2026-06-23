const fs = require("fs");
const path = require("path");

async function main() {
  const ExamPaperSecurity = await ethers.getContractFactory(
    "ExamPaperSecurity"
  );

  const contract = await ExamPaperSecurity.deploy();

  await contract.deployed();

  console.log("Contract deployed to:", contract.address);

  const addressFilePath = path.join(
    __dirname,
    "../backend/contractAddress.json"
  );

  fs.writeFileSync(
    addressFilePath,
    JSON.stringify(
      {
        address: contract.address
      },
      null,
      2
    )
  );

  console.log("Contract address saved to backend/contractAddress.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});