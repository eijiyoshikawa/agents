"use client";

<<<<<<< HEAD
import { useState } from "react";
=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
import type { JobPosting } from "@/lib/types";

interface Props {
  job: JobPosting;
  onChange: (job: JobPosting) => void;
}

<<<<<<< HEAD
/** 抽出結果を出力前に調整する編集パネル（全項目対応）。 */
=======
/** 抽出結果を出力前に微調整するための編集パネル。 */
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
export function JobEditor({ job, onChange }: Props) {
  const set = <K extends keyof JobPosting>(key: K, value: JobPosting[K]) =>
    onChange({ ...job, [key]: value });

  const setList = (key: keyof JobPosting, text: string) =>
    set(key, text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) as never);

  return (
<<<<<<< HEAD
    <div className="space-y-5">
      <Group title="基本情報（求人サイトに無い項目は手入力）">
        <Text label="タイトル/キャッチコピー" value={job.catchphrase} onChange={(v) => set("catchphrase", v)} />
        <Text label="募集元の会社名（空欄なら後で記入）" value={job.companyName} onChange={(v) => set("companyName", v)} />
        <Row>
          <Text label="業種" value={job.industry} onChange={(v) => set("industry", v)} />
          <Text label="職種" value={job.occupation} onChange={(v) => set("occupation", v)} />
        </Row>
        <Row>
          <Text label="設立年" value={job.establishedYear} onChange={(v) => set("establishedYear", v)} />
          <Text label="従業員数" value={job.employeeCount} onChange={(v) => set("employeeCount", v)} />
        </Row>
        <Row>
          <Text label="上場区分" value={job.listingStatus} onChange={(v) => set("listingStatus", v)} />
          <Text label="平均年齢" value={job.averageAge} onChange={(v) => set("averageAge", v)} />
        </Row>
        <Row>
          <Text label="男女比率" value={job.genderRatio} onChange={(v) => set("genderRatio", v)} />
          <Text label="会社HP" value={job.companyWebsite} onChange={(v) => set("companyWebsite", v)} />
        </Row>
        <Text label="本社所在地" value={job.companyAddress} onChange={(v) => set("companyAddress", v)} />
      </Group>

      <Group title="募集条件">
        <Text label="募集職種" value={job.jobTitle} onChange={(v) => set("jobTitle", v)} />
        <Row>
          <Text label="雇用形態" value={job.employmentType} onChange={(v) => set("employmentType", v)} />
          <Text label="採用ポジション" value={job.recruitPosition} onChange={(v) => set("recruitPosition", v)} />
        </Row>
        <Row>
          <Text label="職位" value={job.jobLevel} onChange={(v) => set("jobLevel", v)} />
          <Text label="最終学歴" value={job.education} onChange={(v) => set("education", v)} />
        </Row>
        <Row>
          <Text label="職種経験" value={job.jobExperience} onChange={(v) => set("jobExperience", v)} />
          <Text label="業種経験" value={job.industryExperience} onChange={(v) => set("industryExperience", v)} />
        </Row>
      </Group>

      <Group title="求人内容">
        <Area label="仕事内容の概要" value={job.summary} onChange={(v) => set("summary", v)} />
        <ListArea label="主な業務内容" items={job.responsibilities} onChange={(t) => setList("responsibilities", t)} />
        <ListArea label="必須条件" items={job.requiredSkills} onChange={(t) => setList("requiredSkills", t)} />
        <ListArea label="内定の可能性が高い人/求める人物像" items={job.idealCandidate} onChange={(t) => setList("idealCandidate", t)} />
        <ListArea label="この求人の魅力" items={job.appealPoints} onChange={(t) => setList("appealPoints", t)} />
        <Area label="理念・ビジョン" value={job.philosophy} onChange={(v) => set("philosophy", v)} />
        <Area label="事業内容と今後の事業展開" value={job.businessDescription} onChange={(v) => set("businessDescription", v)} />
        <Area label="働く人・社風" value={job.culture} onChange={(v) => set("culture", v)} />
        <Area label="PRポイント" value={job.prPoints} onChange={(v) => set("prPoints", v)} />
        <Text label="募集背景" value={job.recruitBackground} onChange={(v) => set("recruitBackground", v)} />
        <Text label="現在の組織構成" value={job.orgStructure} onChange={(v) => set("orgStructure", v)} />
      </Group>

      <Group title="待遇・勤務条件">
        <Row>
          <Yen
            label="月給 下限（円）"
            value={job.salary.monthlyMin}
            onChange={(v) => set("salary", { ...job.salary, monthlyMin: v })}
          />
          <Yen
            label="月給 上限（円）"
            value={job.salary.monthlyMax}
            onChange={(v) => set("salary", { ...job.salary, monthlyMax: v })}
          />
        </Row>
        <Row>
          <Yen
            label="想定年収 下限（円）"
            value={job.salary.annualMin}
            onChange={(v) => set("salary", { ...job.salary, annualMin: v })}
          />
          <Yen
            label="想定年収 上限（円）"
            value={job.salary.annualMax}
            onChange={(v) => set("salary", { ...job.salary, annualMax: v })}
          />
        </Row>
        <Text
          label="給与の補足（賞与・昇給・固定残業代等）"
          value={job.salary.note}
          onChange={(v) => set("salary", { ...job.salary, note: v })}
        />
        <Area label="給与・年収例の詳細" value={job.salaryDetail} onChange={(v) => set("salaryDetail", v)} />
        <Text label="勤務地" value={job.workLocation} onChange={(v) => set("workLocation", v)} />
        <Text label="勤務時間" value={job.workHours} onChange={(v) => set("workHours", v)} />
        <Text label="残業に関する補足" value={job.overtime} onChange={(v) => set("overtime", v)} />
        <Text label="休日休暇" value={job.holidays} onChange={(v) => set("holidays", v)} />
        <Text label="受動喫煙対策" value={job.smokingPolicy} onChange={(v) => set("smokingPolicy", v)} />
        <ListArea label="福利厚生・諸手当" items={job.benefits} onChange={(t) => setList("benefits", t)} />
      </Group>

      <Group title="選考情報">
        <Text label="カジュアル面談の有無" value={job.casualInterview} onChange={(v) => set("casualInterview", v)} />
        <Text label="会社説明会の有無" value={job.companyBriefing} onChange={(v) => set("companyBriefing", v)} />
        <Text label="適性テストの有無" value={job.aptitudeTest} onChange={(v) => set("aptitudeTest", v)} />
        <ListArea label="選考フロー" items={job.selectionProcess} onChange={(t) => setList("selectionProcess", t)} />
      </Group>
=======
    <div className="space-y-4">
      <Text label="募集職種" value={job.jobTitle} onChange={(v) => set("jobTitle", v)} />
      <Text
        label="キャッチコピー"
        value={job.catchphrase}
        onChange={(v) => set("catchphrase", v)}
      />
      <Area label="仕事内容の概要" value={job.summary} onChange={(v) => set("summary", v)} />
      <ListArea label="業務内容" items={job.responsibilities} onChange={(t) => setList("responsibilities", t)} />
      <ListArea label="必須要件" items={job.requiredSkills} onChange={(t) => setList("requiredSkills", t)} />
      <ListArea label="歓迎要件" items={job.preferredSkills} onChange={(t) => setList("preferredSkills", t)} />
      <ListArea label="求める人物像" items={job.idealCandidate} onChange={(t) => setList("idealCandidate", t)} />
      <ListArea label="この仕事の魅力" items={job.appealPoints} onChange={(t) => setList("appealPoints", t)} />
      <Text label="雇用形態" value={job.employmentType} onChange={(v) => set("employmentType", v)} />
      <Text label="勤務地" value={job.workLocation} onChange={(v) => set("workLocation", v)} />
      <Text label="勤務時間" value={job.workHours} onChange={(v) => set("workHours", v)} />
      <Text label="休日・休暇" value={job.holidays} onChange={(v) => set("holidays", v)} />
      <ListArea label="福利厚生" items={job.benefits} onChange={(t) => setList("benefits", t)} />
      <ListArea label="選考プロセス" items={job.selectionProcess} onChange={(t) => setList("selectionProcess", t)} />
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
    </div>
  );
}

