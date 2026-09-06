import { FiCheck, FiLock, FiShield } from "react-icons/fi";
import RefreshButton from "../../common/RefreshButton";
import { fmtDate, fmtDateTime, titleCase } from "./userDetailUtils";

function InfoRow({ label, children }) {
  return (
    <div className="aud-info-row">
      <dt>{label}</dt>
      <dd>{children ?? <span className="adm-muted">—</span>}</dd>
    </div>
  );
}

/** Overview tab — personal info, security, verification, registration. */
export default function UserOverviewTab({ user, onRefresh, refreshing }) {
  if (!user) return null;

  return (
    <div>
      <div className="aud-section-tools">
        <RefreshButton onRefresh={onRefresh} refreshing={refreshing} />
      </div>
      <div className="aud-overview">
      <section className="aud-panel">
        <h3 className="aud-panel-title">Personal info</h3>
        <dl className="aud-info-grid">
          <InfoRow label="Full name">{user.name}</InfoRow>
          <InfoRow label="Email">{user.email}</InfoRow>
          <InfoRow label="Phone">{user.phone || "—"}</InfoRow>
          <InfoRow label="Location">{user.location || "—"}</InfoRow>
          <InfoRow label="Emergency contact">{user.emergencyContact || "—"}</InfoRow>
          <InfoRow label="Role">{titleCase(user.role)}</InfoRow>
          <InfoRow label="Viewing as">{titleCase(user.viewRole) || "—"}</InfoRow>
          <InfoRow label="Plan">
            {user.plan ? (
              <span className="adm-badge adm-badge--active">
                {user.plan.planName}
                {user.plan.billingCycle === "free" ? " (free)" : ""}
              </span>
            ) : (
              "—"
            )}
          </InfoRow>
        </dl>
      </section>

      <section className="aud-panel">
        <h3 className="aud-panel-title">Security & verification</h3>
        <dl className="aud-info-grid">
          <InfoRow label="Email verified">
            {user.verified ? (
              <span className="adm-verified-pill">
                <FiCheck size={12} strokeWidth={2.5} /> Verified
              </span>
            ) : (
              <span className="adm-unverified-pill">Unverified</span>
            )}
          </InfoRow>
          <InfoRow label="2FA status">
            {user.twoFactorEnabled ? (
              <span className="adm-tag adm-tag--2fa-on">
                <FiLock size={11} /> On · {titleCase(user.twoFactorMethod) || "Enabled"}
              </span>
            ) : (
              <span className="adm-tag adm-tag--off">Off</span>
            )}
          </InfoRow>
          <InfoRow label="Login alerts">
            {user.loginAlertsEnabled ? "Enabled" : "Disabled"}
          </InfoRow>
          <InfoRow label="Password">{titleCase(user.passwordStatus) || "Set"}</InfoRow>
        </dl>
      </section>

      <section className="aud-panel">
        <h3 className="aud-panel-title">Registration</h3>
        <dl className="aud-info-grid">
          <InfoRow label="Joined">{fmtDate(user.createdAt)}</InfoRow>
          <InfoRow label="Last updated">{fmtDateTime(user.updatedAt)}</InfoRow>
          <InfoRow label="Last seen">{fmtDateTime(user.lastSeenAt)}</InfoRow>
          <InfoRow label="User ID">
            <code className="aud-mono">{user.id}</code>
          </InfoRow>
          {user.deactivatedAt && (
            <InfoRow label="Deactivated at">{fmtDateTime(user.deactivatedAt)}</InfoRow>
          )}
        </dl>
        <p className="aud-panel-note">
          <FiShield size={14} /> Account state changes (ban / reactivate) are audited in the
          platform activity log.
        </p>
      </section>
      </div>
    </div>
  );
}
