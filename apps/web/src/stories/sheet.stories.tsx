import type { Meta, StoryObj } from "@storybook/react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof Sheet> = {
  title: "UI/Sheet",
  component: Sheet,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Sheet>;

export const Default: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="primary">Open Drawer</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Hostel Inventory Details</SheetTitle>
          <SheetDescription>
            Inspect current room mattress, study table, and key allocations.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4 text-sm text-muted">All items verified upon semester check-in.</div>
      </SheetContent>
    </Sheet>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="secondary">Dark Drawer</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Dark Drawer Header</SheetTitle>
          <SheetDescription>Dark themed drawer overlay</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Reduced Motion Drawer</Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Instant Drawer</SheetTitle>
          <SheetDescription>Drawer without slide transition</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  ),
};
