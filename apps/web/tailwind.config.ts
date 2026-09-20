import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/stories/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        brand: {
          50:  "hsl(var(--brand-50)  / <alpha-value>)",
          100: "hsl(var(--brand-100) / <alpha-value>)",
          200: "hsl(var(--brand-200) / <alpha-value>)",
          300: "hsl(var(--brand-300) / <alpha-value>)",
          400: "hsl(var(--brand-400) / <alpha-value>)",
          500: "hsl(var(--brand-500) / <alpha-value>)",
          600: "hsl(var(--brand-600) / <alpha-value>)",
          700: "hsl(var(--brand-700) / <alpha-value>)",
          800: "hsl(var(--brand-800) / <alpha-value>)",
          900: "hsl(var(--brand-900) / <alpha-value>)",
        },
        // Semantic
        accent:  "hsl(var(--accent)  / <alpha-value>)",
        info:    "hsl(var(--info)    / <alpha-value>)",
        success: "hsl(var(--success) / <alpha-value>)",
        warning: "hsl(var(--warning) / <alpha-value>)",
        danger:  "hsl(var(--danger)  / <alpha-value>)",
        // Surface
        surface:    "hsl(var(--surface)    / <alpha-value>)",
        background: "hsl(var(--background) / <alpha-value>)",
        text:       "hsl(var(--text)       / <alpha-value>)",
        muted:      "hsl(var(--muted)      / <alpha-value>)",
        border:     "hsl(var(--border)     / <alpha-value>)",
        input:      "hsl(var(--input)      / <alpha-value>)",
        ring:       "hsl(var(--ring)       / <alpha-value>)",
        // shadcn/ui aliases
        primary: {
          DEFAULT:    "hsl(var(--brand-600) / <alpha-value>)",
          foreground: "hsl(var(--brand-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT:    "hsl(var(--brand-100) / <alpha-value>)",
          foreground: "hsl(var(--brand-700) / <alpha-value>)",
        },
        destructive: {
          DEFAULT:    "hsl(var(--danger) / <alpha-value>)",
          foreground: "hsl(var(--danger-foreground) / <alpha-value>)",
        },
        card: {
          DEFAULT:    "hsl(var(--surface) / <alpha-value>)",
          foreground: "hsl(var(--text)    / <alpha-value>)",
        },
        popover: {
          DEFAULT:    "hsl(var(--surface) / <alpha-value>)",
          foreground: "hsl(var(--text)    / <alpha-value>)",
        },
      },
      borderRadius: {
        ctrl: "var(--radius-ctrl)",   // 12px — controls
        card: "var(--radius-card)",   // 20px — cards
        hero: "var(--radius-hero)",   // 28px — hero panels
        // Keep Tailwind defaults + add ours
        lg:  "var(--radius-ctrl)",
        md:  "calc(var(--radius-ctrl) - 2px)",
        sm:  "calc(var(--radius-ctrl) - 4px)",
      },
      boxShadow: {
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "system-ui", "sans-serif"],
        body:    ["var(--font-body)",    "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",    "ui-monospace", "monospace"],
        sans:    ["var(--font-body)",    "system-ui", "sans-serif"],
      },
      transitionDuration: {
        "100": "100ms",
        "180": "180ms",
        "280": "280ms",
        "480": "480ms",
        "800": "800ms",
      },
      transitionTimingFunction: {
        standard:   "cubic-bezier(0.2, 0, 0, 1)",
        emphasized: "cubic-bezier(0.05, 0.7, 0.1, 1)",
      },
      keyframes: {
        "gradient-shift": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%":      { backgroundPosition: "100% 50%" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%":   { transform: "scale(1)",    opacity: "1" },
          "100%": { transform: "scale(1.5)",  opacity: "0" },
        },
      },
      animation: {
        "gradient-shift":  "gradient-shift 6s ease infinite",
        "fade-in":         "fade-in var(--duration-280) var(--ease-standard) both",
        "fade-up":         "fade-up var(--duration-280) var(--ease-emphasized) both",
        "pulse-ring":      "pulse-ring 1.5s cubic-bezier(0.2, 0, 0.8, 1) infinite",
      },
    },
  },
  plugins: [],
};

export default config;
