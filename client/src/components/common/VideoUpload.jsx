import { useState, useRef, useCallback, useEffect } from 'react';
import { FaVideo, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import uploadService from '../../services/uploadService';
import { urlToCloudinaryPublicId } from '../../utils/cloudinaryUrl';
import '../../styles/VideoUpload.css';

const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/m4v',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/x-msvideo',
];

const MAX_SIZE_MB = 50;

/* ── VideoUpload — single property walkthrough video ──
   Drag & drop (or browse) one video, upload it straight to Cloudinary, and
   surface the resulting URL via onChange. The user never pastes a link — the
   file itself is uploaded. Mirrors ImageUpload's upload-immediately contract:
   the owning form is told via onUploadingChange while a file is in flight so
   it can block submission until the cloud URL is ready. */
const VideoUpload = ({
  value = "",
  onChange,
  onUploadingChange,
  label = "Property Video",
  helperText = "Drag & drop a video here or click to browse",
  maxSizeMB = MAX_SIZE_MB,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputRef = useRef(null);

  const notifyUploading = useCallback(
    (busy) => {
      setIsUploading(busy);
      if (typeof onUploadingChange === "function") onUploadingChange(busy);
    },
    [onUploadingChange]
  );

  // Revoke a stale object URL when the preview changes or unmounts.
  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith("blob:")) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const validateFile = (file) => {
    if (!VIDEO_MIME_TYPES.includes(file.type)) {
      return "Invalid file type. Only MP4, MOV, WEBM, MKV, and AVI videos are allowed.";
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      return `File is too large. Maximum size is ${maxSizeMB}MB.`;
    }
    return null;
  };

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      if (isUploading) return;

      const validationError = validateFile(file);
      if (validationError) {
        toast.error(validationError);
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      notifyUploading(true);

      try {
        const previousUrl = value;
        const response = await uploadService.uploadVideo(file);
        if (response?.success && response?.image?.url) {
          URL.revokeObjectURL(objectUrl);
          setPreviewUrl("");
          onChange(response.image.url);
          // Replace flow: drop the previous Cloudinary video once the new one is live.
          if (previousUrl && previousUrl !== response.image.url) {
            const oldId = urlToCloudinaryPublicId(previousUrl);
            if (oldId) {
              uploadService.deleteVideo(oldId).catch((error) => {
                console.error("Failed to delete replaced video:", error);
              });
            }
          }
          toast.success("Video uploaded successfully");
        } else {
          throw new Error(response?.message || "Upload failed");
        }
      } catch (error) {
        const message =
          error?.message || "Failed to upload video. Please try again.";
        toast.error(message);
        console.error("Video upload failed:", error);
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl("");
      } finally {
        notifyUploading(false);
      }
    },
    [isUploading, maxSizeMB, notifyUploading, onChange, value]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files || []);
      if (files.length > 0) handleFile(files[0]);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) handleFile(files[0]);
      e.target.value = "";
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    if (isUploading) return;
    const publicId = urlToCloudinaryPublicId(value);
    onChange("");
    if (publicId) {
      uploadService.deleteVideo(publicId).catch((error) => {
        console.error("Failed to delete video:", error);
      });
    }
  }, [isUploading, onChange, value]);

  const acceptAttr = VIDEO_MIME_TYPES.join(",");

  return (
    <div className="video-upload-container">
      <label className="video-upload-label">
        {label} <span className="video-upload-label-hint">(optional)</span>
      </label>

      {value && !isUploading && (
        <div className="video-upload-preview">
          <video
            src={value}
            controls
            preload="metadata"
            className="video-upload-player"
          />
          <button
            type="button"
            className="video-upload-remove"
            onClick={handleRemove}
          >
            <FaTimes size={14} /> Remove video
          </button>
        </div>
      )}

      {isUploading ? (
        <div className="video-upload-uploading">
          {previewUrl && (
            <video
              src={previewUrl}
              muted
              preload="metadata"
              className="video-upload-player"
            />
          )}
          <div className="video-upload-overlay">
            <FaSpinner className="spinner" />
            <span>Uploading video…</span>
          </div>
        </div>
      ) : (
        <div
          className={`video-upload-dropzone ${isDragging ? "dragging" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptAttr}
            onChange={handleFileInput}
            style={{ display: "none" }}
          />
          <FaVideo className="upload-icon" />
          <p className="upload-text">
            {value ? "Drop a new video to replace it" : helperText}
          </p>
          <p className="upload-hint">
            MP4 / MOV / WEBM / MKV / AVI • Max {maxSizeMB}MB
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;