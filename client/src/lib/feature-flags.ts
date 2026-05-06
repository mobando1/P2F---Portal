import { useQuery } from "@tanstack/react-query";

/**
 * Returns the evaluated map of feature flags for the current user. Cached for
 * 60s to match the backend cache. Components should read flags via
 * useFeatureFlag(key) below; this hook is exported for cases that need the
 * full map.
 */
export function useFeatureFlags() {
  return useQuery<Record<string, boolean>>({
    queryKey: ["/api/feature-flags"],
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useFeatureFlag(key: string): boolean {
  const { data } = useFeatureFlags();
  return Boolean(data?.[key]);
}
