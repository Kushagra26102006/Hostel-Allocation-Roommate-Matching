import type { Meta, StoryObj } from "@storybook/react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { User, Settings, Bell, Shield } from "lucide-react";

const meta: Meta<typeof Command> = {
  title: "UI/Command",
  component: Command,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Command>;

export const Default: Story = {
  render: () => (
    <div className="w-[450px] border border-border rounded-card overflow-hidden">
      <Command>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem>
              <User className="mr-2 h-4 w-4" />
              <span>Resident Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <Bell className="mr-2 h-4 w-4" />
              <span>Gate Pass Requests</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <Shield className="mr-2 h-4 w-4" />
              <span>Security Curfews</span>
            </CommandItem>
            <CommandItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Preferences</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};

export const Dark: Story = {
  parameters: { theme: "dark" },
  render: () => (
    <div className="w-[450px] border border-border rounded-card overflow-hidden">
      <Command>
        <CommandInput placeholder="Search in dark mode..." />
        <CommandList>
          <CommandGroup heading="Options">
            <CommandItem>
              <User className="mr-2 h-4 w-4" />
              <span>Dark Item</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};

export const ReducedMotion: Story = {
  render: () => (
    <div className="w-[450px] border border-border rounded-card overflow-hidden">
      <Command>
        <CommandInput placeholder="Instant search..." />
        <CommandList>
          <CommandGroup heading="Options">
            <CommandItem>
              <span>Instant selection</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </div>
  ),
};
