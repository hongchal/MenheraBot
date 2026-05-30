"use client";

import { useState, useRef } from "react";

const TONES = [
  { key: "chill", label: "느긋하게", emoji: "🧊" },
  { key: "menhera", label: "멘헤라", emoji: "👿" },
  { key: "ultra", label: "극한집착", emoji: "🔥" },
];

const RELATIONS = [
  { key: "애인", label: "애인", emoji: "💕" },
  { key: "썸", label: "썸", emoji: "🌹" },
  { key: "친구", label: "친구", emoji: "👥" },
  { key: "가족", label: "가족", emoji: "🏠" },
  { key: "직장동료", label: "직장동료", emoji: "💼" },
];

// iOS Dark color tokens
const C = {
  bg: "#000000",
  card: "#1C1C1E",
  cardElevated: "#2C2C2E",
  fill: "#3A3A3C",
  label: "#FFFFFF",
  labelSecondary: "rgba(235,235,245,0.6)",
  labelTertiary: "rgba(235,235,245,0.3)",
  separator: "rgba(255,255,255,0.08)",
  accent: "#0A84FF",
  blue: "#64B5F6",
  orange: "#FF9F0A",
  red: "#FF453A",
  green: "#32D74B",
};

interface Emotion {
  reflection: string;
  normalize: string;
  origin: string;
  action: string;
  reframe: string;
}

interface Structured {
  temperature: number;
  verdict: string;
  emotion_label: string;
  messages: string[];
  emotion: Emotion;
}

