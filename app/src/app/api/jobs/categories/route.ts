import { prisma } from "@/lib/db"

export async function GET() {
  const categories = await prisma.job.groupBy({
    by: ["category"],
    where: { status: "active" },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  })

  return Response.json(
    categories.map((c) => ({
      category: c.category,
      count: c._count.id,
      label: categoryLabel(c.category),
    }))
  )
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    driver: "ドライバー・運転手",
    construction: "建設・土木",
    manufacturing: "製造・工場",
    other: "その他",
  }
  return labels[category] ?? category
}
