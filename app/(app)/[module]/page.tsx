import { notFound } from "next/navigation";
import { findModule } from "@/lib/modules";

// Placeholder for modules not built yet. A real folder such as app/(app)/customers
// takes priority over this route.
export default async function ModulePage({ params }: PageProps<"/[module]">) {
  const { module: slug } = await params;
  const appModule = findModule(slug);

  if (!appModule) notFound();

  return (
    <>
      <h1 className="text-2xl font-semibold">{appModule.label}</h1>
      <p className="mt-1 text-muted">{appModule.description}</p>
      <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-muted">
        Coming in Phase {appModule.phase}.
      </p>
    </>
  );
}
