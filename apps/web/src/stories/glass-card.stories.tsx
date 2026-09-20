import type { Meta, StoryObj } from "@storybook/react";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { useMotionStore } from "@/stores/motion-store";
import { Sparkles } from "lucide-react";

const meta: Meta<typeof GlassCard> = {
  title: "Custom/GlassCard",
  component: GlassCard,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GlassCard>;

export const Default: Story = {
  render: () => (
    <div className="p-12 bg-gradient-to-tr from-brand-600/40 via-accent/30 to-info/20 rounded-hero">
      <GlassCard className="p-6 max-w-md space-y-4" spotlight={true}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-ctrl bg-brand-500/20 text-brand-600 dark:text-brand-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <h3 className="font-heading font-bold text-lg">Cursor Spotlight GlassCard</h3>
        </div>
        <p className="text-sm text-muted">
          Hover over this card to see the radial cursor spotlight effect following the pointer.
        </p>
        <Button variant="primary" size="sm">
          Interactive Action
        </Button>
      </GlassCard>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="p-12 bg-gradient-to-tr from-brand-900/40 via-surface to-background rounded-hero">
      <GlassCard className="p-6 max-w-md space-y-4" spotlight={true}>
        <h3 className="font-heading font-bold text-lg text-text">Dark GlassCard</h3>
        <p className="text-sm text-muted">Spotlight tuned with dark mode token opacity.</p>
        <Button variant="secondary" size="sm">
          Action
        </Button>
      </GlassCard>
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
    <div className="p-12 bg-gradient-to-tr from-brand-600/30 to-accent/30 rounded-hero">
      <GlassCard className="p-6 max-w-md space-y-4" spotlight={true}>
        <h3 className="font-heading font-bold text-lg">Spotlight Disabled</h3>
        <p className="text-sm text-muted">
          When reduced motion is active, the cursor spotlight effect is automatically removed.
        </p>
      </GlassCard>
    </div>
  ),
};
