import StaffLoginForm from "./form";

export const metadata = { title: "スタッフログイン — PartnerSales" };

export default function StaffLoginPage() {
  return (
    <div style={{ maxWidth: 380, margin: "40px auto", display: "grid", gap: 16 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>スタッフログイン</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 13 }}>管理画面の合言葉を入力してください。</p>
      </div>
      <StaffLoginForm />
    </div>
  );
}
