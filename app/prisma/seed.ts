import { PrismaClient } from "@prisma/client"
import { hashSync } from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // サンプル企業
  const company1 = await prisma.company.create({
    data: {
      name: "東京運送株式会社",
      industry: "運送・物流",
      prefecture: "東京都",
      city: "江東区",
      address: "東京都江東区有明1-1-1",
      employeeCount: "51-100",
      description: "創業30年の安定企業。大型トラックドライバーを募集中。",
      contactEmail: "recruit@tokyo-unsou.example.com",
    },
  })

  const company2 = await prisma.company.create({
    data: {
      name: "関西建設工業株式会社",
      industry: "建設",
      prefecture: "大阪府",
      city: "大阪市北区",
      address: "大阪府大阪市北区梅田2-2-2",
      employeeCount: "101-300",
      description: "関西エリアを中心に道路・橋梁の施工管理を行っています。",
      contactEmail: "hr@kansai-kensetsu.example.com",
    },
  })

  // 企業担当者
  await prisma.companyUser.create({
    data: {
      companyId: company1.id,
      email: "admin@tokyo-unsou.example.com",
      passwordHash: hashSync("password123", 10),
      name: "田中太郎",
      role: "admin",
    },
  })

  // サンプル求職者
  await prisma.user.create({
    data: {
      email: "yamada@example.com",
      passwordHash: hashSync("password123", 10),
      name: "山田花子",
      prefecture: "東京都",
      city: "墨田区",
      desiredCategories: ["driver"],
      desiredSalaryMin: 300000,
      profilePublic: true,
    },
  })

  // サンプル求人（直接掲載）
  const jobTitles = [
    { title: "大型トラックドライバー【月給35万〜】", category: "driver", subcategory: "truck", prefecture: "東京都", city: "江東区", salaryMin: 350000, salaryMax: 450000, salaryType: "monthly", employmentType: "full_time", companyId: company1.id },
    { title: "4tドライバー 日勤のみ 土日休み", category: "driver", subcategory: "truck", prefecture: "東京都", city: "品川区", salaryMin: 280000, salaryMax: 350000, salaryType: "monthly", employmentType: "full_time", companyId: company1.id },
    { title: "タクシードライバー【未経験歓迎】", category: "driver", subcategory: "taxi", prefecture: "東京都", city: "新宿区", salaryMin: 300000, salaryMax: 500000, salaryType: "monthly", employmentType: "full_time", companyId: company1.id },
    { title: "施工管理（土木）経験者優遇", category: "construction", subcategory: "civil", prefecture: "大阪府", city: "大阪市北区", salaryMin: 400000, salaryMax: 600000, salaryType: "monthly", employmentType: "full_time", companyId: company2.id },
    { title: "建築現場監督【年収600万〜】", category: "construction", subcategory: "building", prefecture: "大阪府", city: "大阪市中央区", salaryMin: 500000, salaryMax: 700000, salaryType: "monthly", employmentType: "full_time", companyId: company2.id },
  ]

  for (const job of jobTitles) {
    await prisma.job.create({
      data: {
        ...job,
        source: "direct",
        description: `${job.title}の求人です。詳細はお問い合わせください。`,
        benefits: ["社会保険完備", "交通費支給", "退職金制度"],
        tags: ["未経験歓迎", "学歴不問"],
        status: "active",
        publishedAt: new Date(),
      },
    })
  }

  // サンプルHW求人
  for (let i = 1; i <= 5; i++) {
    await prisma.job.create({
      data: {
        source: "hellowork",
        helloworkId: `13010-${String(i).padStart(8, "0")}`,
        title: `配送ドライバー（ハローワーク転載）#${i}`,
        category: "driver",
        subcategory: "delivery",
        employmentType: "full_time",
        description: "ハローワークインターネットサービスより転載。",
        salaryMin: 250000,
        salaryMax: 320000,
        salaryType: "monthly",
        prefecture: "東京都",
        city: "足立区",
        benefits: ["社会保険完備"],
        tags: [],
        status: "active",
        publishedAt: new Date(),
      },
    })
  }

  console.log("Seed completed: 2 companies, 1 company user, 1 seeker, 10 jobs")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
