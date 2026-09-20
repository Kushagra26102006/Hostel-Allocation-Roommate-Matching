import type { Meta, StoryObj } from "@storybook/react";
import { AnimatedNumber } from "@/components/animated-number";
import { useMotionStore } from "@/stores/motion-store";

const meta: Meta<typeof AnimatedNumber> = {
  title: "Custom/AnimatedNumber",
  component: AnimatedNumber,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof AnimatedNumber>;

export const Default: Story = {
  render: () => (
    <div className="text-3xl font-extrabold font-mono text-brand-600">
      <AnimatedNumber from={0} to={8450} format={(n) => `₹${n.toLocaleString()}`} />
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="text-3xl font-extrabold font-mono text-brand-400">
      <AnimatedNumber from={0} to={1280} format={(n) => `${n.toLocaleString()} Residents`} />
    </div>
  ),
};

export const ReducedMotion: Story = {
  decorators: [
    (StoryComponent: React.ComponentType) => {
      useMotionStore.setState({ reduceMotion: true });
      return <StoryComponent />;
    },
  ],
  render: () => (
    <div className="text-3xl font-extrabold font-mono text-brand-600">
      <AnimatedNumber from={0} to={5000} format={(n) => `₹${n.toLocaleString()} (Instant)`} />
    </div>
  ),
};
