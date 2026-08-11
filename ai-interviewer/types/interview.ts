/**
 * AI Interviewer — shared types.
 *
 * These types model the domain across:
 *   - Notion (Job, persisted Interview rows)
 *   - Conversation runtime (Turn, InterviewSession)
 *   - Evaluation output produced by Claude after the interview
 */

// ---------------------------------------------------------------------------
// Job (募集ポジション)
// ---------------------------------------------------------------------------

export type Position =
  | "営業"
  | "エンジニア"
  | "事務"
  | "マーケティング"
  | "デザイナー"
  | "その他";

/** Single key question entry stored as JSON in Notion's KeyQuestions field. */
export interface KeyQuestion {
  topic: string;
  question: string;
  /** 1 (nice to have) – 5 (must-ask). */
  importance: 1 | 2 | 3 | 4 | 5;
}

/** Evaluation axis weights stored as JSON in Notion's EvaluationCriteria field. */
export type EvaluationCriteria = Record<string, 1 | 2 | 3 | 4 | 5>;

export interface Job {
  id: string;
  title: string;
  company: string;
  position: Position;
  jobDescription: string;
  requiredSkills: string[];
  keyQuestions: KeyQuestion[];
  evaluationCriteria: EvaluationCriteria;
}

// ---------------------------------------------------------------------------
// Conversation turns
// ---------------------------------------------------------------------------

export type Role = "interviewer" | "candidate" | "system";

export interface Turn {
  role: Role;
  content: string;
  /** ISO-8601 timestamp set when the turn is committed to history. */
  timestamp: string;
  /** Deepgram confidence (0–1) for candidate turns; undefined otherwise. */
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Interview session (runtime state)
// ---------------------------------------------------------------------------

export type InterviewPhase =
  | "icebreak"
  | "self_intro"
  | "deep_dive"
  | "motivation"
  | "candidate_questions"
  | "closing"
  | "ended";

export type InterviewStatus = "in_progress" | "completed" | "error";

export interface InterviewSession {
  id: string;
  jobId: string;
  candidateName: string;
  startedAt: string;
  endedAt?: string;
  durationSec?: number;
  phase: InterviewPhase;
  status: InterviewStatus;
  turns: Turn[];
}

// ---------------------------------------------------------------------------
// Evaluation (produced by Claude after the interview)
// ---------------------------------------------------------------------------

export type Recommendation = "通過" | "保留" | "不合格";

export type Score = 1 | 2 | 3 | 4 | 5;

export interface SkillAssessment {
  コミュニケーション: Score;
  論理的思考: Score;
  経験の深さ: Score;
  カルチャーフィット: Score;
  志望意欲: Score;
  [axis: string]: Score;
}

export interface KeyQuote {
  topic: string;
  quote: string;
}

export interface Evaluation {
  overall_score: Score;
  recommendation: Recommendation;
  strengths: string[];
  concerns: string[];
  skill_assessment: SkillAssessment;
  key_quotes: KeyQuote[];
  next_step_suggestion: string;
}

// ---------------------------------------------------------------------------
// API contracts
// ---------------------------------------------------------------------------

/** POST /api/heygen-token response. */
export interface HeyGenTokenResponse {
  token: string;
  /** Unix epoch seconds; HeyGen tokens are short-lived (~minutes). */
  expiresAt: number;
}

/** POST /api/claude request payload. */
export interface ClaudeChatRequest {
  sessionId: string;
  jobId: string;
  candidateName: string;
  /** Full conversation history including the latest candidate turn. */
  turns: Turn[];
}

/** POST /api/claude response (non-streaming form). */
export interface ClaudeChatResponse {
  reply: string;
  /** True when Claude emitted [INTERVIEW_END] in its reply. */
  interviewEnded: boolean;
}

/** POST /api/evaluate request payload. */
export interface EvaluateRequest {
  jobId: string;
  turns: Turn[];
}

/** POST /api/evaluate response. */
export interface EvaluateResponse {
  evaluation: Evaluation;
}

/** POST /api/notion/save request payload. */
export interface NotionSaveRequest {
  session: InterviewSession;
  evaluation: Evaluation;
}
