import { Router, type IRouter } from "express";
import healthRouter from "./health";
import emailRouter from "./email";
import scanRouter from "./scan";
import integrationsRouter from "./integrations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(emailRouter);
router.use(scanRouter);
router.use(integrationsRouter);

export default router;
