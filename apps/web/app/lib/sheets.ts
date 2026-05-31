import { GoogleAuth } from "google-auth-library";

const HEADERS = [
  "created_at",
  "env",
  "situation",
  "relation",
  "tone",
  "temperature",
  "verdict",
  "emotion_label",
  "messages",
  "reflection",
  "normalize",
  "origin",
  "action",
  "reframe",
];

async function getAccessToken(): Promise<string> {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!);
  const auth = new GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const client = await auth.getClient();
  const token = await client.getAccessToken();
  return token.token!;
}

async function ensureHeaders(token: string, sheetId: string) {
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:M1`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await res.json();
  if (data.values?.length) return;

  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [HEADERS] }),
    }
  );
}

export async function appendToSheet(data: {
  situation: string;
  created_at: string;
  relation: string;
  tone: string;
  temperature: number;
  verdict: string;
  emotion_label: string;
  messages: string[];
  emotion: {
    reflection: string;
    normalize: string;
    origin: string;
    action: string;
    reframe: string;
  };
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return;

  try {
    const token = await getAccessToken();
    await ensureHeaders(token, sheetId);

    const env = process.env.APP_ENV ?? "local";
    const row = [
      data.created_at,
      env,
      data.situation,
      data.relation,
      data.tone,
      data.temperature,
      data.verdict,
      data.emotion_label,
      data.messages.join(" | "),
      data.emotion.reflection,
      data.emotion.normalize,
      data.emotion.origin,
      data.emotion.action,
      data.emotion.reframe,
    ];

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A1:append?valueInputOption=USER_ENTERED`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [row] }),
      }
    );
  } catch (err) {
    console.error("[sheets] appendToSheet failed:", err);
  }
}
