"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Command as CommandIcon,
  Palette,
  Sliders,
  Activity,
  Layers,
  Bell,
  Zap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { spring, stagger } from "@/lib/motion";
import { useMotionPreference } from "@/hooks/use-motion-preference";
import { useMotionStore } from "@/stores/motion-store";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Toaster } from "@/components/ui/toaster";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Custom Components
import { GradientMesh } from "@/components/gradient-mesh";
import { GlassCard } from "@/components/glass-card";
import { StatusChip } from "@/components/status-chip";
import { AnimatedNumber } from "@/components/animated-number";
import { Stepper } from "@/components/stepper";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { ThemeToggle } from "@/components/theme-toggle";

const COLOR_TOKENS = [
  {
    name: "Brand 600",
    token: "--brand-600",
    light: "#4338CA",
    dark: "#818CF8",
    bgClass: "bg-brand-600",
    textClass: "text-brand-600",
  },
  {
    name: "Accent",
    token: "--accent",
    light: "#7C3AED",
    dark: "#A78BFA",
    bgClass: "bg-accent",
    textClass: "text-accent",
  },
  {
    name: "Info",
    token: "--info",
    light: "#0891B2",
    dark: "#22D3EE",
    bgClass: "bg-info",
    textClass: "text-info",
  },
  {
    name: "Success",
    token: "--success",
    light: "#059669",
    dark: "#34D399",
    bgClass: "bg-success",
    textClass: "text-success",
  },
  {
    name: "Warning",
    token: "--warning",
    light: "#D97706",
    dark: "#FBBF24",
    bgClass: "bg-warning",
    textClass: "text-warning",
  },
  {
    name: "Danger",
    token: "--danger",
    light: "#E11D48",
    dark: "#FB7185",
    bgClass: "bg-danger",
    textClass: "text-danger",
  },
  {
    name: "Surface",
    token: "--surface",
    light: "#FFFFFF",
    dark: "#0B1026",
    bgClass: "bg-surface border border-border",
    textClass: "text-text",
  },
  {
    name: "Background",
    token: "--background",
    light: "#F8FAFC",
    dark: "#070B1F",
    bgClass: "bg-background border border-border",
    textClass: "text-text",
  },
  {
    name: "Text",
    token: "--text",
    light: "#0F172A",
    dark: "#E2E8F0",
    bgClass: "bg-text",
    textClass: "text-text",
  },
  {
    name: "Muted",
    token: "--muted",
    light: "#475569",
    dark: "#94A3B8",
    bgClass: "bg-muted",
    textClass: "text-muted",
  },
];

