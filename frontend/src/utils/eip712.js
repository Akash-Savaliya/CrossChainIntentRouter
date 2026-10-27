import { CONTRACT_ADDRESS } from '../constants/config';

export async function signIntent(signer, intentData, chainId) {
  const domain = {
    name: 'IntentRegistry',
    version: '1',
    chainId: Number(chainId),
    verifyingContract: CONTRACT_ADDRESS
  };

  const types = {
    Intent: [
      { name: 'user', type: 'address' },
      { name: 'inputToken', type: 'address' },
      { name: 'inputAmount', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'nonce', type: 'uint256' },
      { name: 'outputToken', type: 'address' },
      { name: 'outputAmount', type: 'uint256' },
      { name: 'destinationChainId', type: 'uint256' },
      { name: 'recipient', type: 'address' }
    ]
  };

  const signature = await signer.signTypedData(domain, types, intentData);
  return signature;
}