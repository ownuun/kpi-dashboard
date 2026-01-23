import type { AIProvider, AIProviderConfig } from '@/types/links'

export const AI_PROVIDERS: Record<AIProvider, AIProviderConfig> = {
  cerebras: {
    name: 'Cerebras',
    baseUrl: 'https://api.cerebras.ai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b',
    freeLimit: '1M 토큰/일',
    speed: '2000+ tok/s',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://cloud.cerebras.ai',
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
    freeLimit: '500K 토큰/일',
    speed: '280+ tok/s',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://console.groq.com/keys',
  },
  gemini: {
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.5-flash',
    freeLimit: '1000 요청/일',
    speed: '보통',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://aistudio.google.com/app/apikey',
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    freeLimit: '50 요청/일',
    speed: '모델별',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://openrouter.ai/settings/keys',
  },
  together: {
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1/chat/completions',
    defaultModel: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    freeLimit: '$25 크레딧',
    speed: '보통',
    pricePerRequest: '~₩0.3/회',
    signupUrl: 'https://api.together.xyz',
  },
  cohere: {
    name: 'Cohere',
    baseUrl: 'https://api.cohere.ai/v1/chat',
    defaultModel: 'command-a-03-2025',
    freeLimit: '1000 요청/월',
    speed: '보통',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://dashboard.cohere.com',
  },
  glm: {
    name: 'GLM (Z.AI)',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    freeLimit: '25M 토큰/30일',
    speed: '보통',
    pricePerRequest: '~₩0.1/회',
    signupUrl: 'https://z.ai',
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1/chat/completions',
    defaultModel: 'mistral-small-latest',
    freeLimit: '제한적',
    speed: '보통',
    pricePerRequest: '₩0 무료',
    signupUrl: 'https://console.mistral.ai',
  },
}

export function getAuthHeader(
  provider: AIProvider,
  apiKey: string
): Record<string, string> {
  if (provider === 'gemini') {
    return { 'x-goog-api-key': apiKey }
  }
  return { Authorization: `Bearer ${apiKey}` }
}

export function buildTagSelectionPrompt(
  url: string,
  title: string,
  description: string | null,
  tags: Array<{ id: string; name: string }>
): string {
  return `당신은 링크 분류 전문가입니다. 주어진 링크에 적합한 태그를 기존 태그 목록에서 선택해주세요.

## 링크 정보
- URL: ${url}
- 제목: ${title}
- 설명: ${description || '없음'}

## 사용 가능한 태그 (이 중에서만 선택)
${tags.map((t) => `- ${t.name} (id: ${t.id})`).join('\n')}

## 규칙
1. 반드시 위 태그 목록에서만 선택하세요
2. 1~5개의 태그를 선택하세요
3. 가장 관련성 높은 태그를 우선 선택하세요
4. 적합한 태그가 없으면 빈 배열을 반환하세요

## 응답 형식 (JSON만 출력)
{
  "tagIds": ["id1", "id2"],
  "reason": "선택 이유 (한 문장)"
}`
}

export function parseAIResponse(
  content: string,
  availableTags: Array<{ id: string; name: string }>
): { tagIds: string[]; tagNames: string[]; reason: string } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { tagIds: [], tagNames: [], reason: 'AI 응답 파싱 실패' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validTagIds = (parsed.tagIds || []).filter((id: string) =>
      availableTags.some((t) => t.id === id)
    )
    const tagNames = validTagIds
      .map((id: string) => availableTags.find((t) => t.id === id)?.name)
      .filter(Boolean) as string[]

    return {
      tagIds: validTagIds,
      tagNames,
      reason: parsed.reason || '',
    }
  } catch {
    return { tagIds: [], tagNames: [], reason: 'AI 응답 파싱 실패' }
  }
}
