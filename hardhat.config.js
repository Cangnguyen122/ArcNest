require("@nomicfoundation/hardhat-toolbox");
require("dotenv/config");

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || "";
const NEXT_PUBLIC_ARC_TESTNET_RPC_URL = process.env.NEXT_PUBLIC_ARC_TESTNET_RPC_URL || "";

module.exports = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    arcTestnet: {
      url: NEXT_PUBLIC_ARC_TESTNET_RPC_URL,
      accounts: DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [],
    },
  },
};