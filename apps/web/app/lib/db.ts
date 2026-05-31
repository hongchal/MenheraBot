import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
});

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS judgments (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    situation   TEXT        NOT NULL,
    relation    TEXT        NOT NULL,
    tone        TEXT        NOT NULL,
    temperature INTEGER,
    verdict     TEXT,
    emotion_label TEXT,
    messages    JSONB,
    emotion     JSONB
  );
`;

let initialized = false;

async function init() {
  if (initialized) return;
  await pool.query(CREATE_TABLE);
  initialized = true;
}

export async function saveJudgment(data: {
  situation: string;
  relation: string;
  tone: string;
  created_at: string;
  temperature: number;
  verdict: string;
  emotion_label: string;
  messages: string[];
  emotion: object;
}) {
  try {
    await init();
    await pool.query(
      `INSERT INTO judgments
         (created_at, situation, relation, tone, temperature, verdict, emotion_label, messages, emotion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        data.created_at,
        data.situation,
        data.relation,
        data.tone,
        data.temperature,
        data.verdict,
        data.emotion_label,
        JSON.stringify(data.messages),
        JSON.stringify(data.emotion),
      ]
    );
  } catch (err) {
    console.error("[db] saveJudgment failed:", err);
  }
}
