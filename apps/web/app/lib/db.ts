import { Pool } from "pg";

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
    })
  : null;

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS judgments (
    id          SERIAL PRIMARY KEY,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    env         TEXT        NOT NULL DEFAULT 'local',
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

const ADD_ENV_COLUMN = `
  ALTER TABLE judgments ADD COLUMN IF NOT EXISTS env TEXT NOT NULL DEFAULT 'local';
`;

let initialized = false;

async function init() {
  if (!pool || initialized) return;
  await pool.query(CREATE_TABLE);
  await pool.query(ADD_ENV_COLUMN);
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
    if (!pool) return;
    await init();
    const env = process.env.APP_ENV ?? "local";
    await pool.query(
      `INSERT INTO judgments
         (created_at, env, situation, relation, tone, temperature, verdict, emotion_label, messages, emotion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        data.created_at,
        env,
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
