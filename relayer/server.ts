import http, { IncomingMessage, ServerResponse } from "http";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import { RelayerService } from "./service";
import { RelayerConfig } from "./types";

dotenv.config();

export function createRelayerServer(service: RelayerService) {
  const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const clientIp =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    // 1. Health / Status Endpoint (GET /health or /api/relayer/status)
    if (req.method === "GET" && (url.pathname === "/health" || url.pathname === "/api/relayer/status")) {
      try {
        const status = await service.getStatus();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(status, null, 2));
      } catch (err: any) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "error",
            error: "Failed to retrieve relayer health status",
          })
        );
      }
      return;
    }

    // 2. Relay Vote Endpoint (POST /api/relay-vote or /api/relayer/relay-vote)
    if (
      req.method === "POST" &&
      (url.pathname === "/api/relay-vote" || url.pathname === "/api/relayer/relay-vote")
    ) {
      let body = "";
      let byteLength = 0;
      const MAX_SIZE = 10 * 1024; // 10 KB limit

      req.on("data", (chunk: Buffer) => {
        byteLength += chunk.length;
        if (byteLength > MAX_SIZE) {
          res.writeHead(413, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Payload too large. Maximum size is 10 KB.",
              code: "PAYLOAD_TOO_LARGE",
            })
          );
          req.destroy();
          return;
        }
        body += chunk.toString("utf8");
      });

      req.on("end", async () => {
        if (byteLength > MAX_SIZE) return;

        let payload: any;
        try {
          payload = JSON.parse(body);
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Invalid JSON format in request body.",
              code: "INVALID_JSON",
            })
          );
          return;
        }

        try {
          const result = await service.relayVote(payload, clientIp);
          const statusCode = result.success
            ? 200
            : result.code === "RATE_LIMIT_EXCEEDED"
            ? 429
            : 400;

          res.writeHead(statusCode, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result, null, 2));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              success: false,
              error: "Internal server error occurred while processing vote relay.",
              code: "INTERNAL_ERROR",
            })
          );
        }
      });
      return;
    }

    // 3. Save Mainnet Deployment Metadata Endpoint (POST /api/save-mainnet-deployment)
    if (req.method === "POST" && url.pathname === "/api/save-mainnet-deployment") {
      let body = "";
      req.on("data", (chunk: Buffer) => {
        body += chunk.toString("utf8");
      });
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          if (data.network !== "mstMainnet" || data.chainId !== "4646") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "Invalid Mainnet deployment payload." }));
            return;
          }
          const deploymentsDir = path.join(__dirname, "..", "deployments");
          if (!fs.existsSync(deploymentsDir)) {
            fs.mkdirSync(deploymentsDir, { recursive: true });
          }
          const mainnetFilePath = path.join(deploymentsDir, "mstMainnet.json");
          fs.writeFileSync(mainnetFilePath, JSON.stringify(data, null, 2), "utf8");
          console.log(`✔ [Relayer Server] Saved Mainnet deployment record to: ${mainnetFilePath}`);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, path: mainnetFilePath }));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: err.message || "Failed to save deployment" }));
        }
      });
      return;
    }

    // 404 for unknown routes
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Route not found", path: url.pathname }));
  });

  return server;
}

// Standalone runner
if (require.main === module) {
  const rpcUrl =
    process.env.MST_TESTNET_RPC_URL || "https://testnetrpc.mstblockchain.com";
  const chainId = Number(process.env.CHAIN_ID) || 91562037;
  const port = Number(process.env.RELAYER_PORT) || 3001;

  let allowlisted = (process.env.ALLOWLISTED_VAULTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowlisted.length === 0) {
    // Default to verified deployed GenesisClubVaultV2 and TestRelayerVault2of2 on MST Testnet
    allowlisted = [
      "0x8442bF7dE2d0FF9aF4136a83Cf20BE559b6Fb5C9",
      "0x90e309A5246B37bBC79224A1449D25CC29ef88bE",
    ];
  }

  const relayerPrivateKey =
    process.env.RELAYER_PRIVATE_KEY ||
    (process.env.ALLOW_DEPLOYER_AS_RELAYER === "true" ? process.env.PRIVATE_KEY : undefined);

  const config: RelayerConfig = {
    rpcUrl,
    chainId,
    relayerPrivateKey,
    allowlistedVaults: allowlisted,
    port,
  };

  try {
    const service = new RelayerService(config);
    const server = createRelayerServer(service);
    server.listen(port, () => {
      console.log(`ClubVault EIP-712 Relayer listening on http://localhost:${port}`);
      console.log(`Target Network Chain ID: ${chainId}`);
      console.log(`Allowlisted Vaults: ${allowlisted.join(", ") || "None configured"}`);
    });
  } catch (err: any) {
    console.error("Failed to start relayer server:", err.message);
    process.exit(1);
  }
}
