"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook to manage unsent text drafts in localStorage.
 * @param key Unique key for the draft (e.g., 'post-composer' or 'chat-npub1...')
 * @param initialValue Initial text if no draft exists
 */
export function useDrafts(key: string, initialValue: string = "") {
  const [draft, setDraft] = useState<string>(initialValue);
  const [isLoaded, setIsLoaded] = useState(false);

  const storageKey = `tellit-draft-${key}`;

  // Load draft on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setDraft(saved);
      }
    } catch (e) {
      console.warn("Failed to load draft:", e);
    } finally {
      setIsLoaded(true);
    }
  }, [storageKey]);

  // Save draft whenever it changes
  const updateDraft = useCallback((value: string) => {
    setDraft(value);
    if (typeof window === "undefined") return;
    
    try {
      if (value) {
        localStorage.setItem(storageKey, value);
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn("Failed to save draft:", e);
    }
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    setDraft("");
    if (typeof window === "undefined") return;
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { draft, updateDraft, clearDraft, isLoaded };
}
