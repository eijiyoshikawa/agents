"use client";
import { useConsole } from "./ConsoleProviders";
import type { ReactNode } from "react";

export default function SectionGate({ id, children, fallback = null }: { id: string; children: ReactNode; fallback?: ReactNode }) {
  const { isVisible } = useConsole();
  if (!isVisible(id)) return <>{fallback}</>;
  return <>{children}</>;
}
