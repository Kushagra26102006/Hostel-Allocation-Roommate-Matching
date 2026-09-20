import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useMotionStore } from "@/stores/motion-store";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Hostel Room 402</CardTitle>
        <CardDescription>Occupancy: 2/3 residents active</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">
          All utilities, air conditioning, and high-speed network are operational.
        </p>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" size="sm">Manage</Button>
        <Button variant="primary" size="sm">View Details</Button>
      </CardFooter>
    </Card>
  ),
};

export const GlassVariant: Story = {
  render: () => (
    <div className="p-8 bg-gradient-to-br from-brand-600/30 to-accent/30 rounded-hero">
      <Card variant="glass" className="w-[350px]">
        <CardHeader>
          <CardTitle>Glassmorphism Card</CardTitle>
          <CardDescription>With 12% fill + backdrop blur</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Tokens: --glass-fill, --glass-border, --glass-blur</p>
        </CardContent>
        <CardFooter>
          <Button variant="primary" size="sm">Action</Button>
        </CardFooter>
      </Card>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Dark Theme Card</CardTitle>
        <CardDescription>Surface #0B1026 with 4.5:1 text contrast</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">Token-driven background and text.</p>
      </CardContent>
      <CardFooter>
        <Button variant="primary" size="sm">Confirm</Button>
      </CardFooter>
    </Card>
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
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Reduced Motion Card</CardTitle>
        <CardDescription>No hover transform effects</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted">Motion transitions disabled.</p>
      </CardContent>
    </Card>
  ),
};
