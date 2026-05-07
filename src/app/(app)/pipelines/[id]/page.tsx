"use client";

import { useParams } from "next/navigation";
import PipelinesViewPage from "@/components/views/PipelinesViewPage";

export default function PipelineDetailPage() {
  // useParams works in client components; the server-side `params: Promise<...>`
  // signature only applies to server components in Next 16.
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === "string" ? decodeURIComponent(params.id) : undefined;
  return <PipelinesViewPage focusPipelineId={id} />;
}
