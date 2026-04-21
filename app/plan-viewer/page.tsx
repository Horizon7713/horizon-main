"use client";

import Link from "next/link";
import React, { useEffect, useRef } from "react";
import {
  ArrowLeft,
  Calendar,
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
} from "lucide-react";
import { MarkupsListTable } from "@/components/pdf-viewer/markups-list-table";
import { PageThumbnailTray } from "@/components/pdf-viewer/page-thumbnail-tray";
import { PdfCanvasViewer } from "@/components/pdf-viewer/pdf-canvas-viewer";
import { PdfUploadBar } from "@/components/pdf-viewer/pdf-upload-bar";
import { PropertiesPanel } from "@/components/pdf-viewer/properties-panel";
import { QrPanel } from "@/components/pdf-viewer/qr-panel";
import { RegionsList } from "@/components/pdf-viewer/regions-list";
import { ScaleCalibrationDialog } from "@/components/pdf-viewer/scale-calibration-dialog";
import { SidebarPanels } from "@/components/pdf-viewer/sidebar-panels";
import { TakeoffTable } from "@/components/pdf-viewer/takeoff-table";
import { ToolRail } from "@/components/pdf-viewer/tool-rail";
import { PdfViewerProvider, usePdfViewer } from "@/lib/pdf-viewer-context";
import { loadPdfMarkups } from "@/lib/pdf-persistence-service";

function TabButton({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex h-10 items-center rounded-xl border px-3 text-sm font-medium transition-all",
        active
          ? "border-amber-500/30 bg-zinc-900 text-white shadow-[0_0_24px_rgba(245,158,11,0.10)]"
          : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900 hover:text-white",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function WorkspaceNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-10 items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

function PlanViewerScreen() {
  const {
    state,
    setActiveTool,
    setCurrentPage,
    setPageCount,
    setSidebarTab,
    setProjectName,
    setMarkups,
    setRegions,
    setFileName,
    setPdfSource,
  } = usePdfViewer();

  const didSeedRef = useRef(false);

  useEffect(() => {
    if (didSeedRef.current) return;
    didSeedRef.current = true;
    setProjectName("Lowe Residence - Material Intelligence Workspace");
  }, [setProjectName]);

  useEffect(() => {
    if (!state.document.pdfFileId) return;

    let cancelled = false;

    loadPdfMarkups(state.document.pdfFileId)
      .then((result) => {
        if (cancelled) return;
        setRegions(result.regions);
        setMarkups(result.markups);
      })
      .catch((error) => {
        const message =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : JSON.stringify(error, null, 2);

        console.error("Failed to load persisted markups:", message);
      });

    return () => {
      cancelled = true;
    };
  }, [state.document.pdfFileId, setMarkups, setRegions]);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-black text-white">
      {state.ui.leftSidebarOpen ? (
        <aside className="hidden w-[17rem] shrink-0 border-r border-zinc-800 bg-zinc-950 xl:flex xl:flex-col">
          <div className="border-b border-zinc-800 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Pages
            </div>
            <div className="mt-2 text-sm font-semibold text-white">Drawing Set</div>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden">
            <PageThumbnailTray
              isOpen
              pdfUrl={state.document.pdfUrl}
              totalPages={state.document.pageCount}
              currentPageIndex={state.document.currentPageIndex}
              onPageSelect={setCurrentPage}
              onPageCountDetected={setPageCount}
            />
          </div>
        </aside>
      ) : null}

      <aside className="hidden w-[5.5rem] shrink-0 border-r border-zinc-800 bg-zinc-950 md:flex md:flex-col">
        <div className="border-b border-zinc-800 px-3 py-3">
          <div className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
            Tools
          </div>
        </div>

        <div className="flex min-h-0 flex-1 justify-center overflow-hidden px-2 py-3">
          <ToolRail
            activeTool={state.ui.activeTool}
            onToolChange={(tool) => {
              setActiveTool(tool);

              if (tool === "region-rectangle") {
                setSidebarTab("regions");
              } else if (
                tool === "measure-length" ||
                tool === "measure-area" ||
                tool === "measure-count"
              ) {
                setSidebarTab("takeoffs");
              } else {
                setSidebarTab("properties");
              }
            }}
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="border-b border-zinc-800 bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-zinc-800 bg-black text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-100"
                aria-label="Back to dashboard"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="min-w-0">
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Plan Viewer
                </div>
                <div className="mt-1 truncate text-lg font-semibold text-white">
                  {state.document.projectName}
                </div>
                <div className="mt-1 truncate text-sm text-zinc-400">
                  {state.document.fileName || "No drawing loaded"}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <WorkspaceNavLink
                href="/dashboard"
                label="Dashboard"
                icon={LayoutDashboard}
              />
              <WorkspaceNavLink
                href="/project_data"
                label="Projects"
                icon={FolderKanban}
              />
              <WorkspaceNavLink
                href="/messages"
                label="Messages"
                icon={MessageSquare}
              />
              <WorkspaceNavLink
                href="/calendar"
                label="Calendar"
                icon={Calendar}
              />

              <PdfUploadBar
                onUploaded={({ fileName, objectKey, fileUrl }) => {
                  setFileName(fileName);
                  setPdfSource({
                    pdfObjectKey: objectKey,
                    pdfUrl: fileUrl ?? undefined,
                  });
                  setCurrentPage(0);
                }}
              />

              <TabButton
                active={state.ui.activeSidebarTab === "properties"}
                onClick={() => setSidebarTab("properties")}
              >
                Properties
              </TabButton>
              <TabButton
                active={state.ui.activeSidebarTab === "markups"}
                onClick={() => setSidebarTab("markups")}
              >
                Markups
              </TabButton>
              <TabButton
                active={state.ui.activeSidebarTab === "regions"}
                onClick={() => setSidebarTab("regions")}
              >
                Zones
              </TabButton>
              <TabButton
                active={state.ui.activeSidebarTab === "takeoffs"}
                onClick={() => setSidebarTab("takeoffs")}
              >
                Takeoffs
              </TabButton>
              <TabButton
                active={state.ui.activeSidebarTab === "qr"}
                onClick={() => setSidebarTab("qr")}
              >
                QR
              </TabButton>
            </div>
          </div>
        </div>

        <div className="min-h-0 flex-1 bg-[#0d1118] p-4">
          <div className="flex h-full min-h-0 overflow-hidden rounded-[1rem] border border-zinc-800 bg-[#090d14] shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <PdfCanvasViewer />
          </div>
        </div>
      </main>

      {state.ui.rightSidebarOpen ? (
        <aside className="w-[24rem] shrink-0 border-l border-zinc-800 bg-zinc-950">
          <div className="border-b border-zinc-800 px-4 py-4">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
              Inspector
            </div>
            <div className="mt-2 text-sm font-semibold capitalize text-white">
              {state.ui.activeSidebarTab}
            </div>
          </div>

          <div className="min-h-0 h-[calc(100vh-81px)] overflow-hidden">
            <SidebarPanels
              activeTab={state.ui.activeSidebarTab}
              markupsPanel={<MarkupsListTable />}
              propertiesPanel={<PropertiesPanel />}
              regionsPanel={<RegionsList />}
              takeoffsPanel={<TakeoffTable />}
              qrPanel={<QrPanel />}
            />
          </div>
        </aside>
      ) : null}

      {state.ui.isCalibrationDialogOpen ? <ScaleCalibrationDialog /> : null}
    </div>
  );
}

export default function PlanViewerPage() {
  return (
    <PdfViewerProvider>
      <PlanViewerScreen />
    </PdfViewerProvider>
  );
}