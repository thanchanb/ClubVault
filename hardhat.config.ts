import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "shanghai",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    mstTestnet: {
      url: process.env.MST_TESTNET_RPC_URL || "https://testnetrpc.mstblockchain.com",
      chainId: 91562037,
      gasPrice: 1000000000, // 1 Gwei
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: {
      mstTestnet: process.env.EXPLORER_API_KEY || "blockscout",
    },
    customChains: [
      {
        network: "mstTestnet",
        chainId: 91562037,
        urls: {
          apiURL: "https://testnet.mstscan.com/api",
          browserURL: "https://testnet.mstscan.com",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