function TempGauge({ value }: { value: number }) {
  const color = value < 40 ? C.blue : value < 70 ? C.orange : C.red;
  const label =
    value < 30 ? "냉담" :
    value < 50 ? "미지근" :
    value < 70 ? "위험" :
    value < 85 ? "적신호" : "폭발직전";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <span style={{ fontSize: 13, color: C.labelSecondary, fontWeight: 400 }}>집착 온도</span>
        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
          <span style={{ fontSize: 34, fontWeight: 700, color, letterSpacing: -1 }}>{value}</span>
          <span style={{ fontSize: 17, fontWeight: 600, color }}>°</span>
        </div>
      </div>
      <div style={{ position: "relative", height: 4, background: C.fill, borderRadius: 2 }}>
        <div style={{
          position: "absolute", left: 0, top: 0, height: "100%",
          width: `${value}%`, background: color, borderRadius: 2,
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
        <span style={{ fontSize: 11, color: C.labelTertiary }}>0°</span>
        <span style={{ fontSize: 11, fontWeight: 600, color }}>{label}</span>
        <span style={{ fontSize: 11, color: C.labelTertiary }}>100°</span>
      </div>
    </div>
  );
}

const emotionColors: Record<string, string> = {
  불안: "#5E9EFF",
  외로움: "#64B5F6",
  두려움: "#BF5AF2",
  통제욕구: "#FF453A",
  의존감: "#FF9F0A",
  분노: "#BF5AF2",
  질투: "#32D74B",
};

export default function MenheraBot() {
  const [situation, setSituation] = useState("");
  const [relation, setRelation] = useState("애인");
  const [customRelation, setCustomRelation] = useState("");
  const [tone, setTone] = useState("menhera");
  const [structured, setStructured] = useState<Structured | null>(null);
  const [submittedTone, setSubmittedTone] = useState("menhera");
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  async function runJudge() {
    if (!situation.trim()) return;
    setLoading(true);
    setStructured(null);
    setSubmittedTone(tone);
    setVisibleCount(0);
    setError("");

    try {
      const res = await fetch("/internal/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          situation,
          tone,
          relation: relation === "직접입력" ? (customRelation.trim() || "기타") : relation,
        }),
      });
      if (!res.ok) throw new Error();

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
      }

      const parsed: Structured = JSON.parse(raw.trim());
      setStructured(parsed);
      setLoading(false);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);

      for (let i = 0; i < parsed.messages.length; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 300 : 600));
        setVisibleCount(i + 1);
      }
    } catch {
      setError("판단에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  const emotionColor = structured ? (emotionColors[structured.emotion_label] ?? C.accent) : C.accent;
  const toneEmoji = TONES.find(t => t.key === submittedTone)?.emoji;

  return (
    <div style={{ minHeight: "100vh", background: C.bg, fontFamily: "Pretendard, -apple-system, sans-serif", color: C.label }}>
      <link href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" rel="stylesheet" />

      {/* 네비게이션 */}
      <div style={{ padding: "60px 20px 8px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <p style={{ fontSize: 13, color: C.labelTertiary, margin: "0 0 4px", fontWeight: 500 }}>MENHERA BOT</p>
          <h1 style={{ fontSize: 34, fontWeight: 700, letterSpacing: -0.5, margin: 0, lineHeight: 1.2 }}>
            그 사람 행동,<br />분석해보자
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 80px" }}>

        {/* 상대방 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: C.labelSecondary, fontWeight: 500, margin: "0 0 10px 4px" }}>상대방</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[...RELATIONS, { key: "직접입력", label: "직접 입력", emoji: "✏️" }].map(r => (
              <button key={r.key} onClick={() => setRelation(r.key)} style={{
                padding: "6px 14px",
                background: relation === r.key ? C.accent : C.card,
                borderRadius: 20, border: "none", cursor: "pointer",
                color: relation === r.key ? "#fff" : C.labelSecondary,
                fontSize: 13, fontWeight: relation === r.key ? 600 : 400,
                fontFamily: "inherit", transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 5,
              }}>
                <span style={{ fontSize: 14 }}>{r.emoji}</span>{r.label}
              </button>
            ))}
          </div>
          {relation === "직접입력" && (
            <input
              value={customRelation}
              onChange={e => setCustomRelation(e.target.value)}
              placeholder="예: 전 남자친구, 선배..."
              style={{
                marginTop: 10, width: "100%", background: C.card,
                border: "none", borderRadius: 10, padding: "12px 14px",
                color: C.label, fontFamily: "inherit", fontSize: 15,
                outline: "none", boxSizing: "border-box",
              }}
            />
          )}
        </div>

        {/* 상황 입력 */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: C.labelSecondary, fontWeight: 500, margin: "0 0 10px 4px" }}>상황</p>
          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            placeholder="카톡 읽씹 3시간 후에 인스타 스토리 올림..."
            rows={4}
            style={{
              width: "100%", background: C.card, border: "none",
              borderRadius: 12, padding: "14px 16px", color: C.label,
              fontFamily: "inherit", fontSize: 15, lineHeight: 1.6,
              resize: "none", outline: "none", boxSizing: "border-box",
            }}
          />
        </div>

        {/* 레벨 선택 - 세그먼트 컨트롤 */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: C.labelSecondary, fontWeight: 500, margin: "0 0 10px 4px" }}>멘헤라 레벨</p>
          <div style={{ background: C.card, borderRadius: 10, padding: 3, display: "flex" }}>
            {TONES.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)} style={{
                flex: 1, padding: "7px 4px",
                background: tone === t.key ? C.cardElevated : "transparent",
                borderRadius: 8, border: "none", cursor: "pointer",
                color: tone === t.key ? C.label : C.labelSecondary,
                fontFamily: "inherit", fontSize: 12,
                fontWeight: tone === t.key ? 600 : 400,
                transition: "all 0.15s",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              }}>
                <span style={{ fontSize: 16 }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 판단 버튼 */}
        <button
          onClick={runJudge}
          disabled={loading || !situation.trim()}
          style={{
            width: "100%", padding: "15px",
            background: loading || !situation.trim() ? C.card : C.accent,
            border: "none", borderRadius: 12, cursor: loading || !situation.trim() ? "not-allowed" : "pointer",
            color: loading || !situation.trim() ? C.labelTertiary : "#fff",
            fontFamily: "inherit", fontSize: 17, fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          {loading ? "분석 중..." : "판단하기"}
        </button>

        {error && (
          <p style={{ fontSize: 13, color: C.red, marginTop: 10, textAlign: "center" }}>{error}</p>
        )}

        {/* 결과 */}
        {structured && (
          <div ref={resultRef} style={{ marginTop: 32 }}>

            {/* 온도 카드 */}
            <div style={{ background: C.card, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
              <TempGauge value={structured.temperature} />
              <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.separator}` }}>
                <span style={{ fontSize: 13, color: C.labelSecondary }}>판단 </span>
                <span style={{ fontSize: 13, fontWeight: 600, color: C.label }}>{structured.verdict}</span>
              </div>
            </div>

            {/* 말풍선 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {structured.messages.slice(0, visibleCount).map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", animation: "fadeUp 0.25s ease" }}>
                  {i === 0 && (
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%",
                      background: C.cardElevated,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>{toneEmoji}</div>
                  )}
                  {i > 0 && <div style={{ width: 32, flexShrink: 0 }} />}
                  <div style={{ flex: 1 }}>
                    {i === 0 && (
                      <p style={{ fontSize: 11, color: C.labelTertiary, margin: "0 0 4px 2px", fontWeight: 500 }}>멘헤라봇</p>
                    )}
                    <div style={{
                      background: C.card,
                      borderRadius: i === 0 ? "4px 16px 16px 16px" : "16px",
                      padding: "10px 14px",
                      display: "inline-block", maxWidth: "100%",
                    }}>
                      <p style={{ fontSize: 15, color: C.label, lineHeight: 1.5, margin: 0 }}>{msg}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 내 마음 들여다보기 */}
            {visibleCount >= structured.messages.length && structured.emotion && (
              <div style={{ marginTop: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                  <div style={{ flex: 1, height: 1, background: C.separator }} />
                  <span style={{ fontSize: 12, color: C.labelTertiary, fontWeight: 500, whiteSpace: "nowrap" }}>내 마음 들여다보기</span>
                  <div style={{ flex: 1, height: 1, background: C.separator }} />
                </div>

                <div style={{ background: C.card, borderRadius: 16, overflow: "hidden" }}>
                  {/* 섹션 1 */}
                  <div style={{ padding: "18px 18px 16px" }}>
                    <p style={{ fontSize: 14, color: C.labelSecondary, lineHeight: 1.8, margin: 0 }}>
                      {structured.emotion.reflection} {structured.emotion.normalize} {structured.emotion.origin}
                    </p>
                  </div>

                  <div style={{ height: 1, background: C.separator, margin: "0 18px" }} />

                  {/* 섹션 2: action */}
                  <div style={{ padding: "16px 18px" }}>
                    <p style={{ fontSize: 11, color: emotionColor, fontWeight: 600, margin: "0 0 6px", letterSpacing: "0.04em" }}>
                      지금 해볼 것
                    </p>
                    <p style={{ fontSize: 15, color: C.label, lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
                      {structured.emotion.action}
                    </p>
                  </div>

                  <div style={{ height: 1, background: C.separator, margin: "0 18px" }} />

                  {/* 섹션 3: reframe */}
                  <div style={{ padding: "16px 18px 18px" }}>
                    <p style={{ fontSize: 11, color: C.labelTertiary, fontWeight: 500, margin: "0 0 6px", letterSpacing: "0.04em" }}>
                      한 걸음 물러서서
                    </p>
                    <p style={{ fontSize: 14, color: C.labelTertiary, lineHeight: 1.8, margin: 0 }}>
                      {structured.emotion.reframe}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { -webkit-tap-highlight-color: transparent; }
        ::placeholder { color: rgba(235,235,245,0.3); }
      `}</style>
    </div>
  );
}
