import "dotenv/config";
// Polyfill globalThis.crypto pour jose v6 (Node 18+)
import { webcrypto } from "crypto";
if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ensureUploadDir } from "../storage";
import { ENV } from "./env";
import { registerGoogleOAuth, registerFacebookOAuth } from "./oauth-providers";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => { server.close(() => resolve(true)); });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) return port;
  }
  throw new Error(`No available port from ${startPort}`);
}

async function startServer() {
  await ensureUploadDir();

  const app = express();
  const server = createServer(app);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Fichiers uploadés
  app.use("/uploads", express.static(path.resolve(ENV.uploadDir)));

  // OAuth Google & Facebook
  registerGoogleOAuth(app);
  registerFacebookOAuth(app);

  // tRPC API
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);
  server.listen(port, () => console.log(`Server running on http://localhost:${port}/`));
}

startServer().catch(console.error);
