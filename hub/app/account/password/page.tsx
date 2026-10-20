import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Header } from "@/components/Header";
import { hubDbConfigured } from "@/lib/db";
import { PasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function PasswordPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/login");
  return (
    <>
      <Header name={session.user.name ?? session.user.email} role={session.user.role} showAdmin={session.user.role === "exec"} showPassword={hubDbConfigured()} current="password" />
      <main className="mx-auto max-w-md px-4 py-8 sm:px-6">
      <section>
        <h1 className="text-lg font-bold">パスワード変更</h1>
        <div className="mt-4">
          <PasswordForm forced={Boolean(session.user.mustChange)} />
        </div>
      </section>
      </main>
    </>
  );
}
