import type { Metadata } from "next";
import { getNavItemByPath } from "@/config/navigation";
import { PlaceholderPage } from "@/components/shell/placeholder-page";

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const path = `/staff/${slug.join("/")}`;
  const navItem = getNavItemByPath(path);
  const title = navItem ? navItem.fallbackTitle : "Staff Portal";

  return {
    title: `${title} — HostelHub Staff`,
    description: `Staff portal module for ${title}`,
  };
}

export default async function StaffModulePage({ params }: PageProps) {
  const { slug } = await params;
  const path = `/staff/${slug.join("/")}`;
  const navItem = getNavItemByPath(path);

  if (navItem) {
    return (
      <PlaceholderPage
        title={navItem.fallbackTitle}
        description={navItem.description}
        iconName={navItem.id}
        badge={navItem.badge}
      />
    );
  }

  const fallbackTitle = slug[slug.length - 1]
    ?.replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()) ?? "Staff Destination";

  return (
    <PlaceholderPage
      title={fallbackTitle}
      description={`HostelHub administration and governance module for ${path}.`}
      iconName="LayoutDashboard"
      badge="Staff Portal"
    />
  );
}
