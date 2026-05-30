import { NextRequest } from 'next/server';

const SYSTEM_PROMPT = `너는 "멘헤라 봇"이야. 상대방의 행동을 입력받으면 멘헤라 시각으로 분석해줘.

반드시 아래 형식 그대로만 출력해. 절대로 다른 텍스트 없이:

첫 번째 줄: {"temperature": 숫자(0~100), "verdict": "한 줄 판단", "emotion_label": "분노/의존감/통제 욕구/외로움/두려움 중 하나"}
두 번째 줄부터: 멘헤라봇이 친구한테 카톡 보내듯 직접 말하는 메시지. 이모지 자연스럽게. 4~6문장. 해석+감정분석을 채팅 말투로 자연스럽게 녹여서.

해석 레벨:
- chill(느긋하게): 합리적으로 해석. 상대방 변호하는 쪽.
- menhera(멘헤라): 약간 과잉해석. 의심하지만 유머러스하게.
- ultra(극한집착): 최악의 시나리오. 드라마틱하게, 근데 약기게.`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return new Response('API key not configured', { status: 500 });

  const { situation, tone } = await req.json();
  if (!situation?.trim() || !tone) return new Response('Invalid request', { status: 400 });

  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      max_tokens: 2048,
      stream: true,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `해석 레벨: ${tone}\n상황: ${situation}` },
      ],
    }),
  });

  if (!res.ok) return new Response('DeepSeek API error', { status: res.status });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { controller.close(); break; }

          const lines = decoder.decode(value).split('\n');
          for (const line of lines) {
            if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;
            try {
              const data = JSON.parse(line.slice(6));
              const content: string = data.choices?.[0]?.delta?.content ?? '';
              if (content) controller.enqueue(new TextEncoder().encode(content));
            } catch {}
          }
        }
      } catch {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
