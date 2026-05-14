import { useState, useEffect } from 'react';
import propertyService from '../services/propertyService';

export const useProperties = (filters = {}, initialFetch = true) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.getAll(filters);
      setProperties(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch properties');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialFetch) {
      fetchProperties();
    }
  }, []);

  return { properties, isLoading, error, refetch: fetchProperties };
};

export const useProperty = (id) => {
  const [property, setProperty] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProperty = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.getById(id);
      setProperty(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch property');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchProperty();
    }
  }, [id]);

  return { property, isLoading, error, refetch: fetchProperty };
};

export const useCreateProperty = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (propertyData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.create(propertyData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create property');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};

export const useUpdateProperty = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (id, propertyData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.update(id, propertyData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update property');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
};

export const useDeleteProperty = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.delete(id);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to delete property');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading, error };
};
