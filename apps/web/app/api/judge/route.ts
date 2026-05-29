import { NextRequest, NextResponse } from 'next/server';

const SYSTEM_PROMPT = `너는 "멘헤라 봇"이야. 연인/지인 중 상대방의 행동을 입력받으면, 멘헤라 시각으로 해석해서 판단 해줘.

해석 레벨은 세 가지야:
- chill(느긋하게): 최대한 합리적으로 해석. 상대방을 변호하는 쪽.
- menhera(멘헤라): 약간 과잉해석. 의심하지만 유머러스하게.
- ultra(극한집착): 완전 최악의 시나리오로 해석. 드라마틱하게, 근데 약기게.

반드시 아래 JSON 형식으로만 답해. 다른 텍스트 없이 JSON만:
{
  "temperature": 숫자(0~100),
  "verdict": "한 줄 판단 (예: 시험 친 거, 그냥 받은 거, 적신호 주의 등)",
  "interpretation": "AI 멘헤라 해석 (2~4문장. 해석 레벨에 맞게. 말투는 친구처럼 가볍게.)",
  "real_emotion": "감정 번역 → 집착 뒤에 숨어있는 진짜 감정 (분노/의존감/통제 욕구 등을 언급. 2~3문장. 판단하지 않고 따뜻하게.)",
  "emotion_label": "진짜 감정 한 단어 (예: 분노, 의존감, 통제 욕구, 외로움, 두려움 중 하나)"
}`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
  }

  const { situation, tone } = await req.json();
  if (!situation?.trim() || !tone) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `해석 레벨: ${tone}\n상황: ${situation}` }],
    }),
  });

  if (!res.ok) {
    return NextResponse.json({ error: 'Anthropic API error' }, { status: res.status });
  }

  const data = await res.json();
  const text: string = data.content?.find((b: { type: string }) => b.type === 'text')?.text || '';
  const clean = text.replace(/```json|```/g, '').trim();

  return NextResponse.json(JSON.parse(clean));
}
