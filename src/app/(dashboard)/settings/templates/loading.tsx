import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function TemplatesLoading() {
  return (
    <div className="max-w-4xl space-y-6">
      <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
      <div className="h-5 w-64 bg-slate-100 rounded animate-pulse" />
      
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <div className="h-6 w-32 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-100 rounded animate-pulse mt-2" />
            </CardHeader>
            <CardContent>
              <div className="h-32 bg-slate-100 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
