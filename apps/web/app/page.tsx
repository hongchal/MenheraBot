"use client";

import { useState, useRef } from "react";

const TONES = [
  { key: "chill", label: "느긋하게", emoji: "🧊" },
  { key: "menhera", label: "멘헤라", emoji: "👿" },
  { key: "ultra", label: "극한집착", emoji: "🔥" },
];

const RELATIONS = [
  { key: "애인", label: "애인" },
  { key: "썸", label: "썸" },
  { key: "친구", label: "친구" },
  { key: "가족", label: "가족" },
  { key: "직장동료", label: "직장동료" },
  { key: "직접입력", label: "직접 입력" },
];

const ACCENT = "#8B1A2F";
const LINE = "1px solid #111111";

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

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: "0.1em",
        color: "#111111",
        margin: "0 0 10px",
        textTransform: "uppercase",
      }}
    >
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ borderTop: LINE, margin: "20px 0" }} />;
}

function TempGauge({ value }: { value: number }) {
  const isHot = value >= 70;
  const color = isHot ? ACCENT : "#111111";
  const statusKo =
    value < 30
      ? "냉담"
      : value < 50
      ? "미지근"
      : value < 70
      ? "위험"
      : value < 85
      ? "적신호"
      : "폭발직전";

  return (
    <div>
      {/* 헤더: 라벨 ↔ 상태 */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "#999",
          }}
        >
          집착 온도
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color,
          }}
        >
          {statusKo}
        </span>
      </div>

      {/* 숫자 — 주인공 */}
      <div style={{ textAlign: "center", margin: "4px 0 20px", lineHeight: 1 }}>
        <span
          style={{ fontSize: 96, fontWeight: 700, letterSpacing: -4, color }}
        >
          {value}
        </span>
        <span
          style={{
            fontSize: 36,
            fontWeight: 700,
            color,
            verticalAlign: "super",
            marginLeft: 2,
          }}
        >
          °
        </span>
      </div>

      {/* 바 + 눈금 */}
      <div style={{ position: "relative" }}>
        {/* 트랙 */}
        <div
          style={{
            height: 8,
            background: "#e8e8e8",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: `${value}%`,
              background: color,
              transition: "width 0.3s ease",
            }}
          />
        </div>
        {/* 눈금 (25, 50, 75) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 8,
            display: "flex",
            alignItems: "stretch",
            pointerEvents: "none",
          }}
        >
          {[25, 50, 75].map((t) => (
            <div
              key={t}
              style={{
                position: "absolute",
                left: `${t}%`,
                top: 0,
                width: 1,
                height: "100%",
                background: "#fff",
                opacity: 0.6,
              }}
            />
          ))}
        </div>
      </div>

      {/* 0° / 100° */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span style={{ fontSize: 10, color: "#bbb", fontWeight: 600 }}>0°</span>
        <span style={{ fontSize: 10, color: "#bbb", fontWeight: 600 }}>
          100°
        </span>
      </div>
    </div>
  );
}

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
          relation:
            relation === "직접입력"
              ? customRelation.trim() || "기타"
              : relation,
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
      setTimeout(
        () =>
          resultRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100
      );

      for (let i = 0; i < parsed.messages.length; i++) {
        await new Promise((r) => setTimeout(r, i === 0 ? 300 : 600));
        setVisibleCount(i + 1);
      }
    } catch {
      setError("판단에 실패했어요. 다시 시도해주세요.");
      setLoading(false);
    }
  }

  const toneEmoji = TONES.find((t) => t.key === submittedTone)?.emoji;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#fff",
        fontFamily: "Pretendard, -apple-system, sans-serif",
        color: "#111111",
      }}
    >
      <link
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        rel="stylesheet"
      />

      {/* 헤더 */}
      <div style={{ borderBottom: LINE, padding: "40px 24px 20px" }}>
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.15em",
              margin: "0 0 8px",
              color: "#999",
              textTransform: "uppercase",
            }}
          >
            Menhera Bot
          </p>
          <h1
            style={{
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: -0.5,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            그 사람 행동,
            <br />
            분석해보자
          </h1>
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 24px 80px" }}>
        {/* 상대방 */}
        <div style={{ padding: "20px 0" }}>
          <Label>상대방</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {RELATIONS.map((r) => (
              <button
                key={r.key}
                onClick={() => setRelation(r.key)}
                style={{
                  padding: "5px 12px",
                  background: relation === r.key ? "#111111" : "#fff",
                  border: LINE,
                  cursor: "pointer",
                  color: relation === r.key ? "#fff" : "#111111",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  letterSpacing: "0.02em",
                  transition: "all 0.12s",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
          {relation === "직접입력" && (
            <input
              value={customRelation}
              onChange={(e) => setCustomRelation(e.target.value)}
              placeholder="예: 전 남자친구, 선배..."
              style={{
                marginTop: 10,
                width: "100%",
                border: "none",
                borderBottom: LINE,
                padding: "8px 0",
                color: "#111111",
                fontFamily: "inherit",
                fontSize: 14,
                outline: "none",
                boxSizing: "border-box",
                background: "transparent",
              }}
            />
          )}
        </div>

        {/* 상황 */}
        <div style={{ padding: "20px 0" }}>
          <Label>상황</Label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="카톡 읽씹 3시간 후에 인스타 스토리 올림..."
            rows={4}
            style={{
              width: "100%",
              border: "none",
              borderBottom: LINE,
              padding: "0 0 8px",
              color: "#111111",
              fontFamily: "inherit",
              fontSize: 15,
              lineHeight: 1.7,
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              background: "transparent",
            }}
          />
        </div>

        {/* 멘헤라 레벨 */}
        <div style={{ padding: "20px 0" }}>
          <Label>멘헤라 레벨</Label>
          <div style={{ display: "flex", border: LINE }}>
            {TONES.map((t, i) => (
              <button
                key={t.key}
                onClick={() => setTone(t.key)}
                style={{
                  flex: 1,
                  padding: "10px 4px",
                  background: tone === t.key ? "#111111" : "#fff",
                  border: "none",
                  borderLeft: i > 0 ? LINE : "none",
                  cursor: "pointer",
                  color: tone === t.key ? "#fff" : "#111111",
                  fontFamily: "inherit",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  transition: "all 0.12s",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span style={{ fontSize: 16 }}>{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* 판단 버튼 */}
        <div style={{ padding: "20px 0" }}>
          <button
            onClick={runJudge}
            disabled={loading || !situation.trim()}
            style={{
              width: "100%",
              padding: "14px",
              background: loading || !situation.trim() ? "#fff" : "#111111",
              border: `1px solid ${
                loading || !situation.trim() ? "#ccc" : "#111111"
              }`,
              cursor: loading || !situation.trim() ? "not-allowed" : "pointer",
              color: loading || !situation.trim() ? "#ccc" : "#fff",
              fontFamily: "inherit",
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              transition: "all 0.12s",
            }}
          >
            {loading ? "분석 중..." : "판단하기"}
          </button>
          {error && (
            <p
              style={{
                fontSize: 12,
                color: ACCENT,
                marginTop: 8,
                textAlign: "center",
              }}
            >
              {error}
            </p>
          )}
        </div>

        {/* 결과 */}
        {structured && (
          <div ref={resultRef}>
            <div
              style={{
                borderTop: "2px solid #111111",
                paddingTop: 20,
                marginTop: 4,
              }}
            >
              {/* 온도 */}
              <TempGauge value={structured.temperature} />

              {/* 판단 */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                }}
              >
                <Label>판단</Label>
                <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>
                  {structured.verdict}
                </p>
              </div>

              {/* 말풍선 */}
              <Label>분석 {toneEmoji}</Label>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {structured.messages.slice(0, visibleCount).map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-end",
                      animation: "fadeUp 0.2s ease",
                    }}
                  >
                    {i === 0 && (
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: "#111111",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                        }}
                      >
                        {toneEmoji}
                      </div>
                    )}
                    {i > 0 && <div style={{ width: 28, flexShrink: 0 }} />}
                    <div
                      style={{
                        background: "#F0F0F0",
                        borderRadius: i === 0 ? "4px 14px 14px 14px" : "14px",
                        padding: "10px 14px",
                        maxWidth: "85%",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.6,
                          margin: 0,
                          color: "#111111",
                        }}
                      >
                        {msg}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* 내 마음 들여다보기 */}
              {visibleCount >= structured.messages.length &&
                structured.emotion && (
                  <div style={{ marginTop: 8 }}>
                    <Divider />
                    <Label>내 마음 들여다보기</Label>

                    {/* reflection + normalize + origin */}
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.9,
                        margin: "0 0 16px",
                        color: "#333",
                      }}
                    >
                      {structured.emotion.reflection}{" "}
                      {structured.emotion.normalize} {structured.emotion.origin}
                    </p>

                    {/* action */}
                    <div style={{ paddingBottom: 16 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: ACCENT,
                          margin: "0 0 6px",
                        }}
                      >
                        지금 해볼 것
                      </p>
                      <p
                        style={{
                          fontSize: 14,
                          lineHeight: 1.7,
                          margin: 0,
                          fontWeight: 600,
                          color: "#111111",
                        }}
                      >
                        {structured.emotion.action}
                      </p>
                    </div>

                    {/* reframe */}
                    <div style={{ paddingTop: 4 }}>
                      <p
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#999",
                          margin: "0 0 6px",
                        }}
                      >
                        한 걸음 물러서서
                      </p>
                      <p
                        style={{
                          fontSize: 13,
                          lineHeight: 1.9,
                          margin: 0,
                          color: "#666",
                        }}
                      >
                        {structured.emotion.reframe}
                      </p>
                    </div>
                  </div>
                )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        * { -webkit-tap-highlight-color: transparent; box-sizing: border-box; }
        ::placeholder { color: #ccc; }
      `}</style>
    </div>
  );
}
