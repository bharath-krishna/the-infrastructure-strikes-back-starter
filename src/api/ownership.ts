import type { ActionObject } from "@/lib/store";
import { sessionFromRequest } from "@/src/auth";

// Ownership is derived from the cryptographically verified session cookie,
// not any caller-controlled header.
export function isActionOwner(action: ActionObject, req: Request): boolean {
  const session = sessionFromRequest(req);
  if (!session) return false;
  return action.ownerId === session.userId;
}
