import type { FetchedPage } from "./fetch-html";

/** Claude へ渡す抽出指示（システムプロンプト）。 */
export const EXTRACTION_SYSTEM_PROMPT = `あなたは採用のプロフェッショナルです。
複数の他社求人ページのテキストを読み、それらを「1つの魅力的な求人票」に統合・再構成します。

ルール:
- 複数ソースから共通する良い要素を集約し、重複は排除して1枚に統合する。
- 事実が不明な項目は推測で埋めず空文字/空配列のままにする（虚偽を作らない）。
<<<<<<< HEAD
- 募集している企業名が読み取れる場合は companyName に入れる。連絡先や固有のサービス名はそのまま転記しない。
- コピーや業務内容は、転載ではなく要点を再構成した自然な日本語にする。
- 給与の金額は必ず salary の各フィールド（万円の数値、端数は小数で 例:19.6）に入れる。月給はmonthlyMin/monthlyMax、年収(想定年収)はannualMin/annualMaxへ。読み取れない場合のみnull。
- 給与・年収の金額や待遇の数字を appealPoints（魅力）に入れない。金額はsalary系、詳細文はsalaryDetailへ。
- 文字列の中でASCIIの二重引用符(")を使わない。引用や強調は「」や『』を使う（JSONを壊さないため）。
- 必ず指定されたJSONスキーマだけを出力する。前置き・説明・マークダウンは一切付けない。`;

/** テキスト整理モードのシステムプロンプト。 */
export const TEXT_SYSTEM_PROMPT = `あなたは採用のプロフェッショナルです。
採用担当者が書いた求人の素案・メモ・箇条書き・口語の文章を読み、
「1つの整った魅力的な求人票」に整理・再構成します。

ルール:
- 与えられた情報を尊重し、書かれていない事実は推測で創作しない（不明な項目は空のまま）。
- 雑なメモや口語を、求職者に伝わる自然で丁寧な日本語に整える。
- 箇条書きにできる内容（業務・要件・福利厚生等）は適切に項目分けする。
- 給与の金額は必ず salary の各フィールド（万円の数値、端数は小数で 例:19.6）に入れる。月給はmonthlyMin/monthlyMax、年収(想定年収)はannualMin/annualMaxへ。読み取れない場合のみnull。
- 給与・年収の金額や待遇の数字を appealPoints（魅力）に入れない。金額はsalary系、詳細文はsalaryDetailへ。
- 文字列の中でASCIIの二重引用符(")を使わない。引用や強調は「」や『』を使う（JSONを壊さないため）。
- 必ず指定されたJSONスキーマだけを出力する。前置き・説明・マークダウンは一切付けない。`;

/** 共通のJSONスキーマ説明（プロンプト末尾に付与）。 */
const JSON_SCHEMA_GUIDE = `JSONスキーマ（読み取れない項目は空文字""または空配列[]のままにする。創作しない）:
{
  "catchphrase": "求職者の心を掴むタイトル/キャッチコピー(1行)",
  "companyName": "募集している企業名",
  "industry": "業種",
  "occupation": "職種カテゴリ",
  "establishedYear": "設立年(例: 2017年)",
  "employeeCount": "従業員数(例: 31〜50名)",
  "listingStatus": "上場区分(例: 未上場)",
  "averageAge": "平均年齢(例: 26歳)",
  "genderRatio": "男女比率(例: 5:5)",
  "companyWebsite": "会社HPのURL",
  "companyAddress": "本社所在地",
  "jobTitle": "募集職種",
  "employmentType": "雇用形態(例: 正社員)",
  "recruitPosition": "採用ポジション(例: 中途採用)",
  "jobLevel": "職位(例: リーダー、メンバー)",
  "education": "最終学歴(例: 高卒以上)",
  "jobExperience": "職種経験の要否(例: 職種未経験NG)",
  "industryExperience": "業種経験の要否(例: 業種未経験NG)",
  "summary": "仕事内容の概要を2〜3文で",
  "responsibilities": ["主な業務内容を箇条書きで"],
  "requiredSkills": ["必須条件を箇条書きで"],
  "idealCandidate": ["内定の可能性が高い人/求める人物像を箇条書きで"],
  "appealPoints": ["この求人の魅力を箇条書きで（給与や年収の金額はここに入れずsalaryへ）"],
  "philosophy": "理念・ビジョン(ミッション/ビジョン等の文章)",
  "businessDescription": "事業内容と今後の事業展開の文章",
  "culture": "働く人・社風の文章",
  "prPoints": "PRポイントの文章",
  "recruitBackground": "募集背景",
  "orgStructure": "現在の組織構成(例: 部署の人数: 5)",
  "salary": { "monthlyMin": 月給下限(万円の数値、19.6のような小数可)またはnull, "monthlyMax": 月給上限(万円の数値)またはnull, "annualMin": 想定年収下限(万円の数値)またはnull, "annualMax": 想定年収上限(万円の数値)またはnull, "note": "賞与回数・昇給・固定残業代等の補足" },
  "salaryDetail": "給与・年収例の詳細文章",
  "workLocation": "勤務地",
  "workHours": "勤務時間",
  "overtime": "残業に関する補足",
  "holidays": "休日休暇",
  "benefits": ["福利厚生・諸手当を箇条書きで"],
  "smokingPolicy": "受動喫煙対策(例: 屋内禁煙)",
  "casualInterview": "カジュアル面談の有無",
  "companyBriefing": "会社説明会の有無",
  "aptitudeTest": "適性テストの有無",
  "selectionProcess": ["選考フローを順番に"]
}`;

