import { notFound } from "next/navigation";
import { DesignShowcaseClient } from "./design-showcase-client";

export const metadata = {
  title: "HostelHub Design System — Specification & Components",
  description: "Interactive design tokens and component library for HostelHub",
};

export default function DesignPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <DesignShowcaseClient />;
}
