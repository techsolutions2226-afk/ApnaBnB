import { useState, useEffect } from 'react';
import requirementService from '../services/requirementService';

export const useRequirements = () => {
  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequirements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.getAll();
      setRequirements(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequirements();
  }, []);

  return { requirements, isLoading, error, refetch: fetchRequirements };
};

export const useRequirement = (id) => {
  const [requirement, setRequirement] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRequirement = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.getById(id);
      setRequirement(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch requirement');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchRequirement();
    }
  }, [id]);

  return { requirement, isLoading, error, refetch: fetchRequirement };
};

export const useCreateRequirement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (requirementData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.create(requirementData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create requirement');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};

export const useUpdateRequirement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const update = async (id, requirementData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.update(id, requirementData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to update requirement');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { update, isLoading, error };
};

export const useDeleteRequirement = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const remove = async (id) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.delete(id);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to delete requirement');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { remove, isLoading, error };
};

export const useUserRequirements = (userId, viewRole) => {
  const [requirements, setRequirements] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchUserRequirements = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await requirementService.getUserRequirements(userId, viewRole);
      setRequirements(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch user requirements');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchUserRequirements();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, viewRole]);

  return { requirements, isLoading, error, refetch: fetchUserRequirements };
};
