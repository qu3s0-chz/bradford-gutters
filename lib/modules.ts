import {
  Briefcase,
  CalendarDays,
  FileText,
  Home,
  Menu,
  Megaphone,
  Package,
  Receipt,
  Settings,
  Target,
  Users,
} from "lucide-react";

export const modules = [
  {
    slug: "customers",
    label: "Customers",
    description: "Customers, properties and photos",
    phase: 1,
    icon: Users,
  },
  {
    slug: "quotes",
    label: "Quotes",
    description: "White and colored coil quotes",
    phase: 3,
    icon: FileText,
  },
  {
    slug: "jobs",
    label: "Jobs",
    description: "Accepted quotes and material lists",
    phase: 4,
    icon: Briefcase,
  },
  {
    slug: "calendar",
    label: "Calendar",
    description: "Scheduled work",
    phase: 4,
    icon: CalendarDays,
  },
  {
    slug: "invoices",
    label: "Invoices",
    description: "Invoices, deposits and payments",
    phase: 5,
    icon: Receipt,
  },
  {
    slug: "leads",
    label: "Leads",
    description: "New, quoted, follow-up, won and lost",
    phase: 6,
    icon: Target,
  },
  {
    slug: "outreach",
    label: "Outreach",
    description: "Follow-ups and seasonal campaigns",
    phase: 6,
    icon: Megaphone,
  },
  {
    slug: "materials",
    label: "Materials",
    description: "Material prices and contractor rates",
    phase: 2,
    icon: Package,
  },
  {
    slug: "settings",
    label: "Settings",
    description: "Business details and defaults",
    phase: 2,
    icon: Settings,
  },
];

export const primaryNav = [
  { href: "/", label: "Home", icon: Home },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/quotes", label: "Quotes", icon: FileText },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/more", label: "More", icon: Menu },
];

export const sidebarNav = [
  { href: "/", label: "Home", icon: Home },
  ...modules.map(({ slug, label, icon }) => ({
    href: `/${slug}`,
    label,
    icon,
  })),
];

export const moreModules = modules.filter(
  ({ slug }) => !primaryNav.some(({ href }) => href === `/${slug}`),
);

export function findModule(slug: string) {
  return modules.find((module) => module.slug === slug);
}
