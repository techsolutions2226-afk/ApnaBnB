export default function Card({
  children,
  className = "",
  hover = false,
  padding = true,
  ...props
}) {
  return (
    <div
      className={`
        bg-white rounded-xl border border-slate-200
        ${padding ? "p-4 sm:p-5" : ""}
        ${hover ? "shadow-card hover:shadow-card-hover transition-shadow duration-200" : "shadow-xs"}
        ${className}
      `.trim()}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ icon: Icon, label, value, trend, trendLabel, className = "" }) {
  const isPositive = trend && !trend.startsWith("-");
  const isNegative = trend && trend.startsWith("-");

  return (
    <Card className={`flex flex-col gap-3 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>
        {Icon && (
          <div className="h-9 w-9 rounded-lg bg-primary-50 flex items-center justify-center">
            <Icon className="h-4.5 w-4.5 text-primary-600" />
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 font-heading tracking-tight">
          {value}
        </p>
        {(trend || trendLabel) && (
          <div className="flex items-center gap-1.5 mt-1">
            {trend && (
              <span
                className={`text-xs font-semibold ${
                  isPositive
                    ? "text-accent-600"
                    : isNegative
                    ? "text-danger-600"
                    : "text-slate-500"
                }`}
              >
                {trend}
              </span>
            )}
            {trendLabel && (
              <span className="text-xs text-slate-400">{trendLabel}</span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
