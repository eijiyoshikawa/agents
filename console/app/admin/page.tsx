import AdminClient from "./client";
import config from "@/config/visibility.json";

export default function AdminPage() {
  return <AdminClient initialConfig={config} />;
}
