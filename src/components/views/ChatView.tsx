"use client";

import { Suspense } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ChatSkeleton } from "@/components/ui/Skeletons";
import dynamic from "next/dynamic";

const ChatPanel = dynamic(() => import("@/components/ChatPanel"), { ssr: false });

interface ChatViewProps {
  showToast: (msg: string, color: string) => void;
  fullScreen?: boolean;
  defaultTab?: "team" | "ai";
  currentWorkspaceId?: string;
}

export default function ChatView({ showToast, fullScreen, defaultTab, currentWorkspaceId }: ChatViewProps) {
  const { chatMessages, sendChat, handleRemoteMessage, users, currentUser, hasMoreMessages, loadMoreMessages, allPipelinesGlobal, customPipelines, customStages, pipeMetaOverrides, pipeDescOverrides, claims, subtasks, comments, stageDescOverrides, activityLog, getStatus, getPoints, workspaces, t } = useModel();

  const allPipelines = currentWorkspaceId
    ? (() => { const ws = workspaces.find(w => w.id === currentWorkspaceId); return ws ? allPipelinesGlobal.filter(p => ws.pipelineIds.includes(p.id)) : allPipelinesGlobal; })()
    : allPipelinesGlobal;

  // Filter messages to current workspace. Legacy messages without workspaceId stay visible everywhere.
  const filteredMessages = currentWorkspaceId
    ? chatMessages.filter(m => !m.workspaceId || m.workspaceId === currentWorkspaceId)
    : chatMessages;

  const buildAiContext = () => {
    const me = users.find(u => u.id === currentUser);
    const lines: string[] = [];
    lines.push(`Current user: ${me?.name || currentUser} (id=${currentUser}, role=${me?.role || "?"}, points=${getPoints(currentUser!)})`);
    lines.push(`Team: ${users.map(u => `${u.name} (${u.id}, ${u.role}, ${getPoints(u.id)}pts)`).join("; ")}`);
    lines.push(""); lines.push(`Pipelines (${allPipelines.length}):`);
    allPipelines.forEach((p, pi) => {
      const stages = [...p.stages, ...(customStages[p.id] || [])];
      lines.push(`${pi + 1}. ${pipeMetaOverrides[p.id]?.name || p.name} — ${pipeMetaOverrides[p.id]?.priority || p.priority} — ${pipeDescOverrides[p.id] || p.desc}`);
      stages.forEach((s, si) => { const st = getStatus(s); const claimers = (claims[s] || []).map(id => users.find(u => u.id === id)?.name || id).join(", ") || "unclaimed"; const subN = (subtasks[s] || []).length; const comN = (comments[s] || []).length; const sDesc = stageDescOverrides[s] || ""; lines.push(`   ${pi + 1}.${si + 1} ${s} [${st}] — claimed by ${claimers}${subN ? ` — subtasks ${subN}` : ""}${comN ? ` — ${comN} comments` : ""}${sDesc ? ` — ${sDesc}` : ""}`); });
    });
    const recent = activityLog.slice(0, 8);
    if (recent.length) { lines.push(""); lines.push("Recent activity:"); recent.forEach(a => lines.push(`- ${a.user} ${a.type} ${a.target}${a.detail ? ` (${a.detail})` : ""}`)); }
    return lines.join("\n");
  };

  return (
    <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
      <Suspense fallback={<ChatSkeleton t={t} />}>
        <ChatPanel fullScreen={fullScreen} messages={filteredMessages} onSend={sendChat} onRemoteMessage={handleRemoteMessage} users={users} currentUser={currentUser!} t={t} defaultTab={defaultTab || "team"} onLoadMore={loadMoreMessages} hasMore={hasMoreMessages} buildAiContext={buildAiContext} />
      </Suspense>
    </ErrorBoundary>
  );
}
