import type { Meta, StoryObj } from "@storybook/react";
import { GradientMesh } from "@/components/gradient-mesh";
import { useMotionStore } from "@/stores/motion-store";

const meta: Meta<typeof GradientMesh> = {
  title: "Custom/GradientMesh",
  component: GradientMesh,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GradientMesh>;

export const Default: Story = {
  render: () => (
    <div className="relative h-[300px] w-full overflow-hidden rounded-hero border border-border">
      <GradientMesh blobCount={4} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="font-heading font-bold text-2xl text-text">Animated Gradient Mesh</p>
      </div>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="relative h-[300px] w-full overflow-hidden rounded-hero border border-border bg-background">
      <GradientMesh blobCount={3} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="font-heading font-bold text-2xl text-text">Dark Theme Mesh</p>
      </div>
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
    <div className="relative h-[300px] w-full overflow-hidden rounded-hero border border-border">
      <GradientMesh blobCount={4} />
      <div className="relative z-10 flex h-full items-center justify-center">
        <p className="font-heading font-bold text-2xl text-text">
          Static Radial Gradient (Reduced Motion)
        </p>
      </div>
    </div>
  ),
};
