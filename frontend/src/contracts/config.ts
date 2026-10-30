import { ethers } from "ethers";
import ClubVaultABI from "./ClubVaultABI.json";
import VaultFactoryABI from "./VaultFactoryABI.json";
import ClubVaultV2ABI from "./ClubVaultV2ABI.json";
import VaultFactoryV2ABI from "./VaultFactoryV2ABI.json";

export { ClubVaultABI, VaultFactoryABI, ClubVaultV2ABI, VaultFactoryV2ABI };

export const MST_TESTNET_CONFIG = {
  chainId: 91562037,
  chainIdHex: "0x5752035",
  chainName: "MST Testnet",
  nativeCurrency: {
    name: "MST Test Token",
    symbol: "tMSTC",
    decimals: 18,
  },
  rpcUrls: ["https://testnetrpc.mstblockchain.com"],
  blockExplorerUrls: ["https://testnet.mstscan.com"],
};

// Static networks to prevent ethers v6 auto-detection retry loop
const mstTestnetNetwork = ethers.Network.from({
  name: "mst-testnet",
  chainId: 91562037,
});

const mstMainnetNetwork = ethers.Network.from({
  name: "mst-mainnet",
  chainId: 4646,
});

let _sharedMstTestnetProvider: ethers.JsonRpcProvider | null = null;
let _sharedMstMainnetProvider: ethers.JsonRpcProvider | null = null;

export function getMstRpcProvider(chainId?: number): ethers.JsonRpcProvider {
  if (chainId === MST_TESTNET_CONFIG.chainId) {
    if (!_sharedMstTestnetProvider) {
      _sharedMstTestnetProvider = new ethers.JsonRpcProvider(
        MST_TESTNET_CONFIG.rpcUrls[0],
        mstTestnetNetwork,
        { staticNetwork: mstTestnetNetwork, batchMaxCount: 10 }
      );
    }
    return _sharedMstTestnetProvider;
  }

  // Default to MST Mainnet for production
  if (!_sharedMstMainnetProvider) {
    _sharedMstMainnetProvider = new ethers.JsonRpcProvider(
      MST_MAINNET_CONFIG.rpcUrls[0],
      mstMainnetNetwork,
      { staticNetwork: mstMainnetNetwork, batchMaxCount: 10 }
    );
  }
  return _sharedMstMainnetProvider;
}

export const MST_MAINNET_CONFIG = {
  chainId: 4646,
  chainIdHex: "0x1226",
  chainName: "MST Mainnet",
  nativeCurrency: {
    name: "MST Coin",
    symbol: "MSTC",
    decimals: 18,
  },
  rpcUrls: ["https://mariorpc.mstblockchain.com"],
  blockExplorerUrls: ["https://mstscan.com"],
};

export const HARDHAT_CONFIG = {
  chainId: 31337,
  chainIdHex: "0x7a69",
  chainName: "Hardhat Local",
  nativeCurrency: {
    name: "Hardhat ETH",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["http://127.0.0.1:8545"],
  blockExplorerUrls: [],
};

export interface NetworkContracts {
  VaultFactory: string | null;
  GenesisVault: string | null;
  isDeployed: boolean;
  VaultFactoryV2?: string | null;
  GenesisVaultV2?: string | null;
  testRelayerVault2of2?: string | null;
  relayerUrl?: string;
}

export const NETWORK_CONTRACTS: Record<number, NetworkContracts> = {
  // MST Testnet (Chain ID 91562037)
  91562037: {
    VaultFactory: "0xFf1A398eaEAd76dEEA1bF84BDF52e25848369308",
    GenesisVault: "0xECAD385e56299b0aec5A51dB2DdCF0A4746E7c31",
    isDeployed: true,
    VaultFactoryV2: "0x68738EfB0e8B2Dad986a9FF3Db3eF39A0D4Fcfb0", // Live on MST Testnet
    GenesisVaultV2: "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9", // Live on MST Testnet
    testRelayerVault2of2: "0x90e309A5246B37bBC79224A1449D25CC29ef88bE", // Live 2-of-2 multisig test vault
    relayerUrl: "http://localhost:3001",
  },
  // MST Mainnet (Chain ID 4646) — Verified Production Deployment
  4646: {
    VaultFactory: "0x57B3f9C17ADfAa10d2Bbc9E2955be41ed2528b58",
    GenesisVault: "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339",
    isDeployed: true,
    VaultFactoryV2: "0x57B3f9C17ADfAa10d2Bbc9E2955be41ed2528b58",
    GenesisVaultV2: "0x9a81aED1b3D2d4c85A0ea8FC6129D17b2fFed339",
    relayerUrl: "http://localhost:3001",
  },
  // Hardhat Local Node (development only)
  31337: {
    VaultFactory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    GenesisVault: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
    isDeployed: true,
    VaultFactoryV2: "0x68738EfB0e8B2Dad986a9FF3Db3eF39A0D4Fcfb0",
    GenesisVaultV2: "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9",
    testRelayerVault2of2: "0x90e309A5246B37bBC79224A1449D25CC29ef88bE",
    relayerUrl: "http://localhost:3001",
  },
};

export const getContractsForChain = (chainId: number): NetworkContracts => {
  return (
    NETWORK_CONTRACTS[chainId] || {
      VaultFactory: null,
      GenesisVault: null,
      isDeployed: false,
    }
  );
};

const defaultRelayerUrl =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_RELAYER_URL) ||
  "http://localhost:3001";

export const CONTRACT_ADDRESSES = {
  VaultFactory: NETWORK_CONTRACTS[4646].VaultFactory || NETWORK_CONTRACTS[91562037].VaultFactory,
  GenesisVault: NETWORK_CONTRACTS[4646].GenesisVault || NETWORK_CONTRACTS[91562037].GenesisVault,
  VaultFactoryV2: NETWORK_CONTRACTS[4646].VaultFactoryV2 || NETWORK_CONTRACTS[91562037].VaultFactoryV2,
  GenesisVaultV2: NETWORK_CONTRACTS[4646].GenesisVaultV2 || NETWORK_CONTRACTS[91562037].GenesisVaultV2,
  testRelayerVault2of2: NETWORK_CONTRACTS[91562037].testRelayerVault2of2,
  isDeployed: true,
  isTestnetDeployed: NETWORK_CONTRACTS[91562037].isDeployed,
  relayerUrl: defaultRelayerUrl,
};

// EIP-712 Typed Data Configuration for ClubVaultV2 Relayer
export const EIP712_VOTE_TYPES = {
  VoteProposal: [
    { name: "voter", type: "address" },
    { name: "proposalId", type: "uint256" },
    { name: "approve", type: "bool" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};
