import { FiInbox } from "react-icons/fi";
import Button from "./Button";

export default function EmptyState({
  icon: Icon = FiInbox,
  title = "No data yet",
  description,
  action,
  actionLabel,
  onAction,
  className = "",
}) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
        <Icon className="h-7 w-7 text-slate-400" />
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-1">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 max-w-sm mb-5">
          {description}
        </p>
      )}
      {action && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel || action}
        </Button>
      )}
    </div>
  );
}
