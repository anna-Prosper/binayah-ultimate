export type ZoomTokenResult =
  | { ok: true; accessToken: string; expiresIn: number; scope: string }
  | { ok: false; status: number; message: string };

export function getZoomEnv() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  const missing = [
    ["ZOOM_ACCOUNT_ID", accountId],
    ["ZOOM_CLIENT_ID", clientId],
    ["ZOOM_CLIENT_SECRET", clientSecret],
  ].filter(([, value]) => !value).map(([key]) => key);

  return { accountId, clientId, clientSecret, missing };
}

export async function getZoomServerToken(): Promise<ZoomTokenResult> {
  const { accountId, clientId, clientSecret, missing } = getZoomEnv();

  if (missing.length > 0 || !accountId || !clientId || !clientSecret) {
    return {
      ok: false,
      status: 400,
      message: `Missing ${missing.join(", ")}`,
    };
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const url = new URL("https://zoom.us/oauth/token");
  url.searchParams.set("grant_type", "account_credentials");
  url.searchParams.set("account_id", accountId);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: text || res.statusText || "Zoom token request failed",
    };
  }

  const data = await res.json() as { access_token?: string; expires_in?: number; scope?: string };
  if (!data.access_token) {
    return {
      ok: false,
      status: 502,
      message: "Zoom token response did not include an access token",
    };
  }

  return {
    ok: true,
    accessToken: data.access_token,
    expiresIn: data.expires_in ?? 0,
    scope: data.scope ?? "",
  };
}

export type ZoomRecordingFile = {
  id?: string;
  file_type?: string;
  file_extension?: string;
  recording_type?: string;
  status?: string;
  file_size?: number;
  download_url?: string;
};

export type ZoomRecordingMeeting = {
  uuid?: string;
  id?: number | string;
  topic?: string;
  start_time?: string;
  duration?: number;
  recording_count?: number;
  total_size?: number;
  recording_files?: ZoomRecordingFile[];
};

export type ZoomRecordingsResult =
  | { ok: true; from: string; to: string; totalRecords: number; meetings: ZoomRecordingMeeting[] }
  | { ok: false; status: number; message: string };

export type ZoomMeetingSummaryResult =
  | { ok: true; meetingId: string; summary: string; topic: string; startTime: string }
  | { ok: false; status: number; message: string };

/** Zoom response bodies sometimes contain raw control chars — strip before JSON.parse */
function safeParseZoomJson(raw: string): Record<string, unknown> {
  // eslint-disable-next-line no-control-regex
  const cleaned = raw.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");
  return JSON.parse(cleaned) as Record<string, unknown>;
}

/** Double-encode a UUID that may contain slashes — required by Zoom API docs */
function encodeUUID(uuid: string): string {
  return encodeURIComponent(encodeURIComponent(uuid));
}

export type ZoomPastMeeting = {
  id: number | string;
  uuid: string;
  topic: string;
  startTime: string;
  duration: number;
};

export type ZoomPastMeetingsResult =
  | { ok: true; meetings: ZoomPastMeeting[] }
  | { ok: false; status: number; message: string };

export async function getZoomPastMeetings(userEmail: string, pageSize = 30): Promise<ZoomPastMeetingsResult> {
  const token = await getZoomServerToken();
  if (!token.ok) return token;

  const url = new URL(`https://api.zoom.us/v2/users/${encodeURIComponent(userEmail)}/meetings`);
  url.searchParams.set("type", "previousMeetings");
  url.searchParams.set("page_size", String(pageSize));

  const res = await fetch(url, { headers: { Authorization: `Bearer ${token.accessToken}` }, cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: text || "Failed to list past meetings" };
  }

  const data = await res.json() as { meetings?: { id: number | string; uuid: string; topic: string; start_time: string; duration: number }[] };
  const now = Date.now();
  const rawMeetings = data.meetings ?? [];

  // Separate real past meetings from recurring templates (template date = far future)
  const realPast = rawMeetings.filter(m => new Date(m.start_time).getTime() < now);
  const recurringTemplates = rawMeetings.filter(m => new Date(m.start_time).getTime() >= now);

  // For recurring templates, fetch their recent actual instances (up to 5 each)
  const instancePromises = recurringTemplates.map(async m => {
    try {
      const r = await fetch(`https://api.zoom.us/v2/past_meetings/${m.id}/instances`, {
        headers: { Authorization: `Bearer ${token.accessToken}` }, cache: "no-store",
      });
      if (!r.ok) return [];
      const d = await r.json() as { meetings?: { uuid: string; start_time: string }[] };
      return (d.meetings ?? [])
        .filter(i => new Date(i.start_time).getTime() < now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())
        .slice(0, 5)
        .map(i => ({ id: m.id, uuid: i.uuid, topic: m.topic || "Untitled", startTime: i.start_time, duration: m.duration ?? 0 }));
    } catch { return []; }
  });

  const instanceResults = await Promise.all(instancePromises);
  const resolvedInstances = instanceResults.flat().filter((x): x is ZoomPastMeeting => x !== null);

  const meetings = [
    ...realPast.map(m => ({ id: m.id, uuid: m.uuid, topic: m.topic || "Untitled", startTime: m.start_time, duration: m.duration ?? 0 })),
    ...resolvedInstances,
  ];

  return { ok: true, meetings };
}

