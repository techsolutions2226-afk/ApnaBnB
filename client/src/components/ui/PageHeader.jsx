import { FiChevronRight } from "react-icons/fi";
import { Link } from "react-router-dom";

export default function PageHeader({
  title,
  subtitle,
  action,
  actionTo,
  actionLabel,
  breadcrumbs,
  children,
  className = "",
}) {
  return (
    <div className={`flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-slate-400 mb-2" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <FiChevronRight className="h-3 w-3" />}
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-slate-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-slate-600 font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading tracking-tight truncate">
            {title}
          </h1>
          {children}
        </div>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actionTo && (
        <Link
          to={actionTo}
          className="inline-flex items-center justify-center h-10 px-4 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 active:bg-primary-800 transition-colors shadow-sm shrink-0"
        >
          {actionLabel || action}
        </Link>
      )}
      {action && !actionTo && action}
    </div>
  );
}
