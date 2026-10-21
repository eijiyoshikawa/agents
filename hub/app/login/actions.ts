"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { safeNext } from "@/lib/safe-next";

export async function loginWithPassword(formData: FormData): Promise<void> {
  const redirectTo = safeNext(String(formData.get("next") ?? ""));
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo,
    });
  } catch (e) {
    if (e instanceof AuthError) {
      const params = new URLSearchParams({ error: e.type });
      if (redirectTo !== "/") params.set("next", redirectTo);
      redirect(`/login?${params.toString()}`);
    }
    throw e; // NEXT_REDIRECT（成功時）はそのまま伝播させる
  }
}

export async function loginWithGoogle(formData: FormData): Promise<void> {
  await signIn("google", { redirectTo: safeNext(String(formData.get("next") ?? "")) });
}
