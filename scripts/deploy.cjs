const { ethers } = require("hardhat");

async function main() {
  console.log('Deploying BrickBreakerFees to Base Mainnet...');

  const [deployer] = await ethers.getSigners();
  console.log('Deployer:', deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log('Balance:', ethers.formatEther(balance), 'ETH');

  const BrickBreakerFees = await ethers.getContractFactory('BrickBreakerFees');
  const contract = await BrickBreakerFees.deploy();
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log('\n✅ BrickBreakerFees deployed at:', address);
  console.log('\nNext steps:');
  console.log('  1. Add to .env:  VITE_CONTRACT_ADDRESS=' + address);
  console.log('  2. Verify:  npx hardhat verify --network base', address);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
