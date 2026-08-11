import { prisma } from "@/lib/db"

export async function GET() {
  const areas = await prisma.job.groupBy({
    by: ["prefecture"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  })

  return Response.json(
    areas.map((a) => ({
      prefecture: a.prefecture,
      count: a._count.id,
    }))
  )
}
