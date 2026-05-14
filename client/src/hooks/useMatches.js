import { useState, useEffect } from 'react';
import matchService from '../services/matchService';

export const useMatches = (type = 'all') => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await matchService.getMatches(type);
      setMatches(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, [type]);

  return { matches, isLoading, error, refetch: fetchMatches };
};

export const useSellerBuyerMatches = () => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await matchService.getSellerBuyerMatches();
      setMatches(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch seller-buyer matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return { matches, isLoading, error, refetch: fetchMatches };
};

export const useDealerBuyerMatches = () => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await matchService.getDealerBuyerMatches();
      setMatches(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dealer-buyer matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return { matches, isLoading, error, refetch: fetchMatches };
};

export const useDealerDealerMatches = () => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await matchService.getDealerDealerMatches();
      setMatches(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch dealer-dealer matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  return { matches, isLoading, error, refetch: fetchMatches };
};

export const useCreateMatch = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const create = async (matchData) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await matchService.create(matchData);
      return data;
    } catch (err) {
      setError(err.message || 'Failed to create match');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { create, isLoading, error };
};
