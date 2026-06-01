import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./routers";
import { createContext } from "./context";
import cookieParser from "cookie-parser";
import { authRouter } from "./auth";
import { pdfRouter } from "./pdf";
import { uploadRouter } from "./upload";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const isDev = process.env.NODE_ENV === "development";

  app.use(express.json());
  app.use(cookieParser());

  // Auth routes (email+password) — must be before Vite middleware
  app.use("/api/auth", authRouter);

  // PDF/report routes
  app.use("/api/reports", pdfRouter);

  // Document upload route
  app.use("/api/upload", uploadRouter);

  // tRPC — must be before Vite middleware
  app.use(
    "/api/trpc",
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (isDev) {
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
    // In production: serve built static files
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    // Handle client-side routing — serve index.html for all non-API routes
    app.get(/^(?!\/api).*/, (_req, res) => {
      const indexPath = path.join(staticPath, "index.html");
      res.sendFile(indexPath, (err) => {
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
