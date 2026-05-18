import { type Request, type Response, type NextFunction } from "express";
import { isAdminUser } from "../lib/adminCheck";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const admin = await isAdminUser(userId);
  if (!admin) {
    res.status(403).json({ error: "Forbidden: admin access required" });
    return;
  }

  next();
}
