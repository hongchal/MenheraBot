import { GoogleAuth } from "google-auth-library";

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

export async function appendToSheet(data: {
  situation: string;
  created_at: string;
  relation: string;
  tone: string;
  temperature: number;
  verdict: string;
  emotion_label: string;
  messages: string[];
}) {
  const sheetId = process.env.GOOGLE_SHEET_ID;
  if (!sheetId || !process.env.GOOGLE_SERVICE_ACCOUNT_JSON) return;

  try {
    const token = await getAccessToken();
    const row = [
      data.created_at,
      data.situation,
      data.relation,
      data.tone,
      data.temperature,
      data.verdict,
      data.emotion_label,
      data.messages.join(" | "),
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
