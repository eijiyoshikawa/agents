import GraphClient from "./client";
import agents from "@/data/agents.json";

export default function GraphPage() {
  return <GraphClient agents={agents as any} />;
}
