import { ethers } from "ethers";
import { MST_TESTNET_CONFIG, MST_MAINNET_CONFIG, getMstRpcProvider } from "../contracts/config";

export interface WalletProviderDetail {
  info: {
    uuid: string;
    name: string;
    icon: string;
    rdns: string;
  };
  provider: any;
}

// Global cache for EIP-6963 announced providers
let discoveredProviders: WalletProviderDetail[] = [];
let isListeningForEIP6963 = false;

/**
 * Initialize EIP-6963 provider announcement listener
 */
export function initEIP6963Listener(): void {
  if (typeof window === "undefined" || isListeningForEIP6963) return;
  isListeningForEIP6963 = true;

  window.addEventListener("eip6963:announceProvider", (event: any) => {
    if (event.detail && event.detail.provider) {
      const exists = discoveredProviders.some(
        (p) => p.info.uuid === event.detail.info.uuid || p.info.rdns === event.detail.info.rdns
      );
      if (!exists) {
        discoveredProviders.push(event.detail);
      }
    }
  });

  window.dispatchEvent(new Event("eip6963:requestProvider"));
}

// Auto-initialize discovery
if (typeof window !== "undefined") {
  initEIP6963Listener();
}

/**
 * Detect the genuine BridgeKey provider or injected EVM provider.
 * Follows EIP-6963 -> window.bridgekey -> window.ethereum (isBridgeKey or primary).
 */
export function getBridgeKeyProvider(): any | null {
  if (typeof window === "undefined") return null;

  // 1. Direct window.bridgekey or window.bridgeKey injection
  if ((window as any).bridgekey) {
    return (window as any).bridgekey;
  }
  if ((window as any).bridgeKey) {
    return (window as any).bridgeKey;
  }
  if ((window as any).mst) {
    return (window as any).mst;
  }

  // 2. EIP-6963 discovered BridgeKey provider
  const bridgeKeyEIP = discoveredProviders.find(
    (p) =>
      p.info.name.toLowerCase().includes("bridgekey") ||
      p.info.rdns.toLowerCase().includes("bridgekey")
  );
  if (bridgeKeyEIP?.provider) {
    return bridgeKeyEIP.provider;
  }

  // 3. Multi-provider injected array (e.g. window.ethereum.providers)
  const eth = (window as any).ethereum;
  if (eth?.providers && Array.isArray(eth.providers)) {
    const found = eth.providers.find(
      (p: any) =>
        p.isBridgeKey ||
        p.name?.toLowerCase().includes("bridgekey") ||
        p.info?.name?.toLowerCase().includes("bridgekey")
    );
    if (found) return found;
    // Default to first provider in array if only one extension present
    return eth.providers[0];
  }

  // 4. Injected window.ethereum with isBridgeKey flag
  if (eth?.isBridgeKey) {
    return eth;
  }

  // 5. Standard injected window.ethereum (user's active browser extension wallet)
  if (eth) {
    return eth;
  }

  return null;
}

/**
 * Detect MetaMask provider specifically
 */
export function getMetaMaskProvider(): any | null {
  if (typeof window === "undefined") return null;

  // 1. EIP-6963 announced MetaMask
  const mmEIP = discoveredProviders.find(
    (p) =>
      p.info.name.toLowerCase().includes("metamask") ||
      p.info.rdns.toLowerCase().includes("metamask")
  );
  if (mmEIP?.provider) return mmEIP.provider;

  // 2. window.ethereum.providers array
  const eth = (window as any).ethereum;
  if (eth?.providers && Array.isArray(eth.providers)) {
    const found = eth.providers.find((p: any) => p.isMetaMask && !p.isBridgeKey);
    if (found) return found;
  }

  // 3. Direct window.ethereum (MetaMask)
  if (eth?.isMetaMask && !eth?.isBridgeKey) {
    return eth;
  }

  return null;
}

/**
 * Detect Rabby provider specifically
 */
export function getRabbyProvider(): any | null {
  if (typeof window === "undefined") return null;

  // 1. EIP-6963 announced Rabby
  const rabbyEIP = discoveredProviders.find(
    (p) =>
      p.info.name.toLowerCase().includes("rabby") ||
      p.info.rdns.toLowerCase().includes("rabby")
  );
  if (rabbyEIP?.provider) return rabbyEIP.provider;

  // 2. Direct window.rabby
  if ((window as any).rabby) return (window as any).rabby;

  // 3. window.ethereum.providers array
  const eth = (window as any).ethereum;
  if (eth?.providers && Array.isArray(eth.providers)) {
    const found = eth.providers.find((p: any) => p.isRabby);
    if (found) return found;
  }

  if (eth?.isRabby) return eth;
  return null;
}

/**
 * Detect an EIP-712 compatible provider (MetaMask or Rabby)
 */
