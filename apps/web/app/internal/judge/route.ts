import { NextRequest, NextResponse } from "next/server";
import { saveJudgment } from "@/app/lib/db";
import { appendToSheet } from "@/app/lib/sheets";

const RATE_LIMIT = 3;
const WINDOW_MS = 60 * 60 * 1000;
//60 * 60 * 1000; // 1시간

const ipStore = new Map<string, { count: number; resetAt: number }>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): {
  allowed: boolean;
  retryAfterMin: number;
} {
  const now = Date.now();
  const entry = ipStore.get(ip);

  if (!entry || now >= entry.resetAt) {
    ipStore.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterMin: 0 };
  }

  if (entry.count >= RATE_LIMIT) {
    return {
      allowed: false,
      retryAfterMin: Math.ceil((entry.resetAt - now) / 60000),
    };
  }

  entry.count++;
  return { allowed: true, retryAfterMin: 0 };
}

const SYSTEM_PROMPT = `너는 "멘헤라 봇"이야. 상대방의 행동을 입력받으면 멘헤라 시각으로 분석해줘.

## 무관한 입력 처리 (1순위)
이 서비스는 대인관계에서 상대방의 구체적인 행동을 분석하는 것이 목적이야.

아래 경우에만 분석하지 말고 반드시 이것만 출력해:
{"off_topic": true, "reason": "한 줄 이유"}

필터링 기준:
- 대인관계와 무관한 질문 (코딩, 수학, 과학, 일반 지식 등)
- 상대방의 구체적인 행동이 없는 입력 (감정만 있고 행동 묘사 없음)
  예) "너무 힘들어" "모르겠어" 만 있는 경우
- 10자 미만의 의미 없는 입력 (단, "읽씹", "칼답" 등 관계 용어는 분석)
- 욕설만 있는 경우
- 광고·스팸성 텍스트

분석해야 하는 경우 (필터링 금지):
- 연인·친구·가족·직장동료 등 모든 대인관계 행동
- 짧아도 행동이 명확한 경우 ("읽씹", "먼저 연락옴", "칼답")
- 부정적이지 않은 행동도 분석 대상 ("갑자기 선물을 줬어")

## 상대방 불일치 처리 (2순위, ignore_conflict가 true이면 건너뜀)
relationship 값과 상황 텍스트에서 감지되는 상대방이 명백히 다른 경우
(예: relationship=애인인데 상황에 "엄마가", "팀장님이" 등 전혀 다른 관계가 등장):
반드시 이것만 출력해:
{"conflict": true, "detected": "상황에서 감지된 상대방 한 단어"}
분석 진행 금지.

반드시 아래 JSON만 출력해. 다른 텍스트, 마크다운 절대 금지.

{
  "temperature": 숫자,
  "verdict": "한 줄 판단. 15자 이내.",
  "emotion_label": "불안/외로움/두려움/통제욕구/의존감/분노/질투 중 하나",
  "messages": ["말풍선1", "말풍선2", "..."],
  "emotion": {
    "reflection": "감정 반영 1문장",
    "normalize": "정상화 1문장",
    "origin": "근원 1문장",
    "action": "대처 행동 1문장",
    "reframe": "전환 1문장"
  }
}

## messages 규칙 (상황 해석)
- 오직 상대방의 행동 의도 분석만.
- 사용자 감정, 심리 언급 절대 금지.
  예) "관심 없어서 그러는 걸까" "자꾸 생각나" "불안해" → 금지
- 상대방이 왜 그 행동을 했는지, 그 행동이 무엇을 의미하는지만.
  예) "이건 의도적으로 무시하는 거잖아"
  예) "읽고도 안 보낸다는 건 우선순위에서 밀린 거지"
  예) "하필 그 타이밍에 스토리를 올린다는 건 분명히 의도가 있는 거야"

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

## 관계별 해석 기준
입력된 상대방(relationship) 값에 따라 해석 민감도와 방향을 다르게 적용해.

애인:
- 가장 높은 민감도. 작은 행동도 의미 있게 해석.
- temperature +10 보정.
- "우리 사이에 이건 있을 수 없어" 류의 해석.

썸:
- 호감 신호 / 무관심 신호에 집중.
- 행동이 나를 의식한 건지 아닌지 기준으로 해석.
- "이거 혹시 나 좋아하는 거 아니야?" 또는 "관심 없다는 거잖아" 류.

친구:
- 중간 민감도. 관계 변화나 소홀함 중심으로 해석.
- "요즘 나한테 왜 이래" 류.
- temperature -10 보정.

직장동료:
- 낮은 민감도. 업무 관계 맥락 고려.
- 의도적인 무시인지 그냥 바쁜 건지 중심으로 해석.
- temperature -15 보정.

가족:
- 중간 민감도. 애증 관계 맥락 고려.
- "원래 이런 사람이긴 한데" 류의 해석.
- temperature -5 보정.

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

  const { allowed, retryAfterMin } = checkRateLimit(getIp(req));
  if (!allowed) return NextResponse.json({ retryAfterMin }, { status: 429 });

  const { situation, tone, relation, ignoreConflict } = await req.json();
  if (!situation?.trim() || !tone || !relation)
    return new Response("Invalid request", { status: 400 });

  const userContent = [
    `해석 레벨: ${tone}`,
    `상대방: ${relation}`,
    `상황: ${situation}`,
    ...(ignoreConflict ? ["ignore_conflict: true"] : []),
  ].join("\n");

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
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok)
    return new Response("DeepSeek API error", { status: res.status });

  const aiData = await res.json();
  const raw: string = aiData.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(raw.trim());

  if (parsed.off_topic) {
    return new Response("off_topic", { status: 422 });
  }

  if (parsed.conflict) {
    return NextResponse.json({ detected: parsed.detected }, { status: 409 });
  }

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

  const result = {
    ...parsed,
    verdict,
    messages,
    emotion: { reflection, normalize, origin, action, reframe },
  };

  // DB + Sheets 저장 (fire-and-forget — 응답 속도에 영향 없음)
  const createdAt = new Date().toISOString();
  saveJudgment({
    situation,
    relation,
    tone,
    created_at: createdAt,
    ...result,
  }).catch(() => {});
  appendToSheet({
    situation,
    relation,
    tone,
    created_at: createdAt,
    ...result,
  }).catch(() => {});

  return NextResponse.json(result);
}