export function DesignShowcaseClient() {
  const { prefersReducedMotion } = useMotionPreference();
  const { reduceMotion, setReduceMotion } = useMotionStore();

  const [activeStep, setActiveStep] = React.useState(1);
  const [animatedKey, setAnimatedKey] = React.useState(0);
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [progressVal, setProgressVal] = React.useState(68);

  // Keyboard shortcut for command palette: Cmd+K / Ctrl+K
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <TooltipProvider>
      <div className="relative min-h-screen bg-background text-text selection:bg-brand-500/20">
        {/* Background gradient mesh */}
        <GradientMesh blobCount={4} className="opacity-70" />

        {/* Global Toaster */}
        <Toaster />

        {/* Sticky Page Header */}
        <PageHeader
          title="HostelHub Design System"
          description="Live specification, design tokens, primitives, and custom components"
          breadcrumb={[
            { label: "HostelHub", href: "/" },
            { label: "Design System", href: "/design" },
          ]}
          actions={
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 hidden md:inline-flex text-xs"
                onClick={() => setCommandOpen(true)}
              >
                <CommandIcon className="h-3.5 w-3.5" />
                <span>Quick Search</span>
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border border-border bg-muted/20 px-1.5 font-mono text-[10px] font-medium text-muted">
                  ⌘K
                </kbd>
              </Button>
              <ThemeToggle />
            </div>
          }
        />

        <main className="container mx-auto px-4 py-8 max-w-7xl space-y-16 relative z-10">
          {/* Hero Banner with Glass card */}
          <GlassCard className="p-8 md:p-10 border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs font-semibold">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>HostelHub v1.0 Design Tokens & Components</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-heading font-extrabold tracking-tight">
                  Design System & Component Library
                </h2>
                <p className="text-muted text-sm md:text-base leading-relaxed">
                  Unified visual language with WCAG 2.1 AA compliance (contrast &gt; 4.5:1 text,
                  &gt; 3:1 UI), fluid clamp() typography, dark mode via next-themes, accessible
                  motion reduction, and token-driven styles.
                </p>
              </div>

              {/* Reduced Motion Setting Box */}
              <div className="bg-surface/80 border border-border rounded-ctrl p-4 md:min-w-[280px] space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-warning" />
                    <span className="text-xs font-bold uppercase tracking-wider text-muted">
                      Motion Preference
                    </span>
                  </div>
                  <Badge
                    variant={prefersReducedMotion ? "warning" : "success"}
                    className="text-[10px]"
                  >
                    {prefersReducedMotion ? "Reduced Active" : "Full Motion"}
                  </Badge>
                </div>
                <p className="text-xs text-muted">
                  Current state:{" "}
                  <strong className="text-text">
                    {prefersReducedMotion ? "Reduced Motion" : "Normal Motion"}
                  </strong>
                  {reduceMotion === null ? " (Following OS)" : " (In-App Override)"}
                </p>
                <div className="flex gap-1.5 pt-1">
                  <Button
                    size="sm"
                    variant={reduceMotion === null ? "primary" : "outline"}
                    className="text-xs h-7 flex-1"
                    onClick={() => setReduceMotion(null)}
                  >
                    OS Auto
                  </Button>
                  <Button
                    size="sm"
                    variant={reduceMotion === true ? "primary" : "outline"}
                    className="text-xs h-7 flex-1"
                    onClick={() => setReduceMotion(true)}
                  >
                    Reduce
                  </Button>
                  <Button
                    size="sm"
                    variant={reduceMotion === false ? "primary" : "outline"}
                    className="text-xs h-7 flex-1"
                    onClick={() => setReduceMotion(false)}
                  >
                    Allow
                  </Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* SECTION 1: DESIGN TOKENS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Palette className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              <h2 className="text-2xl font-heading font-bold">1. Design Tokens</h2>
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold font-heading text-text">
                Color Palette (HSL Custom Properties)
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {COLOR_TOKENS.map((col) => (
                  <div
                    key={col.token}
                    className="rounded-card border border-border bg-surface p-3 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={cn("h-16 w-full rounded-ctrl shadow-inner", col.bgClass)} />
                    <div>
                      <p className="font-semibold text-sm">{col.name}</p>
                      <p className="font-mono text-xs text-muted">{col.token}</p>
                      <div className="flex justify-between text-[11px] text-muted pt-1 mt-1 border-t border-border">
                        <span>
                          L: <span className="font-mono">{col.light}</span>
                        </span>
                        <span>
                          D: <span className="font-mono">{col.dark}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Typography Scale */}
            <div className="space-y-3 pt-4">
              <h3 className="text-base font-semibold font-heading text-text">
                Typography (Fluid clamp scale & families)
              </h3>
              <div className="rounded-card border border-border bg-surface p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4 border-b border-border">
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase">Headings</p>
                    <p className="font-heading text-xl font-bold text-brand-600 dark:text-brand-400">
                      Plus Jakarta Sans
                    </p>
                    <p className="text-xs text-muted mt-1">Self-hosted with next/font/google</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase">Body</p>
                    <p className="font-body text-xl text-text">Inter Sans</p>
                    <p className="text-xs text-muted mt-1">High readability neutral grotesque</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted uppercase">Identifiers & Code</p>
                    <p className="font-mono text-xl text-accent">JetBrains Mono</p>
                    <p className="text-xs text-muted mt-1">For IDs, badges, timestamps, code</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted font-mono">
                      h1 · clamp(2.25rem, 5vw + 1rem, 3.75rem)
                    </p>
                    <h1 className="font-heading text-4xl font-extrabold text-text">
                      The Complete Hostel Life OS
                    </h1>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-mono">
                      h2 · clamp(1.875rem, 4vw + 0.75rem, 2.75rem)
                    </p>
                    <h2 className="font-heading text-3xl font-bold text-text">
                      Modern Student Housing Reimagined
                    </h2>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-mono">
                      h3 · clamp(1.5rem, 3vw + 0.5rem, 2rem)
                    </p>
                    <h3 className="font-heading text-2xl font-semibold text-text">
                      Real-time room allocations & complaints
                    </h3>
                  </div>
                  <div>
                    <p className="text-xs text-muted font-mono">Body Regular · 1rem (16px)</p>
                    <p className="text-text max-w-3xl leading-relaxed">
                      HostelHub enables university campuses and private residences to seamlessly
                      manage resident allocations, gate passes, maintenance issues, meal rosters,
                      and communications with sub-second feedback.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Radius, Shadows & Glass */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
              {/* Radii */}
              <div className="rounded-card border border-border bg-surface p-5 space-y-3">
                <h4 className="font-semibold text-sm font-heading">Border Radii</h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-ctrl text-center font-mono">
                    rounded-ctrl (12px) · Controls & Inputs
                  </div>
                  <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-card text-center font-mono">
                    rounded-card (20px) · Cards & Panels
                  </div>
                  <div className="p-3 bg-brand-500/10 border border-brand-500/30 rounded-hero text-center font-mono">
                    rounded-hero (28px) · Hero Containers
                  </div>
                </div>
              </div>

              {/* Shadows */}
              <div className="rounded-card border border-border bg-surface p-5 space-y-3">
                <h4 className="font-semibold text-sm font-heading">Elevation Shadows</h4>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-surface border border-border rounded-ctrl text-center font-mono shadow-sm">
                    shadow-sm · Subtle Card Outline
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-ctrl text-center font-mono shadow-md">
                    shadow-md · Dropdowns & Menus
                  </div>
                  <div className="p-3 bg-surface border border-border rounded-ctrl text-center font-mono shadow-lg">
                    shadow-lg · Modals & Dialogs
                  </div>
                </div>
              </div>

              {/* Motion Tokens */}
              <div className="rounded-card border border-border bg-surface p-5 space-y-3">
                <h4 className="font-semibold text-sm font-heading">Motion Tokens</h4>
                <div className="space-y-2 text-xs font-mono text-muted">
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Durations:</span>
                    <span>100, 180, 280, 480, 800 ms</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Easing Standard:</span>
                    <span>cubic-bezier(0.2, 0, 0, 1)</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Easing Emphasized:</span>
                    <span>cubic-bezier(0.05, 0.7, 0.1, 1)</span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-1">
                    <span>Spring:</span>
                    <span>
                      stiffness {spring.stiffness}, damping {spring.damping}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stagger:</span>
                    <span>{stagger} ms</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: SHADCN/UI COMPONENTS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Layers className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              <h2 className="text-2xl font-heading font-bold">2. shadcn/ui Restyled Components</h2>
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <h3 className="text-base font-semibold font-heading text-text">Buttons & Actions</h3>
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary">Primary Gradient</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="link">Link</Button>
                <Button variant="primary" size="sm">
                  Small
                </Button>
                <Button variant="primary" size="lg">
                  Large
                </Button>
                <Button variant="primary" size="icon" aria-label="Quick action">
                  <Zap className="h-4 w-4" />
                </Button>
                <Button variant="primary" disabled>
                  Disabled
                </Button>
              </div>
            </div>

            {/* Cards & Glass Variant */}
            <div className="space-y-3 pt-2">
              <h3 className="text-base font-semibold font-heading text-text">
                Cards & Glass Variant
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Standard Surface Card</CardTitle>
                    <CardDescription>Default token-based elevation and border</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">
                      Clean background surface with border-border tokens.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="outline" size="sm">
                      Manage
                    </Button>
                  </CardFooter>
                </Card>
                <Card variant="glass">
                  <CardHeader>
                    <CardTitle>Glass Variant Card</CardTitle>
                    <CardDescription>--glass-fill, --glass-border & backdrop blur</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted">
                      Subtle frosted glass appearance over gradient backgrounds.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="primary" size="sm">
                      Explore
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </div>

            {/* Form Controls */}
            <div className="space-y-3 pt-4">
              <h3 className="text-base font-semibold font-heading text-text">Form Controls</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Input & Label */}
                <div className="rounded-card border border-border bg-surface p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-name">Student Full Name</Label>
                    <Input id="demo-name" placeholder="e.g. Alex Morgan" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-email">University Email</Label>
                    <Input id="demo-email" type="email" placeholder="alex@university.edu" />
                  </div>
                </div>

                {/* Select & Textarea */}
                <div className="rounded-card border border-border bg-surface p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="hostel-block">Hostel Block</Label>
                    <Select defaultValue="block-a">
                      <SelectTrigger id="hostel-block">
                        <SelectValue placeholder="Select block" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="block-a">Block A (North Hall)</SelectItem>
                        <SelectItem value="block-b">Block B (South Hall)</SelectItem>
                        <SelectItem value="block-c">Block C (International)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="demo-notes">Maintenance Request</Label>
                    <Textarea
                      id="demo-notes"
                      placeholder="Describe the issue with the AC or plumbing..."
                      rows={2}
                    />
                  </div>
                </div>

                {/* Switch & Checkbox */}
                <div className="rounded-card border border-border bg-surface p-5 space-y-5 flex flex-col justify-center">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="demo-switch" className="cursor-pointer">
                      Emergency Alert Notifications
                    </Label>
                    <Switch id="demo-switch" defaultChecked />
                  </div>
                  <div className="flex items-center gap-3">
                    <Checkbox id="demo-checkbox" defaultChecked />
                    <Label htmlFor="demo-checkbox" className="cursor-pointer">
                      I agree to the Hostel Regulations & Curfew Policy
                    </Label>
                  </div>
                </div>
              </div>
            </div>

            {/* Overlays: Dialog, Sheet, Tooltip, Sonner Toasts */}
            <div className="space-y-3 pt-4">
              <h3 className="text-base font-semibold font-heading text-text">
                Overlays, Modals & Drawers
              </h3>
              <div className="flex flex-wrap gap-4 items-center">
                {/* Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="primary">Open Dialog</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Gate Pass Approval</DialogTitle>
                      <DialogDescription>
                        Confirm resident leave request for Weekend Outstation (2 nights).
                      </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-2 text-sm text-muted">
                      <p>• Destination: Home City (Direct Train)</p>
                      <p>• Parent verification: Confirmed via SMS OTP</p>
                    </div>
                    <DialogFooter>
                      <Button
                        variant="primary"
                        onClick={() => toast.success("Gate pass issued successfully!")}
                      >
                        Approve Pass
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Sheet (Drawer) */}
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="secondary">Open Sheet (Drawer)</Button>
                  </SheetTrigger>
                  <SheetContent side="right">
                    <SheetHeader>
                      <SheetTitle>Resident Profile</SheetTitle>
                      <SheetDescription>
                        Viewing complete occupancy details and past incident log.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="py-6 space-y-4 text-sm">
                      <div className="p-4 rounded-ctrl border border-border bg-surface/50">
                        <p className="font-semibold text-text">Room 304-B</p>
                        <p className="text-muted text-xs">Deluxe Triple Occupancy</p>
                      </div>
                      <StatusChip status="online" label="Currently on Campus" />
                    </div>
                    <SheetFooter>
                      <Button variant="outline" className="w-full">
                        Close Drawer
                      </Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>

                {/* Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline">Hover for Tooltip</Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Security encryption active (AES-256-GCM)</p>
                  </TooltipContent>
                </Tooltip>

                {/* Sonner Toasts */}
                <Button
                  variant="primary"
                  onClick={() =>
                    toast.success("HostelHub System Notification", {
                      description: "Mess meal menu for dinner has been published.",
                      action: {
                        label: "View Menu",
                        onClick: () => console.log("Menu clicked"),
                      },
                    })
                  }
                >
                  Trigger Toast
                </Button>

                {/* Command Palette Trigger */}
                <Button variant="secondary" className="gap-2" onClick={() => setCommandOpen(true)}>
                  <CommandIcon className="h-4 w-4" />
                  <span>Open Command Palette</span>
                </Button>
              </div>
            </div>

            {/* Tabs, Accordion, Progress, Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4">
              {/* Tabs */}
              <div className="rounded-card border border-border bg-surface p-5 space-y-4">
                <h4 className="font-semibold text-sm font-heading">Tabs Component</h4>
                <Tabs defaultValue="overview" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="amenities">Amenities</TabsTrigger>
                    <TabsTrigger value="rules">House Rules</TabsTrigger>
                  </TabsList>
                  <TabsContent value="overview" className="space-y-2 pt-3 text-sm text-muted">
                    <p>
                      HostelHub Central Campus features 120 rooms across 4 wings with high-speed
                      1Gbps fiber WiFi.
                    </p>
                  </TabsContent>
                  <TabsContent value="amenities" className="space-y-2 pt-3 text-sm text-muted">
                    <p>
                      Gym, Study lounge, 24/7 laundry station, rooftop cafeteria, and biometric
                      access.
                    </p>
                  </TabsContent>
                  <TabsContent value="rules" className="space-y-2 pt-3 text-sm text-muted">
                    <p>
                      Strict quiet hours between 11:00 PM and 6:00 AM. Guest registration mandatory.
                    </p>
                  </TabsContent>
                </Tabs>
              </div>

              {/* Accordion */}
              <div className="rounded-card border border-border bg-surface p-5 space-y-4">
                <h4 className="font-semibold text-sm font-heading">Accordion Component</h4>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>How are room switch requests handled?</AccordionTrigger>
                    <AccordionContent>
                      Residents can file mutual swap or medical switch requests directly in the app
                      during the first 14 days of the semester.
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-2">
                    <AccordionTrigger>What happens during campus emergencies?</AccordionTrigger>
                    <AccordionContent>
                      The warden broadcasts an instant push alert with evacuation routing
                      instructions to all resident dashboards.
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            </div>

            {/* Badges, Progress & Skeleton */}
            <div className="rounded-card border border-border bg-surface p-5 space-y-6">
              <div className="space-y-3">
                <h4 className="font-semibold text-sm font-heading">Badges (Semantic Tokens)</h4>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="success">Active (Success)</Badge>
                  <Badge variant="warning">Pending (Warning)</Badge>
                  <Badge variant="info">Verified (Info)</Badge>
                  <Badge variant="destructive">Suspended (Destructive)</Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span>Hostel Occupancy Capacity</span>
                    <span className="font-mono">{progressVal}%</span>
                  </div>
                  <Progress value={progressVal} />
                  <div className="flex gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setProgressVal(25)}
                    >
                      25%
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setProgressVal(68)}
                    >
                      68%
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setProgressVal(100)}
                    >
                      100%
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted">Skeleton Loading States</p>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 3: CUSTOM COMPONENTS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <Sliders className="h-6 w-6 text-brand-600 dark:text-brand-400" />
              <h2 className="text-2xl font-heading font-bold">3. Custom Components</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* GlassCard with Cursor-Spotlight */}
              <GlassCard className="p-6 space-y-3" spotlight={true}>
                <div className="h-8 w-8 rounded-ctrl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  <Sparkles className="h-4 w-4" />
                </div>
                <h4 className="font-heading font-bold text-base">GlassCard with Spotlight</h4>
                <p className="text-xs text-muted leading-relaxed">
                  Move your mouse across this card! A subtle radial spotlight follows the cursor
                  position. When reduced motion is enabled, the spotlight automatically disables.
                </p>
              </GlassCard>

              {/* StatusChips */}
              <div className="rounded-card border border-border bg-surface p-6 space-y-4">
                <h4 className="font-heading font-bold text-base">
                  StatusChip (Icon + Text + Color)
                </h4>
                <p className="text-xs text-muted">Never color alone (WCAG 1.4.1 compliant):</p>
                <div className="flex flex-wrap gap-2">
                  <StatusChip status="online" />
                  <StatusChip status="offline" />
                  <StatusChip status="pending" />
                  <StatusChip status="warning" />
                  <StatusChip status="error" />
                  <StatusChip status="success" />
                </div>
              </div>

              {/* AnimatedNumber */}
              <div className="rounded-card border border-border bg-surface p-6 space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-heading font-bold text-base">
                    AnimatedNumber (Spring Count-up)
                  </h4>
                  <p className="text-xs text-muted mb-4">
                    Spring physics count-up animation, instant on reduced motion.
                  </p>
                  <div className="text-3xl font-extrabold font-mono text-brand-600 dark:text-brand-400">
                    <AnimatedNumber
                      key={animatedKey}
                      from={0}
                      to={14280}
                      format={(n) => `₹${n.toLocaleString()}`}
                    />
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() => setAnimatedKey((k) => k + 1)}
                >
                  Replay Count Animation
                </Button>
              </div>
            </div>

            {/* Stepper Component */}
            <div className="rounded-card border border-border bg-surface p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-heading font-bold text-base">Stepper (Progress Bar Morph)</h4>
                  <p className="text-xs text-muted">
                    Horizontal step indicator with animated connector line morphing
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={activeStep === 0}
                    onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={activeStep === 3}
                    onClick={() => setActiveStep((s) => Math.min(3, s + 1))}
                  >
                    Next Step
                  </Button>
                </div>
              </div>
              <Stepper
                steps={["Room Selection", "Profile Details", "Fee Payment", "Confirmation"]}
                currentStep={activeStep}
              />
            </div>

            {/* Empty State Component */}
            <div className="rounded-card border border-border bg-surface overflow-hidden">
              <EmptyState
                icon={<Bell className="h-8 w-8" />}
                title="No Pending Disciplinary Actions"
                description="All resident logs are clean and up-to-date for this academic term."
                action={{
                  label: "View Archived History",
                  onClick: () => toast.info("Viewing archives"),
                }}
              />
            </div>
          </section>

          {/* Command Dialog (Palette) */}
          <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
            <CommandInput placeholder="Type a command or search tokens..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Design Tokens">
                <CommandItem
                  onSelect={() => {
                    toast.info("Brand 600: #4338CA");
                    setCommandOpen(false);
                  }}
                >
                  <Palette className="h-4 w-4 mr-2" />
                  <span>Inspect Brand Colors</span>
                  <CommandShortcut>⌘B</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    toast.info("Motion Tokens active");
                    setCommandOpen(false);
                  }}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  <span>Check Motion Tokens</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Components">
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                  }}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  <span>Button Variants</span>
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setCommandOpen(false);
                  }}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  <span>GlassCard Spotlight</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </CommandDialog>
        </main>
      </div>
    </TooltipProvider>
  );
}
