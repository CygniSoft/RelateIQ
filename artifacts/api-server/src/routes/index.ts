import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import scanRouter from "./scan";
import integrationsRouter from "./integrations";
import billingRouter from "./billing";
import sessionsRouter from "./sessions";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(scanRouter);
router.use(integrationsRouter);
router.use(billingRouter);
router.use(sessionsRouter);

export default router;