export function getEIP712CompatibleProvider(): { provider: any; walletName: string } | null {
  const rabby = getRabbyProvider();
  if (rabby) return { provider: rabby, walletName: "Rabby" };

  const mm = getMetaMaskProvider();
  if (mm) return { provider: mm, walletName: "MetaMask" };

  // Fallback: check any non-BridgeKey EIP-6963 provider
  const otherEIP = discoveredProviders.find(
    (p) =>
      !p.info.name.toLowerCase().includes("bridgekey") &&
      !p.info.rdns.toLowerCase().includes("bridgekey")
  );
  if (otherEIP?.provider) return { provider: otherEIP.provider, walletName: otherEIP.info.name };

  const eth = (window as any).ethereum;
  if (eth?.providers && Array.isArray(eth.providers)) {
    const nonBk = eth.providers.find((p: any) => !p.isBridgeKey);
    if (nonBk) {
      return {
        provider: nonBk,
        walletName: nonBk.isMetaMask ? "MetaMask" : nonBk.isRabby ? "Rabby" : "Injected Web3",
      };
    }
  }

  if (eth && !eth.isBridgeKey) {
    return {
      provider: eth,
      walletName: eth.isMetaMask ? "MetaMask" : eth.isRabby ? "Rabby" : "Injected Web3",
    };
  }

  return null;
}

/**
 * Get active Web3 provider according to user selection or available extensions
 */
export function getActiveWeb3Provider(): any | null {
  if (typeof window === "undefined") return null;

  // BridgeKey is the primary authoritative wallet for MST Blockchain hackathon
  const bk = getBridgeKeyProvider();
  if (bk) return bk;

  const eip712 = getEIP712CompatibleProvider();
  if (eip712?.provider) return eip712.provider;

  return null;
}

/**
 * Check if BridgeKey or any compatible Web3 wallet is installed in browser
 */
export function isBridgeKeyInstalled(): boolean {
  return getBridgeKeyProvider() !== null;
}

/**
 * Request real account authorization from the selected wallet extension
 */
export async function connectRealBridgeKey(
  targetWallet: "bridgekey" | "metamask" | "rabby" | "auto" = "auto"
): Promise<{
  account: string;
  balance: string;
  chainId: string;
  chainIdNum: number;
  isCorrectNetwork: boolean;
  isMainnet: boolean;
  walletName: string;
  provider?: any;
}> {
  let provider = null;
  let walletName = "BridgeKey";

  if (targetWallet === "metamask") {
    provider = getMetaMaskProvider();
    walletName = "MetaMask";
    if (!provider) {
      throw new Error("MetaMask wallet extension not detected. Please install or enable MetaMask.");
    }
  } else if (targetWallet === "rabby") {
    provider = getRabbyProvider();
    walletName = "Rabby";
    if (!provider) {
      throw new Error("Rabby wallet extension not detected. Please install or enable Rabby.");
    }
  } else if (targetWallet === "bridgekey") {
    provider =
      getBridgeKeyProvider() ||
      (typeof window !== "undefined"
        ? (window as any).bridgekey ||
          (window as any).bridgeKey ||
          (window as any).mst ||
          (window as any).ethereum
        : null);
    walletName = "BridgeKey";
    if (!provider) {
      throw new Error(
        "BridgeKey wallet extension not detected. Please make sure the BridgeKey extension is installed and enabled in your browser."
      );
    }
  } else {
    // "auto": Prefer MetaMask/Rabby for EIP-712 compatibility, or fallback to BridgeKey
    const eipComp = getEIP712CompatibleProvider();
    if (eipComp?.provider) {
      provider = eipComp.provider;
      walletName = eipComp.walletName;
    } else {
      provider = getBridgeKeyProvider();
      walletName = "BridgeKey";
    }
    if (!provider) {
      throw new Error(
        "No Web3 wallet extension detected. Please install MetaMask, Rabby, or BridgeKey."
      );
    }
  }

  // Request account authorization directly from wallet (standard EIP-1102 / EIP-1193)
  const accounts: string[] = await provider.request({
    method: "eth_requestAccounts",
  });

  if (!accounts || accounts.length === 0) {
    throw new Error(`No accounts authorized. Please unlock ${walletName} and select an account.`);
  }

  const rawAccount = accounts[0];
  if (!rawAccount || !ethers.isAddress(rawAccount)) {
    throw new Error("Invalid account address returned from wallet.");
  }
  const checksumAddress = ethers.getAddress(rawAccount);

  // Read and validate active chain ID using safe numeric conversion (fast, in-memory)
  let chainIdNum = 0;
  let chainIdHex = "";
  try {
    chainIdHex = await provider.request({ method: "eth_chainId" });
    chainIdNum = typeof chainIdHex === "string" ? parseInt(chainIdHex, 16) : Number(chainIdHex);
  } catch (chainErr) {
    console.warn("Failed to read chainId from wallet provider:", chainErr);
  }

  const isCorrect = chainIdNum === MST_TESTNET_CONFIG.chainId || chainIdNum === MST_MAINNET_CONFIG.chainId;

  // Return connection result immediately without blocking on network balance RPCs
  return {
    account: checksumAddress,
    balance: "0.00",
    chainId: chainIdHex || `0x${chainIdNum.toString(16)}`,
    chainIdNum,
    isCorrectNetwork: isCorrect,
    isMainnet: chainIdNum === MST_MAINNET_CONFIG.chainId,
    walletName,
    provider,
  };
}

