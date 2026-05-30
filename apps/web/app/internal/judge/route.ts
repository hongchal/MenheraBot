import { NextRequest } from "next/server";

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

## emotion 규칙 (감정 번역 — 심리상담 스타일)
- 상대방 행동 언급 절대 금지. 오직 나의 감정과 내면만.
- 반드시 아래 4단계 구조로. 각 단계 1문장씩. 총 4문장.
- 문어체. 존댓말. 차분하고 따뜻한 톤. 판단·설교 금지.

1문장 (반영): emotion_label을 직접 명시하며 지금 감정을 거울처럼 반영.
  예) "지금 느끼는 건 불안이에요."
2문장 (정상화): 그 감정이 자연스럽고 이상하지 않음을 말해줌.
  예) "누군가를 좋아할 때 이런 감정이 드는 건 자연스러운 일이에요."
3문장 (근원): 감정의 근원을 짚어줌.
  예) "상대가 멀어질까봐 두려운 거예요. 연결이 끊길 것 같은 느낌."
4문장 (전환): 상대방이 아닌 나 자신으로 시선을 돌려줌. 부드럽게.
  예) "지금 가장 위로가 필요한 사람은 나예요."

## temperature 범위
- chill: 0~35 / menhera: 36~65 / ultra: 66~100`;

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
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `해석 레벨: ${tone}\n상대방: ${relation}\n상황: ${situation}` },
      ],
    }),
  });

  if (!res.ok)
    return new Response("DeepSeek API error", { status: res.status });

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            break;
          }

          const lines = decoder.decode(value).split("\n");
          for (const line of lines) {
            if (!line.startsWith("data: ") || line === "data: [DONE]") continue;
            try {
              const data = JSON.parse(line.slice(6));
              const content: string = data.choices?.[0]?.delta?.content ?? "";
              if (content)
                controller.enqueue(new TextEncoder().encode(content));
            } catch {}
          }
        }
      } catch {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
