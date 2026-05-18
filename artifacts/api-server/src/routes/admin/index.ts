import { Router, type IRouter } from "express";
import { requireAuth } from "../../middlewares/requireAuth";
import { isAdminUser } from "../../lib/adminCheck";

const router: IRouter = Router();

router.get("/admin/check", requireAuth, async (req, res): Promise<void> => {
  const isAdmin = await isAdminUser(req.userId!);
  res.json({ isAdmin });
});

export default router;
