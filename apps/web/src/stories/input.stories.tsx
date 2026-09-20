import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-inp">Hostel Roll Number</Label>
      <Input id="demo-inp" placeholder="e.g. 23BCE1042" />
    </div>
  ),
};

export const Disabled: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-dis">Room Allocation (Locked)</Label>
      <Input id="demo-dis" disabled defaultValue="Room 102 - Ground Floor" />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-dark">Dark Mode Input</Label>
      <Input id="demo-dark" placeholder="Type here..." />
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-red">Input Field</Label>
      <Input id="demo-red" placeholder="Reduced motion focus" />
    </div>
  ),
};
