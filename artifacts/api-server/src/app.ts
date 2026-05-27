import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const pathMod = await import("path");
  const { fileURLToPath } = await import("url");
  const fsMod = await import("fs");

  const __dirname = pathMod.default.dirname(fileURLToPath(import.meta.url));
  const staticDir = pathMod.default.resolve(__dirname, "../../zoya-ai/dist");
  const indexHtml = pathMod.default.join(staticDir, "index.html");

  app.use(express.static(staticDir, { maxAge: "1d", etag: true }));

  app.get("*", (_req, res) => {
    if (fsMod.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(503).send("Frontend not built.");
    }
  });
}

export default app;
