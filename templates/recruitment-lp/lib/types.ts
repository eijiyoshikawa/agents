export type TemplateName = "modern" | "classic" | "pop";

export interface CompanyInfo {
  name: string;
  name_en?: string;
  slug: string;
  founded?: string;
  address?: string;
  ceo?: string;
  tagline?: string;
  mission?: string;
  description?: string;
}

export interface ServiceItem {
  name: string;
  description: string;
  target?: string;
}

export interface JobItem {
  title: string;
  employment_type: string;
  location: string;
  salary?: string;
  description: string;
  requirements?: string[];
}

export interface CompanyData {
  template: TemplateName;
  company: CompanyInfo;
  services: ServiceItem[];
  jobs: JobItem[];
}
