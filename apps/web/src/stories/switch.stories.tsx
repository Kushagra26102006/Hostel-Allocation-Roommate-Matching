import type { Meta, StoryObj } from "@storybook/react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Switch> = {
  title: "UI/Switch",
  component: Switch,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Switch>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-3">
      <Switch id="airplane-mode" defaultChecked />
      <Label htmlFor="airplane-mode">Night Curfew Verification</Label>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="flex items-center space-x-3">
      <Switch id="switch-dark" defaultChecked />
      <Label htmlFor="switch-dark">Push Notifications</Label>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="flex items-center space-x-3">
      <Switch id="switch-red" defaultChecked />
      <Label htmlFor="switch-red">Instant toggle without slide</Label>
    </div>
  ),
};
