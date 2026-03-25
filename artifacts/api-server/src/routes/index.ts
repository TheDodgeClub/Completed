import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import eventsRouter from "./events";
import usersRouter from "./users";
import postsRouter from "./posts";
import merchRouter from "./merch";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/events", eventsRouter);
router.use("/users", usersRouter);
router.use("/posts", postsRouter);
router.use("/merch", merchRouter);
router.use("/stats", statsRouter);

export default router;
