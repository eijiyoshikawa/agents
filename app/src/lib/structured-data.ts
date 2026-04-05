const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.example.com"

type JobInput = {
  id: string
  title: string
  description: string | null
  category: string
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  prefecture: string
  city: string | null
  address: string | null
  publishedAt: Date | null
  createdAt: Date
  company: {
    name: string
    logoUrl: string | null
    websiteUrl: string | null
  } | null
}

const EMPLOYMENT_TYPE_MAP: Record<string, string> = {
  full_time: "FULL_TIME",
  part_time: "PART_TIME",
  contract: "CONTRACTOR",
}

const SALARY_UNIT_MAP: Record<string, string> = {
  hourly: "HOUR",
  monthly: "MONTH",
  annual: "YEAR",
}

export function generateJobPostingSchema(job: JobInput): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description ?? job.title,
    datePosted: (job.publishedAt ?? job.createdAt).toISOString(),
    url: `${BASE_URL}/jobs/${job.id}`,
  }

  if (job.employmentType && EMPLOYMENT_TYPE_MAP[job.employmentType]) {
    schema.employmentType = EMPLOYMENT_TYPE_MAP[job.employmentType]
  }

  // Hiring organization
  if (job.company) {
    schema.hiringOrganization = {
      "@type": "Organization",
      name: job.company.name,
      ...(job.company.logoUrl && { logo: job.company.logoUrl }),
      ...(job.company.websiteUrl && { sameAs: job.company.websiteUrl }),
    }
  } else {
    schema.hiringOrganization = {
      "@type": "Organization",
      name: "非公開",
    }
  }

  // Job location
  schema.jobLocation = {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressRegion: job.prefecture,
      addressCountry: "JP",
      ...(job.city && { addressLocality: job.city }),
      ...(job.address && { streetAddress: job.address }),
    },
  }

  // Base salary
  if (job.salaryMin != null) {
    const unitText = SALARY_UNIT_MAP[job.salaryType ?? "monthly"] ?? "MONTH"
    schema.baseSalary = {
      "@type": "MonetaryAmount",
      currency: "JPY",
      value: {
        "@type": "QuantitativeValue",
        minValue: job.salaryMin,
        ...(job.salaryMax != null && { maxValue: job.salaryMax }),
        unitText,
      },
    }
  }

  return schema
}
