"use client";

import React from "react";

interface AppPageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function AppPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: AppPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 border-b border-zinc-800 bg-zinc-950 px-6 py-5 md:flex-row md:items-center md:justify-between">
      <div>
        {eyebrow ? <div className="app-section-header">{eyebrow}</div> : null}
        <div className="mt-1 app-title">{title}</div>
        {subtitle ? <div className="mt-1 app-subtitle">{subtitle}</div> : null}
      </div>

      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}