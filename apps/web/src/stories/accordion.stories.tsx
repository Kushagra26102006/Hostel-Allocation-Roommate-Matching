import type { Meta, StoryObj } from "@storybook/react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const meta: Meta<typeof Accordion> = {
  title: "UI/Accordion",
  component: Accordion,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Accordion>;

export const Default: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>What are visiting hours?</AccordionTrigger>
        <AccordionContent>
          Guests are permitted in the central lobby between 9:00 AM and 8:00 PM with valid identity
          proof.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Can I change my assigned room?</AccordionTrigger>
        <AccordionContent>
          Mutual transfers are open during the initial 2 weeks of the semester via the portal.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <Accordion type="single" collapsible className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Dark Theme Accordion</AccordionTrigger>
        <AccordionContent>
          Styled with dark theme token colors and seamless contrast.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <Accordion type="single" collapsible className="w-[400px]">
      <AccordionItem value="item-1">
        <AccordionTrigger>Instant Accordion</AccordionTrigger>
        <AccordionContent>Accordion item without slide morph.</AccordionContent>
      </AccordionItem>
    </Accordion>
  ),
};
