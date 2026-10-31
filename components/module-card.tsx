import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { modules } from "@/lib/modules";

export function ModuleCard({ module }: { module: (typeof modules)[number] }) {
  const { slug, label, description, icon: Icon } = module;

  return (
    <Link
      href={`/${slug}`}
      className="flex min-h-16 items-center gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <Icon aria-hidden size={22} className="shrink-0 text-brand" />
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">{description}</span>
      </span>
      <ChevronRight aria-hidden size={18} className="shrink-0 text-muted" />
    </Link>
  );
}
