export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-slate-200 rounded" />
        <div className="h-10 w-28 bg-slate-200 rounded" />
      </div>

      <div className="h-[380px] bg-slate-100 rounded-lg" />

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-slate-100 rounded-lg" />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-64 bg-slate-100 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
