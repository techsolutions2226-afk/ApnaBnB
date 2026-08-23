/* eslint-disable react-refresh/only-export-components -- this is a column
   CONFIG file, not a component module. The JSX here lives inside per-column
   render functions; there is no component to hot-reload. */
import StatusBadge from "../components/common/StatusBadge";

/* ─── adminUserColumns ───
   Every column the admin Users table can show, in one place.

   `default: true` decides what is visible before the admin picks their own
   set. The rest are available from the Columns menu.

   Secret columns (password, TOTP secret, recovery codes, OTP/reset/challenge
   hashes) are NOT here as values — the server never sends them. What appears
   instead are the *Status fields it derives, so an admin can see whether a
   credential is set or a token is live without the credential itself ever
   reaching the browser.
*/

const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString() : null;

const fmtDateTime = (v) =>
  v ? new Date(v).toLocaleString() : null;

const yesNo = (v) => (v ? "Yes" : "No");

/* Credential state, rendered as a chip rather than raw text so "active"
   reads as a live token an admin may want to act on. */
const statusChip = (value, { activeLabel } = {}) => {
  if (!value) return null;
  if (value === "active")
    return <span className="adm-tag adm-tag--live">{activeLabel || "Active"}</span>;
  if (value === "expired")
    return <span className="adm-tag adm-tag--stale">Expired</span>;
  if (value === "set") return <span className="adm-tag adm-tag--set">Set</span>;
  return String(value);
};

