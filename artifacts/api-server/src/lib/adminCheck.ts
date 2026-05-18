import { createClerkClient } from "@clerk/express";
import { logger } from "./logger";

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isAdminUser(userId: string): Promise<boolean> {
  const adminEmails = getAdminEmails();
  if (adminEmails.length === 0) return false;

  try {
    const user = await clerkClient.users.getUser(userId);
    const userEmails = user.emailAddresses.map((e) =>
      e.emailAddress.toLowerCase()
    );
    return userEmails.some((email) => adminEmails.includes(email));
  } catch (err) {
    logger.warn({ err, userId }, "Failed to look up user for admin check");
    return false;
  }
}
