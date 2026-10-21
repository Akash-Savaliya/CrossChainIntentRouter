// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/IntentRegistry.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract IntentRegistryTest is Test {
    IntentRegistry intentRegistry;
    MockERC20 token;

    uint256 userPrivateKey = 0xA11CE;
    address user;
    address solver;

    function setUp() public {
        user = vm.addr(userPrivateKey);
        solver = address(this);

        intentRegistry = new IntentRegistry();
        token = new MockERC20();

        token.mint(user, 1000 * 10 ** 18);

        vm.prank(user);
        token.approve(address(intentRegistry), type(uint256).max);
    }

    function testFillIntentSuccess() public {
        uint256 amount = 100 * 10 ** 18;
        uint256 deadline = block.timestamp + 1 hours;
        uint256 nonce = 1;

        IntentRegistry.Intent memory intent = IntentRegistry.Intent({
            user: user,
            inputToken: address(token),
            inputAmount: amount,
            deadline: deadline,
            nonce: nonce,
            outputToken: address(token),
            outputAmount: amount,
            destinationChainId: 1,
            recipient: solver
        });

        bytes32 digest = intentRegistry.getMessageHash(intent);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(userPrivateKey, digest);
        bytes memory signature = abi.encodePacked(r, s, v);

        intentRegistry.fulfillIntent(intent, signature);

        assertEq(token.balanceOf(solver), amount);
        assertEq(token.balanceOf(user), 1000 * 10 ** 18 - amount);
    }
}
