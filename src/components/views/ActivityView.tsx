"use client";

import { Suspense } from "react";
import { useModel } from "@/lib/contexts/ModelContext";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { ActivitySkeleton } from "@/components/ui/Skeletons";
import dynamic from "next/dynamic";

const ActivityFeed = dynamic(() => import("@/components/ActivityFeed"), { ssr: false });

export default function ActivityView({ showToast }: { showToast: (msg: string, color: string) => void }) {
  const { activityLog, users, t } = useModel();
  return (
    <ErrorBoundary onError={() => showToast("// failed to load panel — refresh to retry", t.red)}>
      <Suspense fallback={<ActivitySkeleton t={t} />}>
        <div style={{ marginTop: 16 }}>
          <ActivityFeed activityLog={activityLog} users={users} t={t} />
        </div>
      </Suspense>
    </ErrorBoundary>
  );
}
