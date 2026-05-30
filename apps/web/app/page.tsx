"use client";

import { useState, useRef } from "react";

const TONES = [
  { key: "chill", label: "느긋하게", emoji: "🧊" },
  { key: "menhera", label: "멘헤라", emoji: "👿" },
  { key: "ultra", label: "극한집착", emoji: "🔥" },
];

interface Structured {
  temperature: number;
  verdict: string;
  emotion_label: string;
  messages: string[];
}

function TempGauge({ value }: { value: number }) {
  const color = value < 40 ? "#64B5F6" : value < 70 ? "#FFB74D" : "#E57373";
  const label =
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
    <div style={{ margin: "16px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 13,
            color: "#888",
          }}
        >
          집착 온도
        </span>
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 40,
            fontWeight: 700,
            color,
            lineHeight: 1,
          }}
        >
          {value}°
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: 6,
          background: "#1a1a1a",
          borderRadius: 3,
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
            borderRadius: 3,
          }}
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 6,
        }}
      >
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 10,
            color: "#555",
          }}
        >
          0°
        </span>
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 11,
            color,
            fontWeight: 600,
          }}
        >
          {label}
        </span>
        <span
          style={{
            fontFamily: "Pretendard, sans-serif",
            fontSize: 10,
            color: "#555",
          }}
        >
          100°
        </span>
      </div>
    </div>
  );
}

const emotionColors: Record<string, string> = {
  분노: "#9B59B6",
  의존감: "#E67E22",
  "통제 욕구": "#E74C3C",
  외로움: "#3498DB",
  두려움: "#8E44AD",
};

export default function MenheraBot() {
  const [situation, setSituation] = useState("");
  const [tone, setTone] = useState("menhera");
  const [structured, setStructured] = useState<Structured | null>(null);
  const [visibleCount, setVisibleCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  async function runJudge() {
    if (!situation.trim()) return;
    setLoading(true);
    setStructured(null);
    setVisibleCount(0);
    setError("");

    try {
      const res = await fetch("/internal/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ situation, tone }),
      });
      if (!res.ok) throw new Error();

      // 스트림 전체를 버퍼링 후 JSON 파싱
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

      // 말풍선 순차 표시
      for (let i = 0; i < parsed.messages.length; i++) {
        await new Promise(r => setTimeout(r, i === 0 ? 300 : 600));
        setVisibleCount(i + 1);
      }
    } catch {
      setError("판단 실패했어... 다시 시도해봐.");
      setLoading(false);
    }
  }

  const emotionColor = structured
    ? emotionColors[structured.emotion_label] ?? "#888"
    : "#888";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d0d",
        fontFamily: "Pretendard, sans-serif",
        padding: "0 0 80px",
      }}
    >
      <link
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        rel="stylesheet"
      />

      {/* 헤더 */}
      <div
        style={{ padding: "48px 24px 32px", borderBottom: "0.5px solid #222" }}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <h1
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#f0f0f0",
              margin: 0,
              lineHeight: 1.3,
            }}
          >
            그 사람 행동,
            <br />
            분석해보자
          </h1>
          <p style={{ fontSize: 12, color: "#555", marginTop: 10 }}>
            * 판단 결과는 멘헤라봇의 주관적 해석입니다
          </p>
        </div>
      </div>

      {/* 입력 영역 */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px 0" }}>
        {/* 상황 입력 */}
        <div style={{ marginBottom: 24 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#666",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            상황
          </label>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="카톡 읽씹 3시간 후에 인스타 스토리 올림..."
            rows={4}
            style={{
              width: "100%",
              background: "#141414",
              border: "0.5px solid #2a2a2a",
              borderRadius: 8,
              padding: "14px 16px",
              color: "#e0e0e0",
              fontFamily: "Pretendard, sans-serif",
              fontSize: 14,
              lineHeight: 1.7,
              resize: "none",
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#444")}
            onBlur={(e) => (e.target.style.borderColor = "#2a2a2a")}
          />
        </div>

        {/* 레벨 선택 */}
        <div style={{ marginBottom: 28 }}>
          <label
            style={{
              display: "block",
              fontSize: 11,
              color: "#666",
              marginBottom: 10,
              fontWeight: 500,
            }}
          >
            멘헤라 레벨
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {TONES.map((t) => (
              <button
                key={t.key}
                onClick={() => setTone(t.key)}
                style={{
                  flex: 1,
                  padding: "10px 8px",
                  background: tone === t.key ? "#f0f0f0" : "transparent",
                  border: `0.5px solid ${
                    tone === t.key ? "#f0f0f0" : "#2a2a2a"
                  }`,
                  borderRadius: 8,
                  cursor: "pointer",
                  color: tone === t.key ? "#0d0d0d" : "#666",
                  fontFamily: "Pretendard, sans-serif",
                  fontSize: 12,
                  fontWeight: tone === t.key ? 600 : 400,
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 4 }}>{t.emoji}</div>
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
            width: "100%",
            padding: "14px",
            background: loading || !situation.trim() ? "#1a1a1a" : "#f0f0f0",
            border: "none",
            borderRadius: 8,
            cursor: loading || !situation.trim() ? "not-allowed" : "pointer",
            color: loading || !situation.trim() ? "#444" : "#0d0d0d",
            fontFamily: "Pretendard, sans-serif",
            fontSize: 14,
            fontWeight: 600,
            transition: "all 0.15s",
          }}
        >
          {loading ? "분석 중..." : "판단하기"}
        </button>

        {error && (
          <p style={{ fontSize: 12, color: "#E57373", marginTop: 12, textAlign: "center" }}>
            {error}
          </p>
        )}

        {/* 결과 */}
        {structured && (
          <div ref={resultRef} style={{ marginTop: 40 }}>
            {/* 온도 카드 */}
            <div style={{
              background: "#141414", border: "0.5px solid #222",
              borderRadius: 12, padding: "20px", marginBottom: 24,
            }}>
              <TempGauge value={structured.temperature} />
              <div style={{ fontSize: 13, color: "#888", marginTop: 8 }}>
                판단: <span style={{ color: "#f0f0f0", fontWeight: 600 }}>{structured.verdict}</span>
              </div>
            </div>

            {/* 채팅 말풍선 목록 */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {structured.messages.slice(0, visibleCount).map((msg, i) => (
                <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", animation: "fadeUp 0.3s ease" }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "#1a1a1a", border: "0.5px solid #333",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>👿</div>
                  <div style={{ flex: 1 }}>
                    {i === 0 && (
                      <div style={{ fontSize: 12, color: "#555", marginBottom: 6, fontWeight: 500 }}>멘헤라봇</div>
                    )}
                    <div style={{
                      background: "#141414",
                      border: `0.5px solid ${emotionColor}30`,
                      borderRadius: i === 0 ? "0px 12px 12px 12px" : "12px",
                      padding: "12px 16px",
                    }}>
                      <p style={{ fontSize: 14, color: "#ddd", lineHeight: 1.8, margin: 0 }}>{msg}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 감정 태그 */}
            {visibleCount >= structured.messages.length && (
              <div style={{ marginTop: 16, paddingLeft: 46 }}>
                <span style={{
                  background: `${emotionColor}20`, color: emotionColor,
                  fontSize: 11, fontWeight: 600,
                  padding: "3px 10px", borderRadius: 20,
                  border: `0.5px solid ${emotionColor}40`,
                }}>
                  # {structured.emotion_label}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
