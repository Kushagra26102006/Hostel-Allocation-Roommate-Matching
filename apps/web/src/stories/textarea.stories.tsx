import type { Meta, StoryObj } from "@storybook/react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Textarea> = {
  title: "UI/Textarea",
  component: Textarea,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Textarea>;

export const Default: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-textarea">Maintenance Feedback</Label>
      <Textarea id="demo-textarea" placeholder="Please provide specific details..." />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-ta-dark">Dark Theme Feedback</Label>
      <Textarea id="demo-ta-dark" placeholder="Dark textarea..." />
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="demo-ta-red">Textarea Field</Label>
      <Textarea id="demo-ta-red" placeholder="Static focus transition" />
    </div>
  ),
};