/**
 * Asynchronously query live account balance without blocking wallet connection UI
 */
export async function fetchWalletBalance(
  provider: any,
  checksumAddress: string,
  chainIdNum?: number
): Promise<string> {
  if (!checksumAddress || !ethers.isAddress(checksumAddress)) return "0.00";

  try {
    if (provider?.request) {
      const balHex = await provider.request({
        method: "eth_getBalance",
        params: [checksumAddress, "latest"],
      });
      return Number(ethers.formatEther(balHex)).toFixed(4);
    }
  } catch {}

  try {
    const rpc = getMstRpcProvider(chainIdNum);
    const bal = await rpc.getBalance(checksumAddress);
    return Number(ethers.formatEther(bal)).toFixed(4);
  } catch {
    return "0.00";
  }
}

/**
 * Switch wallet to MST Testnet (Chain ID 91562037) or add it if not configured
 */
export async function switchOrAddMSTTestnet(): Promise<boolean> {
  const provider = getBridgeKeyProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MST_TESTNET_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    // Error 4902 means chain has not been added to wallet yet
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: MST_TESTNET_CONFIG.chainIdHex,
              chainName: MST_TESTNET_CONFIG.chainName,
              rpcUrls: MST_TESTNET_CONFIG.rpcUrls,
              nativeCurrency: MST_TESTNET_CONFIG.nativeCurrency,
              blockExplorerUrls: MST_TESTNET_CONFIG.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add MST Testnet to wallet:", addError);
        return false;
      }
    }
    console.error("Failed to switch network:", switchError);
    return false;
  }
}

/**
 * Switch wallet to MST Mainnet (Chain ID 4646) or add it if not configured
 */
export async function switchOrAddMSTMainnet(): Promise<boolean> {
  const provider = getBridgeKeyProvider();
  if (!provider) return false;

  try {
    await provider.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: MST_MAINNET_CONFIG.chainIdHex }],
    });
    return true;
  } catch (switchError: any) {
    if (switchError.code === 4902 || switchError?.data?.originalError?.code === 4902) {
      try {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: MST_MAINNET_CONFIG.chainIdHex,
              chainName: MST_MAINNET_CONFIG.chainName,
              rpcUrls: MST_MAINNET_CONFIG.rpcUrls,
              nativeCurrency: MST_MAINNET_CONFIG.nativeCurrency,
              blockExplorerUrls: MST_MAINNET_CONFIG.blockExplorerUrls,
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add MST Mainnet to wallet:", addError);
        return false;
      }
    }
    console.error("Failed to switch network to MST Mainnet:", switchError);
    return false;
  }
}

/**
 * Parse wallet errors into human-readable format and detect background extension reloads
 */
export function parseWalletError(err: any): {
  isExtensionReload: boolean;
  isUserReject: boolean;
  message: string;
} {
  const errString = typeof err === "string" ? err : JSON.stringify(err || {});
  const directMessage = err?.message || "";
  const nestedMessage = err?.error?.message || err?.info?.error?.message || "";
  const combined = `${directMessage} ${nestedMessage} ${errString}`.toLowerCase();

  const isExtensionReload =
    combined.includes("bridgekey was updated") ||
    combined.includes("extension context invalidated") ||
    combined.includes("refresh this page") ||
    combined.includes("reload this tab") ||
    (combined.includes("could not coalesce error") && combined.includes("updated"));

  const isUserReject =
    err?.code === 4001 ||
    err?.code === "ACTION_REJECTED" ||
    err?.action === "reject" ||
    combined.includes("rejected") ||
    combined.includes("user denied") ||
    combined.includes("user rejected") ||
    combined.includes("cancelled") ||
    combined.includes("canceled");

  const isInsufficientFunds =
    combined.includes("insufficient funds") ||
    combined.includes("gas * price + value") ||
    err?.code === "INSUFFICIENT_FUNDS";

  let message = "";
  if (isExtensionReload) {
    message = "BridgeKey extension was updated in the background. Please refresh this page to reconnect.";
  } else if (isUserReject) {
    message = "Transaction was cancelled in your wallet.";
  } else if (isInsufficientFunds) {
    message = "Insufficient wallet balance: The entered amount plus gas fees exceeds your available balance. Please enter a lower amount.";
  } else if (err?.reason) {
    message = err.reason;
  } else if (nestedMessage && !nestedMessage.includes("could not coalesce")) {
    message = nestedMessage;
  } else if (err?.shortMessage && err.shortMessage !== "could not coalesce error") {
    message = err.shortMessage;
  } else if (directMessage && !directMessage.includes("could not coalesce")) {
    message = directMessage;
  } else {
    // If ethers wrapped it in "could not coalesce error", extract the inner message
    const match = directMessage.match(/"message":\s*"([^"]+)"/);
    if (match && match[1]) {
      message = match[1];
    } else {
      message = err?.shortMessage || directMessage || "Transaction failed";
    }
  }

  return { isExtensionReload, isUserReject, message };
}

