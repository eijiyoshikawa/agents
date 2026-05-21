import { prisma } from "@/lib/db"
import { type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  const prefecture = searchParams.get("prefecture")
  const category = searchParams.get("category")
  const employmentType = searchParams.get("employment_type")
  const salaryMin = searchParams.get("salary_min")
  const q = searchParams.get("q")
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20")))
  const sort = searchParams.get("sort") ?? "published_at"

  const where = {
    status: "active" as const,
    ...(prefecture && { prefecture }),
    ...(category && { category }),
    ...(employmentType && { employmentType }),
    ...(salaryMin && { salaryMin: { gte: Number(salaryMin) } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  }

  const orderBy =
    sort === "salary_max"
      ? { salaryMax: "desc" as const }
      : sort === "view_count"
        ? { viewCount: "desc" as const }
        : { publishedAt: "desc" as const }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        employmentType: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        prefecture: true,
        city: true,
        tags: true,
        source: true,
        publishedAt: true,
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    }),
    prisma.job.count({ where }),
  ])

  return Response.json({
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}
