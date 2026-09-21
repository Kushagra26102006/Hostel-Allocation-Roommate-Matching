"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function RouteAnnouncer() {
  const pathname = usePathname();
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    // Wait for Next.js to update document title
    const timer = setTimeout(() => {
      const pageTitle = document.title || pathname;
      setAnnouncement(`Navigated to ${pageTitle}`);

      // Reset focus to main content container if available
      const mainContent = document.getElementById("main-content");
      if (mainContent) {
        mainContent.focus({ preventScroll: true });
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [pathname]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only pointer-events-none fixed top-0 left-0 h-0 w-0 overflow-hidden"
    >
      {announcement}
    </div>
  );
}
