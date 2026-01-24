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

export function buildFolderSelectionPrompt(
  url: string,
  title: string,
  description: string | null,
  folders: Array<{ id: string; name: string; path: string }>
): string {
  return `당신은 링크 분류 전문가입니다. 주어진 링크에 가장 적합한 폴더를 기존 폴더 목록에서 선택해주세요.

## 링크 정보
- URL: ${url}
- 제목: ${title}
- 설명: ${description || '없음'}

## 사용 가능한 폴더 (이 중에서 하나만 선택)
${folders.map((f) => `- ${f.path} (id: ${f.id})`).join('\n')}

## 규칙
1. 반드시 위 폴더 목록에서 하나만 선택하세요
2. 링크 내용과 가장 관련 있는 폴더를 선택하세요
3. 하위 폴더가 있다면 가장 구체적인 폴더를 선택하세요
4. 적합한 폴더가 없으면 가장 상위 폴더를 선택하세요

## 응답 형식 (JSON만 출력)
{
  "folderId": "선택한 폴더 id",
  "reason": "선택 이유 (한 문장)"
}`
}

export function parseAIFolderResponse(
  content: string,
  availableFolders: Array<{ id: string; name: string; path: string }>
): { folderId: string | null; folderName: string; folderPath: string; reason: string } {
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return { folderId: null, folderName: '', folderPath: '', reason: 'AI 응답 파싱 실패' }
    }

    const parsed = JSON.parse(jsonMatch[0])
    const folder = availableFolders.find((f) => f.id === parsed.folderId)

    if (!folder) {
      return { folderId: null, folderName: '', folderPath: '', reason: 'AI가 선택한 폴더가 유효하지 않습니다' }
    }

    return {
      folderId: folder.id,
      folderName: folder.name,
      folderPath: folder.path,
      reason: parsed.reason || '',
    }
  } catch {
    return { folderId: null, folderName: '', folderPath: '', reason: 'AI 응답 파싱 실패' }
  }
}
