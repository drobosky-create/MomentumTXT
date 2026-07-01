import type { Express, RequestHandler } from "express";
import { clerkMiddleware, getAuth, clerkClient } from "@clerk/express";
import { storage } from "./storage";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.warn("Clerk credentials not configured (CLERK_SECRET_KEY missing). Authentication is disabled.");
}

/**
 * Mounts Clerk's auth middleware. Reads CLERK_SECRET_KEY / CLERK_PUBLISHABLE_KEY
 * from the environment. If Clerk isn't configured, we skip mounting so the
 * server can still boot for local/UI development — protected routes will 401.
 */
export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  if (!CLERK_SECRET_KEY) {
    console.warn("Clerk not configured — skipping auth setup. Login/protected routes are disabled.");
    return;
  }

  app.use(clerkMiddleware());
}

/**
 * Route guard. Resolves the Clerk session, lazily syncs the user into our DB on
 * first sight, and exposes the same `req.user.claims` shape the routes already
 * expect (previously populated by the Auth0 integration), so route handlers are
 * unchanged.
 */
export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!CLERK_SECRET_KEY) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const { userId } = getAuth(req);
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    // Ensure a local user row exists (lazy sync from Clerk on first request).
    let dbUser = await storage.getUser(userId);
    if (!dbUser) {
      const clerkUser = await clerkClient.users.getUser(userId);
      const email =
        clerkUser.primaryEmailAddress?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress;
      dbUser = await storage.upsertUser({
        id: userId,
        email,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        profileImageUrl: clerkUser.imageUrl ?? undefined,
        authProvider: "clerk",
      });
    }

    (req as any).user = {
      claims: {
        sub: dbUser.id,
        email: dbUser.email,
        first_name: dbUser.firstName,
        last_name: dbUser.lastName,
        profile_image_url: dbUser.profileImageUrl,
      },
    };

    next();
  } catch (error) {
    console.error("Error resolving authenticated user:", error);
    return res.status(401).json({ message: "Unauthorized" });
  }
};
