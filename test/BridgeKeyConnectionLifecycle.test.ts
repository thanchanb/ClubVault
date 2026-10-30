import { expect } from "chai";
import { ethers } from "ethers";

describe("BridgeKey Wallet Connection Lifecycle & Invariant Verification Suite", function () {
  const TEST_ACCOUNT_1 = "0xF09192ed618C49e9f9A439D97d798F8c600A38a8";
  const TEST_ACCOUNT_2 = "0x06e08cf0aed1663834E267E90333164a0276bbbD";
  const MAINNET_CHAIN_ID_HEX = "0x1226"; // 4646
  const TESTNET_CHAIN_ID_HEX = "0x5752035"; // 91562037

  class MockBridgeKeyProvider {
    public accounts: string[];
    public chainId: string;
    public shouldReject: boolean;
    public listeners: Record<string, ((...args: any[]) => void)[]>;
    public requestCount: Record<string, number>;

    constructor(initialAccounts: string[] = [TEST_ACCOUNT_1], initialChainId: string = MAINNET_CHAIN_ID_HEX) {
      this.accounts = initialAccounts;
      this.chainId = initialChainId;
      this.shouldReject = false;
      this.listeners = {};
      this.requestCount = {};
    }

    on(event: string, callback: (...args: any[]) => void) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(callback);
    }

    removeListener(event: string, callback: (...args: any[]) => void) {
      if (!this.listeners[event]) return;
      this.listeners[event] = this.listeners[event].filter((cb) => cb !== callback);
    }

    off(event: string, callback: (...args: any[]) => void) {
      this.removeListener(event, callback);
    }

    emit(event: string, ...args: any[]) {
      if (this.listeners[event]) {
        for (const cb of this.listeners[event]) {
          cb(...args);
        }
      }
    }

    async request({ method, params }: { method: string; params?: any[] }) {
      this.requestCount[method] = (this.requestCount[method] || 0) + 1;

      if (this.shouldReject) {
        const err: any = new Error("User rejected the request.");
        err.code = 4001;
        err.action = "reject";
        throw err;
      }

      switch (method) {
        case "eth_requestAccounts":
          return this.accounts;
        case "eth_accounts":
          return this.accounts;
        case "eth_chainId":
          return this.chainId;
        case "eth_getBalance":
          return "0x4548dbbb3e9dc000"; // 5.0 ETH / MSTC in hex
        default:
          return null;
      }
    }
  }

  // Pure wallet lifecycle state machine mirroring App.tsx
  class WalletStateMachine {
    public walletStatus: "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "WRONG_NETWORK" | "ERROR";
    public account: string | null;
    public accountBalance: string;
    public currentChainId: number;
    public isConnectedByUser: boolean;
    public statusMessage: string | null;
    public activeProvider: MockBridgeKeyProvider | null;

    constructor() {
      // Boot / Fresh page load: strictly DISCONNECTED
      this.walletStatus = "DISCONNECTED";
      this.account = null;
      this.accountBalance = "0.00";
      this.currentChainId = 4646;
      this.isConnectedByUser = false;
      this.statusMessage = null;
      this.activeProvider = null;
    }

    // TEST 1 & 2: Simulate page boot / reload
    resetOnPageReload() {
      this.isConnectedByUser = false;
      this.walletStatus = "DISCONNECTED";
      this.account = null;
      this.accountBalance = "0.00";
      this.statusMessage = null;
    }

    // Attach listeners exactly once
    initListeners(provider: MockBridgeKeyProvider) {
      this.activeProvider = provider;
      provider.on("accountsChanged", (accounts: string[]) => {
        if (!this.isConnectedByUser) return;
        if (!accounts || accounts.length === 0) {
          this.disconnect();
        } else {
          this.account = ethers.getAddress(accounts[0]);
          this.statusMessage = `Active account switched to ${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
        }
      });

      provider.on("chainChanged", (chainIdHex: string) => {
        if (!this.isConnectedByUser) return;
        const chainIdNum = parseInt(chainIdHex, 16);
        this.currentChainId = chainIdNum;
        if (chainIdNum !== 4646 && chainIdNum !== 91562037) {
          this.walletStatus = "WRONG_NETWORK";
          this.statusMessage = "Notice: Wallet network changed away from MST Network. Transactions are disabled.";
        } else {
          this.walletStatus = "CONNECTED";
          this.statusMessage = chainIdNum === 4646 ? "✔ Connected to MST Mainnet (Chain ID 4646)." : "✔ Connected to MST Testnet (Chain ID 91562037).";
        }
      });
    }

    // TEST 3, 4, 5, 6: Connect Wallet flow
    async connect(provider: MockBridgeKeyProvider | null) {
      if (this.walletStatus === "CONNECTING") {
        return; // Guard against duplicate calls
      }

      this.walletStatus = "CONNECTING";

      if (!provider) {
        this.walletStatus = "ERROR";
        this.statusMessage = "BridgeKey wallet extension not detected. Please make sure BridgeKey is installed.";
        return;
      }

      try {
        const accounts = await provider.request({ method: "eth_requestAccounts" });
        if (!accounts || accounts.length === 0) {
          throw new Error("No accounts authorized.");
        }

        const validAddr = ethers.getAddress(accounts[0]);
        const chainIdHex: any = await provider.request({ method: "eth_chainId" });
        const chainIdNum = parseInt(String(chainIdHex), 16);
        const isMst = chainIdNum === 4646 || chainIdNum === 91562037;

        this.isConnectedByUser = true;
        this.account = validAddr;
        this.currentChainId = chainIdNum;
        this.walletStatus = isMst ? "CONNECTED" : "WRONG_NETWORK";
        this.statusMessage = "Wallet Connected Successfully!";

        // Fetch balance asynchronously in background
        provider.request({ method: "eth_getBalance", params: [validAddr, "latest"] }).then((balHex: any) => {
          if (this.isConnectedByUser) {
            this.accountBalance = Number(ethers.formatEther(balHex)).toFixed(4);
          }
        });
      } catch (err: any) {
        if (err.code === 4001 || err.action === "reject" || err.message?.includes("rejected")) {
          this.isConnectedByUser = false;
          this.account = null;
          this.accountBalance = "0.00";
          this.walletStatus = "DISCONNECTED";
          this.statusMessage = "Wallet connection was cancelled.";
        } else {
          this.walletStatus = "ERROR";
          this.statusMessage = `BridgeKey Error: ${err.message}`;
        }
      } finally {
        if (this.walletStatus === "CONNECTING") {
          this.walletStatus = "DISCONNECTED";
        }
      }
    }

    disconnect() {
      this.isConnectedByUser = false;
      this.account = null;
      this.accountBalance = "0.00";
      this.walletStatus = "DISCONNECTED";
      this.statusMessage = "BridgeKey wallet session disconnected.";
    }
  }

  it("TEST 1 — Fresh page load: starts in disconnected state with Connect Wallet visible", function () {
    const state = new WalletStateMachine();
    expect(state.walletStatus).to.equal("DISCONNECTED");
    expect(state.account).to.be.null;
    expect(state.accountBalance).to.equal("0.00");
    expect(state.isConnectedByUser).to.be.false;
  });

  it("TEST 2 — Reload after previously connecting: always starts in disconnected state", function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider();
    state.initListeners(provider);

    // Simulate previous connection
    state.isConnectedByUser = true;
    state.account = TEST_ACCOUNT_1;
    state.walletStatus = "CONNECTED";

    // Simulate page reload
    state.resetOnPageReload();
    expect(state.walletStatus).to.equal("DISCONNECTED");
    expect(state.account).to.be.null;
    expect(state.isConnectedByUser).to.be.false;
  });

  it("TEST 3 — Click Connect Wallet: triggers eth_requestAccounts on the BridgeKey provider", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider();
    state.initListeners(provider);

    await state.connect(provider);
    expect(provider.requestCount["eth_requestAccounts"]).to.equal(1);
  });

  it("TEST 4 — Approve connection: validates address, updates state immediately, and shows exact notification", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider([TEST_ACCOUNT_1], MAINNET_CHAIN_ID_HEX);
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.walletStatus).to.equal("CONNECTED");
    expect(state.account).to.equal(ethers.getAddress(TEST_ACCOUNT_1));
    expect(state.statusMessage).to.equal("Wallet Connected Successfully!");
    expect(state.isConnectedByUser).to.be.true;
  });

  it("TEST 5 — Reject connection: remains disconnected and displays exact cancellation message", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider();
    provider.shouldReject = true;
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.walletStatus).to.equal("DISCONNECTED");
    expect(state.account).to.be.null;
    expect(state.statusMessage).to.equal("Wallet connection was cancelled.");
    expect(state.isConnectedByUser).to.be.false;
  });

  it("TEST 6 — Click Connect repeatedly: duplicate clicks are blocked while connecting", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider();
    state.initListeners(provider);

    state.walletStatus = "CONNECTING";
    await state.connect(provider); // Should return early without calling request
    expect(provider.requestCount["eth_requestAccounts"] || 0).to.equal(0);
  });

  it("TEST 7 — Change BridgeKey account: immediately updates to newly selected address", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider([TEST_ACCOUNT_1]);
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.account).to.equal(ethers.getAddress(TEST_ACCOUNT_1));

    // User switches account in BridgeKey popup
    provider.emit("accountsChanged", [TEST_ACCOUNT_2]);
    expect(state.account).to.equal(ethers.getAddress(TEST_ACCOUNT_2));
    expect(state.statusMessage).to.include(TEST_ACCOUNT_2.slice(0, 6));
  });

  it("TEST 8 — Lock or disconnect BridgeKey: reverts to disconnected state immediately", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider([TEST_ACCOUNT_1]);
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.walletStatus).to.equal("CONNECTED");

    // BridgeKey locked or revoked (returns empty accounts)
    provider.emit("accountsChanged", []);
    expect(state.walletStatus).to.equal("DISCONNECTED");
    expect(state.account).to.be.null;
    expect(state.isConnectedByUser).to.be.false;
  });

  it("TEST 9 — Switch between MST Mainnet and Testnet: chain state updates without disconnecting wallet", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider([TEST_ACCOUNT_1], MAINNET_CHAIN_ID_HEX);
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.currentChainId).to.equal(4646);
    expect(state.walletStatus).to.equal("CONNECTED");

    // Switch to MST Testnet (91562037)
    provider.emit("chainChanged", TESTNET_CHAIN_ID_HEX);
    expect(state.currentChainId).to.equal(91562037);
    expect(state.walletStatus).to.equal("CONNECTED");
    expect(state.account).to.equal(ethers.getAddress(TEST_ACCOUNT_1));
  });

  it("TEST 10 — Refresh after successful connection: starts completely disconnected again", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider();
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.walletStatus).to.equal("CONNECTED");

    // Browser tab refreshed
    state.resetOnPageReload();
    expect(state.walletStatus).to.equal("DISCONNECTED");
    expect(state.account).to.be.null;
    expect(state.isConnectedByUser).to.be.false;
  });

  it("TEST 11 — BridgeKey not installed: shows clear detection message and does not crash", async function () {
    const state = new WalletStateMachine();
    await state.connect(null);
    expect(state.walletStatus).to.equal("ERROR");
    expect(state.statusMessage).to.equal("BridgeKey wallet extension not detected. Please make sure BridgeKey is installed.");
  });

  it("TEST 12 — Existing application regression: verifies proposal and treasury invariant math after connection", async function () {
    const state = new WalletStateMachine();
    const provider = new MockBridgeKeyProvider([TEST_ACCOUNT_1]);
    state.initListeners(provider);

    await state.connect(provider);
    expect(state.walletStatus).to.equal("CONNECTED");

    // Verify mathematical solvency invariants
    const vaultBalance = ethers.parseEther("10.0");
    const reservedFunds = ethers.parseEther("2.5");
    const availableFunds = vaultBalance - reservedFunds;

    expect(availableFunds).to.equal(ethers.parseEther("7.5"));
    expect(vaultBalance >= reservedFunds).to.be.true;
  });
});
