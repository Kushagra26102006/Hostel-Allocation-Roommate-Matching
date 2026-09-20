import type { Meta, StoryObj } from "@storybook/react";
import { Stepper } from "@/components/stepper";
import { useMotionStore } from "@/stores/motion-store";

const meta: Meta<typeof Stepper> = {
  title: "Custom/Stepper",
  component: Stepper,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Stepper>;

const STEPS = ["Room Selection", "Profile Details", "Fee Payment", "Confirmation"];

export const Default: Story = {
  args: {
    steps: STEPS,
    currentStep: 1,
  },
};

export const Completed: Story = {
  args: {
    steps: STEPS,
    currentStep: 3,
  },
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  args: {
    steps: STEPS,
    currentStep: 2,
  },
};

export const ReducedMotion: Story = {
  decorators: [
    (StoryComponent: React.ComponentType) => {
      useMotionStore.setState({ reduceMotion: true });
      return <StoryComponent />;
    },
  ],
  args: {
    steps: STEPS,
    currentStep: 2,
  },
};
