'use client';

import { useState, useEffect, useRef } from 'react';

const TONES = [
  { key: 'chill', label: '느긋하게', emoji: '🧊' },
  { key: 'menhera', label: '멘헤라', emoji: '🌸' },
  { key: 'ultra', label: '극한집착', emoji: '🔥' },
];


interface JudgeResult {
  temperature: number;
  verdict: string;
  interpretation: string;
  real_emotion: string;
  emotion_label: string;
}

function TempGauge({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = () => {
      start += Math.ceil((value - start) / 8);
      if (start >= value) { setDisplay(value); return; }
      setDisplay(start);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);

  const color = display < 40 ? '#64B5F6' : display < 70 ? '#FFB74D' : '#E57373';
  const label =
    display < 30 ? '냉담' :
    display < 50 ? '미지근' :
    display < 70 ? '위험' :
    display < 85 ? '적신호' : '폭발직전';

  return (
    <div style={{ margin: '20px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 13, color: '#888', letterSpacing: '0.05em' }}>집착 온도</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 42, fontWeight: 400, color, lineHeight: 1 }}>{display}°</span>
      </div>
      <div style={{ position: 'relative', height: 6, background: '#1a1a1a', borderRadius: 3 }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, height: '100%',
          width: `${display}%`, background: color,
          borderRadius: 3, transition: 'width 0.05s linear',
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#555' }}>0°</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color, letterSpacing: '0.05em' }}>{label}</span>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#555' }}>100°</span>
      </div>
    </div>
  );
}

export default function MenheraBot() {
  const [situation, setSituation] = useState('');
  const [tone, setTone] = useState('menhera');
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  async function runJudge() {
    if (!situation.trim()) return;
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const res = await fetch('/internal/judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ situation, tone }),
      });
      if (!res.ok) throw new Error();
      const parsed: JudgeResult = await res.json();
      setResult(parsed);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch {
      setError('판단 실패했어... 다시 시도해봐.');
    }
    setLoading(false);
  }

  const emotionColors: Record<string, string> = {
    '분노': '#9B59B6',
    '의존감': '#E67E22',
    '통제 욕구': '#E74C3C',
    '외로움': '#3498DB',
    '두려움': '#8E44AD',
  };
  const emotionColor = result ? (emotionColors[result.emotion_label] || '#888') : '#888';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0d0d',
      fontFamily: "'Noto Sans KR', sans-serif",
      padding: '0 0 80px',
    }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500&family=Noto+Serif+KR:wght@400;600&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {/* 헤더 */}
      <div style={{ padding: '48px 24px 32px', borderBottom: '0.5px solid #222' }}>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <div style={{
            display: 'inline-block',
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            color: '#555', letterSpacing: '0.15em',
            border: '0.5px solid #333', padding: '3px 10px',
            borderRadius: 2, marginBottom: 16,
          }}>MENHERA BOT v1</div>
          <h1 style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 28, fontWeight: 600,
            color: '#f0f0f0', margin: 0, lineHeight: 1.3,
          }}>그 사람 행동,<br />일단 분석해보자</h1>
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#555', marginTop: 10, letterSpacing: '0.03em' }}>
            * 판단 결과는 멘헤라 AI의 주관적 해석입니다
          </p>
        </div>
      </div>

      {/* 입력 영역 */}
      <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 24px 0' }}>

        {/* 상황 입력 */}
        <div style={{ marginBottom: 24 }}>
          <label style={{
            display: 'block', fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: '#666', letterSpacing: '0.12em',
            marginBottom: 10,
          }}>SITUATION</label>
          <textarea
            value={situation}
            onChange={e => setSituation(e.target.value)}
            placeholder="카톡 읽씹 3시간 후에 인스타 스토리 올림..."
            rows={4}
            style={{
              width: '100%', background: '#141414',
              border: '0.5px solid #2a2a2a', borderRadius: 4,
              padding: '14px 16px', color: '#e0e0e0',
              fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14,
              lineHeight: 1.7, resize: 'none', outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => (e.target.style.borderColor = '#444')}
            onBlur={e => (e.target.style.borderColor = '#2a2a2a')}
          />
        </div>

        {/* 레벨 선택 */}
        <div style={{ marginBottom: 28 }}>
          <label style={{
            display: 'block', fontFamily: "'DM Mono', monospace",
            fontSize: 10, color: '#666', letterSpacing: '0.12em',
            marginBottom: 10,
          }}>INTERPRETATION LEVEL</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {TONES.map(t => (
              <button key={t.key} onClick={() => setTone(t.key)} style={{
                flex: 1, padding: '10px 8px',
                background: tone === t.key ? '#f0f0f0' : 'transparent',
                border: `0.5px solid ${tone === t.key ? '#f0f0f0' : '#2a2a2a'}`,
                borderRadius: 4, cursor: 'pointer',
                color: tone === t.key ? '#0d0d0d' : '#666',
                fontFamily: "'Noto Sans KR', sans-serif", fontSize: 12,
                fontWeight: tone === t.key ? 500 : 300,
                transition: 'all 0.15s',
              }}>
                <div style={{ fontSize: 16, marginBottom: 3 }}>{t.emoji}</div>
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
            width: '100%', padding: '14px',
            background: loading || !situation.trim() ? '#1a1a1a' : '#f0f0f0',
            border: 'none', borderRadius: 4,
            cursor: loading || !situation.trim() ? 'not-allowed' : 'pointer',
            color: loading || !situation.trim() ? '#444' : '#0d0d0d',
            fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14, fontWeight: 500,
            letterSpacing: '0.05em', transition: 'all 0.15s',
          }}
        >
          {loading ? '판단 중...' : '판단하기'}
        </button>

        {error && (
          <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#E57373', marginTop: 12, textAlign: 'center' }}>{error}</p>
        )}

        {/* 결과 */}
        {result && (
          <div ref={resultRef} style={{ marginTop: 40 }}>

            {/* 온도 */}
            <div style={{
              background: '#141414', border: '0.5px solid #222',
              borderRadius: 6, padding: '24px 20px', marginBottom: 16,
            }}>
              <TempGauge value={result.temperature} />
              <div style={{ fontFamily: "'Noto Serif KR', serif", fontSize: 13, color: '#888', marginTop: 4 }}>
                판단: <span style={{ color: '#f0f0f0', fontWeight: 600 }}>{result.verdict}</span>
              </div>
            </div>

            {/* AI 해석 */}
            <div style={{
              background: '#141414', border: '0.5px solid #222',
              borderRadius: 6, padding: '20px', marginBottom: 16,
            }}>
              <div style={{
                fontFamily: "'DM Mono', monospace", fontSize: 10,
                color: '#555', letterSpacing: '0.12em', marginBottom: 12,
              }}>AI INTERPRETATION</div>
              <p style={{
                fontFamily: "'Noto Sans KR', sans-serif", fontSize: 14,
                color: '#ccc', lineHeight: 1.85, margin: 0,
              }}>{result.interpretation}</p>
            </div>

            {/* 감정 번역 */}
            <div style={{
              background: '#141414',
              border: `0.5px solid ${emotionColor}40`,
              borderLeft: `3px solid ${emotionColor}`,
              borderRadius: 6, padding: '20px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  color: '#555', letterSpacing: '0.12em',
                }}>EMOTION TRANSLATION</div>
                <div style={{
                  background: `${emotionColor}20`,
                  color: emotionColor,
                  fontFamily: "'DM Mono', monospace", fontSize: 10,
                  padding: '2px 8px', borderRadius: 2,
                  border: `0.5px solid ${emotionColor}40`,
                }}>{result.emotion_label}</div>
              </div>
              <p style={{
                fontFamily: "'Noto Serif KR', serif", fontSize: 14,
                color: '#bbb', lineHeight: 1.9, margin: 0,
              }}>{result.real_emotion}</p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
