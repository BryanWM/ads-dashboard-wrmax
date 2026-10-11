"use server";

import { cookies } from "next/headers";
import { z } from "zod";

import { DATA_ORIGIN } from "@/server/data/source";

import { DEMO_VIEWER_COOKIE, DEMO_VIEWERS } from "./session";

const input = z.enum(DEMO_VIEWERS);

/**
 * Switches the DEMO session between the agency and client views.
 * Only available while the app runs on simulated data; with real data the
 * session comes from authentication and cannot be chosen by the browser.
 */
export async function switchDemoViewer(kind: unknown): Promise<void> {
  if (DATA_ORIGIN !== "simulated") throw new Error("Demo sessions are disabled");
  const parsed = input.parse(kind);
  (await cookies()).set(DEMO_VIEWER_COOKIE, parsed, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}
