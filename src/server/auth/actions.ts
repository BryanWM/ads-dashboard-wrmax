"use server";

import "server-only";

import { cookies } from "next/headers";
import { z } from "zod";

import { DEMO_VIEWER_COOKIE, DEMO_VIEWERS, isDemoMode } from "./session";

const input = z.enum(DEMO_VIEWERS);

/**
 * Switches the DEMO session between the agency and client views.
 * Only in demo mode; with Supabase the session comes from authentication and
 * can never be chosen by the browser.
 */
export async function switchDemoViewer(kind: unknown): Promise<void> {
  if (!isDemoMode()) throw new Error("Demo sessions are disabled");
  const parsed = input.parse(kind);
  (await cookies()).set(DEMO_VIEWER_COOKIE, parsed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
