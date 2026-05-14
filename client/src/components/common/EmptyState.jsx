import "../../styles/Common.css";

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) {
  return (
    <div className="cm-empty">
      {icon && <div className="cm-empty-icon">{icon}</div>}
      {title && <h3 className="cm-empty-title">{title}</h3>}
      {description && <p className="cm-empty-description">{description}</p>}
      {actionLabel && onAction && (
        <button className="cm-empty-action" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
