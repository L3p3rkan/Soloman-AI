import { Router, type IRouter } from "express";
import { db, userProfiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { UpsertProfileBody } from "@workspace/api-zod";
import { requireAuth } from "../../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/profile", requireAuth, async (req, res): Promise<void> => {
  const [row] = await db
    .select()
    .from(userProfiles)
    .where(eq(userProfiles.userId, req.userId!));

  res.json({
    userId: req.userId!,
    displayName: row?.displayName ?? null,
  });
});

router.put("/profile", requireAuth, async (req, res): Promise<void> => {
  const parsed = UpsertProfileBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: String(parsed.error) });
    return;
  }

  await db
    .insert(userProfiles)
    .values({ userId: req.userId!, displayName: parsed.data.displayName })
    .onConflictDoUpdate({
      target: userProfiles.userId,
      set: { displayName: parsed.data.displayName },
    });

  res.json({ userId: req.userId!, displayName: parsed.data.displayName });
});

export default router;