/**
 * Convenience helper to initialize ethers.js BrowserProvider and Signer from detected BridgeKey provider
 */
export async function getBrowserSigner(): Promise<{
  provider: ethers.BrowserProvider;
  signer: ethers.JsonRpcSigner;
} | null> {
  const raw = getBridgeKeyProvider();
  if (!raw) return null;
  try {
    await raw.request({ method: "eth_requestAccounts" });
  } catch (e: any) {
    const parsed = parseWalletError(e);
    if (parsed.isExtensionReload) {
      throw new Error("BridgeKey was updated. Refresh this page, then click Connect Wallet again.");
    }
    console.warn("eth_requestAccounts error or dismissed:", e);
  }
  const provider = new ethers.BrowserProvider(raw);
  try {
    const signer = await provider.getSigner();
    return { provider, signer };
  } catch (signerErr: any) {
    const parsed = parseWalletError(signerErr);
    if (parsed.isExtensionReload) {
      throw new Error("BridgeKey was updated. Refresh this page, then click Connect Wallet again.");
    }
    throw signerErr;
  }
}

/**
 * Wait for provider injection (handles async extension loading on page refresh)
 */
export async function waitForInjectedProvider(timeoutMs: number = 2000): Promise<any | null> {
  if (typeof window === "undefined") return null;
  const immediate = getBridgeKeyProvider() || getActiveWeb3Provider() || (window as any).ethereum;
  if (immediate) return immediate;

  return new Promise((resolve) => {
    let resolved = false;

    const check = () => {
      if (resolved) return;
      const p = getBridgeKeyProvider() || getActiveWeb3Provider() || (window as any).ethereum;
      if (p) {
        resolved = true;
        clearInterval(interval);
        window.removeEventListener("eip6963:announceProvider", onAnnounce);
        window.removeEventListener("ethereum#initialized", onAnnounce);
        resolve(p);
      }
    };

    const onAnnounce = () => check();
    window.addEventListener("eip6963:announceProvider", onAnnounce);
    window.addEventListener("ethereum#initialized", onAnnounce);

    const interval = setInterval(check, 100);

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        clearInterval(interval);
        window.removeEventListener("eip6963:announceProvider", onAnnounce);
        window.removeEventListener("ethereum#initialized", onAnnounce);
        resolve(getBridgeKeyProvider() || getActiveWeb3Provider() || (window as any).ethereum || null);
      }
    }, timeoutMs);
  });
}

/**
 * Check if the wallet is currently connected without prompting popup
 */
export async function queryActiveWalletAccount(provider?: any): Promise<{
  account: string;
  balance: string;
  isCorrectNetwork: boolean;
} | null> {
  const p = provider || (await waitForInjectedProvider(1500));
  if (!p || typeof p.request !== "function") return null;

  try {
    const accounts: string[] = await p.request({ method: "eth_accounts" });
    if (!accounts || accounts.length === 0) return null;

    const checksum = ethers.getAddress(accounts[0]);
    let balStr = "0.00";
    try {
      const balHex = await p.request({
        method: "eth_getBalance",
        params: [checksum, "latest"],
      });
      balStr = Number(ethers.formatEther(balHex)).toFixed(4);
    } catch {
      balStr = "0.00";
    }

    const chainIdHex: string = await p.request({ method: "eth_chainId" });
    const isCorrect =
      chainIdHex.toLowerCase() === MST_TESTNET_CONFIG.chainIdHex.toLowerCase() ||
      parseInt(chainIdHex, 16) === MST_TESTNET_CONFIG.chainId;

    return {
      account: checksum,
      balance: balStr,
      isCorrectNetwork: isCorrect,
    };
  } catch (err) {
    console.warn("queryActiveWalletAccount failed:", err);
    return null;
  }
}

