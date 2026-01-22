export default function CategoriesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 bg-slate-200 rounded" />
        <div className="h-10 w-32 bg-slate-200 rounded" />
      </div>

      <div className="flex gap-2">
        <div className="h-10 w-32 bg-slate-100 rounded" />
        <div className="h-10 w-32 bg-slate-100 rounded" />
      </div>

      <div className="rounded-lg border bg-white p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-14 bg-slate-50 rounded" />
        ))}
      </div>
    </div>
  )
}
