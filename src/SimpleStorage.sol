// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
 
contract SimpleStorage {
    uint256 private value;
    event ValueChanged(address indexed setter, uint256 newValue);
 
    function store(uint256 _value) public {
        value = _value;
        emit ValueChanged(msg.sender, _value);
    }
 
    function retrieve() public view returns (uint256) {
        return value;
    }
}
