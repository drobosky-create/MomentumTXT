import { auth } from "express-openid-connect";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import { storage } from "./storage";

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

if (!AUTH0_DOMAIN || !AUTH0_CLIENT_ID || !AUTH0_CLIENT_SECRET) {
  console.warn("Auth0 credentials not fully configured. Authentication will not work properly.");
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);

  const baseURL = process.env.REPLIT_DOMAINS 
    ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
    : "http://localhost:5000";

  const config = {
    authRequired: false,
    auth0Logout: true,
    secret: process.env.SESSION_SECRET || "fallback-secret-change-in-production",
    baseURL,
    clientID: AUTH0_CLIENT_ID || "",
    issuerBaseURL: AUTH0_DOMAIN ? `https://${AUTH0_DOMAIN}` : "",
    routes: {
      login: "/api/login",
      logout: "/api/logout",
      callback: "/api/callback",
    },
  };

  app.use(auth(config));

  // After Auth0 authenticates, upsert the user into our DB and store the DB user ID on the request
  app.use(async (req: Request, _res: Response, next: NextFunction) => {
    if ((req as any).oidc?.isAuthenticated()) {
      const userInfo = (req as any).oidc.user;
      if (userInfo) {
        try {
          const dbUser = await storage.upsertUser({
            id: userInfo.sub,
            email: userInfo.email,
            firstName: userInfo.given_name || userInfo.name?.split(" ")[0],
            lastName: userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" "),
            profileImageUrl: userInfo.picture,
            authProvider: "auth0",
          });
          // Store the actual DB user ID so routes always use the correct one
          (req as any)._dbUserId = dbUser.id;
        } catch (error) {
          console.error("Error upserting user:", error);
          // Try email fallback so the user isn't locked out
          if (userInfo.email) {
            try {
              const existing = await storage.getUserByEmail(userInfo.email);
              if (existing) (req as any)._dbUserId = existing.id;
            } catch {}
          }
        }
      }
    }
    next();
  });
}

export const isAuthenticated: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const oidc = (req as any).oidc;
  
  if (!oidc?.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const userInfo = oidc.user;
  if (!userInfo) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Use the DB user ID resolved by the middleware (handles pre-auth email conflicts)
  const effectiveUserId = (req as any)._dbUserId || userInfo.sub;

  (req as any).user = {
    claims: {
      sub: effectiveUserId,
      email: userInfo.email,
      first_name: userInfo.given_name || userInfo.name?.split(" ")[0],
      last_name: userInfo.family_name || userInfo.name?.split(" ").slice(1).join(" "),
      profile_image_url: userInfo.picture,
    },
  };

  next();
};
