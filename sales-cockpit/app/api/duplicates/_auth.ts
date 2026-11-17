import { cookies } from "next/headers";
import { verifySession, SESSION_COOKIE, type Session } from "@/lib/session";

export async function sessionOf(): Promise<Session | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
