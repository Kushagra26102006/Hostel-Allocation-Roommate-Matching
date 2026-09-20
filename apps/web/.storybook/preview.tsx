import type { Preview } from "@storybook/react";
import React from "react";
import { ThemeProvider } from "next-themes";
import "../src/app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      name: "Theme",
      description: "Global theme",
      defaultValue: "light",
      toolbar: {
        icon: "circlehollow",
        items: [
          { value: "light", icon: "sun", title: "Light" },
          { value: "dark", icon: "moon", title: "Dark" },
        ],
        showName: true,
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme =
        (context.parameters.theme as string) || (context.globals["theme"] as string) || "light";
      return React.createElement(
        ThemeProvider,
        { attribute: "class", forcedTheme: theme, defaultTheme: theme },
        React.createElement(
          "div",
          {
            className: `${theme === "dark" ? "dark " : ""}bg-background text-text min-h-[200px] p-6 font-sans`,
            style: { fontFamily: "Inter, system-ui, sans-serif" },
          },
          React.createElement(Story),
        ),
      );
    },
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      element: "#storybook-root",
      config: {},
      options: {},
    },
    backgrounds: { disable: true },
  },
};

export default preview;
