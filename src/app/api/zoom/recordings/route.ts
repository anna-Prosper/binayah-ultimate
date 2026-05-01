import { NextResponse } from "next/server";
import { getRecentZoomRecordings } from "@/lib/zoom";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await getRecentZoomRecordings(30);
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: "ZOOM_RECORDINGS_FAILED",
        message: result.message,
      },
      { status: result.status || 502 },
    );
  }

  return NextResponse.json({
    ok: true,
    from: result.from,
    to: result.to,
    totalRecords: result.totalRecords,
    meetings: result.meetings.map(meeting => {
      const files = meeting.recording_files ?? [];
      const transcriptFiles = files.filter(file => {
        const type = `${file.file_type || ""} ${file.file_extension || ""} ${file.recording_type || ""}`.toLowerCase();
        return type.includes("transcript") || type.includes("vtt");
      });
      return {
        uuid: meeting.uuid,
        id: meeting.id,
        topic: meeting.topic || "Untitled Zoom call",
        startTime: meeting.start_time,
        duration: meeting.duration,
        fileCount: files.length,
        transcriptCount: transcriptFiles.length,
      };
    }),
  });
}
