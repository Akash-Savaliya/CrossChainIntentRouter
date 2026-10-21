// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TargetEscrow {
    event ExecutedOnTarget(
        bytes32 indexed intentHash,
        address indexed solver,
        address indexed recipient,
        address token,
        uint256 amount
    );

    mapping(bytes32 => bool) public fulfilledOnTarget;

    function fulfillOnTarget(
        bytes32 intentHash,
        address recipient,
        address token,
        uint256 amount
    ) external {
        require(!fulfilledOnTarget[intentHash], "Target already fulfilled");
        fulfilledOnTarget[intentHash] = true;

        bool success = IERC20(token).transferFrom(
            msg.sender,
            recipient,
            amount
        );
        require(success, "Target transfer failed");

        emit ExecutedOnTarget(intentHash, msg.sender, recipient, token, amount);
    }
}
