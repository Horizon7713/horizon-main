"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface AppContentShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppContentShell({
  children,
  className,
}: AppContentShellProps) {
  return (
    <div
      className={cn(
        "min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(39,39,42,0.75),rgba(9,9,11,1))] p-6",
        className
      )}
    >
      {children}
    </div>
  );
}