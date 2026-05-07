import { SignJWT } from "jose";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import { getSessionCookieOptions } from "./cookies";
import { ENV } from "./env";
import * as db from "../db";

const APP_URL = process.env.APP_URL ?? "https://maprod.up.railway.app";

async function createSessionAndRedirect(
  req: Request,
  res: Response,
  openId: string,
  name: string,
  email: string | null,
  loginMethod: string
) {
  await db.upsertUser({
    openId,
    name,
    email,
    loginMethod,
    lastSignedIn: new Date(),
  });

  const secret = new TextEncoder().encode(ENV.cookieSecret);
  const token = await new SignJWT({ openId, name })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1y")
    .sign(secret);

  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  res.redirect(302, "/");
}

// ─── Google OAuth ─────────────────────────────────────────────────────────────

export function registerGoogleOAuth(app: Express) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) { app.get("/api/auth/google", (_, res) => res.redirect("/login?error=google_not_configured")); return; }

  app.get("/api/auth/google", (_req, res) => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${APP_URL}/api/auth/google/callback`,
      response_type: "code",
      scope: "openid email profile",
      access_type: "offline",
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  });

  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.redirect("/login?error=google_failed");

    try {
      // Exchange code for tokens
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: `${APP_URL}/api/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      const tokens = await tokenRes.json() as any;

      // Get user info
      const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const user = await userRes.json() as any;

      await createSessionAndRedirect(
        req, res,
        `google:${user.id}`,
        user.name ?? user.email,
        user.email ?? null,
        "google"
      );
    } catch (e) {
      console.error("[Google OAuth]", e);
      res.redirect("/login?error=google_failed");
    }
  });
}

// ─── Facebook OAuth ───────────────────────────────────────────────────────────

export function registerFacebookOAuth(app: Express) {
  const appId = process.env.FACEBOOK_APP_ID;
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appId || !appSecret) { app.get("/api/auth/facebook", (_, res) => res.redirect("/login?error=facebook_not_configured")); return; }

  app.get("/api/auth/facebook", (_req, res) => {
    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: `${APP_URL}/api/auth/facebook/callback`,
      response_type: "code",
      scope: "email,public_profile",
    });
    res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
  });

  app.get("/api/auth/facebook/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string;
    if (!code) return res.redirect("/login?error=facebook_failed");

    try {
      // Exchange code for token
      const tokenRes = await fetch(
        `https://graph.facebook.com/v19.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: `${APP_URL}/api/auth/facebook/callback`,
          code,
        })
      );
      const tokens = await tokenRes.json() as any;

      // Get user info
      const userRes = await fetch(
        `https://graph.facebook.com/me?fields=id,name,email&access_token=${tokens.access_token}`
      );
      const user = await userRes.json() as any;

      await createSessionAndRedirect(
        req, res,
        `facebook:${user.id}`,
        user.name ?? "Utilisateur Facebook",
        user.email ?? null,
        "facebook"
      );
    } catch (e) {
      console.error("[Facebook OAuth]", e);
      res.redirect("/login?error=facebook_failed");
    }
  });
}

export function registerDebugRoute(app: Express) {
  if (process.env.NODE_ENV === "production") return;
  app.get("/api/debug/env", (_req, res) => {
    res.json({
      hasGoogleId: !!process.env.GOOGLE_CLIENT_ID,
      hasFacebookId: !!process.env.FACEBOOK_APP_ID,
    });
  });
}
