import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// Stripe webhook MUST be registered before express.json() parses the body
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, "Stripe webhook error");
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Token-based session middleware for mobile clients
app.use((req: Request, _res: Response, next: NextFunction) => {
  const token = req.headers["x-auth-token"] as string | undefined;
  if (token && /^\d+$/.test(token)) {
    req.session = { userId: Number(token) };
  } else {
    req.session = null;
  }
  next();
});

// Non-blocking lastSeenAt heartbeat for authenticated mobile requests
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (req.session?.userId) {
    db.update(usersTable)
      .set({ lastSeenAt: new Date() })
      .where(eq(usersTable.id, req.session.userId))
      .catch(() => {});
  }
  next();
});

app.use("/api", router);

// Temporary GeoJSON download route
app.get("/download/london.geojson", (_req, res) => {
  const geojson = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {},
        geometry: {
          type: "MultiPolygon",
          coordinates: [
            [
              [
                [-0.5103, 51.2868],
                [-0.5103, 51.6919],
                [0.3340, 51.6919],
                [0.3340, 51.2868],
                [-0.5103, 51.2868],
              ],
            ],
          ],
        },
      },
    ],
  };
  res.setHeader("Content-Disposition", "attachment; filename=london.geojson");
  res.setHeader("Content-Type", "application/geo+json");
  res.json(geojson);
});

export default app;
