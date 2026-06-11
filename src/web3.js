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
    alert('MetaMask không tìm thấy. Hãy cài MetaMask để dùng tính năng on-chain.');
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
    alert('Kết nối ví thất bại: ' + (err?.message || err));
    return null;
  }
}

// ─── Pay Start Fee ────────────────────────────────────────────────────────────
export async function payStartFee() {
  if (!wallet?.signer) return 'skip';
  if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return 'skip';

  feeStatus = 'paying';
  setTxStatus('⏳ Đang xác nhận giao dịch bắt đầu…', 'pending');

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
    const fee = await contract.gameStartFee();
    const tx  = await contract.payGameStart({ value: fee });
    setTxStatus('⏳ Chờ xác nhận trên blockchain…', 'pending');
    await tx.wait();
    feeStatus = 'ok';
    setTxStatus('✅ Thanh toán thành công! Bắt đầu chơi…', 'success');
    setTimeout(() => setTxStatus('', ''), 3000);
    return 'ok';
  } catch (e) {
    console.warn('payStartFee failed:', e.message);
    feeStatus = 'skip';
    setTxStatus('⚠️ Giao dịch thất bại, chơi miễn phí.', 'warn');
    setTimeout(() => setTxStatus('', ''), 3000);
    return 'skip';
  }
}

// ─── Pay End Fee ──────────────────────────────────────────────────────────────
export async function payEndFee() {
  if (!wallet?.signer) return 'skip';
  if (CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') return 'skip';

  setTxStatus('⏳ Đang gửi phí kết thúc…', 'pending');

  try {
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet.signer);
    const fee = await contract.gameEndFee();
    const tx  = await contract.payGameEnd({ value: fee });
    await tx.wait();
    setTxStatus('✅ Phí kết thúc đã gửi!', 'success');
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
