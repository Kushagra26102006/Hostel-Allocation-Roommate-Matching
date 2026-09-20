import type { Meta, StoryObj } from "@storybook/react";
import { StatusChip } from "@/components/status-chip";

const meta: Meta<typeof StatusChip> = {
  title: "Custom/StatusChip",
  component: StatusChip,
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: "select",
      options: ["online", "offline", "pending", "warning", "error", "success"],
    },
  },
};

export default meta;
type Story = StoryObj<typeof StatusChip>;

export const Default: Story = {
  args: {
    status: "online",
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusChip status="online" />
      <StatusChip status="offline" />
      <StatusChip status="pending" />
      <StatusChip status="warning" />
      <StatusChip status="error" />
      <StatusChip status="success" />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="flex flex-wrap gap-3">
      <StatusChip status="online" />
      <StatusChip status="warning" />
      <StatusChip status="error" />
      <StatusChip status="success" />
    </div>
  ),
};

export const ReducedMotion: Story = {
  args: {
    status: "success",
    label: "WCAG 1.4.1 Compliant (Static)",
  },
};
