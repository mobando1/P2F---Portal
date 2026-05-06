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

export interface FlagState {
  enabled: boolean;
  loading: boolean;
}

/**
 * Returns the flag state including loading. Prefer this over useFeatureFlag
 * for UI that branches on the flag (e.g. "Join class" routing) so we don't
 * flicker the user to the wrong destination during the initial fetch.
 */
export function useFeatureFlagState(key: string): FlagState {
  const { data, isLoading, isFetching } = useFeatureFlags();
  return {
    enabled: Boolean(data?.[key]),
    loading: isLoading || (isFetching && data === undefined),
  };
}

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagState(key).enabled;
}
