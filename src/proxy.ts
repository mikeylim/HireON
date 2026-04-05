import { updateSession } from "@/lib/supabase/middleware";
import type { NextRequest } from "next/server";

// Next.js 16 uses "proxy" instead of "middleware"
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

// Protect all routes except static files, images, and API routes that don't need auth
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/).*)",
  ],
};
