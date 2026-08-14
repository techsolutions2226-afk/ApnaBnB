import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import adminService from "../../services/adminService";
import SearchInput from "../../components/common/SearchInput";
import Modal from "../../components/common/Modal";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import StatusBadge from "../../components/common/StatusBadge";
import { formatPrice } from "../../utils/formatters";
import {
  FiEdit2,
  FiTrash2,
  FiExternalLink,
} from "react-icons/fi";
import "../../styles/Admin.css";

const PROPERTY_STATUSES = ["active", "pending", "sold", "rented", "featured", "rejected"];
const LISTING_STATUSES = ["active", "pending", "sold", "featured"];

/* ─── AdminListings — Properties + Listings management (tabbed) ─── */
const AdminListings = () => {
  const [tab, setTab] = useState("properties"); // properties | listings

  // shared filters
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [properties, setProperties] = useState([]);
  const [listings, setListings] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [editTarget, setEditTarget] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      if (tab === "properties") {
        const data = await adminService.getProperties({
          page,
          limit: 15,
          q: query || undefined,
          status: status || undefined,
        });
        setProperties(data.properties || []);
        setTotal(data.total || 0);
      } else {
        const data = await adminService.getListings({
          page,
          limit: 15,
          q: query || undefined,
          status: status || undefined,
        });
        setListings(data.listings || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      setError(err.message || "Failed to load data");
    } finally {
      setIsLoading(false);
    }
  }, [tab, page, query, status]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditListing = (listing) => {
    setEditTarget({ kind: "listing", ...listing });
    setEditFields({ status: listing.status });
  };

  const openEditProperty = (property) => {
    setEditTarget({ kind: "property", ...property });
    setEditFields({
      title: property.title,
      price: property.price,
      status: property.status,
      propertyType: property.propertyType,
      bedrooms: property.bedrooms ?? "",
      bathrooms: property.bathrooms ?? "",
    });
  };

  const handleSave = async () => {
    if (!editTarget) return;
    setSaving(true);
    try {
      if (editTarget.kind === "listing") {
        await adminService.updateListing(editTarget._id || editTarget.id, {
          status: editFields.status,
        });
        toast.success("Listing updated");
      } else {
        if (!editFields.title.trim()) {
          toast.error("Title is required");
          return;
        }
        await adminService.updateProperty(editTarget._id || editTarget.id, {
          title: editFields.title,
          price: Number(editFields.price) || 0,
          status: editFields.status,
          propertyType: editFields.propertyType,
          bedrooms: editFields.bedrooms === "" ? undefined : Number(editFields.bedrooms),
          bathrooms: editFields.bathrooms === "" ? undefined : Number(editFields.bathrooms),
        });
        toast.success("Property updated");
      }
      setEditTarget(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.kind === "listing") {
        await adminService.deleteListing(deleteTarget._id || deleteTarget.id);
        toast.success("Listing deleted");
      } else {
        await adminService.deleteProperty(deleteTarget._id || deleteTarget.id);
        toast.success("Property deleted");
      }
      setDeleteTarget(null);
      if (page > 1 && total === 1) setPage(page - 1);
      else fetchData();
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const changeStatus = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / 15));
  const statusOptions = tab === "properties" ? PROPERTY_STATUSES : LISTING_STATUSES;

  return (
    <div className="adm-page">
      <div className="adm-header">
        <h1 className="adm-title">Listings</h1>
        <p className="adm-subtitle">
          Manage every property and its analytics listing on the platform.
        </p>
      </div>

      {/* Tab switch */}
      <div className="adm-tabs">
        <button
          type="button"
          className={`adm-tab${tab === "properties" ? " adm-tab--active" : ""}`}
          onClick={() => {
            setTab("properties");
            setPage(1);
            setStatus("");
          }}
        >
          Properties
        </button>
        <button
          type="button"
          className={`adm-tab${tab === "listings" ? " adm-tab--active" : ""}`}
          onClick={() => {
            setTab("listings");
            setPage(1);
            setStatus("");
          }}
        >
          Listings
        </button>
      </div>

      <div className="adm-toolbar">
        <SearchInput
          value={query}
          onChange={(v) => {
            setPage(1);
            setQuery(v);
          }}
          placeholder={tab === "properties" ? "Search properties…" : "Search listings by property…"}
          rawEvent={false}
        />
        <select className="adm-select" value={status} onChange={changeStatus}>
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      <div className="adm-table-wrap">
        {isLoading ? (
          <div className="adm-loading">Loading…</div>
        ) : error ? (
          <div className="adm-error">{error}</div>
        ) : tab === "properties" ? (
          properties.length === 0 ? (
            <p className="adm-empty">No properties found.</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Property</th>
                  <th>Owner</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Listed</th>
                  <th className="adm-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p) => {
                  const pid = p._id || p.id;
                  return (
                    <tr key={pid}>
                      <td>
                        <div className="adm-table-title">{p.title}</div>
                        <div className="adm-table-sub">
                          {p.location?.area}, {p.location?.city}
                        </div>
                      </td>
                      <td>
                        <div className="adm-table-title">{p.listedBy?.name || "—"}</div>
                      </td>
                      <td>
                        <StatusBadge status={p.purpose} prefix="adm-badge" />
                      </td>
                      <td>
                        <StatusBadge status={p.status} prefix="adm-badge" />
                      </td>
                      <td>{formatPrice(p.price || 0, { prefix: true })}</td>
                      <td>
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleDateString()
                          : "—"}
                      </td>
                      <td>
                        <div className="adm-actions">
                          <Link
                            to={`/property/${pid}`}
                            className="adm-action-icon"
                            title="View on site"
                            target="_blank"
                          >
                            <FiExternalLink size={15} />
                          </Link>
                          <button
                            type="button"
                            className="adm-action-icon"
                            title="Edit"
                            onClick={() => openEditProperty(p)}
                          >
                            <FiEdit2 size={15} />
                          </button>
                          <button
                            type="button"
                            className="adm-action-icon adm-action-icon--danger"
                            title="Delete"
                            onClick={() => setDeleteTarget({ kind: "property", ...p })}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )
        ) : listings.length === 0 ? (
          <p className="adm-empty">No listings found.</p>
        ) : (
          <table className="adm-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Owner</th>
                <th>Status</th>
                <th>Views</th>
                <th>Inquiries</th>
                <th>Created</th>
                <th className="adm-th-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const lid = l._id || l.id;
                return (
                  <tr key={lid}>
                    <td>
                      <div className="adm-table-title">
                        {l.property?.title || "—"}
                      </div>
                      <div className="adm-table-sub">
                        {l.property?.location?.area}, {l.property?.location?.city}
                      </div>
                    </td>
                    <td>{l.owner?.name || "—"}</td>
                    <td>
                      <StatusBadge status={l.status} prefix="adm-badge" />
                    </td>
                    <td>{l.views ?? 0}</td>
                    <td>{l.inquiries ?? 0}</td>
                    <td>
                      {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td>
                      <div className="adm-actions">
                        <button
                          type="button"
                          className="adm-action-icon"
                          title="Edit status"
                          onClick={() => openEditListing(l)}
                        >
                          <FiEdit2 size={15} />
                        </button>
                        <button
                          type="button"
                          className="adm-action-icon adm-action-icon--danger"
                          title="Delete"
                          onClick={() => setDeleteTarget({ kind: "listing", ...l })}
                        >
                          <FiTrash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      {/* Edit modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title={editTarget?.kind === "listing" ? "Edit Listing" : "Edit Property"}
        size="small"
      >
        <div className="adm-form">
          {editTarget?.kind === "property" && (
            <>
              <label className="adm-form-label">
                Title
                <input
                  className="adm-form-input"
                  value={editFields.title || ""}
                  onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                />
              </label>
              <label className="adm-form-label">
                Price (PKR)
                <input
                  className="adm-form-input"
                  type="number"
                  value={editFields.price ?? ""}
                  onChange={(e) => setEditFields({ ...editFields, price: e.target.value })}
                />
              </label>
              <label className="adm-form-label">
                Property type
                <input
                  className="adm-form-input"
                  value={editFields.propertyType || ""}
                  onChange={(e) =>
                    setEditFields({ ...editFields, propertyType: e.target.value })
                  }
                />
              </label>
              <div className="adm-form-row">
                <label className="adm-form-label">
                  Bedrooms
                  <input
                    className="adm-form-input"
                    type="number"
                    value={editFields.bedrooms ?? ""}
                    onChange={(e) =>
                      setEditFields({ ...editFields, bedrooms: e.target.value })
                    }
                  />
                </label>
                <label className="adm-form-label">
                  Bathrooms
                  <input
                    className="adm-form-input"
                    type="number"
                    value={editFields.bathrooms ?? ""}
                    onChange={(e) =>
                      setEditFields({ ...editFields, bathrooms: e.target.value })
                    }
                  />
                </label>
              </div>
            </>
          )}
          <label className="adm-form-label">
            Status
            <select
              className="adm-form-input"
              value={editFields.status || ""}
              onChange={(e) => setEditFields({ ...editFields, status: e.target.value })}
            >
              {(editTarget?.kind === "listing" ? LISTING_STATUSES : PROPERTY_STATUSES).map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <div className="adm-form-actions">
            <button type="button" className="adm-btn" onClick={() => setEditTarget(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn adm-btn--primary"
              disabled={saving}
              onClick={handleSave}
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={doDelete}
        title={`Delete ${deleteTarget?.kind === "listing" ? "listing" : "property"}?`}
        message={
          deleteTarget?.kind === "listing"
            ? "This removes the listing record. The property itself is kept."
            : "This permanently deletes the property, its listing, matches and trips."
        }
        confirmLabel="Delete"
        variant="danger"
        icon={<FiTrash2 size={22} />}
      />
    </div>
  );
};

export default AdminListings;