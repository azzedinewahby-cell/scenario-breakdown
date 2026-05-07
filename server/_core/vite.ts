import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

// En production, on sert les fichiers statiques compilés
export function serveStatic(app: Express) {
  const distPath = path.join(process.cwd(), "dist", "public");
  console.log(`[Static] Serving from: ${distPath}`);
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

// En développement, on utilise Vite dev server
// Import dynamique pour éviter que vite.config (qui utilise import.meta.dirname)
// soit évalué en production sur Node 18
export async function setupVite(app: Express, server: Server) {
  const { createServer: createViteServer } = await import("vite");
  const { nanoid } = await import("nanoid");
  const { fileURLToPath } = await import("url");
  const viteConfig = (await import("../../vite.config")).default;

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: { middlewareMode: true, hmr: { server }, allowedHosts: true as const },
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    try {
      const srcDir = path.dirname(fileURLToPath(import.meta.url));
      const clientTemplate = path.resolve(srcDir, "../..", "client", "index.html");
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(`src="/src/main.tsx"`, `src="/src/main.tsx?v=${nanoid()}"`);
      const page = await vite.transformIndexHtml(req.originalUrl, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      (vite as any).ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}
