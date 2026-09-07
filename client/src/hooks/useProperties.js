import { useState, useEffect } from 'react';
import propertyService from '../services/propertyService';

export const useProperties = (filters = {}, initialFetch = true) => {
  const [properties, setProperties] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState(null);

  const fetchProperties = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await propertyService.getAll(filters);
      // The backend returns a flat array until `page`/`limit` are passed, then a
      // { items, total, page, pages } object. Normalize both into `properties`
      // so callers keep consuming the same shape; `pagination` is only the
      // populated metadata for server-side paging (null otherwise).
      if (Array.isArray(data)) {
        setProperties(data);
        setPagination(null);
      } else if (data && Array.isArray(data.items)) {
        setProperties(data.items);
        setPagination({ total: data.total, page: data.page, pages: data.pages });
      } else {
        setProperties([]);
        setPagination(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch properties');
    } finally {
      setIsLoading(false);
    }
  };

  // Key on the serialized filters (not the object identity — callers pass
  // fresh `{}` literals every render) so the list refetches when the actual
  // filter VALUES change, without looping on unrelated re-renders.
  const filtersKey = JSON.stringify(filters);

  useEffect(() => {
    if (initialFetch) {
      fetchProperties();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersKey]);

  return { properties, isLoading, error, refetch: fetchProperties, pagination };
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