export async function getZoomMeetingInstanceSummary(meetingId: number | string): Promise<ZoomMeetingSummaryResult> {
  const token = await getZoomServerToken();
  if (!token.ok) return token;

  // Get the most recent past instance UUID
  const instRes = await fetch(`https://api.zoom.us/v2/past_meetings/${meetingId}/instances`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });
  if (!instRes.ok) {
    return { ok: false, status: instRes.status, message: "Could not fetch meeting instances" };
  }
  const instData = await instRes.json() as { meetings?: { uuid: string; start_time: string }[] };
  const now = Date.now();
  const instances = (instData.meetings ?? [])
    .filter(i => new Date(i.start_time).getTime() < now)
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
  if (instances.length === 0) {
    return { ok: false, status: 404, message: "No past instances found for this meeting" };
  }
  // Try each instance from most recent until we find one with a summary
  for (const instance of instances.slice(0, 5)) {
    const result = await getZoomMeetingSummaryByUUID(instance.uuid, String(meetingId));
    if (result.ok) return result;
  }
  return { ok: false, status: 404, message: "No AI Companion summary found in the last 5 instances of this meeting" };
}

export async function getZoomSummaryByUUID(uuid: string, meetingId: string): Promise<ZoomMeetingSummaryResult> {
  return getZoomMeetingSummaryByUUID(uuid, meetingId);
}

async function getZoomMeetingSummaryByUUID(uuid: string, fallbackId: string): Promise<ZoomMeetingSummaryResult> {
  const token = await getZoomServerToken();
  if (!token.ok) return token;

  const encoded = encodeUUID(uuid);
  const res = await fetch(`https://api.zoom.us/v2/meetings/${encoded}/meeting_summary`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });

  const raw = await res.text().catch(() => "");
  let data: Record<string, unknown>;
  try {
    data = safeParseZoomJson(raw);
  } catch {
    return { ok: false, status: 502, message: "Failed to parse Zoom summary response" };
  }

  if (!res.ok || (data.code && data.code !== "ok")) {
    return { ok: false, status: res.status || 400, message: String(data.message || "Zoom summary not found") };
  }

  const summaryDetails = Array.isArray(data.summary_details)
    ? (data.summary_details as { label?: string; summary?: string }[])
    : [];

  let summary = String(data.summary_content || "");
  if (!summary && summaryDetails.length > 0) {
    summary = summaryDetails
      .map(d => `${d.label ? d.label + ":\n" : ""}${d.summary || ""}`)
      .join("\n\n");
  }

  if (!summary) {
    return { ok: false, status: 404, message: "No AI Companion summary for this meeting. Make sure AI Companion was enabled during the call." };
  }

  return {
    ok: true,
    meetingId: fallbackId,
    summary,
    topic: String(data.meeting_topic ?? "Untitled meeting"),
    startTime: String(data.start_time ?? ""),
  };
}

export async function getZoomMeetingSummary(meetingId: string): Promise<ZoomMeetingSummaryResult> {
  const token = await getZoomServerToken();
  if (!token.ok) return token;

  const res = await fetch(`https://api.zoom.us/v2/meetings/${encodeURIComponent(meetingId)}/meeting_summary`, {
    headers: { Authorization: `Bearer ${token.accessToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, message: text || res.statusText || "Zoom summary request failed" };
  }

  const raw = await res.text().catch(() => "{}");
  let data: Record<string, unknown>;
  try { data = safeParseZoomJson(raw); } catch { return { ok: false, status: 502, message: "Failed to parse Zoom response" }; }

  const summaryDetails = Array.isArray(data.summary_details)
    ? (data.summary_details as { label?: string; summary?: string }[])
    : [];

  let summary = String(data.summary_content || "");
  if (!summary && summaryDetails.length > 0) {
    summary = summaryDetails.map(d => `${d.label ? d.label + ":\n" : ""}${d.summary || ""}`).join("\n\n");
  }

  if (!summary) {
    return { ok: false, status: 404, message: "No AI summary found for this meeting. Make sure Zoom AI Companion is enabled." };
  }

  return {
    ok: true,
    meetingId,
    summary,
    topic: String(data.meeting_topic ?? "Untitled meeting"),
    startTime: String(data.start_time ?? ""),
  };
}

export async function getRecentZoomRecordings(days = 30): Promise<ZoomRecordingsResult> {
  const token = await getZoomServerToken();
  if (!token.ok) return token;

  const to = new Date();
  const from = new Date(to.getTime() - Math.max(1, Math.min(days, 180)) * 86_400_000);
  const fromText = from.toISOString().slice(0, 10);
  const toText = to.toISOString().slice(0, 10);
  const url = new URL("https://api.zoom.us/v2/accounts/me/recordings");
  url.searchParams.set("from", fromText);
  url.searchParams.set("to", toText);
  url.searchParams.set("page_size", "30");

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token.accessToken}`,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: res.status,
      message: text || res.statusText || "Zoom recordings request failed",
    };
  }

  const data = await res.json() as {
    from?: string;
    to?: string;
    total_records?: number;
    meetings?: ZoomRecordingMeeting[];
  };

  return {
    ok: true,
    from: data.from ?? fromText,
    to: data.to ?? toText,
    totalRecords: data.total_records ?? data.meetings?.length ?? 0,
    meetings: data.meetings ?? [],
  };
}
