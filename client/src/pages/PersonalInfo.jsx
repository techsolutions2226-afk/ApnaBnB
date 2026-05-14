import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-toastify";
import uploadService from "../services/uploadService";
import Avatar from "../components/common/Avatar";
import { FiChevronLeft, FiCamera } from "react-icons/fi";
import "../styles/Account.css";

// Backend currently persists only `name` and `avatar`. Other fields
// (phone, address, emergency contact) are stored client-side via AuthContext;
// they'll round-trip back to the API once those columns are added to the User model.
const fields = [
  { key: "legalName", label: "Legal name" },
  { key: "email", label: "Email address", readOnly: true },
  { key: "phone", label: "Phone number" },
  { key: "address", label: "Address" },
  { key: "emergencyContact", label: "Emergency contact" },
];

export default function PersonalInfo() {
  const { currentUser, updateProfile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [editingField, setEditingField] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [savingField, setSavingField] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!currentUser) navigate("/login", { replace: true });
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const getFieldValue = (key) => {
    switch (key) {
      case "legalName":
        return currentUser.name || "Not provided";
      case "email":
        return currentUser.email || "Not provided";
      case "phone":
        return currentUser.phone || "Not provided";
      case "address":
        return currentUser.location || "Not provided";
      case "emergencyContact":
        return currentUser.emergencyContact || "Not provided";
      default:
        return "Not provided";
    }
  };

  const startEditing = (key) => {
    const current = getFieldValue(key);
    setEditValues({ [key]: current === "Not provided" ? "" : current });
    setEditingField(key);
  };

  const cancelEditing = () => {
    setEditingField(null);
    setEditValues({});
  };

  const saveField = async (key) => {
    const value = editValues[key]?.trim();
    if (!value) {
      toast.error("Field cannot be empty");
      return;
    }

    setSavingField(key);
    try {
      switch (key) {
        case "legalName":
          await updateProfile({ name: value });
          break;
        case "phone":
          await updateProfile({ phone: value });
          break;
        case "address":
          await updateProfile({ location: value });
          break;
        case "emergencyContact":
          await updateProfile({ emergencyContact: value });
          break;
        default:
          break;
      }
      toast.success("Updated successfully");
      setEditingField(null);
      setEditValues({});
    } catch (err) {
      toast.error(err.message || "Failed to update");
    } finally {
      setSavingField(null);
    }
  };

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be 5 MB or smaller");
      return;
    }

    setUploadingAvatar(true);
    try {
      const uploaded = await uploadService.uploadSingle(file);
      const url = uploaded.url || uploaded.secure_url || uploaded.image?.url;
      if (!url) throw new Error("Upload succeeded but no URL returned");
      await updateProfile({ avatar: url });
      toast.success("Profile photo updated");
    } catch (err) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingAvatar(false);
      // Reset so the same file can be re-selected later if needed
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="ac-page">
      <div className="ac-container">
        <Link to="/account" className="ac-breadcrumb">
          <FiChevronLeft size={18} />
          <span>Account</span>
        </Link>

        <h1 className="ac-title">Personal info</h1>

        {/* Profile photo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "20px 0",
            borderBottom: "1px solid #ebebeb",
            marginBottom: 20,
          }}
        >
          <Avatar
            src={currentUser.avatar}
            name={currentUser.name}
            size="xl"
          />
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 600, marginBottom: 4 }}>Profile photo</p>
            <p style={{ color: "#717171", fontSize: 14, marginBottom: 12 }}>
              Add a photo so other users can recognise you.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 16px",
                background: "#222",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                cursor: uploadingAvatar ? "not-allowed" : "pointer",
                opacity: uploadingAvatar ? 0.6 : 1,
                fontSize: 14,
              }}
            >
              <FiCamera size={16} />
              {uploadingAvatar ? "Uploading…" : "Upload photo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              style={{ display: "none" }}
            />
          </div>
        </div>

        <div className="ac-fields">
          {fields.map(({ key, label, readOnly }) => {
            const isEditing = editingField === key;
            const isSaving = savingField === key;
            return (
              <div key={key} className="ac-field-row">
                <div className="ac-field-header">
                  <div>
                    <p className="ac-field-label">{label}</p>
                    {!isEditing && (
                      <p className="ac-field-value">{getFieldValue(key)}</p>
                    )}
                  </div>
                  {!readOnly && !isEditing ? (
                    <button
                      className="ac-field-edit-btn"
                      onClick={() => startEditing(key)}
                    >
                      Edit
                    </button>
                  ) : !readOnly ? (
                    <button
                      className="ac-field-edit-btn"
                      onClick={cancelEditing}
                      disabled={isSaving}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
                {isEditing && (
                  <div className="ac-field-editor">
                    <input
                      type={key === "email" ? "email" : "text"}
                      className="ac-field-input"
                      value={editValues[key] || ""}
                      onChange={(e) =>
                        setEditValues({ [key]: e.target.value })
                      }
                      autoFocus
                      disabled={isSaving}
                    />
                    <button
                      className="ac-field-save-btn"
                      onClick={() => saveField(key)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
