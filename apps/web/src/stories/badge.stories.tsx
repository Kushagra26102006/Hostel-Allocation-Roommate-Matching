import type { Meta, StoryObj } from "@storybook/react";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Badge> = {
  title: "UI/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "secondary", "outline", "destructive", "success", "warning", "info"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Badge>;

export const Default: Story = {
  args: {
    children: "Active Resident",
    variant: "default",
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="success">Success</Badge>
      <Badge variant="warning">Warning</Badge>
      <Badge variant="info">Info</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="default">Dark Default</Badge>
      <Badge variant="success">Dark Success</Badge>
      <Badge variant="warning">Dark Warning</Badge>
      <Badge variant="destructive">Dark Destructive</Badge>
    </div>
  ),
};

export const ReducedMotion: Story = {
  args: {
    children: "Verified",
    variant: "info",
  },
};
