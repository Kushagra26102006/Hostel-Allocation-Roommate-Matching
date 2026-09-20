import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "@/components/ui/button";
import { useMotionStore } from "@/stores/motion-store";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["primary", "secondary", "ghost", "destructive", "outline", "link"],
    },
    size: {
      control: "select",
      options: ["sm", "default", "lg", "xl", "icon"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {
    children: "Primary Gradient Action",
    variant: "primary",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary Button",
    variant: "secondary",
  },
};

export const Destructive: Story = {
  args: {
    children: "Destructive Action",
    variant: "destructive",
  },
};

export const Dark: Story = {
  parameters: {
    theme: "dark",
  },
  render: () => (
    <div className="flex gap-3">
      <Button variant="primary">Primary Dark</Button>
      <Button variant="secondary">Secondary Dark</Button>
      <Button variant="ghost">Ghost Dark</Button>
      <Button variant="destructive">Destructive Dark</Button>
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
  args: {
    children: "Instant Response (Reduced Motion)",
    variant: "primary",
  },
};
