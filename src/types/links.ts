// ============================================
// 링크 공유 타입 (v3.0 - 폴더 기반)
// ============================================

export type LinkOwnerType = 'PERSONAL' | 'TEAM'

// ============================================
// 폴더 타입
// ============================================

export interface LinkFolderBasic {
  id: string
  name: string
  icon: string | null
  ownerType: LinkOwnerType
  parentId: string | null
  sortOrder: number
}

export interface LinkFolderWithChildren extends LinkFolderBasic {
  children: LinkFolderWithChildren[]
  _count: {
    links: number
  }
}

export interface LinkFolderTree {
  personal: LinkFolderWithChildren[]
  team: LinkFolderWithChildren[]
  hasTeam: boolean
}

export interface CreateFolderInput {
  name: string
  icon?: string
  parentId?: string | null
  ownerType: LinkOwnerType
}

export interface UpdateFolderInput {
  name?: string
  icon?: string
}

// ============================================
// 링크 타입
// ============================================

export interface LinkViewUser {
  id: string
  name: string | null
  image: string | null
}

export interface LinkWithDetails {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: LinkOwnerType
  sortOrder: number
  folder: LinkFolderBasic
  createdBy: {
    id: string
    name: string | null
    image: string | null
  }
  viewedBy: LinkViewUser[]
  sourceTeamLinkId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateLinkInput {
  url: string
  title: string
  description?: string
  favicon?: string | null
  rating?: number
  ownerType: LinkOwnerType
  folderId: string
}

export interface UpdateLinkInput {
  title?: string
  description?: string | null
  rating?: number
  folderId?: string
}

export interface LinkFilters {
  ownerType?: LinkOwnerType
  folderId?: string
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
// AI 폴더 추천
// ============================================

export interface AIFolderResult {
  folderId: string
  folderName: string
  folderPath: string
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

export interface BookmarkImportNode {
  title: string
  url?: string
  children?: BookmarkImportNode[]
}

export interface BookmarkImportResult {
  foldersCreated: number
  linksCreated: number
  errors: string[]
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
  autoFolderEnabled: boolean
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
