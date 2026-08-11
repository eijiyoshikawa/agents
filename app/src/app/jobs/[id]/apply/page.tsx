import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2 } from "lucide-react"
import { ApplicationForm } from "./application-form"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true },
  })
  if (!job) return { title: "求人が見つかりません" }
  return { title: `${job.title} に応募` }
}

export default async function ApplyPage({ params }: Props) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      category: true,
      prefecture: true,
      city: true,
      status: true,
      company: {
        select: { name: true },
      },
    },
  })

  if (!job) notFound()

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        求人詳細に戻る
      </Link>

      <div className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">応募する</h1>

        {/* Job Summary */}
        <div className="mt-4 rounded-lg bg-gray-50 p-4">
          <p className="font-semibold text-gray-900">{job.title}</p>
          {job.company && (
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
              <Building2 className="h-4 w-4" />
              {job.company.name}
            </p>
          )}
          <p className="mt-1 text-sm text-gray-500">
            {job.prefecture}
            {job.city ? ` ${job.city}` : ""}
          </p>
        </div>

        {job.status !== "active" ? (
          <div className="mt-6 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            この求人は現在募集を停止しているため、応募できません。
          </div>
        ) : (
          <ApplicationForm jobId={job.id} />
        )}
      </div>
    </div>
  )
}
