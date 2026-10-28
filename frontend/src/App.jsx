import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import IntentForm from './components/IntentForm';

export default function App() {
  const [account, setAccount] = useState('');

  return (
    <div className="page">
      <div className="card">
      <h2 className="title">Cross-Chain Intent Bridge</h2>
      
      <WalletConnect account={account} setAccount={setAccount} />

      <IntentForm account={account} />
      </div>
    </div>
  );
}