/** テキスト素案 → 求人票JSON のユーザープロンプトを組み立てる。 */
export function buildTextUserPrompt(text: string): string {
  return `次のJSONスキーマに厳密に従って、以下の求人の素案を整理した求人票を出力してください。

${JSON_SCHEMA_GUIDE}

求人の素案・メモ:
${text}

上記スキーマのJSONオブジェクトのみを出力してください。`;
}

=======
- 他社の社名・固有のサービス名・連絡先はそのまま転記しない（自社求人票に流用するため）。
- コピーや業務内容は、転載ではなく要点を再構成した自然な日本語にする。
- 給与は数値が読み取れる場合のみ min/max に数値（円・整数）で入れる。月給か年収かを type に。
- 必ず指定されたJSONスキーマだけを出力する。前置き・説明・マークダウンは一切付けない。`;

>>>>>>> claude/evaluation-finance-dashboard-50w8t9
/** スキーマ説明 + 抽出元テキストを組み立てる。 */
export function buildExtractionUserPrompt(pages: FetchedPage[]): string {
  const usable = pages.filter((p) => p.fetched && p.text);
  const sources = usable
    .map((p, i) => `--- 求人ソース ${i + 1} (${p.url}) ---\n${p.text}`)
    .join("\n\n");

  return `次のJSONスキーマに厳密に従って、求人票を1つにまとめて出力してください。

<<<<<<< HEAD
${JSON_SCHEMA_GUIDE}
=======
JSONスキーマ:
{
  "jobTitle": "募集職種（例: フロントエンドエンジニア）",
  "catchphrase": "求職者の心を掴む1行のキャッチコピー",
  "summary": "仕事内容の概要を2〜3文で",
  "responsibilities": ["具体的な業務内容を箇条書きで複数"],
  "requiredSkills": ["必須要件を箇条書きで"],
  "preferredSkills": ["歓迎要件を箇条書きで"],
  "idealCandidate": ["求める人物像を箇条書きで"],
  "appealPoints": ["この仕事・環境の魅力を箇条書きで"],
  "employmentType": "雇用形態（例: 正社員）",
  "salary": { "type": "月給 または 年収", "min": 数値またはnull, "max": 数値またはnull, "note": "補足（賞与・昇給等）" },
  "workLocation": "勤務地",
  "workHours": "勤務時間",
  "holidays": "休日・休暇",
  "benefits": ["福利厚生を箇条書きで"],
  "selectionProcess": ["選考プロセスを順番に"]
}
>>>>>>> claude/evaluation-finance-dashboard-50w8t9

抽出元の求人ページ:
${sources}

上記スキーマのJSONオブジェクトのみを出力してください。`;
}
