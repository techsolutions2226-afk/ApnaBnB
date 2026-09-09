import { useState, useRef, useCallback } from 'react';
import { FaCloudUploadAlt, FaTimes, FaSpinner } from 'react-icons/fa';
import { toast } from 'react-toastify';
import uploadService from '../../services/uploadService';
import '../../styles/ImageUpload.css';

const ImageUpload = ({
  images = [],
  onChange,
  maxImages = 5,
  label = 'Upload Images',
  helperText = 'Drag & drop images here or click to browse',
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [, setUploadingImages] = useState({});
  const fileInputRef = useRef(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  const validateFile = (file) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Only JPG, PNG, and WebP images are allowed.';
    }

    if (file.size > maxSize) {
      return 'File is too large. Maximum size is 5MB.';
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

  const handleFiles = useCallback(
    async (files) => {
      const current = imagesRef.current || [];
      const remainingSlots = maxImages - current.length;

      if (remainingSlots <= 0) {
        toast.info(`You can upload up to ${maxImages} images.`);
        return;
      }

      const filesToUpload = files.slice(0, remainingSlots);
      let currentImages = [...current];

      for (const file of filesToUpload) {
        const validationError = validateFile(file);

        if (validationError) {
          toast.error(validationError);
          continue;
        }

        const tempId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        setUploadingImages((prev) => ({ ...prev, [tempId]: true }));

        const objectUrl = URL.createObjectURL(file);
        const tempImage = {
          tempId,
          url: objectUrl,
          isUploading: true,
          file,
        };

        currentImages = [...currentImages, tempImage];
        onChange(currentImages);

        try {
          const response = await uploadService.uploadSingle(file);

          if (response?.success && response?.image?.url) {
            URL.revokeObjectURL(objectUrl);
            currentImages = currentImages.map((img) =>
              img.tempId === tempId
                ? {
                    url: response.image.url,
                    publicId: response.image.public_id,
                    isUploading: false,
                  }
                : img
            );
            onChange(currentImages);
          } else {
            throw new Error(response?.message || 'Upload failed');
          }
        } catch (error) {
          const message =
            error?.message ||
            'Failed to upload image. Please try again.';
          toast.error(message);
          console.error('Upload failed:', error);
          URL.revokeObjectURL(objectUrl);
          currentImages = currentImages.filter((img) => img.tempId !== tempId);
          onChange(currentImages);
        } finally {
          setUploadingImages((prev) => {
            const next = { ...prev };
            delete next[tempId];
            return next;
          });
        }
      }
    },
    [maxImages, onChange]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files || []);
      handleFiles(files);
    },
    [handleFiles]
  );

  const handleFileInput = useCallback(
    (e) => {
      const files = Array.from(e.target.files || []);
      handleFiles(files);
      e.target.value = '';
    },
    [handleFiles]
  );

  const handleRemove = async (index) => {
    const imageToRemove = images[index];
    if (!imageToRemove) return;

    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);

    if (imageToRemove.publicId && !imageToRemove.tempId) {
      try {
        await uploadService.deleteImage(imageToRemove.publicId);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }

    if (imageToRemove.tempId && imageToRemove.url?.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    if (Number.isNaN(fromIndex) || fromIndex === toIndex) return;
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  const canUploadMore = images.length < maxImages;

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">{label}</label>

      {canUploadMore && (
        <div
          className={`image-upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              fileInputRef.current?.click();
            }
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
          <FaCloudUploadAlt className="upload-icon" />
          <p className="upload-text">{helperText}</p>
          <p className="upload-hint">
            {maxImages - images.length} slots remaining • Max 5MB each • JPG/PNG/WebP
          </p>
        </div>
      )}

      {images.length > 0 && (
        <div className="image-upload-grid">
          {images.map((image, index) => (
            <div
              key={image.tempId || image.publicId || image.url || index}
              className={`image-upload-item ${index === 0 ? 'cover-image' : ''} ${
                image.isUploading ? 'uploading' : ''
              }`}
              draggable={!image.isUploading}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', String(index));
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
                handleReorder(fromIndex, index);
              }}
            >
              <img
                src={image.url}
                alt={`Property ${index + 1}`}
                className="uploaded-image"
              />

              {image.isUploading && (
                <div className="upload-overlay">
                  <FaSpinner className="spinner" />
                  <span>Uploading...</span>
                </div>
              )}

              <button
                type="button"
                className="remove-image-btn"
                onClick={() => handleRemove(index)}
                disabled={image.isUploading}
                aria-label={`Remove image ${index + 1}`}
              >
                <FaTimes />
              </button>

              {index === 0 && !image.isUploading && (
                <div className="cover-badge">Cover</div>
              )}

              {!image.isUploading && (
                <div className="image-number">{index + 1}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length > 0 && (
        <p className="image-upload-instructions">
          Drag images to reorder. First image will be the cover photo.
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
