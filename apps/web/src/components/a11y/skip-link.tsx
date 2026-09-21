"use client";

import React from "react";

export function SkipLink() {
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:inline-flex focus:items-center focus:rounded-xl focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-xs focus:font-bold focus:text-white focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-brand-400/50 transition-all"
    >
      Skip to main content
    </a>
  );
}
