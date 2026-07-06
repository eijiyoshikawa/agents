import type { Customer } from "./types";

// 架電フック自動生成（無課金・ルールベース）。
// 「採用支援をSNSで行うサービス」の切り口で、テレアポのきっかけになる3〜4行を組み立てる。

type Hook = { text: string; tone: "good" | "chance" | "info" };

const REAL_SNS = (sns: string[]) => sns.filter((s) => s && s !== "なし");

export function buildHooks(c: Customer, now = new Date()): Hook[] {
  const out: Hook[] = [];
  const year = now.getFullYear();
  const realSns = REAL_SNS(c.sns ?? []);
  const media = c.media ?? [];

  // 1) SNS活用状況（このサービスの本丸）
  if (realSns.length > 0) {
    out.push({ text: `既に ${realSns.join("・")} を運用中 → 採用観点での運用最適化・成果改善を提案`, tone: "good" });
  } else {
    out.push({ text: `採用SNSの発信が見当たらない → 採用SNS導入のフックが大きい`, tone: "chance" });
  }

  // 2) 採用に投資しているサイン（媒体掲載・採用ページ）
  if (media.length > 0) {
    out.push({ text: `求人媒体に掲載中（${media.join("・")}）＝採用予算あり。媒体依存からのSNS切替/併用を訴求`, tone: "chance" });
  } else if (c.recruitPage) {
    out.push({ text: `自社採用ページあり＝採用に積極的。SNS連携で母集団拡大を提案`, tone: "chance" });
  }

  // 3) 企業の強み（信頼材料としてのトークフック）
  if (typeof c.founded === "number" && c.founded > 1800 && c.founded <= year) {
    const age = year - c.founded;
    out.push({
      text: age >= 20 ? `創業${age}年の安定企業（${c.founded}年設立）＝信頼基盤あり` : `${c.founded}年設立（創業${age}年）`,
      tone: "info",
    });
  }
  if (typeof c.employees === "number" && c.employees > 0) {
    out.push({
      text: c.employees >= 50 ? `従業員${c.employees}名規模＝継続的な採用ニーズが見込める` : `従業員${c.employees}名`,
      tone: "info",
    });
  }
  if (c.listing && c.listing !== "非上場" && c.listing !== "その他") {
    out.push({ text: `${c.listing}の上場企業＝予算・信用力あり`, tone: "info" });
  }

  // 4) 業種特化トーク
  if (c.industry) {
    out.push({ text: `業種「${c.industry}」＝${c.industry}の採用課題（人手不足・若年層採用）に触れる`, tone: "info" });
  }

  // 5) 過去接点
  if (c.callCount && c.callCount > 0) {
    out.push({ text: `過去架電 ${c.callCount}回${c.lastCallDate ? `（最終 ${c.lastCallDate.slice(0, 10)}）` : ""}＝履歴を踏まえて再アプローチ`, tone: "info" });
  }

  if (out.length === 0) {
    out.push({ text: `情報が少ないため、まずは現状の採用方法（媒体・SNS・紹介）をヒアリング`, tone: "info" });
  }

  // SNS(本丸)→採用投資→強み→業種 の優先順で上位4件
  return out.slice(0, 4);
}
