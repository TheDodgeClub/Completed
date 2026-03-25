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

export default router;
