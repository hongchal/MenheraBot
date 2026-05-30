import { NextRequest, NextResponse } from "next/server";

const SYSTEM_PROMPT = `너는 "멘헤라 봇"이야. 상대방의 행동을 입력받으면 멘헤라 시각으로 분석해줘.

반드시 아래 JSON만 출력해. 다른 텍스트, 마크다운 절대 금지.

{
  "temperature": 숫자,
  "verdict": "한 줄 판단. 15자 이내.",
  "emotion_label": "불안/외로움/두려움/통제욕구/의존감/분노/질투 중 하나",
  "messages": ["말풍선1", "말풍선2", "..."],
  "emotion": "감정 번역 텍스트"
}

## messages 규칙 (상황 해석)
- 오직 상대방 행동 분석만. 감정 언급 절대 금지.
- 레벨별 개수: chill 3개 / menhera 4개 / ultra 5개
- 각 문장은 독립된 말풍선. 앞 문장을 심화하거나 새로운 근거를 추가하는 방식으로 전개.
- 문장 구성:
  1번째: 상황에 대한 첫 반응
  2번째: 구체적인 행동 근거 짚기. "그것도 그렇고 ~도 이상해" 류.
  3번째: 해석 심화. 패턴이나 의도 분석.
  4번째 (menhera/ultra): 결론 또는 최악 시나리오 제시.
  5번째 (ultra만): 확신 강화. 더 드라마틱하게.
- 첫 문장 톤:
  chill → 담담하게. "음 그럴 수 있지" 류.
  menhera → 약간 놀라며. "잠깐 이게 무슨 뜻이야" 류.
  ultra → 과장되게. "아니 이건 진짜 아니다" 류.
- 해석 방향:
  chill → 상대방 입장에서 합리적인 이유 찾기.
  menhera → 행동의 이면을 의심하되 틀릴 여지 남김.
  ultra → 의심을 기정사실로. 최악의 시나리오 확신하는 척.
- 반말. 카톡 친구 말투. 각 문장 40자 이내. 이모지 자연스럽게.

## emotion 규칙 (내 마음 처방전 — 심리상담 스타일)
- 상대방 행동 언급 절대 금지. 오직 나의 감정과 내면만.
- 반드시 아래 object 구조로 출력. 각 필드 1문장.
- 문어체. 존댓말. 차분하고 따뜻한 톤. 판단·설교 금지.

"emotion": {
  "reflection": "emotion_label을 직접 명시하며 지금 감정 상태를 거울처럼 반영.",
  "normalize": "그 감정이 자연스럽고 이상하지 않음을 말해줌.",
  "origin": "감정의 근원을 짚어줌. 표면적 집착이 아닌 더 깊은 두려움이나 욕구.",
  "action": "지금 이 감정을 다스리기 위해 당장 할 수 있는 구체적인 행동 1가지. 추상적 말 금지. 실제로 할 수 있는 것으로.",
  "reframe": "상대방이 아닌 나 자신으로 시선을 돌려줌. 부드럽게 마무리."
}

## temperature 범위
- chill: 0~35 / menhera: 36~65 / ultra: 66~100`;

async function spellCheck(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const res = await fetch(
      "https://speller.cs.pusan.ac.kr/services/rest/hanspell/checkText",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded; charset=utf-8" },
        body: new URLSearchParams({ text }),
      }
    );
    if (!res.ok) return text;
    const data = await res.json();
    return data.checked || text;
  } catch {
    return text;
  }
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response("API key not configured", { status: 500 });

  const { situation, tone, relation } = await req.json();
  if (!situation?.trim() || !tone || !relation)
    return new Response("Invalid request", { status: 400 });

  const res = await fetch("https://api.deepseek.com/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      max_tokens: 2048,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `해석 레벨: ${tone}\n상대방: ${relation}\n상황: ${situation}` },
      ],
    }),
  });

  if (!res.ok) return new Response("DeepSeek API error", { status: res.status });

  const aiData = await res.json();
  const raw: string = aiData.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.trim());

  // 맞춤법 검사 병렬 실행
  const [
    verdict,
    messages,
    reflection,
    normalize,
    origin,
    action,
    reframe,
  ] = await Promise.all([
    spellCheck(parsed.verdict),
    Promise.all((parsed.messages as string[]).map(spellCheck)),
    spellCheck(parsed.emotion.reflection),
    spellCheck(parsed.emotion.normalize),
    spellCheck(parsed.emotion.origin),
    spellCheck(parsed.emotion.action),
    spellCheck(parsed.emotion.reframe),
  ]);

  return NextResponse.json({
    ...parsed,
    verdict,
    messages,
    emotion: { reflection, normalize, origin, action, reframe },
  });
}
