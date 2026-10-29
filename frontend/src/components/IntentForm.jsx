import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CHAINS, CONTRACT_ADDRESS, DESTINATION_CHAINS, SOURCE_CHAINS } from '../constants/config';
import { signIntent } from '../utils/eip712';
import { submitIntentToBackend } from '../services/api';

const ERC20_ABI = [
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

async function ensureInputTokenApproval(sourceChainId, inputToken, inputAmount) {
  const chainId = BigInt(sourceChainId);
  let provider = new ethers.BrowserProvider(window.ethereum);
  const network = await provider.getNetwork();

  if (network.chainId !== chainId) {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain', 
      params: [{ chainId: ethers.toBeHex(chainId) }]
    });
    provider = new ethers.BrowserProvider(window.ethereum);
  }

  const signer = await provider.getSigner();
  const token = new ethers.Contract(inputToken, ERC20_ABI, signer);
  const allowance = await token.allowance(await signer.getAddress(), CONTRACT_ADDRESS);

  if (allowance < BigInt(inputAmount)) {
    const approveTx = await token.approve(CONTRACT_ADDRESS, inputAmount);
    await approveTx.wait();
  }

  return provider;
}

function createNonce() {
  const random = crypto.getRandomValues(new Uint32Array(1))[0];
  return (BigInt(Date.now()) * 4294967296n + BigInt(random)).toString();
}

export default function IntentForm({ account }) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const [formData, setFormData] = useState({
    user: account,
    sourceChainId: CHAINS.SOURCE,
    destinationChainId: CHAINS.DESTINATION,
    inputToken: '0x0000000000000000000000000000000000000000',
    inputAmount: '1000000000000000',
    outputToken: '0x0000000000000000000000000000000000000000',
    outputAmount: '1000000',
    recipient: ''
  });

  useEffect(() => {
    if (account) {
      setFormData(prev => ({ ...prev, recipient: account }));
    }
  }, [account]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'sourceChainId' || name === 'destinationChainId' ? Number(value) : value;
    setFormData({ ...formData, [name]: nextValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!account) {
      alert('Please connect your wallet first!');
      return;
    }

    setLoading(true);
    setStatusMessage('Approving input token for IntentRegistry...');

    try {
      const provider = await ensureInputTokenApproval(
        formData.sourceChainId,
        formData.inputToken,
        formData.inputAmount
      );
      setStatusMessage('Requesting EIP-712 Signature from MetaMask...');
      const signer = await provider.getSigner();
      const nonce = createNonce();
      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const intentToSign = { ...formData, user: account, nonce, deadline };

      const signature = await signIntent(signer, intentToSign, intentToSign.sourceChainId);
      setStatusMessage('Signature generated successfully! Sending to backend...');

      const payload = {
        user: account,
        sourceChainId: Number(formData.sourceChainId),
        destinationChainId: Number(formData.destinationChainId),
        inputToken: formData.inputToken,
        inputAmount: formData.inputAmount,
        outputToken: formData.outputToken,
        outputAmount: formData.outputAmount,
        recipient: formData.recipient,
        nonce,
        deadline,
        signature: signature
      };

      const result = await submitIntentToBackend(payload);
      setStatusMessage(`Success! Intent Saved. ID: ${result.intentId}`);

    } catch (error) {
      console.error(error);
      setStatusMessage(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="form" onSubmit={handleSubmit}>
      <div className="field">
        <label>Source Chain:</label>
        <select name="sourceChainId" value={formData.sourceChainId} onChange={handleChange}>
          {SOURCE_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id}>{chain.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Target Chain:</label>
        <select name="destinationChainId" value={formData.destinationChainId} onChange={handleChange}>
          {DESTINATION_CHAINS.map((chain) => (
            <option key={chain.id} value={chain.id}>{chain.name}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Input Token Address:</label>
        <input type="text" name="inputToken" value={formData.inputToken} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Input Amount (Wei):</label>
        <input type="text" name="inputAmount" value={formData.inputAmount} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Output Token Address:</label>
        <input type="text" name="outputToken" value={formData.outputToken} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Output Amount:</label>
        <input type="text" name="outputAmount" value={formData.outputAmount} onChange={handleChange} />
      </div>
      <div className="field">
        <label>Recipient Address:</label>
        <input type="text" name="recipient" value={formData.recipient} onChange={handleChange} />
      </div>
      <button className="submit-button" type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Sign Intent & Submit'}
      </button>

      {statusMessage && (
        <div className="status">
          <p>{statusMessage}</p>
        </div>
      )}
    </form>
  );
}