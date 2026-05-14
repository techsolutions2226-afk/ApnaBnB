/* EditListing - Edit an existing property listing
   Loads listing data from `:id` param using API
   Allows editing property details and listing status
   ----------------------------------------------- */

import { useState, useEffect, useCallback } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useListing, useUpdateListing } from "../hooks/useListings";
import { useProperties, useUpdateProperty } from "../hooks/useProperties";
import ListingForm from "../components/listing/ListingForm";
import { FiArrowLeft, FiHome } from "react-icons/fi";
import "../styles/Dashboard.css";
import "../styles/Listing.css";

const EditListing = () => {
  const { id } = useParams();
  const { currentUser, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { update: updateProperty } = useUpdateProperty();
  const { update: updateListing } = useUpdateListing();

  // Fetch listing data from API
  const { listing, isLoading: listingLoading, error: listingError, refetch: refetchListing } = useListing(id);
  
  // Fetch properties for enrichment
  const { properties, isLoading: propsLoading } = useProperties({}, true);

  // State for form data
  const [initialData, setInitialData] = useState(null);
  const [property, setProperty] = useState(null);

  // Enrich listing data when loaded
  useEffect(() => {
    if (listing && properties) {
      // Get property data from populated listing or find in properties list
      const propData = typeof listing.property === 'object' 
        ? listing.property 
        : properties.find(p => p._id === listing.property || p._id === listing.propertyId);
      
      if (propData) {
        setProperty(propData);
        
        // Build form initial data
        setInitialData({
          title: propData.title || '',
          propertyType: propData.propertyType || '',
          price: propData.price || '',
          size: propData.size || '',
          sizeUnit: propData.sizeUnit || 'sq ft',
          city: propData.location?.city || propData.city || '',
          area: propData.location?.area || propData.area || '',
          coordinates: propData.location?.coordinates || propData.coordinates || null,
          bedrooms: propData.bedrooms || '',
          bathrooms: propData.bathrooms || '',
          description: propData.description || '',
          amenities: propData.amenities || [],
          image: propData.image || '',
          gallery: propData.gallery || propData.photos || [],
          status: listing.status || 'active',
          featured: listing.featured || false,
        });
      }
    }
  }, [listing, properties]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (formData) => {
      if (!property || !listing) return;
      
      setIsSubmitting(true);

      try {
        // Update property details via API
        const propertyUpdates = {
          title: formData.title,
          propertyType: formData.propertyType,
          price: Number(formData.price),
          size: Number(formData.size) || undefined,
          location: {
            city: formData.city,
            area: formData.area,
            ...(formData.coordinates ? { coordinates: formData.coordinates } : {}),
          },
          bedrooms: Number(formData.bedrooms) || undefined,
          bathrooms: Number(formData.bathrooms) || undefined,
          description: formData.description,
          amenities: Array.isArray(formData.amenities) ? formData.amenities : [],
          photos: Array.isArray(formData.images) ? formData.images : undefined,
        };

        // Update listing status via API
        const statusUpdate = {
          status: formData.status,
          featured: formData.featured,
        };

        // Call APIs to update
        await updateProperty(property._id, propertyUpdates);
        await updateListing(listing._id, statusUpdate);

        setIsSubmitting(false);
        toast.success("Listing updated successfully!");
        navigate("/my-listings");
      } catch (error) {
        setIsSubmitting(false);
        toast.error(error.message || "Failed to update listing");
      }
    },
    [property, listing, navigate, updateProperty, updateListing]
  );

  // Loading state
  if (listingLoading || propsLoading) {
    return (
      <div className="lst-page">
        <div className="lst-loading">
          <div className="lst-loading-spinner" />
          <p>Loading listing...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (listingError) {
    return (
      <div className="lst-page">
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Edit Listing</span>
        </nav>

        <div className="lst-empty">
          <div className="lst-empty-icon">❌</div>
          <h2 className="lst-empty-title">Error Loading Listing</h2>
          <p className="lst-empty-text">{listingError}</p>
          <button 
            onClick={refetchListing}
            className="lst-btn lst-btn--primary"
            style={{ marginTop: '16px' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Not found / not owner state
  if (!listing || !property) {
    return (
      <div className="lst-page">
        <nav className="dash-breadcrumb">
          <Link to="/" className="dash-breadcrumb-link">Home</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
          <span className="dash-breadcrumb-sep">/</span>
          <span className="dash-breadcrumb-current">Edit Listing</span>
        </nav>

        <div className="lst-empty">
          <div className="lst-empty-icon">🔍</div>
          <h2 className="lst-empty-title">Listing Not Found</h2>
          <p className="lst-empty-text">
            The listing you're looking for doesn't exist or you don't have
            permission to edit it.
          </p>
          <Link to="/my-listings" className="lst-btn lst-btn--primary">
            Go to My Listings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="lst-page">
      {/* Breadcrumb */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to="/my-listings" className="dash-breadcrumb-link">My Listings</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Edit Listing</span>
      </nav>

      <Link to="/my-listings" className="lst-back-link">
        <FiArrowLeft /> Back to My Listings
      </Link>

      <div className="lst-header">
        <h1 className="lst-title">
          <FiHome style={{ marginRight: '8px' }} />
          Edit Listing
        </h1>
        <p className="lst-subtitle">
          Update the details for{" "}
          <strong>{property.title}</strong>
        </p>
      </div>

      {initialData && (
        <ListingForm
          initialData={initialData}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Save Changes"
          mode="edit"
        />
      )}
    </div>
  );
};

export default EditListing;