import LoginForm from "./form";

export const metadata = { title: "パートナーログイン — PartnerSales" };

export default function LoginPage() {
  return (
    <div style={{ maxWidth: 400, margin: "40px auto", display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>パートナーログイン</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>
          弊社から発行されたログインID・パスワードでログインしてください。
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
