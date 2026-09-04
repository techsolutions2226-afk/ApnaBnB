import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import securityService from "../services/securityService";
import Modal from "../components/common/Modal";
import RecoveryCodesPanel from "../components/account/RecoveryCodesPanel";
import useAccountPath from "../hooks/useAccountPath";
import {
  FiChevronLeft,
  FiCheckCircle,
  FiSmartphone,
  FiMail,
  FiKey,
} from "react-icons/fi";
import "../styles/Account.css";

/* ─── Login & security ───
   Password, two-factor authentication, login alerts and self-deactivation.

   Every destructive or security-weakening action re-asks for the account
   password. A stolen session token alone must not be enough to turn 2FA off
   or deactivate the account.
*/

const EMPTY_PASSWORDS = { current: "", next: "", confirm: "" };

export default function LoginSecurity() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const { base } = useAccountPath();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Password
  const [editingPassword, setEditingPassword] = useState(false);
  const [passwords, setPasswords] = useState(EMPTY_PASSWORDS);
  const [savingPassword, setSavingPassword] = useState(false);

  // 2FA setup
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupMethod, setSetupMethod] = useState(null); // 'totp' | 'email'
  const [setupData, setSetupData] = useState(null); // { secret, qrDataUrl } | { sentTo }
  const [setupCode, setSetupCode] = useState("");
  const [setupBusy, setSetupBusy] = useState(false);

  // Recovery codes shown once, right after enabling or regenerating.
  const [recoveryCodes, setRecoveryCodes] = useState(null);

  // Password-gated actions
  const [disableOpen, setDisableOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateBusy, setGateBusy] = useState(false);

  const [alertsBusy, setAlertsBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setOverview(await securityService.getOverview());
    } catch (err) {
      setLoadError(err.message || "Could not load your security settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true });
      return;
    }
    load();
  }, [currentUser, navigate, load]);

  if (!currentUser) return null;

  /* ── Password ── */
  const closePasswordForm = () => {
    setEditingPassword(false);
    setPasswords(EMPTY_PASSWORDS);
  };

  const submitPassword = async () => {
    if (!passwords.current) {
      toast.error("Enter your current password");
      return;
    }
    if (passwords.next.length < 8) {
      toast.error("Your new password must be at least 8 characters");
      return;
    }
    if (passwords.next !== passwords.confirm) {
      toast.error("The two new passwords do not match");
      return;
    }
    setSavingPassword(true);
    try {
      await securityService.changePassword(passwords.current, passwords.next);
      toast.success("Password updated");
      closePasswordForm();
    } catch (err) {
      toast.error(err.message || "Could not change your password");
    } finally {
      setSavingPassword(false);
    }
  };

  /* ── Login alerts ── */
  const toggleAlerts = async () => {
    if (!overview || alertsBusy) return;
    const next = !overview.loginAlertsEnabled;
    // Optimistic: the switch should feel instant, and we roll back on failure.
    setOverview({ ...overview, loginAlertsEnabled: next });
    setAlertsBusy(true);
    try {
      await securityService.setLoginAlerts(next);
    } catch (err) {
      setOverview({ ...overview, loginAlertsEnabled: !next });
      toast.error(err.message || "Could not update login alerts");
    } finally {
      setAlertsBusy(false);
    }
  };

  /* ── 2FA setup ── */
  const beginSetup = async (method) => {
    setSetupMethod(method);
    setSetupData(null);
    setSetupCode("");
    setSetupOpen(true);
    setSetupBusy(true);
    try {
      setSetupData(await securityService.startTwoFactorSetup(method));
    } catch (err) {
      toast.error(err.message || "Could not start setup");
      setSetupOpen(false);
    } finally {
      setSetupBusy(false);
    }
  };

  const confirmSetup = async () => {
    if (!/^\d{6}$/.test(setupCode)) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setSetupBusy(true);
    try {
      const result = await securityService.enableTwoFactor(setupMethod, setupCode);
      setSetupOpen(false);
      setSetupCode("");
      // This is the only time these codes exist in readable form.
      setRecoveryCodes(result.recoveryCodes || []);
      toast.success("Two-factor authentication is on");
      load();
    } catch (err) {
      toast.error(err.message || "That code did not work");
    } finally {
      setSetupBusy(false);
    }
  };

  /* ── Password-gated actions ── */
  const closeGate = () => {
    setDisableOpen(false);
    setRegenerateOpen(false);
    setDeactivateOpen(false);
    setGatePassword("");
  };

  const runGated = async (fn, onDone) => {
    if (!gatePassword) {
      toast.error("Enter your password to continue");
      return;
    }
    setGateBusy(true);
    try {
      const result = await fn(gatePassword);
      closeGate();
      onDone(result);
    } catch (err) {
      toast.error(err.message || "That did not work");
    } finally {
      setGateBusy(false);
    }
  };

  const doDisable = () =>
    runGated(securityService.disableTwoFactor, () => {
      toast.success("Two-factor authentication is off");
      load();
    });

  const doRegenerate = () =>
    runGated(securityService.regenerateRecoveryCodes, (result) => {
      setRecoveryCodes(result.recoveryCodes || []);
      toast.success("New recovery codes generated");
      load();
    });

  const doDeactivate = () =>
    runGated(securityService.deactivateAccount, () => {
      toast.info("Your account has been deactivated.");
      logout();
      navigate("/", { replace: true });
    });

  const twoFactorOn = !!overview?.twoFactorEnabled;
  const methodLabel =
    overview?.twoFactorMethod === "totp" ? "Authenticator app" : "Email code";

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to={base} className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Login &amp; security</h1>
        <p className="ac-subtitle-text">
          Update your password and keep your account secure.
        </p>

        {loading ? (
          <p className="ac-sec-hint ac-sec-hint--block">Loading your settings…</p>
        ) : loadError ? (
          <div className="ac-preview-note">{loadError}</div>
        ) : (
          <div className="ac-sec-body">
            {/* ── Login ── */}
            <section className="ac-sec-block">
              <h2 className="ac-sec-heading">Login</h2>

              <div className="ac-field-row ac-field-row--flush">
                <div className="ac-field-header">
                  <div>
                    <p className="ac-field-label">Password</p>
                    <p className="ac-field-value">
                      {editingPassword ? "Choose a new password" : "••••••••"}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="ac-field-edit-btn"
                    onClick={() =>
                      editingPassword ? closePasswordForm() : setEditingPassword(true)
                    }
                  >
                    {editingPassword ? "Cancel" : "Update"}
                  </button>
                </div>

                {editingPassword && (
                  <div className="ac-sec-form">
                    <label className="ac-sec-label">
                      Current password
                      <input
                        type="password"
                        className="ac-field-input"
                        value={passwords.current}
                        onChange={(e) =>
                          setPasswords({ ...passwords, current: e.target.value })
                        }
                        autoComplete="current-password"
                        disabled={savingPassword}
                      />
                    </label>
                    <label className="ac-sec-label">
                      New password
                      <input
                        type="password"
                        className="ac-field-input"
                        value={passwords.next}
                        onChange={(e) =>
                          setPasswords({ ...passwords, next: e.target.value })
                        }
                        autoComplete="new-password"
                        disabled={savingPassword}
                      />
                      <span className="ac-sec-hint">At least 8 characters.</span>
                    </label>
                    <label className="ac-sec-label">
                      Confirm new password
                      <input
                        type="password"
                        className="ac-field-input"
                        value={passwords.confirm}
                        onChange={(e) =>
                          setPasswords({ ...passwords, confirm: e.target.value })
                        }
                        autoComplete="new-password"
                        disabled={savingPassword}
                      />
                    </label>
                    <div className="ac-sec-form-actions">
                      <button
                        type="button"
                        className="ac-field-save-btn"
                        onClick={submitPassword}
                        disabled={savingPassword}
                      >
                        {savingPassword ? "Saving…" : "Update password"}
                      </button>
                      <button
                        type="button"
                        className="ac-btn-ghost"
                        onClick={closePasswordForm}
                        disabled={savingPassword}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="ac-field-row">
                <div className="ac-field-header">
                  <div>
                    <p className="ac-field-label">Email address</p>
                    <p className="ac-field-value">{overview?.email}</p>
                  </div>
                  {overview?.emailVerified ? (
                    <span className="ac-chip ac-chip--ok">
                      <FiCheckCircle size={13} /> Verified
                    </span>
                  ) : (
                    <span className="ac-chip ac-chip--muted">Unverified</span>
                  )}
                </div>
              </div>
            </section>

            {/* ── Two-factor ── */}
            <section className="ac-sec-block">
              <div className="ac-sec-heading-row">
                <h2 className="ac-sec-heading">Two-factor authentication</h2>
                {twoFactorOn && (
                  <span className="ac-chip ac-chip--ok">
                    <FiCheckCircle size={13} /> On &middot; {methodLabel}
                  </span>
                )}
              </div>

              {twoFactorOn ? (
                <>
                  <p className="ac-sec-hint ac-sec-hint--block">
                    You&apos;ll be asked for a code from your{" "}
                    {overview.twoFactorMethod === "totp" ? "authenticator app" : "email"}{" "}
                    every time you sign in.
                  </p>

                  <div className="ac-notif-row">
                    <div className="ac-notif-info">
                      <p className="ac-notif-label">Recovery codes</p>
                      <p className="ac-notif-desc">
                        {overview.recoveryCodesRemaining} unused code
                        {overview.recoveryCodesRemaining === 1 ? "" : "s"} left. Use one
                        if you lose access to your{" "}
                        {overview.twoFactorMethod === "totp" ? "phone" : "email"}.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ac-btn-outline"
                      onClick={() => setRegenerateOpen(true)}
                    >
                      <FiKey size={14} /> Generate new
                    </button>
                  </div>

                  <div className="ac-danger-row">
                    <div className="ac-notif-info">
                      <p className="ac-notif-label">Turn off two-factor</p>
                      <p className="ac-notif-desc">
                        Your account will be protected by your password alone.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="ac-btn-danger"
                      onClick={() => setDisableOpen(true)}
                    >
                      Turn off
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p className="ac-sec-hint ac-sec-hint--block">
                    Add a second step at sign-in, so knowing your password alone
                    isn&apos;t enough to get into your account.
                  </p>

                  <div className="ac-2fa-options">
                    <button
                      type="button"
                      className="ac-2fa-option"
                      onClick={() => beginSetup("totp")}
                    >
                      <span className="ac-device-icon">
                        <FiSmartphone size={18} />
                      </span>
                      <span className="ac-device-info">
                        <span className="ac-notif-label">Authenticator app</span>
                        <span className="ac-notif-desc">
                          Google Authenticator, Authy or similar. Works without
                          a signal and is the stronger option.
                        </span>
                      </span>
                      <span className="ac-chip ac-chip--ok ac-chip--inline">
                        Recommended
                      </span>
                    </button>

                    <button
                      type="button"
                      className="ac-2fa-option"
                      onClick={() => beginSetup("email")}
                    >
                      <span className="ac-device-icon">
                        <FiMail size={18} />
                      </span>
                      <span className="ac-device-info">
                        <span className="ac-notif-label">Email code</span>
                        <span className="ac-notif-desc">
                          We email a 6-digit code each time you sign in. Nothing
                          to install.
                        </span>
                      </span>
                    </button>
                  </div>
                </>
              )}
            </section>

            {/* ── Alerts ── */}
            <section className="ac-sec-block">
              <h2 className="ac-sec-heading">Alerts</h2>
              <div className="ac-notif-row">
                <div className="ac-notif-info">
                  <p className="ac-notif-label">Login alerts</p>
                  <p className="ac-notif-desc">
                    Email me whenever someone signs in to my account.
                  </p>
                </div>
                <button
                  type="button"
                  className={`ac-toggle ${overview?.loginAlertsEnabled ? "ac-toggle--on" : ""}`}
                  onClick={toggleAlerts}
                  disabled={alertsBusy}
                  aria-label="Toggle login alerts"
                  aria-pressed={!!overview?.loginAlertsEnabled}
                >
                  <span className="ac-toggle-thumb" />
                </button>
              </div>
            </section>

            {/* ── Account ── */}
            <section className="ac-sec-block">
              <h2 className="ac-sec-heading">Account</h2>
              <div className="ac-danger-row">
                <div className="ac-notif-info">
                  <p className="ac-notif-label">Deactivate my account</p>
                  <p className="ac-notif-desc">
                    Your listings and requirements are hidden and your profile stops
                    appearing in search. Nothing is deleted — contact support to
                    reactivate.
                  </p>
                </div>
                <button
                  type="button"
                  className="ac-btn-danger"
                  onClick={() => setDeactivateOpen(true)}
                >
                  Deactivate
                </button>
              </div>
            </section>
          </div>
        )}
      </div>

      {/* ── 2FA setup modal ── */}
      <Modal
        isOpen={setupOpen}
        onClose={() => !setupBusy && setSetupOpen(false)}
        title={
          setupMethod === "totp"
            ? "Set up your authenticator app"
            : "Set up email codes"
        }
      >
        {setupBusy && !setupData ? (
          <p className="ac-sec-hint">Preparing…</p>
        ) : setupMethod === "totp" ? (
          <div className="ac-setup">
            <ol className="ac-setup-steps">
              <li>Open your authenticator app and choose &ldquo;add account&rdquo;.</li>
              <li>Scan this QR code.</li>
              <li>Enter the 6-digit code it shows.</li>
            </ol>

            {setupData?.qrDataUrl && (
              <img
                className="ac-setup-qr"
                src={setupData.qrDataUrl}
                alt="QR code for your authenticator app"
              />
            )}

            <p className="ac-sec-hint">
              Can&apos;t scan? Enter this key manually:
            </p>
            <code className="ac-setup-secret">{setupData?.secret}</code>

            <label className="ac-sec-label" style={{ marginTop: 18 }}>
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="ac-field-input"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                disabled={setupBusy}
                autoFocus
              />
            </label>

            <div className="ac-sec-form-actions">
              <button
                type="button"
                className="ac-field-save-btn"
                onClick={confirmSetup}
                disabled={setupBusy}
              >
                {setupBusy ? "Checking…" : "Turn on two-factor"}
              </button>
              <button
                type="button"
                className="ac-btn-ghost"
                onClick={() => setSetupOpen(false)}
                disabled={setupBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="ac-setup">
            <p className="ac-sec-hint ac-sec-hint--block">
              We sent a 6-digit code to{" "}
              <strong>{setupData?.sentTo || overview?.email}</strong>. Enter it below
              to confirm you can receive it.
            </p>

            <label className="ac-sec-label">
              6-digit code
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                className="ac-field-input"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ""))}
                placeholder="000000"
                disabled={setupBusy}
                autoFocus
              />
            </label>

            <div className="ac-sec-form-actions">
              <button
                type="button"
                className="ac-field-save-btn"
                onClick={confirmSetup}
                disabled={setupBusy}
              >
                {setupBusy ? "Checking…" : "Turn on two-factor"}
              </button>
              <button
                type="button"
                className="ac-btn-ghost"
                onClick={() => setSetupOpen(false)}
                disabled={setupBusy}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Recovery codes, shown exactly once ── */}
      <Modal
        isOpen={!!recoveryCodes}
        onClose={() => setRecoveryCodes(null)}
        title="Save your recovery codes"
      >
        <RecoveryCodesPanel
          codes={recoveryCodes || []}
          onDone={() => setRecoveryCodes(null)}
        />
      </Modal>

      {/* ── Password gates ── */}
      <Modal
        isOpen={disableOpen || regenerateOpen || deactivateOpen}
        onClose={() => !gateBusy && closeGate()}
        title={
          disableOpen
            ? "Turn off two-factor authentication?"
            : regenerateOpen
              ? "Generate new recovery codes?"
              : "Deactivate your account?"
        }
        size="small"
      >
        <p className="ac-modal-note">
          {disableOpen &&
            "Your account will be protected by your password alone. Your recovery codes will stop working."}
          {regenerateOpen &&
            "Your current recovery codes will stop working immediately and be replaced with a new set."}
          {deactivateOpen &&
            "Your listings and profile will be hidden and you'll be signed out. Nothing is deleted — contact support to reactivate."}
        </p>

        <label className="ac-sec-label">
          Confirm your password
          <input
            type="password"
            className="ac-field-input"
            value={gatePassword}
            onChange={(e) => setGatePassword(e.target.value)}
            autoComplete="current-password"
            disabled={gateBusy}
            autoFocus
          />
        </label>

        <div className="ac-sec-form-actions">
          <button
            type="button"
            className={deactivateOpen || disableOpen ? "ac-btn-danger" : "ac-field-save-btn"}
            onClick={
              disableOpen ? doDisable : regenerateOpen ? doRegenerate : doDeactivate
            }
            disabled={gateBusy}
          >
            {gateBusy
              ? "Working…"
              : disableOpen
                ? "Turn off"
                : regenerateOpen
                  ? "Generate new codes"
                  : "Deactivate account"}
          </button>
          <button
            type="button"
            className="ac-btn-ghost"
            onClick={closeGate}
            disabled={gateBusy}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </div>
  );
}
