import { Router, type IRouter } from "express";
import healthRouter from "./health";
import zoyaAuthRouter from "./zoya-auth";
import zoyaChatRouter from "./zoya-chat";
import zoyaConversationsRouter from "./zoya-conversations";
import zoyaMemoryRouter from "./zoya-memory";
import zoyaVoiceRouter from "./zoya-voice";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zoyaAuthRouter);
router.use(zoyaChatRouter);
router.use(zoyaConversationsRouter);
router.use(zoyaMemoryRouter);
router.use(zoyaVoiceRouter);

export default router;
