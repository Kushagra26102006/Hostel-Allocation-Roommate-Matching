import type { Meta, StoryObj } from "@storybook/react";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Label> = {
  title: "UI/Label",
  component: Label,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Label>;

export const Default: Story = {
  args: {
    children: "Standard Field Label",
  },
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  args: {
    children: "Dark Theme Field Label",
  },
};

export const ReducedMotion: Story = {
  args: {
    children: "Accessible Label",
  },
};
