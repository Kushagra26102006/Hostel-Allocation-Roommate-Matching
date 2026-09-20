import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="block-a" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="block-a">Block A</TabsTrigger>
        <TabsTrigger value="block-b">Block B</TabsTrigger>
        <TabsTrigger value="block-c">Block C</TabsTrigger>
      </TabsList>
      <TabsContent value="block-a" className="p-4 text-sm text-muted">
        North Campus residence hall with 45 double occupancy rooms.
      </TabsContent>
      <TabsContent value="block-b" className="p-4 text-sm text-muted">
        South Campus hall with air conditioned single rooms.
      </TabsContent>
      <TabsContent value="block-c" className="p-4 text-sm text-muted">
        International student hall.
      </TabsContent>
    </Tabs>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <Tabs defaultValue="daily" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="daily">Daily View</TabsTrigger>
        <TabsTrigger value="weekly">Weekly View</TabsTrigger>
      </TabsList>
      <TabsContent value="daily" className="p-4 text-sm text-muted">
        Today's meal menu: Breakfast, Lunch, High Tea, Dinner.
      </TabsContent>
      <TabsContent value="weekly" className="p-4 text-sm text-muted">
        Full 7-day nutritional chart.
      </TabsContent>
    </Tabs>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[400px]">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="p-4 text-sm text-muted">
        Instant tab content switch without cross-fade.
      </TabsContent>
      <TabsContent value="settings" className="p-4 text-sm text-muted">
        Instant tab content.
      </TabsContent>
    </Tabs>
  ),
};
