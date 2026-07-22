// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/UniVoice.sol";

contract DeployUniVoice is Script {
    function run() external {
        // Ambil Private Key dari environment variable
        uint256 deployerPrivateKey = vm.envUint("PK");
        address adminAddress = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy kontrak dengan parameter admin
        UniVoice uniVoice = new UniVoice(adminAddress);

        vm.stopBroadcast();

        console.log("UniVoice deployed to:", address(uniVoice));
        console.log("Admin address:", adminAddress);
    }
}