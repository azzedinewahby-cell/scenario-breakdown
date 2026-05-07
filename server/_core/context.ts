import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { COOKIE_NAME } from "@shared/const";
import { verifyJWT } from "./jwt";
import { ENV } from "./env";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

async function getUserFromRequest(req: CreateExpressContextOptions["req"]): Promise<User | null> {
  try {
    const rawCookie = req.headers.cookie ?? "";
    const cookies = Object.fromEntries(
      rawCookie.split(";").map(c => { const [k, ...v] = c.trim().split("="); return [decodeURIComponent(k), decodeURIComponent(v.join("="))]; })
    );
    const token = cookies[COOKIE_NAME];
    if (!token) return null;
    const payload = verifyJWT(token, ENV.cookieSecret);
    const openId = payload.openId as string | undefined;
    if (!openId) return null;
    return await db.getUserByOpenId(openId) ?? null;
  } catch {
    return null;
  }
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return {
    req: opts.req,
    res: opts.res,
    user: await getUserFromRequest(opts.req),
  };
}
