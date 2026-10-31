import { ModuleCard } from "@/components/module-card";
import { SignOutButton } from "@/components/sign-out-button";
import { moreModules } from "@/lib/modules";

export default function MorePage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">More</h1>
      <ul className="mt-6 flex flex-col gap-3">
        {moreModules.map((module) => (
          <li key={module.slug}>
            <ModuleCard module={module} />
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <SignOutButton />
      </div>
    </>
  );
}
