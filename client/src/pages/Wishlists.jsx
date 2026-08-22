import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useWishlist } from "../context/WishlistContext";
import RefreshButton from "../components/common/RefreshButton";
import useRefresh from "../hooks/useRefresh";
import { useProperties } from "../hooks/useProperties";
import { toast } from "react-toastify";
import EmptyState from "../components/common/EmptyState";
import Modal from "../components/common/Modal";
import PropertyCard from "../components/property/PropertyCard";
import Skeleton from "../components/common/Skeleton";
import { FiHeart, FiPlus, FiTrash2 } from "react-icons/fi";
import "../styles/Wishlists.css";
import "../styles/PropertyCards.css";

const ALL_TAB = "__all__";

export default function Wishlists() {
  const { currentUser } = useAuth();
  const { lists, createList, deleteList, allSavedIds, refresh: refreshWishlist } =
    useWishlist();
  const { properties = [], isLoading, refetch: refetchProperties } =
    useProperties();

  // Refresh just this tab — no browser reload.
  const { refresh, refreshing } = useRefresh(refreshWishlist, refetchProperties);
  const navigate = useNavigate();

  /* Index properties by id (handles _id from API + legacy id) */
  const propertyMap = useMemo(() => {
    const map = {};
    properties.forEach((p) => {
      if (p._id) map[p._id] = p;
      if (p.id) map[p.id] = p;
    });
    return map;
  }, [properties]);

  const [activeTab, setActiveTab] = useState(ALL_TAB);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  /* If the active folder is deleted elsewhere, fall back to "All" */
  useEffect(() => {
    if (activeTab !== ALL_TAB && !lists.find((l) => l.id === activeTab)) {
      setActiveTab(ALL_TAB);
    }
  }, [lists, activeTab]);

  if (!currentUser) return null;

  /* Property ids visible in the current tab */
  const visibleIds =
    activeTab === ALL_TAB
      ? Array.from(new Set(allSavedIds))
      : lists.find((l) => l.id === activeTab)?.propertyIds || [];

  /* Resolve to actual property objects, filter out unknown */
  const visibleProperties = visibleIds
    .map((id) => propertyMap[id])
    .filter(Boolean);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    try {
      const created = await createList(name);
      toast.success(`Wishlist "${name}" created`);
      setNewName("");
      setShowCreate(false);
      setActiveTab(created.id);
    } catch (err) {
      toast.error(err?.message || "Failed to create wishlist");
    }
  };

  const handleDelete = async (listId) => {
    const list = lists.find((l) => l.id === listId);
    try {
      await deleteList(listId);
      toast.info(`"${list?.name || "Wishlist"}" deleted`);
    } catch (err) {
      toast.error(err?.message || "Failed to delete wishlist");
    }
    setDeleteConfirm(null);
    if (activeTab === listId) setActiveTab(ALL_TAB);
  };

  const totalSaved = new Set(allSavedIds).size;

  return (
    <div className="wl-page">
      <div className="wl-container">
        <div className="wl-header">
          <div>
            <h1 className="wl-title">Wishlists</h1>
            <p className="wl-subtitle">
              {totalSaved} saved propert{totalSaved !== 1 ? "ies" : "y"}
            </p>
          </div>
          <div className="wl-header-actions">
            <RefreshButton onRefresh={refresh} refreshing={refreshing} />
            <button className="wl-create-btn" onClick={() => setShowCreate(true)}>
              <FiPlus size={18} />
              New wishlist
            </button>
          </div>
        </div>

        {/* ── Folder Tabs ── */}
        {lists.length > 0 && (
          <div className="wl-tabs">
            <button
              type="button"
              className={`wl-tab${activeTab === ALL_TAB ? " wl-tab--active" : ""}`}
              onClick={() => setActiveTab(ALL_TAB)}
            >
              All saved
              <span className="wl-tab-count">{totalSaved}</span>
            </button>
            {lists.map((list) => (
              <button
                key={list.id}
                type="button"
                className={`wl-tab${activeTab === list.id ? " wl-tab--active" : ""}`}
                onClick={() => setActiveTab(list.id)}
              >
                {list.name}
                <span className="wl-tab-count">{list.propertyIds.length}</span>
                {list.id !== "default" && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="wl-tab-delete"
                    aria-label={`Delete ${list.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(list.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        setDeleteConfirm(list.id);
                      }
                    }}
                  >
                    <FiTrash2 size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Property grid ── */}
        {isLoading ? (
          <div className="prop-grid">
            <Skeleton count={4} />
          </div>
        ) : visibleProperties.length === 0 ? (
          <EmptyState
            icon={<FiHeart size={48} />}
            title={
              activeTab === ALL_TAB
                ? "No saved properties yet"
                : "This wishlist is empty"
            }
            description="As you browse, tap the heart icon on any property to save it here."
            actionLabel="Start exploring"
            onAction={() => navigate("/")}
          />
        ) : (
          <div className="prop-grid">
            {visibleProperties.map((p) => (
              <PropertyCard
                key={p._id || p.id}
                id={p._id || p.id}
                {...p}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Wishlist Modal */}
      {showCreate && (
        <Modal onClose={() => setShowCreate(false)} title="Create wishlist">
          <div className="wl-modal-body">
            <label className="wl-modal-label">Name</label>
            <input
              type="text"
              className="wl-modal-input"
              placeholder="e.g. Lahore Houses"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              maxLength={50}
              autoFocus
            />
            <p className="wl-modal-count">
              {50 - newName.length} characters remaining
            </p>
            <button
              className="wl-modal-create-btn"
              onClick={handleCreate}
              disabled={!newName.trim()}
            >
              Create
            </button>
          </div>
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <Modal
          onClose={() => setDeleteConfirm(null)}
          title="Delete this wishlist?"
          size="small"
        >
          <div className="wl-modal-body">
            <p className="wl-delete-text">
              This action can&apos;t be undone. The properties stay in your
              other wishlists if you saved them elsewhere.
            </p>
            <div className="wl-delete-actions">
              <button
                className="wl-delete-cancel"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </button>
              <button
                className="wl-delete-confirm"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
