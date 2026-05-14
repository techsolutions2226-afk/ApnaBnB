import { useState, useRef, useCallback } from 'react';
import { FaCloudUploadAlt, FaTimes, FaImage, FaSpinner } from 'react-icons/fa';
import uploadService from '../../services/uploadService';
import '../../styles/ImageUpload.css';

const ImageUpload = ({ 
  images = [], 
  onChange, 
  maxImages = 5, 
  label = 'Upload Images',
  helperText = 'Drag & drop images here or click to browse'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingImages, setUploadingImages] = useState({});
  const fileInputRef = useRef(null);

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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [images]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    handleFiles(files);
    // Reset input so same file can be selected again
    e.target.value = '';
  }, [images]);

  const handleFiles = async (files) => {
    const remainingSlots = maxImages - images.length;
    
    if (remainingSlots <= 0) {
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    
    // Track current images for each file upload
    let currentImages = [...images];
    
    for (const file of filesToUpload) {
      const validationError = validateFile(file);
      
      if (validationError) {
        console.error(validationError);
        continue;
      }

      const tempId = Date.now() + Math.random().toString(36).substr(2, 9);
      
      // Add temp image with loading state
      setUploadingImages(prev => ({ ...prev, [tempId]: true }));
      
      const tempImage = {
        tempId,
        url: URL.createObjectURL(file),
        isUploading: true,
        file
      };
      
      currentImages = [...currentImages, tempImage];
      onChange(currentImages);

      try {
        // Upload to Cloudinary
        const response = await uploadService.uploadSingle(file);
        
        if (response.success) {
          // Replace temp image with uploaded image
          currentImages = currentImages.map(img => 
            img.tempId === tempId 
              ? { 
                  url: response.image.url, 
                  publicId: response.image.public_id,
                  isUploading: false 
                }
              : img
          );
          onChange(currentImages);
        }
      } catch (error) {
        console.error('Upload failed:', error);
        // Remove failed upload from images
        currentImages = currentImages.filter(img => img.tempId !== tempId);
        onChange(currentImages);
      } finally {
        setUploadingImages(prev => {
          const newState = { ...prev };
          delete newState[tempId];
          return newState;
        });
      }
    }
  };

  const handleRemove = async (index) => {
    const imageToRemove = images[index];
    
    // Remove from UI immediately
    const newImages = [...images];
    newImages.splice(index, 1);
    onChange(newImages);
    
    // If it was uploaded to Cloudinary, delete it
    if (imageToRemove.publicId && !imageToRemove.tempId) {
      try {
        await uploadService.deleteImage(imageToRemove.publicId);
      } catch (error) {
        console.error('Failed to delete image:', error);
      }
    }
    
    // Clean up object URL if it was a temp image
    if (imageToRemove.tempId) {
      URL.revokeObjectURL(imageToRemove.url);
    }
  };

  const handleReorder = (fromIndex, toIndex) => {
    const newImages = [...images];
    const [movedImage] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, movedImage);
    onChange(newImages);
  };

  const canUploadMore = images.length < maxImages;

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">{label}</label>
      
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`image-upload-dropzone ${isDragging ? 'dragging' : ''}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
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

      {/* Images Grid */}
      {images.length > 0 && (
        <div className="image-upload-grid">
          {images.map((image, index) => (
            <div 
              key={image.tempId || image.publicId || index} 
              className={`image-upload-item ${index === 0 ? 'cover-image' : ''} ${image.isUploading ? 'uploading' : ''}`}
              draggable={!image.isUploading}
              onDragStart={(e) => {
                e.dataTransfer.setData('text/plain', index.toString());
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
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

      {/* Instructions */}
      {images.length > 0 && (
        <p className="image-upload-instructions">
          Drag images to reorder. First image will be the cover photo.
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
