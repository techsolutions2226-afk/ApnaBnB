import { useState, useEffect } from 'react';
import listingService from '../services/listingService';

export const useListings = () => {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchListings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.getAll();
      setListings(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  return { listings, isLoading, error, refetch: fetchListings };
};

export const useListing = (id) => {
  const [listing, setListing] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchListing = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.getById(id);
      setListing(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch listing');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchListing();
    } else {
      setIsLoading(false);
    }
  }, [id]);

  return { listing, isLoading, error, refetch: fetchListing };
};

export const useCreateListing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (listingData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.create(listingData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create listing');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};

export const useUpdateListingStatus = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateStatus = async (id, status) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.updateStatus(id, status);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update listing');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { updateStatus, isLoading, error };
};

export const useUpdateListing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (id, updates) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.update(id, updates);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update listing');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
};

export const useUserListings = (userId, viewRole) => {
  const [listings, setListings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserListings = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.getUserListings(userId, viewRole);
      setListings(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch user listings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserListings();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, viewRole]);

  return { listings, isLoading, error, refetch: fetchUserListings };
};

export const useDeleteListing = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await listingService.delete(id);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to delete listing');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading, error };
};