export const USER_COLUMNS = [
  // ── Identity ──
  {
    key: "name",
    label: "Full Name",
    group: "Identity",
    default: true,
    // Pinned: this is how you know whose row you are reading while scrolling.
    sticky: true,
    render: (u) => (
      <div className="adm-user-cell">
        <div className="adm-user-avatar-fallback">
          {(u.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="adm-user-info">
          <span className="adm-user-name">{u.name}</span>
        </div>
      </div>
    ),
    plain: (u) => u.name,
  },
  { key: "email", label: "Email", group: "Identity", default: true, plain: (u) => u.email },
  {
    key: "role",
    label: "Role",
    group: "Identity",
    default: true,
    render: (u) => <StatusBadge status={u.role} prefix="adm-badge" />,
    plain: (u) => u.role,
  },
  {
    key: "viewRole",
    label: "Viewing As",
    group: "Identity",
    plain: (u) => u.viewRole,
  },
  { key: "id", label: "User ID", group: "Identity", mono: true, plain: (u) => u.id },

  // ── Contact ──
  { key: "phone", label: "Phone", group: "Contact", default: true, plain: (u) => u.phone },
  {
    key: "location",
    label: "Location",
    group: "Contact",
    default: true,
    plain: (u) => u.location,
  },
  {
    key: "coordinates",
    label: "Coordinates",
    group: "Contact",
    render: (u) =>
      u.latitude != null && u.longitude != null ? (
        <a
          className="adm-user-coords"
          href={`https://www.google.com/maps?q=${u.latitude},${u.longitude}`}
          target="_blank"
          rel="noreferrer"
          title="Open in Google Maps"
        >
          {u.latitude.toFixed(5)}, {u.longitude.toFixed(5)}
        </a>
      ) : null,
    plain: (u) =>
      u.latitude != null && u.longitude != null ? `${u.latitude}, ${u.longitude}` : null,
  },
  {
    key: "emergencyContact",
    label: "Emergency Contact",
    group: "Contact",
    plain: (u) => u.emergencyContact,
  },
  {
    key: "avatar",
    label: "Avatar URL",
    group: "Contact",
    mono: true,
    plain: (u) => u.avatar,
  },

  // ── Account state ──
  {
    key: "accountState",
    label: "Account State",
    group: "Account",
    default: true,
    render: (u) => {
      // A user can be BOTH self-deactivated and admin-suspended. Show both
      // rather than letting one hide the other.
      const tags = [];
      if (u.deactivated)
        tags.push(
          <span key="d" className="adm-deactivated-tag">
            Deactivated by user
          </span>,
        );
      if (u.suspended)
        tags.push(
          <span key="s" className="adm-suspended-tag">
            Suspended
          </span>,
        );
      if (!tags.length)
        return <span className="adm-active-tag">Active</span>;
      return <div className="adm-state-stack">{tags}</div>;
    },
    plain: (u) =>
      [u.deactivated && "Deactivated by user", u.suspended && "Suspended"]
        .filter(Boolean)
        .join(" + ") || "Active",
  },
  {
    key: "verified",
    label: "Email Verified",
    group: "Account",
    default: true,
    render: (u) =>
      u.verified ? (
        <span className="adm-verified">
          <span className="adm-verified-dot" /> Verified
        </span>
      ) : (
        <span className="adm-unverified">
          <span className="adm-unverified-dot" /> Unverified
        </span>
      ),
    plain: (u) => yesNo(u.verified),
  },
  {
    key: "deactivatedAt",
    label: "Deactivated At",
    group: "Account",
    plain: (u) => fmtDateTime(u.deactivatedAt),
  },
  {
    key: "plan",
    label: "Plan",
    group: "Account",
    default: true,
    render: (u) =>
      u.plan ? (
        <span
          className="adm-badge adm-badge--active"
          title={`${u.plan.planName} · ${u.plan.billingCycle}`}
        >
          {u.plan.planName}
          {u.plan.billingCycle === "free" ? " (free)" : ""}
        </span>
      ) : null,
    plain: (u) => (u.plan ? u.plan.planName : null),
  },

  // ── Security ──
  {
    key: "twoFactorEnabled",
    label: "2FA",
    group: "Security",
    default: true,
    render: (u) =>
      u.twoFactorEnabled ? (
        <span className="adm-tag adm-tag--set">
          {u.twoFactorMethod === "totp" ? "App" : "Email"}
        </span>
      ) : (
        <span className="adm-tag adm-tag--off">Off</span>
      ),
    plain: (u) => (u.twoFactorEnabled ? u.twoFactorMethod : "off"),
  },
  {
    key: "twoFactorMethod",
    label: "2FA Method",
    group: "Security",
    plain: (u) => u.twoFactorMethod,
  },
  {
    key: "twoFactorSecretStatus",
    label: "2FA Secret",
    group: "Security",
    // The value itself never leaves the server; this only says whether one exists.
    render: (u) => statusChip(u.twoFactorSecretStatus),
    plain: (u) => u.twoFactorSecretStatus,
  },
  {
    key: "passwordStatus",
    label: "Password",
    group: "Security",
    render: (u) => statusChip(u.passwordStatus),
    plain: (u) => u.passwordStatus,
  },
  {
    key: "loginAlertsEnabled",
    label: "Login Alerts",
    group: "Security",
    plain: (u) => yesNo(u.loginAlertsEnabled),
  },

  // ── Pending tokens ──
  {
    key: "otpStatus",
    label: "Signup OTP",
    group: "Pending tokens",
    render: (u) => statusChip(u.otpStatus, { activeLabel: "Pending" }),
    plain: (u) => u.otpStatus,
  },
  {
    key: "otpExpiresAt",
    label: "OTP Expires",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.otpExpiresAt),
  },
  {
    key: "otpAttempts",
    label: "OTP Attempts",
    group: "Pending tokens",
    plain: (u) => (u.otpAttempts ? String(u.otpAttempts) : null),
  },
  {
    key: "otpLastSentAt",
    label: "OTP Last Sent",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.otpLastSentAt),
  },
  {
    key: "resetTokenStatus",
    label: "Reset Link",
    group: "Pending tokens",
    render: (u) => statusChip(u.resetTokenStatus),
    plain: (u) => u.resetTokenStatus,
  },
  {
    key: "resetPasswordExpiresAt",
    label: "Reset Expires",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.resetPasswordExpiresAt),
  },
  {
    key: "resetPasswordLastSentAt",
    label: "Reset Last Sent",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.resetPasswordLastSentAt),
  },
  {
    key: "twoFactorChallengeStatus",
    label: "2FA Challenge",
    group: "Pending tokens",
    render: (u) => statusChip(u.twoFactorChallengeStatus),
    plain: (u) => u.twoFactorChallengeStatus,
  },
  {
    key: "twoFactorChallengeExpiresAt",
    label: "Challenge Expires",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.twoFactorChallengeExpiresAt),
  },
  {
    key: "twoFactorChallengeAttempts",
    label: "Challenge Attempts",
    group: "Pending tokens",
    plain: (u) =>
      u.twoFactorChallengeAttempts ? String(u.twoFactorChallengeAttempts) : null,
  },
  {
    key: "twoFactorCodeStatus",
    label: "2FA Email Code",
    group: "Pending tokens",
    render: (u) => statusChip(u.twoFactorCodeStatus),
    plain: (u) => u.twoFactorCodeStatus,
  },
  {
    key: "twoFactorCodeExpiresAt",
    label: "2FA Code Expires",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.twoFactorCodeExpiresAt),
  },
  {
    key: "twoFactorCodeLastSentAt",
    label: "2FA Code Last Sent",
    group: "Pending tokens",
    plain: (u) => fmtDateTime(u.twoFactorCodeLastSentAt),
  },

  // ── Activity ──
  {
    key: "listings",
    label: "Listings",
    group: "Activity",
    default: true,
    numeric: true,
    plain: (u) => String(u._count?.listings ?? 0),
  },
  {
    key: "requirements",
    label: "Requirements",
    group: "Activity",
    default: true,
    numeric: true,
    plain: (u) => String(u._count?.requirements ?? 0),
  },
  {
    key: "lastSeenAt",
    label: "Last Seen",
    group: "Activity",
    plain: (u) => fmtDateTime(u.lastSeenAt),
  },
  {
    key: "createdAt",
    label: "Joined",
    group: "Activity",
    default: true,
    plain: (u) => fmtDate(u.createdAt),
  },
  {
    key: "updatedAt",
    label: "Last Updated",
    group: "Activity",
    plain: (u) => fmtDateTime(u.updatedAt),
  },
];

export const DEFAULT_VISIBLE = USER_COLUMNS.filter((c) => c.default).map((c) => c.key);

export const COLUMN_GROUPS = [
  ...new Set(USER_COLUMNS.map((c) => c.group)),
];

export default USER_COLUMNS;
