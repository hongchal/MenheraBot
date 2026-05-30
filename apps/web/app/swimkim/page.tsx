'use client';

import { useEffect, useRef, useState } from 'react';

const GREETING = '수영아,';
const ACCENT_CHARS = new Set(['수', '영']);
const PETAL_GLYPHS = ['❀', '✿', '✦', '·'];
const PETAL_COLORS = ['#c97a6e', '#f4a787', '#c9a35b'];

export default function Home() {
  const [noteOpen, setNoteOpen] = useState(false);

  // Floating petals — kept identical to the original page so the live site
  // reads the same after the static→Next.js port.
  useEffect(() => {
    const petalTimers: number[] = [];
    function spawnPetal() {
      const petal = document.createElement('div');
      petal.className = 'petal';
      petal.textContent = PETAL_GLYPHS[Math.floor(Math.random() * PETAL_GLYPHS.length)];
      const startX = Math.random() * window.innerWidth;
      const size = 12 + Math.random() * 14;
      const duration = 9 + Math.random() * 8;
      const drift = (Math.random() - 0.5) * 200;
      const rotation = (Math.random() - 0.5) * 720;
      petal.style.left = `${startX}px`;
      petal.style.top = '-30px';
      petal.style.fontSize = `${size}px`;
      petal.style.color = PETAL_COLORS[Math.floor(Math.random() * PETAL_COLORS.length)];
      petal.style.opacity = String(0.3 + Math.random() * 0.3);
      petal.animate(
        [
          { transform: 'translate(0, 0) rotate(0deg)' },
          {
            transform: `translate(${drift}px, ${window.innerHeight + 60}px) rotate(${rotation}deg)`,
          },
        ],
        { duration: duration * 1000, easing: 'linear' }
      );
      document.body.appendChild(petal);
      const removal = window.setTimeout(() => petal.remove(), duration * 1000);
      petalTimers.push(removal);
    }
    const interval = window.setInterval(spawnPetal, 1200);
    for (let i = 0; i < 4; i++) {
      petalTimers.push(window.setTimeout(spawnPetal, i * 800));
    }
    return () => {
      window.clearInterval(interval);
      petalTimers.forEach((t) => window.clearTimeout(t));
      document.querySelectorAll('.petal').forEach((p) => p.remove());
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setNoteOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const heartRef = useRef<HTMLButtonElement>(null);
  const onHeartClick = () => {
    setNoteOpen(true);
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };

  return (
    <>
      <style>{`
        body {
          background:
            radial-gradient(ellipse 80% 60% at 50% -10%, rgba(244, 167, 135, 0.18) 0%, transparent 60%),
            radial-gradient(ellipse 60% 50% at 100% 100%, rgba(201, 122, 110, 0.12) 0%, transparent 50%),
            #fdf6ed;
        }
        body::before {
          content: '';
          position: fixed;
          inset: 0;
          background-image: radial-gradient(rgba(42, 29, 24, 0.025) 1px, transparent 1px);
          background-size: 4px 4px;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
      <div className="stage">
        <div className="label">— for sy —</div>

        <h1 className="greeting" id="greeting">
          {[...GREETING].map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className={`char${ACCENT_CHARS.has(ch) ? ' accent' : ''}`}
              style={{ animationDelay: `${0.6 + i * 0.12}s` }}
            >
              {ch}
            </span>
          ))}
        </h1>

        <p className="sub">널 위한 페이지야.</p>

        <div className="hand">— always &nbsp;♡</div>

        <button
          ref={heartRef}
          className="heart"
          aria-label="open"
          type="button"
          onClick={onHeartClick}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-7-4.35-9.5-9.5C0.5 7 4 3 8 3c2 0 3 1 4 2.5C13 4 14 3 16 3c4 0 7.5 4 5.5 8.5C19 16.65 12 21 12 21z" />
          </svg>
        </button>
      </div>

      <footer>MenheraBot · 2026</footer>

      <div
        className={`note${noteOpen ? ' open' : ''}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) setNoteOpen(false);
        }}
      >
        <div className="text">
          <em>수영아.</em>
          <br />
          이 작은 자리는 너만을 위한 곳이야.
          <br />
          가끔 들러서, 따뜻하게 머물다 가.
        </div>
        <button className="close" type="button" onClick={() => setNoteOpen(false)}>
          close
        </button>
      </div>
    </>
  );
}
