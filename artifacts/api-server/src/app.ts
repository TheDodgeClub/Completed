import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
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
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple in-memory session store keyed by token header
app.use((req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers["x-auth-token"] as string | undefined;
  if (token && /^\d+$/.test(token)) {
    req.session = { userId: Number(token) };
  } else {
    req.session = null;
  }
  next();
});

app.use("/api", router);

export default app;
