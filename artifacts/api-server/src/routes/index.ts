import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zoyaChatRouter from "./zoya-chat";
import zoyaVoiceRouter from "./zoya-voice";
import zoyaAuthRouter from "./zoya-auth";
import zoyaConversationsRouter from "./zoya-conversations";
import zoyaMemoryRouter from "./zoya-memory";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zoyaChatRouter);
router.use(zoyaVoiceRouter);
router.use(zoyaAuthRouter);
router.use(zoyaConversationsRouter);
router.use(zoyaMemoryRouter);

export default router;
