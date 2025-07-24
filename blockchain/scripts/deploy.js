const { ethers } = require("hardhat");

async function main() {
  console.log("Starting deployment...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Check account balance
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy FileRegistry contract
  console.log("\nDeploying FileRegistry contract...");
  const FileRegistry = await ethers.getContractFactory("FileRegistry");
  
  // Deploy with constructor arguments if needed
  const fileRegistry = await FileRegistry.deploy();
  await fileRegistry.waitForDeployment();

  const contractAddress = await fileRegistry.getAddress();
  console.log("FileRegistry deployed to:", contractAddress);

  // Set the owner (if not already set in constructor)
  try {
    const setOwnerTx = await fileRegistry.setOwner();
    await setOwnerTx.wait();
    console.log("Owner set successfully");
  } catch (error) {
    console.log("Owner already set or error:", error.message);
  }

  // Verify deployment
  console.log("\nVerifying deployment...");
  const totalFiles = await fileRegistry.getTotalFiles();
  const version = await fileRegistry.getVersion();
  console.log("Total files:", totalFiles.toString());
  console.log("Contract version:", version);

  // Save deployment information
  const deploymentInfo = {
    network: (await ethers.provider.getNetwork()).name,
    contractAddress: contractAddress,
    deployer: deployer.address,
    blockNumber: await ethers.provider.getBlockNumber(),
    gasPrice: (await ethers.provider.getFeeData()).gasPrice?.toString(),
    timestamp: new Date().toISOString(),
    version: version,
  };

  console.log("\n=== Deployment Summary ===");
  console.log("Network:", deploymentInfo.network);
  console.log("Contract Address:", deploymentInfo.contractAddress);
  console.log("Deployer:", deploymentInfo.deployer);
  console.log("Block Number:", deploymentInfo.blockNumber);
  console.log("Timestamp:", deploymentInfo.timestamp);
  console.log("Contract Version:", deploymentInfo.version);

  // Instructions for frontend configuration
  console.log("\n=== Frontend Configuration ===");
  console.log("Add this to your frontend .env file:");
  console.log(`REACT_APP_CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`REACT_APP_NETWORK_ID=${(await ethers.provider.getNetwork()).chainId}`);

  // Instructions for backend configuration
  console.log("\n=== Backend Configuration ===");
  console.log("Add this to your backend .env file:");
  console.log(`CONTRACT_ADDRESS=${contractAddress}`);
  console.log(`WEB3_PROVIDER_URI=${ethers.provider.connection?.url || 'http://localhost:8545'}`);

  return deploymentInfo;
}

// Handle deployment errors
main()
  .then((deploymentInfo) => {
    console.log("\n✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });
