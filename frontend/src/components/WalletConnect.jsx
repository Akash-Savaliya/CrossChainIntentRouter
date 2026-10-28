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
    <div className="wallet">
      {!account ? (
        <button className="connect-button" onClick={connectWallet}>
          Connect MetaMask
        </button>
      ) : (
        <p className="connected">
          <b>Connected:</b> {account}
        </p>
      )}
    </div>
  );
}