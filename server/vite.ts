// vite.ts
import express, { type Express } from "express";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

// إعداد المسارات
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Logger مخصص
const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

// إعداد Vite للتطوير
export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: {
      server,
      timeout: 60000,
      protocol: "ws",
      clientPort: 5000,
    },
    host: true, // للسماح بالوصول من أي IP
    strictPort: false,
    allowedHosts: [
      "binarjoinanelytic.info", // الدومين الخاص بك
      "localhost",
      "127.0.0.1",
      ".yourdomain.com", // أي subdomain مسموح
    ],
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
    customLogger: {
      ...viteLogger,
      error: (msg, options) => viteLogger.error(msg, options),
    },
  });

  app.use(vite.middlewares);

  // التعامل مع أي طلب غير موجود لتحويله إلى index.html (SPA)
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    try {
      const clientTemplate = path.resolve(
        __dirname,
        "..",
        "..",
        "Bot.v4",
        "client",
        "index.html"
      );

      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      // إضافة query string لمنع cache
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );

      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });

  log("Vite middleware setup completed", "vite");
}

// إعداد Express للإنتاج (Static)
export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "..", "client", "dist");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}. Run "vite build" first.`
    );
  }

  app.use(express.static(distPath, { maxAge: "1h" }));

  // fallback إلى index.html لكل الطلبات غير الموجودة (SPA)
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });

  log("Serving static files from dist", "express");
}