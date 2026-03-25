import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import storageRouter from "./storage";
import eventsRouter from "./events";
import usersRouter from "./users";
import postsRouter from "./posts";
import merchRouter from "./merch";
import statsRouter from "./stats";
import adminRouter from "./admin";
import videosRouter from "./videos";
import messagesRouter from "./messages";
import sessionsRouter from "./sessions";
import ticketsRouter from "./tickets";
import { settingsRouter } from "./settings";
import eliteRouter from "./elite";

const router: IRouter = Router();

router.use(healthRouter);
router.use(storageRouter);
router.use("/auth", authRouter);
router.use("/events", eventsRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/merch", merchRouter);
router.use("/stats", statsRouter);
router.use("/admin", adminRouter);
router.use("/videos", videosRouter);
router.use("/messages", messagesRouter);
router.use("/sessions", sessionsRouter);
router.use("/tickets", ticketsRouter);
router.use("/settings", settingsRouter);
router.use("/elite", eliteRouter);

export default router;
