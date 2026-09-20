import type { Meta, StoryObj } from "@storybook/react";
import { ThemeToggle } from "@/components/theme-toggle";

const meta: Meta<typeof ThemeToggle> = {
  title: "Custom/ThemeToggle",
  component: ThemeToggle,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ThemeToggle>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <span className="text-sm text-muted">Click icon to toggle theme</span>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <span className="text-sm text-muted">Currently in Dark mode</span>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <ThemeToggle />
      <span className="text-sm text-muted">Toggle with reduced motion</span>
    </div>
  ),
};
