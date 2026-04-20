import { Link } from 'react-router-dom'

export default function AdminWorkspaceLayout({
  title,
  description,
  icon: Icon,
  sections,
  activeSection,
  action,
  children,
}) {
  return (
    <div className="page-container max-w-[1400px] mx-auto px-4 py-8 animate-fade-in bg-[#fafafa] min-h-screen">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            {Icon ? <Icon className="w-8 h-8 text-primary-600" /> : null}
            {title}
          </h1>
          {description ? (
            <p className="text-sm text-gray-500 mt-2 font-medium">{description}</p>
          ) : null}
        </div>
        {action}
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-72 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-2 sticky top-24">
            <nav className="space-y-1">
              {sections.map((section) => {
                const SectionIcon = section.icon
                const isActive = activeSection === section.id

                return (
                  <Link
                    key={section.id}
                    to={section.to}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <SectionIcon className={`w-5 h-5 mt-0.5 ${isActive ? 'text-primary-600' : 'text-gray-400'}`} />
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{section.label}</span>
                      {section.description ? (
                        <span className="block text-xs text-gray-500 mt-1">{section.description}</span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        <section className="flex-1">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden min-h-[500px]">
            <div className="px-8 py-6 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900">
                {sections.find((section) => section.id === activeSection)?.label || title}
              </h2>
              {sections.find((section) => section.id === activeSection)?.description ? (
                <p className="text-sm text-gray-500 mt-1">
                  {sections.find((section) => section.id === activeSection)?.description}
                </p>
              ) : null}
            </div>
            <div className="p-8">{children}</div>
          </div>
        </section>
      </div>
    </div>
  )
}
