import StatusBadge from "../../common/StatusBadge";
import {
  FiEdit2,
  FiShield,
  FiKey,
  FiUserCheck,
  FiCheckCircle,
  FiTrash2,
  FiMail,
  FiPhone,
} from "react-icons/fi";
import { accountStateClass, accountStateLabel, titleCase } from "./userDetailUtils";

/**
 * Profile header — identity, badges, and quick actions (Edit / Ban / Reset password).
 */
export default function UserProfileHeader({
  user,
  onEdit,
  onBan,
  onUnban,
  onReactivate,
  onResetPassword,
  onDelete,
  onVerify,
}) {
  if (!user) return null;

  const blocked = user.deactivated || user.suspended;

  return (
    <div className="aud-header">
      <div className="aud-header-main">
        <div className="aud-avatar">
          {user.avatar ? (
            <img src={user.avatar} alt="" referrerPolicy="no-referrer" />
          ) : (
            <span>{(user.name || "?").charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="aud-identity">
          <div className="aud-name-row">
            <h1 className="aud-name">{user.name || "Unnamed user"}</h1>
            <StatusBadge status={user.role} label={titleCase(user.role)} prefix="adm-badge" />
            {user.viewRole && user.viewRole !== user.role && (
              <span className="aud-viewing-pill">Viewing as {titleCase(user.viewRole)}</span>
            )}
            <span className={accountStateClass(user)}>
              <span
                className={`adm-state-dot ${
                  blocked
                    ? user.suspended
                      ? "adm-state-dot--danger"
                      : "adm-state-dot--warn"
                    : "adm-state-dot--ok"
                }`}
              />
              {accountStateLabel(user)}
            </span>
          </div>

          <div className="aud-contact">
            <span>
              <FiMail size={13} aria-hidden="true" />
              {user.email || "—"}
            </span>
            <span>
              <FiPhone size={13} aria-hidden="true" />
              {user.phone || "No phone"}
            </span>
          </div>
        </div>
      </div>

      <div className="aud-actions">
        <button type="button" className="adm-btn" onClick={onEdit}>
          <FiEdit2 size={15} /> Edit
        </button>
        <button type="button" className="adm-btn" onClick={onResetPassword}>
          <FiKey size={15} /> Reset Password
        </button>
        {user.deactivated && (
          <button type="button" className="adm-btn adm-btn--primary" onClick={onReactivate}>
            <FiUserCheck size={15} /> Reactivate
          </button>
        )}
        {!user.suspended ? (
          <button type="button" className="adm-btn adm-btn--outline" onClick={onBan}>
            <FiShield size={15} /> Ban
          </button>
        ) : (
          <button type="button" className="adm-btn adm-btn--primary" onClick={onUnban}>
            <FiCheckCircle size={15} /> Unban
          </button>
        )}
        {!user.verified && (
          <button type="button" className="adm-btn" onClick={onVerify}>
            <FiCheckCircle size={15} /> Verify email
          </button>
        )}
        <button type="button" className="adm-btn adm-btn--danger" onClick={onDelete}>
          <FiTrash2 size={15} /> Delete
        </button>
      </div>
    </div>
  );
}
