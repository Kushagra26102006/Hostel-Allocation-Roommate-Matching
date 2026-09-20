import type { Meta, StoryObj } from "@storybook/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Tooltip> = {
  title: "UI/Tooltip",
  component: Tooltip,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tooltip>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Curfew Hours</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Main gate closes at 10:30 PM sharp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="secondary">Dark Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Dark theme tooltip styling</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Instant Tooltip</Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>No scale or zoom animation</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
