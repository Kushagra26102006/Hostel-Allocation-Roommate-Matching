import type { Meta, StoryObj } from "@storybook/react";
import { Progress } from "@/components/ui/progress";

const meta: Meta<typeof Progress> = {
  title: "UI/Progress",
  component: Progress,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Progress>;

export const Default: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <div className="flex justify-between text-xs font-semibold">
        <span>Hostel Capacity</span>
        <span>75%</span>
      </div>
      <Progress value={75} />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="w-80 space-y-2">
      <div className="flex justify-between text-xs font-semibold">
        <span>Mess Quota Used</span>
        <span>40%</span>
      </div>
      <Progress value={40} />
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <div className="flex justify-between text-xs font-semibold">
        <span>Static Progress</span>
        <span>90%</span>
      </div>
      <Progress value={90} />
    </div>
  ),
};
