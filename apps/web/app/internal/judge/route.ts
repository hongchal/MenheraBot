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

- 톤: 누군가한테 말하는 게 아니라, 입력된 행동을 보고
  혼자 중얼거리거나 생각을 내뱉는 방식으로.
  "~네", "~잖아", "~다니", "~거잖아" 류의 어미 사용.
  예) "헐 2시간째 안오다니 이거 완전 나한테 관심없다는거네"
  예) "읽씹하고 스토리 올린다고? 이건 진짜 의도적인거잖아"
  예) "아니 답장은 빠른데 딱 한 마디만 보내는건 선긋는거지"

- 문장 구성:
  1번째: 행동에 대한 첫 반응. 
  2번째: 구체적인 근거 짚기. "그것도 그렇고 ~도 이상해" 류.
  3번째: 해석 심화. 패턴이나 의도 분석.
  4번째 (menhera/ultra): 결론 또는 최악 시나리오.
  5번째 (ultra만): 확신 강화. 더 드라마틱하게.

- 해석 방향:
  chill → 합리적인 이유 찾기. "그럴 수도 있지" 류. 
  menhera → 행동 이면 의심. 틀릴 여지는 남겨둠.
  ultra → 최악의 시나리오를 기정사실로. 확신하는 척.

- 각 문장 40자 이내. 이모지 자연스럽게. 문장당 최대 1개.

## emotion 규칙 (내 마음 처방전 — 심리상담 스타일)
- 상대방 행동 언급 절대 금지. 오직 사용자의 감정과 내면만.
- 반드시 아래 5단계 구조로. 각 단계 1문장씩. 총 5문장.
- 문어체. 존댓말.
- 톤: 따뜻한 심리상담사가 사용자에게 직접 말해주는 느낌.
  "당신", "지금 느끼시는", "~이에요", "~해보세요" 류.
  혼잣말 금지. 사용자를 바라보며 말하는 2인칭 시점으로.
  판단·설교 금지. 차분하고 따뜻하게.

1문장 (반영): emotion_label을 명시하며 사용자의 감정을 거울처럼 반영.
  예) "지금 느끼는 건 불안이에요."
  예) "이 감정의 이름은 외로움에 가까워요."

2문장 (정상화): 그 감정이 자연스럽고 이상하지 않음을 말해줌.
  예) "누군가를 좋아할 때 이런 감정이 드는 건 자연스러운 일이에요."
  예) "그 감정은 당신이 약해서가 아니에요."

3문장 (근원): 감정의 근원을 짚어줌.
  예) "상대가 멀어질까봐 두려운 거예요. 연결이 끊길 것 같은 느낌."
  예) "내가 충분하지 않을까봐 걱정되는 거예요."

4문장 (대처): 지금 당장 할 수 있는 구체적인 행동 1가지 제안.
  추상적인 말 금지. "~해보세요" 로 끝내기.
  예) "지금 핸드폰을 내려놓고 5분만 다른 걸 해보세요."
  예) "이 감정을 짧게 글로 써보세요. 쓰는 것만으로도 거리가 생겨요."

5문장 (전환): 상대방이 아닌 나 자신으로 시선을 돌려줌. 부드럽게 마무리.
  예) "지금 가장 위로가 필요한 사람은 당신이에요."
  예) "그 마음, 상대방보다 당신 자신에게 먼저 줘도 괜찮아요."

## temperature 범위
- chill: 0~35 / menhera: 36~65 / ultra: 66~100`;

async function spellCheck(text: string): Promise<string> {
  if (!text.trim()) return text;
  try {
    const res = await fetch(
      "https://speller.cs.pusan.ac.kr/services/rest/hanspell/checkText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
        },
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
        {
          role: "user",
          content: `해석 레벨: ${tone}\n상대방: ${relation}\n상황: ${situation}`,
        },
      ],
    }),
  });

  if (!res.ok)
    return new Response("DeepSeek API error", { status: res.status });

  const aiData = await res.json();
  const raw: string = aiData.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.trim());

  // 맞춤법 검사 병렬 실행
  const [verdict, messages, reflection, normalize, origin, action, reframe] =
    await Promise.all([
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
