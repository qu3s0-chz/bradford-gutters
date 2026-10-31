import { ModuleCard } from "@/components/module-card";
import { modules } from "@/lib/modules";

export default function HomePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Bradford Seamless Gutters</h1>
      <p className="mt-1 text-muted">
        Your revenue and close rate will show here in Phase 7.
      </p>
      <ul className="mt-6 flex flex-col gap-3">
        {modules.map((module) => (
          <li key={module.slug}>
            <ModuleCard module={module} />
          </li>
        ))}
      </ul>
    </>
  );
}
