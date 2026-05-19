import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import bibleRouter from "./bible";
import adminRouter from "./admin";
import profileRouter from "./profile";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(bibleRouter);
router.use(adminRouter);
router.use(profileRouter);

export default router;
