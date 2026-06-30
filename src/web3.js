import { ethers } from 'ethers';
import {
  BASE_CHAIN_HEX,
  BASE_RPC,
  CONTRACT_ADDRESS,
  CONTRACT_ABI,
} from './lib/contract.js';

// ─── State ───────────────────────────────────────────────────────────────────
let wallet = null; // { provider, signer, address }
let feeStatus = null; // null | 'paying' | 'ok' | 'skip'

// ─── DOM refs ─────────────────────────────────────────────────────────────────
const connectBtn   = document.getElementById('connect-btn');
const walletInfo   = document.getElementById('wallet-info');
const walletAddr   = document.getElementById('wallet-addr');
const txStatusEl   = document.getElementById('tx-status');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function shortAddr(addr) {
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

function setTxStatus(msg, type = 'info') {
  if (!txStatusEl) return;
  txStatusEl.textContent = msg;
  txStatusEl.className = `tx-status tx-status--${type}`;
  txStatusEl.style.display = msg ? 'block' : 'none';
}

// ─── Connect Wallet ───────────────────────────────────────────────────────────
export async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask not found. Please install MetaMask to use on-chain features.');
    return null;
  }
  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    await provider.send('eth_requestAccounts', []);

    // Switch to Base Mainnet
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: BASE_CHAIN_HEX }],
      });
    } catch (err) {
      if (err.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: BASE_CHAIN_HEX,
            chainName: 'Base',
            nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
            rpcUrls: [BASE_RPC],
            blockExplorerUrls: ['https://basescan.org'],
          }],
        });
      } else {
        throw err;
      }
    }

    const signer  = await provider.getSigner();
    const address = await signer.getAddress();
    wallet = { provider, signer, address };

    // Update UI
    connectBtn.textContent = 'Connected';
    connectBtn.disabled = true;
    walletInfo.style.display = 'flex';
    walletAddr.textContent = shortAddr(address);

    return wallet;
  } catch (err) {
    console.error('Wallet connect failed:', err);
    alert('Wallet connection failed: ' + (err?.message || err));
    return null;
  }
}

// ─── Pay Start Fee ────────────────────────────────────────────────────────────
export async function payStartFee() {
  if (!wallet?.signer) return 'skip';
  if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return 'skip';

  feeStatus = 'paying';
  setTxStatus('Confirming start transaction...', 'pending');

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
    const fee = await contract.gameStartFee();
    
    // Append builder code bc_zcfcz746 to transaction data
    const txReq = await contract.payGameStart.populateTransaction({ value: fee });
    const builderCodeHex = ethers.hexlify(ethers.toUtf8Bytes('bc_zcfcz746')).replace('0x', '');
    txReq.data = txReq.data + builderCodeHex;
    
    const tx = await wallet.signer.sendTransaction(txReq);
    setTxStatus('Waiting for blockchain confirmation...', 'pending');
    await tx.wait();
    feeStatus = 'ok';
    setTxStatus('Payment successful! Starting game...', 'success');
    setTimeout(() => setTxStatus('', ''), 3000);
    return 'ok';
  } catch (e) {
    console.warn('payStartFee failed:', e.message);
    feeStatus = 'skip';
    setTxStatus('Transaction failed, playing for free.', 'warn');
    setTimeout(() => setTxStatus('', ''), 3000);
    return 'skip';
  }
}

// ─── Pay End Fee ──────────────────────────────────────────────────────────────
export async function payEndFee() {
  if (!wallet?.signer) return 'skip';
  if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return 'skip';

  setTxStatus('Sending end fee...', 'pending');

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
    const fee = await contract.gameEndFee();
    
    // Append builder code bc_zcfcz746 to transaction data
    const txReq = await contract.payGameEnd.populateTransaction({ value: fee });
    const builderCodeHex = ethers.hexlify(ethers.toUtf8Bytes('bc_zcfcz746')).replace('0x', '');
    txReq.data = txReq.data + builderCodeHex;
    
    const tx = await wallet.signer.sendTransaction(txReq);
    await tx.wait();
    setTxStatus('End fee sent!', 'success');
    setTimeout(() => setTxStatus('', ''), 3000);
    return 'ok';
  } catch (e) {
    console.warn('payEndFee failed:', e.message);
    setTxStatus('', '');
    return 'skip';
  }
}

// ─── Wire up connect button ────────────────────────────────────────────────────
connectBtn?.addEventListener('click', connectWallet);
