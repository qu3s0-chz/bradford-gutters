import type { Metadata } from "next";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Calculator settings" };

export default function CalculatorSettingsPage() {
  return <SettingsForm />;
}
