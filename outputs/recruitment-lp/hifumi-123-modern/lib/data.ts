import companyJson from "@/data/company.json";
import type { CompanyData } from "./types";

export function getCompanyData(): CompanyData {
  return companyJson as CompanyData;
}
