import { useState, useEffect } from 'react';
import matchService from '../services/matchService';
import { getSocket } from '../api/socket';

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

// All matches for the role the user is currently ACTING AS, sorted by recency.
// Used by every role's dashboard for the "Recent Matches" section. Pass the
// viewRole (seller|buyer|dealer) so each role only sees its own side's matches.
export const useMyMatches = (viewRole) => {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchMatches = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await matchService.getMyMatches(viewRole);
      setMatches(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || 'Failed to fetch your matches');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewRole]);

  /* AI scoring runs fire-and-forget after a match is created, so without this
     the card sits on "AI scoring in progress…" until the user refreshes by
     hand — the score itself lands in about a second. Patch the row in place
     when the server pushes the result.

     Falls back to a short poll while anything is still pending, so a dropped
     socket doesn't leave the spinner running forever. */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onScored = (payload) => {
      if (!payload?.id) return;
      setMatches((prev) =>
        prev.map((m) =>
          (m._id || m.id) === payload.id
            ? {
                ...m,
                aiStatus: payload.aiStatus,
                aiScore: payload.aiScore ?? m.aiScore,
                aiReason: payload.aiReason ?? m.aiReason,
                score: payload.score ?? m.score,
              }
            : m,
        ),
      );
    };
    socket.on('match:scored', onScored);
    return () => socket.off('match:scored', onScored);
  }, []);

  /* Depend on the BOOLEAN, not the array: every fetch returns a new array
     reference, which would tear down and recreate the interval each tick and
     reset `elapsed` — so the give-up cap would never be reached. */
  const hasPending = matches.some((m) => m.aiStatus === 'pending');

  useEffect(() => {
    if (!hasPending) return;
    // Scoring takes ~1-2s; give up after a minute so a stuck row can't poll forever.
    let elapsed = 0;
    const id = setInterval(() => {
      elapsed += 4000;
      if (elapsed > 60000) {
        clearInterval(id);
        return;
      }
      fetchMatches();
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPending]);

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
