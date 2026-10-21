// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IntentRegistry is EIP712 {
    using ECDSA for bytes32;

    struct Intent {
        address user;
        address inputToken;
        uint256 inputAmount;
        uint256 deadline;
        uint256 nonce;
        address outputToken;
        uint256 outputAmount;
        uint256 destinationChainId;
        address recipient;
    }

    bytes32 public constant INTENT_TYPEHASH =
        keccak256(
            "Intent(address user,address inputToken,uint256 inputAmount,uint256 deadline,uint256 nonce,address outputToken,uint256 outputAmount,uint256 destinationChainId,address recipient)"
        );

    mapping(address => uint256) public nonces;

    constructor() EIP712("IntentRegistry", "1") {}

    function fulfillIntent(
        Intent calldata intent,
        bytes memory signature
    ) external {
        require(block.timestamp <= intent.deadline, "Intent expired");
        require(intent.nonce == ++nonces[intent.user], "Invalid nonce");

        bytes32 digest = getMessageHash(intent);

        address signer = digest.recover(signature);
        require(signer == intent.user, "Invalid signature");

        bool success = IERC20(intent.inputToken).transferFrom(
            intent.user,
            msg.sender,
            intent.inputAmount
        );
        require(success, "Token transfer failed");
    }

    function getMessageHash(
        Intent calldata intent
    ) public view returns (bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(
                INTENT_TYPEHASH,
                intent.user,
                intent.inputToken,
                intent.inputAmount,
                intent.deadline,
                intent.nonce,
                intent.outputToken,
                intent.outputAmount,
                intent.destinationChainId,
                intent.recipient
            )
        );
        return _hashTypedDataV4(structHash);
    }
}