const labelCls = "mb-1 block text-xs font-semibold text-ink";
const inputCls =
  "w-full rounded-xl border border-border-soft bg-white p-2.5 text-sm outline-none focus:border-ink";

<<<<<<< HEAD
function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-2xl border border-border-soft p-3">
      <legend className="px-2 text-xs font-bold tracking-[0.04em] text-brand-dark">
        {title}
      </legend>
      <div className="space-y-3">{children}</div>
    </fieldset>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
function Text({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

<<<<<<< HEAD
/** 全角数字→半角にし、数字以外（カンマ・円など）を除去して数値化。空ならnull。 */
function parseYenText(raw: string): number | null {
  const digits = raw
    .replace(/[０-９]/g, (z) => String.fromCharCode(z.charCodeAt(0) - 0xfee0))
    .replace(/[^\d]/g, "");
  if (!digits) return null;
  // 万円に変換（小数第1位まで保持: 196000円→19.6）
  return Math.round(Number(digits) / 1000) / 10;
}

/**
 * 金額入力（円・テキスト直打ち）。内部データは万円で保持し相互変換する。
 * 入力中は打った文字をそのまま表示し、フォーカスを外すと整形される。
 */
function Yen({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null; // 万円
  onChange: (value: number | null) => void; // 万円
}) {
  // 入力中だけ生テキストを保持（未フォーカス時はデータ由来の表示）
  const [draft, setDraft] = useState<string | null>(null);
  const display =
    draft ?? (value == null ? "" : String(Math.round(value * 10000)));
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input
        type="text"
        inputMode="numeric"
        className={inputCls}
        value={display}
        placeholder="例: 196000"
        onFocus={(e) => setDraft(e.target.value)}
        onChange={(e) => {
          setDraft(e.target.value);
          onChange(parseYenText(e.target.value));
        }}
        onBlur={() => setDraft(null)}
      />
    </label>
  );
}

=======
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
function Area({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
<<<<<<< HEAD
      <textarea className={inputCls} rows={3} value={value} onChange={(e) => onChange(e.target.value)} />
=======
      <textarea
        className={inputCls}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
    </label>
  );
}

function ListArea({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (text: string) => void;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}（1行に1項目）</span>
      <textarea
        className={inputCls}
<<<<<<< HEAD
        rows={Math.min(Math.max(items.length, 2), 8)}
=======
        rows={Math.min(Math.max(items.length, 2), 6)}
>>>>>>> claude/evaluation-finance-dashboard-50w8t9
        value={items.join("\n")}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}
