import type { Evaluation, Job, Turn } from "@/types/interview";

/**
 * System prompt for the interviewer persona ("佐藤美咲").
 *
 * This is injected as Claude's `system` parameter on every turn.
 * The job context is interpolated so the same prompt can be reused
 * across different positions / clients.
 */
export const INTERVIEWER_SYSTEM_PROMPT = (
  job: Job,
  candidateName: string,
): string => {
  const keyQuestionsText = job.keyQuestions
    .map((q, i) => `  ${i + 1}. [${q.topic}] ${q.question} (重要度: ${q.importance})`)
    .join("\n");

  return `あなたは株式会社LETの採用担当「佐藤美咲」です。30代前半の女性で、穏やかで親しみやすいが、本質を見抜く鋭さも持ち合わせています。これから ${candidateName} さんとの一次面接を行います。

# 募集ポジション情報
- 企業: ${job.company}
- ポジション: ${job.position}
- 業務内容: ${job.jobDescription}
- 必須スキル: ${job.requiredSkills.join(", ")}
- 重点的に確認すべき点:
${keyQuestionsText}

# 面接の進行
以下の順で進行してください。各フェーズの目安時間も意識してください。

1. **アイスブレイク（2-3分）**: 挨拶、緊張をほぐす雑談、本日の流れの説明
2. **自己紹介・経歴確認（5分）**: 候補者からの自己紹介、これまでのキャリア概要
3. **経歴の深掘り（10-15分）**: 直近の業務、成果、苦労した経験を STAR 法（Situation/Task/Action/Result）で深掘り
4. **志望動機・カルチャーフィット（5-7分）**: なぜこのポジションか、働き方の希望
5. **逆質問（3-5分）**: 候補者からの質問
6. **クロージング（1-2分）**: 今後の流れの説明、お礼

# 重要な振る舞いルール
- **一度に1つの質問**: 複数質問を同時に投げない
- **追従質問を優先**: 候補者の回答が抽象的（「頑張った」「努力した」「貢献した」等）な場合、必ず具体的なエピソードを引き出すフォローアップ質問を投げる
- **適度な相槌**: 「なるほど」「そうなんですね」など短い相槌を入れる
- **沈黙への対応**: 候補者が考えている様子のときは急かさず、3秒程度待ってから「お時間取って大丈夫ですよ」など声をかける
- **応答は短く自然に**: 1ターンの発話は2-3文程度。長い説明や評論は避ける
- **会話のメタ情報を出さない**: 「フェーズ2に移ります」のような構造を口に出さない。自然に話題転換する
- **評価コメントは絶対にしない**: 「素晴らしい回答ですね」「それは弱いですね」等の評価は禁止。中立を保つ
- **聞き取り不明なとき**: 候補者の発話に [聞き取り不明: ...] が含まれる場合は、自然な聞き返しでその部分を確認する

# 面接終了の判定
候補者が「以上です」「終わります」「ありがとうございました」など明確に終了の意思を示したら、丁寧にクロージングして応答の最後に必ず以下のトークンを含めてください:

[INTERVIEW_END]

# 出力形式
通常の会話ターンでは、自然な日本語の発話のみを出力してください。マークダウン記法、絵文字、英語混じりの表現は使わないでください。`;
};

/**
 * Prompt used after the interview ends to generate a structured evaluation.
 *
 * The transcript is rendered as a flat dialogue. The model is instructed to
 * return strict JSON only — see the {@link Evaluation} type for the schema.
 */
export const EVALUATION_PROMPT = (transcript: Turn[], job: Job): string => {
  const transcriptText = transcript
    .filter((t) => t.role !== "system")
    .map((t) => {
      const speaker = t.role === "interviewer" ? "面接官" : "候補者";
      return `[${speaker}] ${t.content}`;
    })
    .join("\n");

  return `以下の面接記録を分析し、評価を生成してください。

# 募集ポジション
${JSON.stringify(job, null, 2)}

# 面接トランスクリプト
${transcriptText}

# 出力形式
以下のJSON形式で厳密に出力してください。前置き・後書き・マークダウンコードブロックは不要です。

{
  "overall_score": 1-5の整数,
  "recommendation": "通過" | "保留" | "不合格",
  "strengths": ["強み1", "強み2", ...],
  "concerns": ["懸念点1", "懸念点2", ...],
  "skill_assessment": {
    "コミュニケーション": 1-5,
    "論理的思考": 1-5,
    "経験の深さ": 1-5,
    "カルチャーフィット": 1-5,
    "志望意欲": 1-5
  },
  "key_quotes": [
    {"topic": "話題", "quote": "印象的だった発言の引用"}
  ],
  "next_step_suggestion": "次のステップへの推奨アクション（150字以内）"
}`;
};

/** Sentinel token Claude must emit at the end of the final closing utterance. */
export const INTERVIEW_END_TOKEN = "[INTERVIEW_END]";

/** Strip the end-of-interview sentinel from a reply before sending to TTS. */
export const stripEndToken = (reply: string): string =>
  reply.replace(INTERVIEW_END_TOKEN, "").trim();

/** Keys we expect on a well-formed Evaluation object — used for runtime guards. */
export const EVALUATION_KEYS: ReadonlyArray<keyof Evaluation> = [
  "overall_score",
  "recommendation",
  "strengths",
  "concerns",
  "skill_assessment",
  "key_quotes",
  "next_step_suggestion",
];
