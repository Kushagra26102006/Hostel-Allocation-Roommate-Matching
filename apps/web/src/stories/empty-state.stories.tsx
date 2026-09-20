import type { Meta, StoryObj } from "@storybook/react";
import { EmptyState } from "@/components/empty-state";
import { Bell, Inbox } from "lucide-react";

const meta: Meta<typeof EmptyState> = {
  title: "Custom/EmptyState",
  component: EmptyState,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof EmptyState>;

export const Default: Story = {
  args: {
    icon: <Bell className="h-8 w-8" />,
    title: "No Notifications Yet",
    description: "You are all caught up! Announcements from hostel management will appear here.",
    action: {
      label: "Refresh Inbox",
      onClick: () => {},
    },
  },
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  args: {
    icon: <Inbox className="h-8 w-8" />,
    title: "No Maintenance Requests",
    description: "Your room has no active complaints or repair tickets.",
    action: {
      label: "Submit New Ticket",
      onClick: () => {},
    },
  },
};

export const ReducedMotion: Story = {
  args: {
    title: "Clean State",
    description: "No movement, crisp static layout.",
  },
};
