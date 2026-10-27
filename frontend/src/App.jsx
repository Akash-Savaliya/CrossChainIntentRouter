import React, { useState } from 'react';
import WalletConnect from './components/WalletConnect';
import IntentForm from './components/IntentForm';

export default function App() {
  const [account, setAccount] = useState('');

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto', fontFamily: 'sans-serif', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
      <h2 style={{ textAlign: 'center', color: '#1e293b' }}>Cross-Chain Intent Bridge</h2>
      
      <WalletConnect account={account} setAccount={setAccount} />

      <IntentForm account={account} />
    </div>
  );
}