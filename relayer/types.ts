/**
 * Relayer Service Types & Interfaces
 */

export interface RelayVotePayload {
  chainId: number;
  vaultAddress: string;
  voter: string;
  proposalId: number | string;
  approve: boolean;
  deadline: number | string;
  signature: string;
}

export interface RelayVoteSuccessResponse {
  success: true;
  txHash: string;
  status: "pending" | "confirmed";
  blockNumber?: number;
  gasUsed?: string;
  message: string;
}

export interface RelayVoteErrorResponse {
  success: false;
  error: string;
  code: string;
  details?: string;
}

export type RelayVoteResponse = RelayVoteSuccessResponse | RelayVoteErrorResponse;

export interface RelayerStatusResponse {
  status: "healthy" | "degraded";
  service: "ClubVault-Application-Relayer";
  chainId: number;
  relayerAddress: string;
  relayerBalanceWei: string;
  relayerBalanceFormatted: string;
  supportedVaults: string[];
  uptimeSeconds: number;
  rateLimit: {
    maxRequestsPerWindow: number;
    windowSeconds: number;
  };
}

export interface RelayerConfig {
  rpcUrl: string;
  chainId: number;
  relayerPrivateKey?: string; // Loaded strictly server-side from env
  allowlistedVaults: string[];
  port?: number;
  rateLimitWindowMs?: number;
  maxRequestsPerWindow?: number;
}
