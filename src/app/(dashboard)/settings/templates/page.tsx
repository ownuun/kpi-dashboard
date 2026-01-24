import { getEnabledTemplateCategories } from '@/actions/teams'
import { TemplatesClient } from './templates-client'

export default async function TemplatesPage() {
  const result = await getEnabledTemplateCategories()
  const enabledTemplates = result.success ? result.data : ['sales']

  return <TemplatesClient initialEnabledCategories={enabledTemplates} />
}
