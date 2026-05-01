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
  download_url?: string;
};

export type ZoomRecordingMeeting = {
  uuid?: string;
  id?: number | string;
  topic?: string;
  start_time?: string;
  duration?: number;
  recording_files?: ZoomRecordingFile[];
};

export type ZoomRecordingsResult =
  | { ok: true; from: string; to: string; totalRecords: number; meetings: ZoomRecordingMeeting[] }
  | { ok: false; status: number; message: string };

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
