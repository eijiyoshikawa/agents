import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/server";
import { getDataSource } from "@/lib/db";
import { PAYOUT_METHOD, PAYOUT_THRESHOLD } from "@/lib/payout";
import { yen } from "@/lib/format";
import Simulator, { type SimService } from "./simulator";

export const metadata = { title: "ガイド・報酬シミュレーション — PartnerSales" };

export default async function GuidePage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const services = await getDataSource().getServices();
  const simServices: SimService[] = services
    .filter((s) => s.active)
    .map((s) => ({
      id: s.id,
      name: s.name,
      unitPrice: s.unitPrice ?? 1000000,
      rewards: ([1, 2, 3] as const).map((t) => {
        const r = s.rewards.find((x) => x.tier === t);
        return { tier: t, type: r?.type ?? "percentage", rate: r?.rate ?? 0, fixedAmount: r?.fixedAmount ?? 0 };
      }),
    }));

  return (
    <div style={{ display: "grid", gap: 28, maxWidth: 900 }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700 }}>ガイド・報酬シミュレーション</h1>
        <p style={{ color: "var(--fg-muted)", fontSize: 14 }}>
          紹介報酬のしくみと、契約額に応じた報酬の目安です。
        </p>
      </div>

      <section>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>報酬シミュレーション</h2>
        {simServices.length === 0 ? (
          <div className="card" style={{ color: "var(--fg-muted)", fontSize: 14 }}>表示できるサービスがありません。</div>
        ) : (
          <Simulator services={simServices} />
        )}
      </section>

      <section className="prose-md">
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>使い方マニュアル</h2>

        <h3>1. 紹介報酬のしくみ</h3>
        <p>
          クライアント（お客様）をご紹介いただき、弊社と契約が成立すると紹介報酬が発生します。
          報酬は契約額を基準に、紹介のつながりに沿って <strong>最大3段</strong> まで分配されます。
        </p>
        <ul>
          <li><strong>tier1</strong>：あなたが直接クライアントを紹介して成約したとき</li>
          <li><strong>tier2</strong>：あなたが紹介したパートナー（1段下）が成約したとき</li>
          <li><strong>tier3</strong>：さらにその下（2段下）が成約したとき</li>
        </ul>

        <h3>2. あなたの招待コード</h3>
        <p>
          新しいパートナー（紹介会社）をお連れいただく際は、あなたの<strong>招待コード</strong>をお伝えください。
          そのコードを使って登録された会社は、あなたの紹介ツリーの配下に入り、その成約があなたの tier2 / tier3 報酬につながります。
          招待コードはマイページ上部に表示されています。
        </p>

        <h3>3. 報酬が確定するタイミング</h3>
        <p>
          成約が「確定」状態になった時点で報酬が<strong>確定</strong>します（契約前の見込み案件は「見込み報酬」として別に表示されます）。
          適用される料率は<strong>成約時点</strong>のもので記録され、あとから料率が変わっても過去の成約分は変わりません。
        </p>

        <h3>4. お支払いについて</h3>
        <ul>
          <li>確定報酬の未精算分が <strong>{yen(PAYOUT_THRESHOLD)}</strong> に達すると、お支払いの対象になります（それまでは繰り越し）。</li>
          <li>対象になりましたら、弊社より<strong>請求書の発行</strong>をご依頼します。請求書を受領後、{PAYOUT_METHOD.replace("（紹介者が都度請求書を発行）", "")}にてお支払いします。</li>
          <li>お支払いは都度、請求書ベースで行います。</li>
        </ul>

        <h3>5. マイページの見方</h3>
        <ul>
          <li><strong>確定報酬 / 見込み報酬</strong>：現時点で確定した報酬と、見込みの報酬</li>
          <li><strong>支払い状況</strong>：未精算額・振込済み累計・支払い下限</li>
          <li><strong>報酬明細 / 月次締め</strong>：成約ごとの内訳と、月ごとの合計</li>
          <li><strong>紹介ツリー</strong>：あなたの配下の紹介ネットワーク</li>
        </ul>

        <h3>6. ログイン情報</h3>
        <p>
          ログインID・パスワードは弊社より発行しています。パスワードを忘れた・変更したい場合は、担当スタッフまでご連絡ください（再発行いたします）。
          ログインに5回連続で失敗すると、安全のため一時的にロックされます。
        </p>

        <h3>お問い合わせ</h3>
        <p>ご不明な点は担当スタッフまでお気軽にご連絡ください。</p>
      </section>
    </div>
  );
}
