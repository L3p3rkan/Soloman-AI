import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import bibleRouter from "./bible";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(bibleRouter);
router.use(adminRouter);

export default router;
