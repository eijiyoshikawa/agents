import RegisterForm from "./form";

export const metadata = { title: "パートナー登録 — PartnerSales" };

export default function RegisterPage() {
  return (
    <div style={{ maxWidth: 560, margin: "0 auto", display: "grid", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 700 }}>パートナー登録</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          紹介会社として登録します。紹介元から受け取った招待コードがあれば入力してください。
          登録すると専用の招待コードと個別ページが発行されます。
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
