import type { Meta, StoryObj } from "@storybook/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const meta: Meta<typeof Select> = {
  title: "UI/Select",
  component: Select,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Select>;

export const Default: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="room-select">Room Category</Label>
      <Select defaultValue="ac-single">
        <SelectTrigger id="room-select">
          <SelectValue placeholder="Select room type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ac-single">Single Occupancy (Air Conditioned)</SelectItem>
          <SelectItem value="ac-double">Double Sharing (Air Conditioned)</SelectItem>
          <SelectItem value="non-ac-double">Double Sharing (Standard)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="hostel-sel-dark">Hostel Wing</Label>
      <Select defaultValue="wing-a">
        <SelectTrigger id="hostel-sel-dark">
          <SelectValue placeholder="Select wing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wing-a">Wing A (East)</SelectItem>
          <SelectItem value="wing-b">Wing B (West)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="w-80 space-y-2">
      <Label htmlFor="hostel-sel-red">Hostel Wing</Label>
      <Select defaultValue="wing-a">
        <SelectTrigger id="hostel-sel-red">
          <SelectValue placeholder="Select wing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="wing-a">Wing A (East)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  ),
};
