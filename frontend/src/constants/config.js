export const CONTRACT_ADDRESS = import.meta.env.VITE_INTENT_REGISTRY_ADDRESS;
export const BACKEND_URL = "http://localhost:4000";

export const CHAINS = {
  SOURCE: 11155111,
  DESTINATION: 421614
};

export const SOURCE_CHAINS = [
  {id: CHAINS.SOURCE, name: 'Ethereum Sepolia'}
];

export const DESTINATION_CHAINS = [
  {id: CHAINS.DESTINATION, name: 'Arbitrum Sepolia'}
];