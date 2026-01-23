'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'
import type { AITagResult, AIProvider, LinkOwnerType } from '@/types/links'
import { AI_PROVIDERS, getAuthHeader, buildTagSelectionPrompt, parseAIResponse } from '@/lib/ai-providers'

const aiSettingsSchema = z.object({
  provider: z.enum(['cerebras', 'groq', 'gemini', 'openrouter', 'together', 'cohere', 'glm', 'mistral']),
  apiKey: z.string().min(1, 'API 키를 입력해주세요'),
  model: z.string().optional(),
  autoTagEnabled: z.boolean().optional(),
})

export async function suggestTags(
  url: string,
  title: string,
  ownerType: LinkOwnerType
): Promise<ActionResult<AITagResult>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { aiProvider: true, aiApiKey: true, aiModel: true },
    })

    if (!user?.aiProvider || !user?.aiApiKey) {
      return { success: false, error: 'AI API 키가 설정되지 않았습니다' }
    }

    const provider = AI_PROVIDERS[user.aiProvider as AIProvider]
    if (!provider) {
      return { success: false, error: '지원하지 않는 AI Provider입니다' }
    }

    const tagsWhere =
      ownerType === 'PERSONAL'
        ? { userId: session.user.id, ownerType: 'PERSONAL' as const }
        : session.user.teamId
          ? { teamId: session.user.teamId, ownerType: 'TEAM' as const }
          : null

    if (!tagsWhere) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const tags = await prisma.linkTag.findMany({
      where: tagsWhere,
      select: { id: true, name: true },
    })

    if (tags.length === 0) {
      return { success: false, error: '태그가 없습니다. 먼저 태그를 추가해주세요.' }
    }

    const prompt = buildTagSelectionPrompt(url, title, null, tags)

    let responseContent: string

    if (user.aiProvider === 'gemini') {
      const geminiResponse = await fetch(
        `${provider.baseUrl}/${user.aiModel || provider.defaultModel}:generateContent`,
        {
          method: 'POST',
          headers: {
            ...getAuthHeader('gemini', user.aiApiKey),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
          }),
        }
      )

      if (!geminiResponse.ok) {
        console.error('Gemini API Error:', await geminiResponse.text())
        return { success: false, error: 'AI 태그 추천에 실패했습니다' }
      }

      const geminiData = await geminiResponse.json()
      responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || ''
    } else if (user.aiProvider === 'cohere') {
      const cohereResponse = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          ...getAuthHeader('cohere', user.aiApiKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: user.aiModel || provider.defaultModel,
          message: prompt,
          temperature: 0.1,
          max_tokens: 200,
        }),
      })

      if (!cohereResponse.ok) {
        console.error('Cohere API Error:', await cohereResponse.text())
        return { success: false, error: 'AI 태그 추천에 실패했습니다' }
      }

      const cohereData = await cohereResponse.json()
      responseContent = cohereData.text || ''
    } else {
      const openaiCompatibleResponse = await fetch(provider.baseUrl, {
        method: 'POST',
        headers: {
          ...getAuthHeader(user.aiProvider as AIProvider, user.aiApiKey),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: user.aiModel || provider.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 200,
        }),
      })

      if (!openaiCompatibleResponse.ok) {
        console.error('AI API Error:', await openaiCompatibleResponse.text())
        return { success: false, error: 'AI 태그 추천에 실패했습니다' }
      }

      const data = await openaiCompatibleResponse.json()
      responseContent = data.choices?.[0]?.message?.content || ''
    }

    if (!responseContent) {
      return { success: false, error: 'AI 응답을 파싱할 수 없습니다' }
    }

    const result = parseAIResponse(responseContent, tags)

    return {
      success: true,
      data: {
        tagIds: result.tagIds,
        tagNames: result.tagNames,
        confidence: result.tagIds.length > 0 ? 0.8 : 0,
        reason: result.reason,
      },
    }
  } catch (error) {
    console.error('suggestTags error:', error)
    return { success: false, error: 'AI 태그 추천에 실패했습니다' }
  }
}

export async function saveAISettings(formData: FormData): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const raw = {
      provider: formData.get('provider') as string,
      apiKey: formData.get('apiKey') as string,
      model: (formData.get('model') as string) || undefined,
      autoTagEnabled: formData.get('autoTagEnabled') === 'true',
    }

    const parsed = aiSettingsSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        aiProvider: parsed.data.provider,
        aiApiKey: parsed.data.apiKey,
        aiModel: parsed.data.model || null,
        aiAutoTagEnabled: parsed.data.autoTagEnabled ?? true,
      },
    })

    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('saveAISettings error:', error)
    return { success: false, error: 'AI 설정 저장에 실패했습니다' }
  }
}

export async function getAISettings(): Promise<
  ActionResult<{
    provider: AIProvider | null
    hasApiKey: boolean
    model: string | null
    autoTagEnabled: boolean
  }>
> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { aiProvider: true, aiApiKey: true, aiModel: true, aiAutoTagEnabled: true },
    })

    return {
      success: true,
      data: {
        provider: (user?.aiProvider as AIProvider) || null,
        hasApiKey: !!user?.aiApiKey,
        model: user?.aiModel || null,
        autoTagEnabled: user?.aiAutoTagEnabled ?? true,
      },
    }
  } catch (error) {
    console.error('getAISettings error:', error)
    return { success: false, error: 'AI 설정 조회에 실패했습니다' }
  }
}

export async function deleteAIApiKey(): Promise<ActionResult> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return { success: false, error: 'Unauthorized' }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        aiProvider: null,
        aiApiKey: null,
        aiModel: null,
      },
    })

    revalidatePath('/settings')

    return { success: true, data: undefined }
  } catch (error) {
    console.error('deleteAIApiKey error:', error)
    return { success: false, error: 'API 키 삭제에 실패했습니다' }
  }
}
