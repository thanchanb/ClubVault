import ClubVaultABI from "./ClubVaultABI.json";
import VaultFactoryABI from "./VaultFactoryABI.json";

export { ClubVaultABI, VaultFactoryABI };

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

export const CONTRACT_ADDRESSES = {
  // If deployed to testnet or mock, specify here; fallback addresses provided for UI exploration
  VaultFactory: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  GenesisVault: "0xa16E02E87b7454126E5E10d957A927A7F5B5d2be",
};
