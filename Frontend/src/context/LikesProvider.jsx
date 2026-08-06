import { useCallback, useEffect, useMemo, useState } from 'react';
import useAuth from '../hooks/useAuth';
import { recipeApi } from '../lib/api';
import { LikesContext } from './likesContext';

export default function LikesProvider({ children }) {
  const { token, isAuthenticated } = useAuth();
  const [likedIds, setLikedIds] = useState(() => new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setLikedIds(new Set());
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    recipeApi
      .saved(token, { signal: controller.signal })
      .then((data) => {
        if (Array.isArray(data?.likes)) {
          setLikedIds(new Set(data.likes.map(String)));
        }
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load saved recipe interactions:', err);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [isAuthenticated, token]);

  const isLiked = useCallback(
    (recipeId) => {
      if (!recipeId) return false;
      return likedIds.has(String(recipeId));
    },
    [likedIds],
  );

  const toggleLike = useCallback(
    async (recipeId) => {
      if (!isAuthenticated || !token) {
        return { unauthenticated: true };
      }

      const idStr = String(recipeId);
      const currentlyLiked = likedIds.has(idStr);
      const nextLiked = !currentlyLiked;

      // Optimistic state update
      setLikedIds((prev) => {
        const next = new Set(prev);
        if (nextLiked) {
          next.add(idStr);
        } else {
          next.delete(idStr);
        }
        return next;
      });

      try {
        const res = nextLiked
          ? await recipeApi.like(idStr, token)
          : await recipeApi.unlike(idStr, token);

        return {
          liked: Boolean(res?.liked),
          likeCount: typeof res?.likeCount === 'number' ? res.likeCount : null,
        };
      } catch (err) {
        // Revert optimistic update on failure
        setLikedIds((prev) => {
          const next = new Set(prev);
          if (currentlyLiked) {
            next.add(idStr);
          } else {
            next.delete(idStr);
          }
          return next;
        });
        throw err;
      }
    },
    [isAuthenticated, token, likedIds],
  );

  const value = useMemo(
    () => ({
      likedIds,
      isLiked,
      toggleLike,
      loading,
    }),
    [likedIds, isLiked, toggleLike, loading],
  );

  return <LikesContext.Provider value={value}>{children}</LikesContext.Provider>;
}
