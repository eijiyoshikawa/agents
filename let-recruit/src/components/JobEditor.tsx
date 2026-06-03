"use client";

import type { JobPosting } from "@/lib/types";

interface Props {
  job: JobPosting;
  onChange: (job: JobPosting) => void;
}

/** 抽出結果を出力前に微調整するための編集パネル。 */
export function JobEditor({ job, onChange }: Props) {
  const set = <K extends keyof JobPosting>(key: K, value: JobPosting[K]) =>
    onChange({ ...job, [key]: value });

  const setList = (key: keyof JobPosting, text: string) =>
    set(key, text.split(/\r?\n/).map((s) => s.trim()).filter(Boolean) as never);

  return (
    <div className="space-y-4">
      <Text
        label="募集会社名"
        value={job.companyName}
        onChange={(v) => set("companyName", v)}
      />
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
    </div>
  );
}

const labelCls = "mb-1 block text-xs font-semibold text-ink";
const inputCls =
  "w-full rounded-xl border border-border-soft bg-white p-2.5 text-sm outline-none focus:border-ink";

function Text({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <input className={inputCls} value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

function Area({ label, value, onChange }: FieldProps) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      <textarea
        className={inputCls}
        rows={3}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
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
        rows={Math.min(Math.max(items.length, 2), 6)}
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
