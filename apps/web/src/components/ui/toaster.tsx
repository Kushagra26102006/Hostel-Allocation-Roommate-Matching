"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={(theme as "light" | "dark" | "system") || "system"}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast bg-surface border border-border text-text shadow-lg rounded-card",
          description: "text-muted",
          actionButton: "bg-brand-600 text-white",
          cancelButton: "bg-muted/20 text-muted",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
