"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useAppShell } from "@/lib/contexts/AppShellContext";
import { useModel } from "@/lib/contexts/ModelContext";
import { useEphemeral } from "@/lib/contexts/EphemeralContext";
import { lsGet, lsSet } from "@/lib/storage";
import PipelinesView from "@/components/views/PipelinesView";

/**
 * Shared host for the /pipelines and /pipelines/[id] routes.
 * Wires PipelinesView to URL/router + shell context. The optional
 * `focusPipelineId` ensures that visiting /pipelines/<id> auto-expands
 * the matching pipeline so deep links land on the right card.
 */
export default function PipelinesViewPage({ focusPipelineId }: { focusPipelineId?: string }) {
  const router = useRouter();
  const isMobile = useIsMobile(768);
  const shell = useAppShell();
  const { workspaces, isOfficerOfWorkspace, getStatus, claims, users } = useModel();
  const { setCopied } = useEphemeral();

  const [view, setView] = useState<"list" | "kanban" | "overview">(() => lsGet("pipelines_view_v2", "kanban"));
  const [expanded, setExpanded] = useState<string[]>(() => lsGet("expanded", ["research"]));
  const [expS, setExpS] = useState<string | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  useEffect(() => { lsSet("expanded", expanded); }, [expanded]);
  useEffect(() => { lsSet("pipelines_view_v2", view); }, [view]);

  // Auto-expand the target pipeline when arriving via /pipelines/[id]
  useEffect(() => {
    if (!focusPipelineId) return;
    setExpanded(prev => prev.includes(focusPipelineId) ? prev : [...prev, focusPipelineId]);
  }, [focusPipelineId]);

  const currentWorkspace = workspaces.find(w => w.id === shell.currentWorkspaceId) || null;
  const isAdmin = isOfficerOfWorkspace(shell.currentWorkspaceId);

  const sharePipeline = useCallback((pid: string, pname: string, pdesc: string, priority: string, stageList: string[]) => {
    const stageLines = stageList.map(s => `  · ${s}  [${getStatus(s).toUpperCase()}]`).join("\n");
    const owners = [...new Set(stageList.flatMap(s => claims[s] || []))]
      .map(uid => users.find(u => u.id === uid)?.name)
      .filter(Boolean);
    const lines = ["Binayah AI  //  Pipeline", "────────────────────────────────", pname, `Priority: ${priority}  ·  ${stageList.length} stages`];
    if (pdesc) { lines.push(""); lines.push(pdesc); }
    lines.push(""); lines.push("Stages:"); lines.push(stageLines);
    if (owners.length) { lines.push(""); lines.push(`Owners: ${owners.join(", ")}`); }
    navigator.clipboard?.writeText(lines.join("\n")).catch(() => {});
    setCopied(`pipe-${pid}`); setTimeout(() => setCopied(null), 2000);
  }, [setCopied, getStatus, claims, users]);

  return (
    <PipelinesView
      view={view}
      setView={setView}
      expanded={expanded}
      setExpanded={setExpanded}
      expS={expS}
      setExpS={setExpS}
      searchQ={searchQ}
      setSearchQ={setSearchQ}
      statusFilter={statusFilter}
      setStatusFilter={setStatusFilter}
      isMobile={isMobile}
      currentWorkspaceId={shell.currentWorkspaceId}
      currentWorkspace={currentWorkspace}
      isAdmin={isAdmin}
      readOnly={false}
      showToast={shell.showToast}
      handleClaimWithAnim={shell.handleClaimWithAnim}
      sharePipeline={sharePipeline}
      onPipelineClick={(pid) => router.push(`/pipelines/${encodeURIComponent(pid)}`)}
    />
  );
}
