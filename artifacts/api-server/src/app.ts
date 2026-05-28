import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
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

app.use(cors({ credentials: true, origin: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const pathMod = await import("path");
  const { fileURLToPath } = await import("url");
  const fsMod = await import("fs");

  const __dirname = pathMod.default.dirname(fileURLToPath(import.meta.url));
  const staticDir = pathMod.default.resolve(__dirname, "../../zoya-ai/dist");
  const indexHtml = pathMod.default.join(staticDir, "index.html");

  app.use(express.static(staticDir, { maxAge: "1d", etag: true }));

  app.get("/{*splat}", (_req, res) => {
    if (fsMod.existsSync(indexHtml)) {
      res.sendFile(indexHtml);
    } else {
      res.status(503).send("Frontend not built.");
    }
  });
}

export default app;
