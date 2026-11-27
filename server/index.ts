import express from "express";
import { createServer } from "http";
import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./context";
import cookieParser from "cookie-parser";
import { authRouter } from "./auth";
import { pdfRouter } from "./pdf";
import { uploadRouter } from "./upload";
import { chatRouter } from "./chat";
import { founding100Router } from "./founding100";
import { validateProductionEnvironment } from "./env";
import { injectRouteMetadata } from "./routeMetadata";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  validateProductionEnvironment();
  const app = express();
  const server = createServer(app);
  const isDev = process.env.NODE_ENV === "development";
  const useViteDevServer =
    isDev && process.env.LOCAL_STATIC_PREVIEW !== "1";

  if (process.env.TRUST_PROXY) {
    const numericTrustProxy = Number(process.env.TRUST_PROXY);
    app.set(
      "trust proxy",
      Number.isNaN(numericTrustProxy)
        ? process.env.TRUST_PROXY
        : numericTrustProxy
    );
  }

  app.use(express.json());
  app.use(cookieParser());

  // Public Founding 100 pilot application route
  app.use("/api/founding-100", founding100Router);

  // Auth routes (email+password) — must be before Vite middleware
  app.use("/api/auth", authRouter);

  // PDF/report routes
  app.use("/api/reports", pdfRouter);

  // Document upload route
  app.use("/api/upload", uploadRouter);

  // AI Huismeester chat (streaming SSE)
  app.use("/api/chat", chatRouter);

  // tRPC — must be before Vite middleware
  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (useViteDevServer) {
    // In development: use Vite as middleware so everything runs on port 3000
    // This ensures /api/oauth/callback is handled by Express, not Vite
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "../vite.config.ts"),
      server: {
        middlewareMode: true,
        // Disable the proxy since Express handles /api directly
        proxy: undefined,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve the production bundle, including in credential-free local preview.
    const staticPath = isDev
      ? path.resolve(__dirname, "../dist/public")
      : path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get(["/founding-100", "/founding-100/bedankt"], async (req, res) => {
      try {
        const indexHtml = await fs.readFile(
          path.join(staticPath, "index.html"),
          "utf8"
        );
        res.type("html").send(injectRouteMetadata(indexHtml, req.path));
      } catch {
        res.status(404).send("Not found");
      }
    });
    // Handle client-side routing — serve index.html for all non-API routes
    app.get(/^(?!\/api).*/, (_req, res) => {
      const indexPath = path.join(staticPath, "index.html");
      res.sendFile(indexPath, err => {
        if (err) {
          res.status(404).send("Not found");
        }
      });
    });
  }

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
