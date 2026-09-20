import type { Meta, StoryObj } from "@storybook/react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof PageHeader> = {
  title: "Custom/PageHeader",
  component: PageHeader,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PageHeader>;

export const Default: Story = {
  args: {
    title: "Room Allocations",
    description: "Manage student room assignments and bed capacity",
    breadcrumb: [
      { label: "Dashboard", href: "/" },
      { label: "Hostels", href: "/hostels" },
      { label: "Allocations" },
    ],
    actions: (
      <Button variant="primary" size="sm">
        New Allocation
      </Button>
    ),
  },
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  args: {
    title: "Hostel Hub Security",
    description: "Night curfews and automated gate pass validations",
    breadcrumb: [
      { label: "Admin", href: "/" },
      { label: "Gate Passes" },
    ],
    actions: (
      <Button variant="secondary" size="sm">
        Export CSV
      </Button>
    ),
  },
};

export const ReducedMotion: Story = {
  args: {
    title: "Reduced Motion Header",
    description: "Header with instant transitions",
    breadcrumb: [{ label: "Home", href: "/" }, { label: "Settings" }],
  },
};
