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
      const audioFiles = files.filter(file => `${file.file_type || ""} ${file.file_extension || ""}`.toLowerCase().includes("m4a"));
      const videoFiles = files.filter(file => `${file.file_type || ""} ${file.file_extension || ""}`.toLowerCase().includes("mp4"));
      const chatFiles = files.filter(file => `${file.recording_type || ""} ${file.file_type || ""}`.toLowerCase().includes("chat"));
      const processingFiles = files.filter(file => file.status && file.status !== "completed");
      const completedFiles = files.filter(file => file.status === "completed");
      const readyForTasks = transcriptFiles.length > 0;
      const state = readyForTasks
        ? "ready"
        : processingFiles.length > 0
          ? "processing"
          : audioFiles.length > 0 || videoFiles.length > 0
            ? "needs_transcript"
            : "no_recording_files";
      return {
        uuid: meeting.uuid,
        id: meeting.id,
        topic: meeting.topic || "Untitled Zoom call",
        startTime: meeting.start_time,
        duration: meeting.duration,
        state,
        readyForTasks,
        fileCount: files.length,
        completedFileCount: completedFiles.length,
        processingFileCount: processingFiles.length,
        transcriptCount: transcriptFiles.length,
        audioCount: audioFiles.length,
        videoCount: videoFiles.length,
        chatCount: chatFiles.length,
        totalSize: meeting.total_size ?? files.reduce((sum, file) => sum + (file.file_size ?? 0), 0),
      };
    }),
  });
}
