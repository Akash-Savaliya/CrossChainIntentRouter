const axios = require('axios');
const { ethers } = require('ethers');
require('dotenv').config();

const BACKEND_URL = process.env.BACKEND_URL;

const sourceProvider = new ethers.JsonRpcProvider(process.env.SOURCE_RPC_URL);
const destinationProvider = new ethers.JsonRpcProvider(process.env.DESTINATION_RPC_URL);

const solverWalletSource = new ethers.Wallet(process.env.SOLVER_PRIVATE_KEY, sourceProvider);
const solverWalletDestination = new ethers.Wallet(process.env.SOLVER_PRIVATE_KEY, destinationProvider);

const INTENT_REGISTRY_ADDRESS = process.env.INTENT_REGISTRY_ADDRESS;
const ESCROW_CONTRACT_ADDRESS = process.env.ESCROW_CONTRACT_ADDRESS;

const REGISTRY_ABI = [
    "function fulfillIntent((address user,address inputToken,uint256 inputAmount,uint256 deadline,uint256 nonce,address outputToken,uint256 outputAmount,uint256 destinationChainId,address recipient) intent, bytes signature) external"
];

const ESCROW_ABI = [
    "function fulfillOnTarget(bytes32 intentHash, address recipient, address token, uint256 amount) external payable"
];

const ERC20_ABI = [
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)'
];

const registryContract = new ethers.Contract(INTENT_REGISTRY_ADDRESS, REGISTRY_ABI, solverWalletSource);
const escrowContract = new ethers.Contract(ESCROW_CONTRACT_ADDRESS, ESCROW_ABI, solverWalletDestination);

async function startFullFlowSolverBot() {
    console.log('Solver Bot started...');

    setInterval(async () => {
        try {
            const response = await axios.get(BACKEND_URL + '/intents');
            const pendingIntents = response.data.intents;

            if (!pendingIntents || pendingIntents.length === 0) {
                return;
            }

            console.log('Found ' + pendingIntents.length + ' pending intents');

            const sourceNetwork = await sourceProvider.getNetwork();
            const destinationNetwork = await destinationProvider.getNetwork();

            for (const intent of pendingIntents) {
                if (
                    BigInt(intent.sourceChainId) !== sourceNetwork.chainId ||
                    BigInt(intent.destinationChainId) !== destinationNetwork.chainId
                ) {
                    console.log('Skipping intent ' + intent._id + ': chain id does not match solver RPCs');
                    continue;
                }

                const latestBlock = await sourceProvider.getBlock('latest');
                if (BigInt(intent.deadline) <= latestBlock.timestamp) {
                    console.log('Skipping intent ' + intent._id + ': deadline passed');
                    try {
                        await axios.patch(BACKEND_URL + '/intents/' + intent._id + '/status', {
                            status: 'failed'
                        });
                    } catch (patchErr) {
                        console.error('Failed to update status to failed:', patchErr.message);
                    }
                    continue;
                }

                console.log('\nProcessing Intent ID: ' + intent._id);
                let destinationFilled = false;

                try {
                    console.log('Executing fulfillOnTarget on Destination chain...');

                    const outputToken = new ethers.Contract(intent.outputToken, ERC20_ABI, solverWalletDestination);
                    const outputAmount = BigInt(intent.outputAmount);
                    const allowance = await outputToken.allowance(solverWalletDestination.address, ESCROW_CONTRACT_ADDRESS);
                    if (allowance < outputAmount) {
                        const approveTx = await outputToken.approve(ESCROW_CONTRACT_ADDRESS, outputAmount);
                        await approveTx.wait();
                    }

                    try {
                        const txTarget = await escrowContract.fulfillOnTarget(
                            intent.intentIdHash,
                            intent.recipient,
                            intent.outputToken,
                            intent.outputAmount
                        );

                        console.log('Destination tx submitted, Hash: ' + txTarget.hash);
                        await txTarget.wait();
                        console.log('Destination tx confirmed! Recipient got funds.');
                    } catch (destError) {
                        const text = (destError.shortMessage || '') + ' ' + (destError.message || '');
                        if (!text.includes('Target already fulfilled')) {
                            throw destError;
                        }
                        console.log('Destination already fulfilled');
                    }
                    destinationFilled = true;

                    console.log('Executing fulfillIntent on Source chain for settlement...');

                    const intentStruct = {
                        user: intent.user,
                        inputToken: intent.inputToken,
                        inputAmount: intent.inputAmount,
                        deadline: intent.deadline,
                        nonce: intent.nonce,
                        outputToken: intent.outputToken,
                        outputAmount: intent.outputAmount,
                        destinationChainId: intent.destinationChainId,
                        recipient: intent.recipient
                    };

                    const txSource = await registryContract.fulfillIntent(
                        intentStruct,
                        intent.signature
                    );

                    console.log('Source settlement tx submitted, Hash: ' + txSource.hash);
                    await txSource.wait();
                    console.log('Source settlement confirmed! Funds released to solver.');

                    await axios.patch(BACKEND_URL + '/intents/' + intent._id + '/status', {
                        status: 'completed'
                    });

                    console.log('Intent ' + intent._id + ' fully completed & marked on backend!');

                } catch (txError) {
                    console.error('Failed to process intent ' + intent._id + ':', txError.shortMessage || txError.message);

                    if (destinationFilled) {
                        continue;
                    }

                    try {
                        await axios.patch(BACKEND_URL + '/intents/' + intent._id + '/status', {
                            status: 'failed'
                        });
                    } catch (patchErr) {
                        console.error('Failed to update status to failed:', patchErr.message);
                    }
                }
            }
        } catch (error) {
            console.error('Error in solver bot loop:', error.message);
        }
    }, 10000);
}

startFullFlowSolverBot();