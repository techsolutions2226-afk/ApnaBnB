import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiArrowLeft,
  FiUser,
  FiHome,
  FiActivity,
  FiTrash2,
  FiShield,
} from "react-icons/fi";
import adminService from "../../services/adminService";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import RefreshButton from "../../components/common/RefreshButton";
import UserProfileHeader from "../../components/admin/userDetail/UserProfileHeader";
import UserMetricsBar from "../../components/admin/userDetail/UserMetricsBar";
import UserOverviewTab from "../../components/admin/userDetail/UserOverviewTab";
import UserListingsTab from "../../components/admin/userDetail/UserListingsTab";
import UserActivityTab from "../../components/admin/userDetail/UserActivityTab";
import UserEditModal from "../../components/admin/userDetail/UserEditModal";
import "../../styles/Admin.css";

const TABS = [
  { id: "overview", label: "Overview", icon: FiUser },
  { id: "listings", label: "Listings & Requirements", icon: FiHome },
  { id: "activity", label: "Activity", icon: FiActivity },
];

const EMPTY_COUNTS = {
  listings: 0,
  activeRequirements: 0,
  visits: 0,
  matches: 0,
  reviews: 0,
};

export default function AdminUserDetail() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState("overview");

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const [modal, setModal] = useState(null); // "edit" | "password" | null
  const [saving, setSaving] = useState(false);

  const user = data?.user;
  const counts = data?.counts || data?.activity || EMPTY_COUNTS;

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const detail = await adminService.getUser(id);
      setData(detail);
    } catch (err) {
      setError(err.message || "Failed to load user");
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const doVerify = async () => {
    try {
      await adminService.verifyUser(id);
      toast.success("Email marked verified");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to verify user");
    }
  };

  const doReactivate = async () => {
    try {
      await adminService.reactivateUser(id);
      toast.success("Account reactivated");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to reactivate account");
    }
  };

  const doBan = async () => {
    try {
      await adminService.suspendUser(id);
      toast.success("User banned");
      setBanOpen(false);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to ban user");
    }
  };

  const doUnban = async () => {
    try {
      await adminService.unsuspendUser(id);
      toast.success("Ban lifted");
      load();
    } catch (err) {
      toast.error(err.message || "Failed to unban user");
    }
  };

  const doDelete = async () => {
    try {
      await adminService.deleteUser(id);
      toast.success("User deleted");
      window.location.href = "/admin/users";
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    }
  };

  const doSave = async (payload) => {
    if (modal === "edit" && (!payload.name?.trim() || !payload.email?.trim())) {
      toast.error("Name and email are required");
      return;
    }
    if (modal === "password" && !payload.password) {
      toast.error("Enter a new password");
      return;
    }
    setSaving(true);
    try {
      await adminService.updateUser(id, payload);
      toast.success(modal === "password" ? "Password reset" : "User updated");
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="adm-page">
        <div className="adm-loading">Loading user…</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="adm-page">
        <div className="adm-error">{error}</div>
        <Link to="/admin/users" className="adm-back-link">
          <FiArrowLeft size={14} /> Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="adm-page aud-page">
      <div className="adm-header aud-topbar">
        <Link to="/admin/users" className="adm-back-link">
          <FiArrowLeft size={14} /> Back to users
        </Link>
        <RefreshButton onRefresh={load} refreshing={isLoading} />
      </div>

      <UserProfileHeader
        user={user}
        onEdit={() => setModal("edit")}
        onResetPassword={() => setModal("password")}
        onBan={() => setBanOpen(true)}
        onUnban={doUnban}
        onReactivate={doReactivate}
        onDelete={() => setDeleteOpen(true)}
        onVerify={doVerify}
      />

      <UserMetricsBar counts={counts} />

      <div className="aud-tabs-wrap">
        <div className="aud-tabs" role="tablist" aria-label="User detail sections">
          {TABS.map(({ id: tabId, label, icon: Icon }) => (
            <button
              key={tabId}
              type="button"
              role="tab"
              aria-selected={tab === tabId}
              className={`aud-tab${tab === tabId ? " aud-tab--active" : ""}`}
              onClick={() => setTab(tabId)}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="aud-tab-panel" role="tabpanel">
          {tab === "overview" && (
            <UserOverviewTab user={user} onRefresh={load} refreshing={isLoading} />
          )}
          {tab === "listings" && (
            <UserListingsTab
              listings={data?.listings || user?.listings || []}
              requirements={data?.requirements || user?.requirements || []}
              onRefresh={load}
              refreshing={isLoading}
            />
          )}
          {tab === "activity" && (
            <UserActivityTab
              visits={data?.visits || { scheduled: [], received: [] }}
              matches={data?.matches || []}
              reviews={data?.reviews || { given: [], received: [] }}
              onRefresh={load}
              refreshing={isLoading}
            />
          )}
        </div>
      </div>

      <UserEditModal
        isOpen={!!modal}
        mode={modal || "edit"}
        user={user}
        saving={saving}
        onClose={() => setModal(null)}
        onSave={doSave}
      />

      <ConfirmDialog
        isOpen={banOpen}
        onClose={() => setBanOpen(false)}
        onConfirm={doBan}
        title={`Ban ${user?.name || "this user"}?`}
        message="Banned users cannot sign in. Their account stays intact and can be unbanned anytime."
        confirmLabel="Ban user"
        variant="danger"
        icon={<FiShield size={22} />}
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={doDelete}
        title={`Delete ${user?.name || "user"}?`}
        message="This permanently removes the user and everything they created — properties, listings, requirements, matches and messages."
        confirmLabel="Delete user"
        variant="danger"
        icon={<FiTrash2 size={22} />}
      />
    </div>
  );
}
