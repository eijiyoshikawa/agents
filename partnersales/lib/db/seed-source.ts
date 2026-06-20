// シードデータを返すデータソース（既定）。
import type { DataSource } from "./source";
import { deals, partners, payouts, services } from "@/data/seed";

export const seedSource: DataSource = {
  name: "seed",
  async getServices() {
    return services;
  },
  async getPartners() {
    return partners;
  },
  async getDeals() {
    return deals;
  },
  async getPayouts() {
    return payouts;
  },
};
