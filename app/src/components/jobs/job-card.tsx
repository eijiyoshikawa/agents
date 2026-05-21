import Link from "next/link"
import { MapPin, Banknote, Building2, Clock } from "lucide-react"

type JobCardProps = {
  id: string
  title: string
  category: string
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  prefecture: string
  city: string | null
  source: string
  tags: string[]
  company: { name: string; logoUrl: string | null } | null
}

export function JobCard({ job }: { job: JobCardProps }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="block rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md hover:border-blue-300"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-gray-900 line-clamp-2">
            {job.title}
          </h3>
          {job.company && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              {job.company.name}
            </p>
          )}
        </div>
        {job.source === "hellowork" && (
          <span className="shrink-0 rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            HW
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
        <span className="flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {job.prefecture}
          {job.city && ` ${job.city}`}
        </span>
        {job.salaryMin && (
          <span className="flex items-center gap-1">
            <Banknote className="h-3.5 w-3.5" />
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
          </span>
        )}
        {job.employmentType && (
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {employmentTypeLabel(job.employmentType)}
          </span>
        )}
      </div>

      {job.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {job.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  const unit = type === "hourly" ? "時給" : type === "annual" ? "年収" : "月給"
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(0)}万` : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  if (min) return `${unit} ${fmt(min)}円〜`
  return ""
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return labels[type] ?? type
}
