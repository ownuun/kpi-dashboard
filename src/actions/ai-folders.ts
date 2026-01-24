'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'
import type { AIFolderResult, AIProvider, LinkOwnerType } from '@/types/links'
import { AI_PROVIDERS, getAuthHeader, buildFolderSelectionPrompt, parseAIFolderResponse } from '@/lib/ai-providers'

const aiSettingsSchema = z.object({
  provider: z.enum(['cerebras', 'groq', 'gemini', 'openrouter', 'together', 'cohere', 'glm', 'mistral']),
  apiKey: z.string().min(1, 'API 키를 입력해주세요'),
  model: z.string().optional(),
  autoFolderEnabled: z.boolean().optional(),
})

interface FolderWithPath {
  id: string
  name: string
  path: string
}

interface FolderRecord {
  id: string
  name: string
  parentId: string | null
}

function buildFolderPath(
  folderId: string,
  foldersMap: Map<string, FolderRecord>
): string {
  const parts: string[] = []
  let currentId: string | null = folderId

  while (currentId) {
    const folder = foldersMap.get(currentId)
    if (!folder) break
    parts.unshift(folder.name)
    currentId = folder.parentId
  }

  return parts.join(' > ')
}

export async function suggestFolder(
  url: string,
  title: string,
  ownerType: LinkOwnerType
): Promise<ActionResult<AIFolderResult>> {
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

    const foldersWhere =
      ownerType === 'PERSONAL'
        ? { userId: session.user.id, ownerType: 'PERSONAL' as const }
        : session.user.teamId
          ? { teamId: session.user.teamId, ownerType: 'TEAM' as const }
          : null

    if (!foldersWhere) {
      return { success: false, error: '팀에 소속되어 있지 않습니다' }
    }

    const folders = await prisma.linkFolder.findMany({
      where: foldersWhere,
      select: { id: true, name: true, parentId: true },
    })

    if (folders.length === 0) {
      return { success: false, error: '폴더가 없습니다. 먼저 폴더를 추가해주세요.' }
    }

    const foldersMap = new Map<string, FolderRecord>(
      folders.map((f) => [f.id, { id: f.id, name: f.name, parentId: f.parentId }])
    )
    const foldersWithPath: FolderWithPath[] = folders.map((f) => ({
      id: f.id,
      name: f.name,
      path: buildFolderPath(f.id, foldersMap),
    }))

    const prompt = buildFolderSelectionPrompt(url, title, null, foldersWithPath)

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
        return { success: false, error: 'AI 폴더 추천에 실패했습니다' }
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
        return { success: false, error: 'AI 폴더 추천에 실패했습니다' }
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
        return { success: false, error: 'AI 폴더 추천에 실패했습니다' }
      }

      const data = await openaiCompatibleResponse.json()
      responseContent = data.choices?.[0]?.message?.content || ''
    }

    if (!responseContent) {
      return { success: false, error: 'AI 응답을 파싱할 수 없습니다' }
    }

    const result = parseAIFolderResponse(responseContent, foldersWithPath)

    if (!result.folderId) {
      return { success: false, error: '적합한 폴더를 찾지 못했습니다' }
    }

    return {
      success: true,
      data: {
        folderId: result.folderId,
        folderName: result.folderName,
        folderPath: result.folderPath,
        confidence: 0.8,
        reason: result.reason,
      },
    }
  } catch (error) {
    console.error('suggestFolder error:', error)
    return { success: false, error: 'AI 폴더 추천에 실패했습니다' }
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
      autoFolderEnabled: formData.get('autoFolderEnabled') === 'true',
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
        aiAutoTagEnabled: parsed.data.autoFolderEnabled ?? true,
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
    autoFolderEnabled: boolean
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
        autoFolderEnabled: user?.aiAutoTagEnabled ?? true,
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
