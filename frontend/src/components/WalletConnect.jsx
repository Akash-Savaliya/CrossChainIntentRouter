import React from 'react';
import { ethers } from 'ethers';

export default function WalletConnect({ account, setAccount }) {
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setAccount(accounts[0]);
      } catch (error) {
        console.error("User rejected connection:", error);
      }
    } else {
      alert('Please install MetaMask!');
    }
  };

  return (
    <div style={{ marginBottom: '20px' }}>
      {!account ? (
        <button onClick={connectWallet} style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '5px' }}>
          Connect MetaMask
        </button>
      ) : (
        <p style={{ background: '#f1f5f9', padding: '10px', borderRadius: '5px' }}>
          <b>Connected:</b> {account}
        </p>
      )}
    </div>
  );
}