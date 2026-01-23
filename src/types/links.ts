// LinkOwnerType will be available after running: npx prisma generate
// For now, define the enum locally to allow TypeScript to work
export type LinkOwnerType = 'PERSONAL' | 'TEAM'

// ============================================
// 태그 타입
// ============================================

export interface LinkTagBasic {
  id: string
  name: string
  color: string
  ownerType: LinkOwnerType
}

export interface LinkTagWithCount extends LinkTagBasic {
  _count: {
    links: number
  }
}

// ============================================
// 링크 타입
// ============================================

export interface LinkWithDetails {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: LinkOwnerType
  tags: LinkTagBasic[]
  createdBy: {
    id: string
    name: string | null
    image: string | null
  }
  createdAt: Date
  updatedAt: Date
}

export interface CreateLinkInput {
  url: string
  title: string
  description?: string
  favicon?: string
  rating?: number
  ownerType: LinkOwnerType
  tagIds: string[]
}

export interface UpdateLinkInput {
  title?: string
  description?: string
  rating?: number
  tagIds?: string[]
}

export interface LinkFilters {
  ownerType?: LinkOwnerType
  tagIds?: string[]
  rating?: number
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginatedLinks {
  links: LinkWithDetails[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================
// AI 태그 추천
// ============================================

export interface AITagResult {
  tagIds: string[]
  tagNames: string[]
  confidence: number
  reason: string
}

export type AIProvider =
  | 'cerebras'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'together'
  | 'cohere'
  | 'glm'
  | 'mistral'

export interface AIProviderConfig {
  name: string
  baseUrl: string
  defaultModel: string
  freeLimit: string
  speed: string
  pricePerRequest: string
  signupUrl: string
}

// ============================================
// Chrome 북마크 가져오기
// ============================================

export interface ChromeBookmarkNode {
  id: string
  title: string
  url?: string
  children?: ChromeBookmarkNode[]
}

export interface FolderToTagMapping {
  folderPath: string
  tagName: string
  tagColor?: string
}

// ============================================
// 사용자 설정
// ============================================

export interface LinkSaveSettings {
  savePersonal: boolean
  saveTeam: boolean
}

export interface AISettings {
  provider: AIProvider | null
  apiKey: string | null
  model: string | null
  autoTagEnabled: boolean
}

// ============================================
// Extension API 응답
// ============================================

export interface ExtensionAuthCheckResponse {
  authenticated: boolean
  userId?: string
  teamId?: string | null
  hasAiApiKey: boolean
  aiProvider?: AIProvider | null
  aiAutoTagEnabled: boolean
  settings: LinkSaveSettings
}
