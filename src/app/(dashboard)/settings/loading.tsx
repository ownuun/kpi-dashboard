export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-6 animate-pulse">
      <div className="h-8 w-20 bg-slate-200 rounded" />

      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border bg-white p-6 space-y-4">
          <div className="h-6 w-24 bg-slate-200 rounded" />
          <div className="h-4 w-48 bg-slate-100 rounded" />
          <div className="space-y-3">
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-10 bg-slate-50 rounded" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
