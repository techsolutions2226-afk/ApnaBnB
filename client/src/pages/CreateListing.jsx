/* ─── CreateListing — New property listing page ───
   Sellers and Dealers can create a new property listing.
   Uses the shared ListingForm component.
   Calls real backend API to create property and listing.
   ─────────────────────────────────────────────── */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useCreateProperty } from "../hooks/useProperties";
import { useCreateListing } from "../hooks/useListings";
import { clearListingDraft } from "../utils/listingDraft";
import { FiArrowLeft, FiPlusCircle, FiSave } from "react-icons/fi";
import "../styles/Dashboard.css"; /* breadcrumb styles */
import ListingForm from "../components/listing/ListingForm";
import "../styles/Listing.css";

const CreateListing = () => {
  const { currentUser, getDashboardPath } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { create: createProperty, error: propError } = useCreateProperty();
  const { create: createListing, error: listError } = useCreateListing();

  const handleSubmit = useCallback(
    async (formData) => {
      setIsSubmitting(true);

      try {
        // First create the property
        const propertyData = {
          title: formData.title,
          description: formData.description,
          price: formData.price,
          location: {
            city: formData.city,
            area: formData.area,
            ...(formData.coordinates ? { coordinates: formData.coordinates } : {}),
          },
          bedrooms: formData.bedrooms,
          bathrooms: formData.bathrooms,
          size: formData.size,
          propertyType: formData.propertyType.toLowerCase(),
          amenities: Array.isArray(formData.amenities) ? formData.amenities : [],
          photos: formData.images || [], // Changed from images to photos for backend
        };

        const createdProperty = await createProperty(propertyData);
        console.log("Created property:", createdProperty);

        // Then create the listing
        const listingData = {
          propertyId: createdProperty._id,
        };

        await createListing(listingData);
        console.log("Created listing for property:", createdProperty._id);

        // Listing committed to the server — drop the local draft.
        clearListingDraft(currentUser?.id);

        setIsSubmitting(false);
        toast.success("Listing created successfully!");
        navigate("/my-listings");
      } catch (err) {
        setIsSubmitting(false);
        const errorMessage = propError || listError || err.message || "Failed to create listing";
        console.error("Error creating listing:", errorMessage);
        toast.error(errorMessage);
      }
    },
    [currentUser, navigate, createProperty, createListing, propError, listError]
  );

  return (
    <div className="lst-page">
      {/* ── Breadcrumb ── */}
      <nav className="dash-breadcrumb">
        <Link to="/" className="dash-breadcrumb-link">Home</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to={getDashboardPath()} className="dash-breadcrumb-link">Dashboard</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <Link to="/my-listings" className="dash-breadcrumb-link">My Listings</Link>
        <span className="dash-breadcrumb-sep">/</span>
        <span className="dash-breadcrumb-current">Create Listing</span>
      </nav>

      <Link to="/my-listings" className="lst-back-link">
        <FiArrowLeft /> Back to My Listings
      </Link>

      <div className="lst-header">
        <h1 className="lst-title">
          <FiPlusCircle style={{ marginRight: 8, verticalAlign: "-3px" }} />
          Create New Listing
        </h1>
        <p className="lst-subtitle">
          Share the details of your property with{" "}
          <strong>thousands of buyers and dealers</strong> across Pakistan.
        </p>
      </div>

      {/* ── Auto-save info banner ── */}
      <div className="lst-banner lst-banner--info">
        <FiSave className="lst-banner-icon" />
        <span>
          <strong>Your progress is saved automatically.</strong> Close the tab
          and come back anytime — your draft will be waiting for you.
        </span>
      </div>

      <ListingForm
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        submitLabel="Create Listing"
        draftKey={currentUser?.id}
      />
    </div>
  );
};

export default CreateListing;
