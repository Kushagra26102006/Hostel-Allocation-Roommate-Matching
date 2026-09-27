/**
 * Centralized Design Token Definitions & Theme Configuration
 * HostelHub - Aurora Design Language
 */

export const themeConfig = {
  colors: {
    brand: {
      50: "hsl(var(--brand-50, 239 100% 97%))",
      100: "hsl(var(--brand-100, 241 100% 93%))",
      200: "hsl(var(--brand-200, 239 91% 85%))",
      300: "hsl(var(--brand-300, 240 84% 75%))",
      400: "hsl(var(--brand-400, 241 75% 66%))",
      500: "hsl(var(--brand-500, 241 68% 58%))",
      600: "hsl(var(--brand-600, 243 75% 49%))",
      700: "hsl(var(--brand-700, 243 74% 42%))",
      800: "hsl(var(--brand-800, 244 65% 35%))",
      900: "hsl(var(--brand-900, 243 56% 28%))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent, 262 83% 58%))",
      cyan: "hsl(var(--accent-cyan, 187 85% 53%))",
    },
    semantic: {
      success: "hsl(var(--success, 160 84% 39%))",
      warning: "hsl(var(--warning, 37 91% 55%))",
      danger: "hsl(var(--danger, 347 88% 50%))",
      info: "hsl(var(--info, 191 91% 37%))",
    },
    surface: {
      DEFAULT: "hsl(var(--surface))",
      muted: "hsl(var(--surface-muted))",
      background: "hsl(var(--background))",
      foreground: "hsl(var(--foreground))",
      border: "hsl(var(--border))",
    },
  },
  typography: {
    heading: 'var(--font-heading, "Plus Jakarta Sans", system-ui, sans-serif)',
    body: 'var(--font-body, "Inter", system-ui, sans-serif)',
    mono: 'var(--font-mono, "JetBrains Mono", monospace)',
  },
  radius: {
    sm: "var(--radius-sm, 8px)",
    md: "var(--radius-md, 12px)",
    lg: "var(--radius-lg, 16px)",
    xl: "var(--radius-xl, 20px)",
    "2xl": "var(--radius-2xl, 28px)",
    full: "var(--radius-full, 9999px)",
  },
  shadows: {
    sm: "var(--shadow-sm)",
    md: "var(--shadow-md)",
    lg: "var(--shadow-lg)",
    xl: "var(--shadow-xl)",
    aurora: "var(--shadow-aurora)",
  },
  animations: {
    duration: {
      fast: "150ms",
      normal: "250ms",
      slow: "400ms",
    },
    easing: {
      standard: "cubic-bezier(0.2, 0, 0, 1)",
      spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    },
  },
} as const;

export type ThemeConfig = typeof themeConfig;
