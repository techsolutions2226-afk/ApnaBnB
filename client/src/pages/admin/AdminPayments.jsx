import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiImage,
  FiCreditCard,
} from "react-icons/fi";
import adminService from "../../services/adminService";
import Pagination from "../../components/common/Pagination";
import RefreshButton from "../../components/common/RefreshButton";
import Modal from "../../components/common/Modal";
import StatusBadge from "../../components/common/StatusBadge";
import "../../styles/Admin.css";

const STATUSES = ["approved", "pending", "rejected"];

/* ─── AdminPayments — manual EasyPaisa QR subscription payments ───
   Every row is a user-submitted payment screenshot. The user's LATEST
   payment decides whether their messaging is unlocked, so rejecting the
   newest one locks them out on their next app visit. */
const AdminPayments = () => {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Proof viewer + approve/reject target
  const [viewing, setViewing] = useState(null); // payment row shown in the modal
  const [proofUrl, setProofUrl] = useState("");
  const [proofLoading, setProofLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await adminService.getPayments({
        page,
        limit: 20,
        status: status || undefined,
      });
      // Paginated object when ?page is sent, flat array otherwise.
      setPayments(Array.isArray(data) ? data : data.items || []);
      setTotal(Array.isArray(data) ? data.length : data.total || 0);
    } catch (err) {
      setError(err.message || "Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const totalPages = Math.max(1, Math.ceil(total / 20));

  const openProof = async (payment) => {
    setViewing(payment);
    setProofUrl("");
    setProofLoading(true);
    try {
      const resp = await fetch(payment.proofUrl);
      const blob = await resp.blob();
      setProofUrl(URL.createObjectURL(blob));
    } catch {
      // CORS or network issue — fall back to a direct link.
      setProofUrl(payment.proofUrl);
    } finally {
      setProofLoading(false);
    }
  };

  const closeProof = () => {
    if (proofUrl.startsWith("blob:")) URL.revokeObjectURL(proofUrl);
    setViewing(null);
    setProofUrl("");
  };

  const handleSetStatus = async (payment, nextStatus) => {
    setUpdatingStatus(true);
    try {
      await adminService.updatePaymentStatus(payment._id || payment.id, nextStatus);
      const messages = {
        approved: "Payment approved — messaging unlocked for this user.",
        pending: "Payment marked pending — messaging locked until reviewed.",
        rejected: "Payment rejected — messaging locked for this user.",
      };
      toast.success(messages[nextStatus] || "Payment status updated.");
      closeProof();
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to update payment");
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="adm-page">
      <div className="adm-header">
        <div>
          <h1 className="adm-title">Payments</h1>
          <p className="adm-subtitle">
            Manual EasyPaisa subscription payments. A user&apos;s latest
            payment controls their plan — approving unlocks messaging,
            rejecting locks it.
          </p>
        </div>
        <RefreshButton onRefresh={fetchData} refreshing={isLoading} />
      </div>

      <div className="adm-toolbar adm-toolbar--wrap">
        <select
          className="adm-select"
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-section-count adm-log-count">
        {payments.length} of {total} payment{total !== 1 ? "s" : ""} shown
      </div>

      <div className="adm-card">
        {isLoading ? (
          <div className="adm-loading">Loading payments…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : payments.length === 0 ? (
          <p className="adm-empty">No payments recorded yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>User</th>
                  <th>Plan</th>
                  <th>Billing</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Proof</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment._id || payment.id}>
                    <td>
                      <div className="adm-log-when">
                        {payment.createdAt
                          ? new Date(payment.createdAt).toLocaleString()
                          : "—"}
                      </div>
                    </td>
                    <td>
                      {payment.user?.id ? (
                        <Link
                          to={`/admin/users/${payment.user.id}`}
                          className="adm-log-actor"
                          title="View this user"
                        >
                          <div className="adm-table-title">
                            {payment.user.name || "Unknown"}
                          </div>
                          <div className="adm-table-sub">
                            {payment.user.email}
                            {payment.user.role ? ` · ${payment.user.role}` : ""}
                          </div>
                        </Link>
                      ) : (
                        <span className="adm-muted">Deleted user</span>
                      )}
                    </td>
                    <td>
                      <div className="adm-table-title" style={{ gap: 6, display: "inline-flex", alignItems: "center" }}>
                        <FiCreditCard size={13} />
                        {payment.planName}
                      </div>
                      <div className="adm-table-sub">{payment.planId}</div>
                    </td>
                    <td>{payment.billingCycle}</td>
                    <td>
                      {payment.currency}{" "}
                      {Number(payment.amount).toLocaleString()}
                    </td>
                    <td>
                      <StatusBadge
                        status={payment.status}
                        prefix="adm-badge"
                      />
                    </td>
                    <td>
                      <button
                        className="adm-action-btn adm-action-btn--view"
                        onClick={() => openProof(payment)}
                        title="View payment screenshot"
                      >
                        <FiImage size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* ── Proof viewer + approve / reject ── */}
      <Modal
        isOpen={!!viewing}
        onClose={closeProof}
        title={`Payment proof — ${viewing?.planName || ""}`}
      >
        {viewing && (
          <div className="adm-proof">
            <div className="adm-proof-meta">
              <div>
                <strong>{viewing.user?.name || "Unknown"}</strong>
                <div className="adm-table-sub">{viewing.user?.email}</div>
              </div>
              <div className="adm-proof-amount">
                {viewing.currency} {Number(viewing.amount).toLocaleString()}
                {" · "}
                {viewing.billingCycle}
              </div>
              <StatusBadge status={viewing.status} prefix="adm-badge" />
            </div>

            <div className="adm-proof-image">
              {proofLoading ? (
                <div className="adm-loading">Loading screenshot…</div>
              ) : proofUrl ? (
                <img src={proofUrl} alt="Payment screenshot" />
              ) : (
                <div className="adm-muted">Screenshot unavailable.</div>
              )}
            </div>

            <div className="adm-proof-actions">
              <button
                className="adm-proof-btn adm-proof-btn--approve"
                onClick={() => handleSetStatus(viewing, "approved")}
                disabled={updatingStatus || viewing.status === "approved"}
              >
                <FiCheckCircle size={15} />
                {updatingStatus ? "Saving…" : "Approve"}
              </button>
              <button
                className="adm-proof-btn adm-proof-btn--pending"
                onClick={() => handleSetStatus(viewing, "pending")}
                disabled={updatingStatus || viewing.status === "pending"}
              >
                <FiClock size={15} />
                Mark Pending
              </button>
              <button
                className="adm-proof-btn adm-proof-btn--reject"
                onClick={() => handleSetStatus(viewing, "rejected")}
                disabled={updatingStatus || viewing.status === "rejected"}
              >
                <FiXCircle size={15} />
                Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminPayments;
