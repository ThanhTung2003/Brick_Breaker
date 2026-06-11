import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import solc from 'solc';
import { ethers } from 'ethers';

dotenv.config();

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const rpc = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
  const pk  = process.env.PRIVATE_KEY;
  if (!pk) throw new Error('PRIVATE_KEY not set in .env');

  console.log('Compiling BrickBreakerFees.sol...');
  const sourcePath = join(__dirname, '..', 'contracts', 'BrickBreakerFees.sol');
  const source     = readFileSync(sourcePath, 'utf8');

  const input = {
    language: 'Solidity',
    sources: { 'BrickBreakerFees.sol': { content: source } },
    settings: {
      outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } },
      optimizer: { enabled: true, runs: 200 },
    },
  };

  const output = JSON.parse(solc.compile(JSON.stringify(input)));

  if (output.errors) {
    const hasError = output.errors.some((e) => e.severity === 'error');
    output.errors.forEach((e) => console.log(e.formattedMessage || e.message));
    if (hasError) throw new Error('Compilation failed');
  }

  const contractOut = output.contracts['BrickBreakerFees.sol']['BrickBreakerFees'];
  const abi      = contractOut.abi;
  const bytecode = contractOut.evm.bytecode.object;

  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet   = new ethers.Wallet(pk, provider);

  console.log('Deployer:', await wallet.getAddress());
  const bal = await provider.getBalance(await wallet.getAddress());
  console.log('Balance:', ethers.formatEther(bal), 'ETH');

  if (bal === 0n) throw new Error('Deployer has 0 ETH – please fund the wallet first');

  const factory  = new ethers.ContractFactory(abi, bytecode, wallet);
  console.log('Deploying to Base Mainnet...');
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const address = contract.target;
  console.log('\n✅ BrickBreakerFees deployed at:', address);
  console.log('\nNext steps:');
  console.log('  1. Update .env:  VITE_CONTRACT_ADDRESS=' + address);
  console.log('  2. Run:  npm run build');
}

main().catch((err) => { console.error(err); process.exitCode = 1; });
