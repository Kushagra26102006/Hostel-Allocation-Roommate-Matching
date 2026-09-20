import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Open Room Allocation Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Room Allocation</DialogTitle>
          <DialogDescription>
            You are assigning Room 304 (Double AC) to Student ID #2026-BCE.
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-muted py-2">
          An automated notification SMS will be dispatched to the resident and their parents.
        </p>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button variant="primary">Confirm Assignment</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Open Dark Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Dark Mode Modal</DialogTitle>
          <DialogDescription>Surface #0B1026 modal with backdrop blur overlay.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Reduced Motion Dialog</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Fade-in Dialog</DialogTitle>
          <DialogDescription>Dialog opening with instant/fade transition.</DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
};
