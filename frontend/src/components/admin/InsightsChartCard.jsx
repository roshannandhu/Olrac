export default function InsightsChartCard({ title, description, children, height = 320 }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="px-6 py-5 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      </div>
      <div className="p-4 sm:p-6" style={{ height }}>
        {children}
      </div>
    </div>
  )
}
