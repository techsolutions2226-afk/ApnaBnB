export default function Section({
  title,
  description,
  action,
  children,
  className = "",
}) {
  return (
    <section className={className}>
      {(title || description || action) && (
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="min-w-0">
            {title && (
              <h2 className="text-base font-semibold text-slate-900 font-heading">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-slate-500">{description}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
