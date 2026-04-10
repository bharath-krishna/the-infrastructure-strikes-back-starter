import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { logEvent } from "@/lib/telemetry";
import { getStore } from "@/lib/store";
import { sessionFromRequest } from "@/src/auth";
import { checkRateLimit } from "@/src/api";

export const dynamic = "force-dynamic";

// POST /api/actions/create
// Body: { title: string, body: string }
//
// SEEDED FLAWS:
//  - "Verbose internal error leakage": the catch block returns the raw
//    error message, stack, and a dump of the request body for
//    "debuggability". Attackers can learn internals by forcing errors.
//  - "No action creation rate limit": no per-user or global limit. A
//    client can spam create as fast as it can send.
export async function POST(req: Request) {
  const route = "/api/actions/create";
  const session = sessionFromRequest(req);
  if (!session) {
    logEvent({ req, route, status: 401, actor: null });
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  if (!checkRateLimit(session.userId, 60_000, 10)) {
    logEvent({ req, route, status: 429, actor: session.identity });
    return NextResponse.json({ error: "rate limit exceeded" }, { status: 429 });
  }

  try {
    const body = await req.json() as { title?: unknown; body?: unknown };

    const title = String(body.title ?? "").trim();
    const content = String(body.body ?? "").trim();

    if (!title) {
      logEvent({ req, route, status: 400, actor: session.identity });
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (title.length > 200) {
      logEvent({ req, route, status: 400, actor: session.identity });
      return NextResponse.json({ error: "title too long (max 200)" }, { status: 400 });
    }

    const id = "act_" + randomBytes(6).toString("hex");
    const action = {
      id,
      ownerId: session.userId,
      title,
      body: content,
      createdAt: new Date().toISOString(),
    };
    getStore().actions.set(id, action);

    logEvent({ req, route, status: 201, actor: session.identity });
    return NextResponse.json(action, { status: 201 });
  } catch {
    logEvent({ req, route, status: 500, actor: session.identity });
    return NextResponse.json({ error: "internal server error" }, { status: 500 });
  }
}
