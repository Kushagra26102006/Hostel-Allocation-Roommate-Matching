import type { Meta, StoryObj } from "@storybook/react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Checkbox> = {
  title: "UI/Checkbox",
  component: Checkbox,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms" defaultChecked />
      <Label htmlFor="terms">Accept hostel residency terms & conditions</Label>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms-dark" defaultChecked />
      <Label htmlFor="terms-dark">Dark theme checkbox</Label>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="flex items-center space-x-2">
      <Checkbox id="terms-red" defaultChecked />
      <Label htmlFor="terms-red">Instant check state</Label>
    </div>
  ),
};
