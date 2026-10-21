// SPDX-License-Identifier: MIT
pragma solidity ^0.8.37;

import "forge-std/Test.sol";
import "../src/TargetEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockERC20 is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) public {
        _mint(to, amount);
    }
}

contract TargetEscrowTest is Test {
    TargetEscrow targetEscrow;
    MockERC20 token;

    address solver = address(0x1);
    address recipient = address(0x2);

    function setUp() public {
        targetEscrow = new TargetEscrow();
        token = new MockERC20();

        token.mint(solver, 1000 * 10 ** 18);

        vm.prank(solver);
        token.approve(address(targetEscrow), type(uint256).max);
    }

    function testFulfillOnTargetSuccess() public {
        uint256 amount = 100 * 10 ** 18;
        bytes32 intentHash = keccak256("test_intent");

        vm.prank(solver);
        targetEscrow.fulfillOnTarget(
            intentHash,
            recipient,
            address(token),
            amount
        );

        assertEq(token.balanceOf(recipient), amount);
        assertEq(token.balanceOf(solver), 900 * 10 ** 18);
        assertTrue(targetEscrow.fulfilledOnTarget(intentHash));
    }

    function testFulfillOnTargetAlreadyFulfilled() public {
        uint256 amount = 100 * 10 ** 18;
        bytes32 intentHash = keccak256("test_intent");

        vm.startPrank(solver);
        targetEscrow.fulfillOnTarget(
            intentHash,
            recipient,
            address(token),
            amount
        );

        vm.expectRevert("Target already fulfilled");
        targetEscrow.fulfillOnTarget(
            intentHash,
            recipient,
            address(token),
            amount
        );
        vm.stopPrank();
    }
}
