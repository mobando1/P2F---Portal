import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";

const STORAGE_KEY = "p2f_onboarding_v1";

interface OnboardingState {
  seen: string[];
  dismissed: boolean;
}

interface OnboardingContextType {
  isActive: boolean;
  seenSteps: string[];
  markStepSeen: (id: string) => void;
  dismissAll: () => void;
  hasSeenStep: (id: string) => boolean;
  registerStep: (id: string) => void;
  isCurrentStep: (id: string) => boolean;
}

const OnboardingContext = createContext<OnboardingContextType>({
  isActive: false,
  seenSteps: [],
  markStepSeen: () => {},
  dismissAll: () => {},
  hasSeenStep: () => true,
  registerStep: () => {},
  isCurrentStep: () => false,
});

export function useOnboarding() {
  return useContext(OnboardingContext);
}

function loadState(): OnboardingState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as OnboardingState;
  } catch {}
  return { seen: [], dismissed: false };
}

function saveState(state: OnboardingState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => loadState());
  const [registeredSteps, setRegisteredSteps] = useState<string[]>([]);

  const user = getCurrentUser();

  const isNewStudent =
    !!user &&
    user.userType !== "admin" &&
    !state.dismissed;

  const isActive = isNewStudent;

  // Register a step so we know the order
  const registerStep = useCallback((id: string) => {
    setRegisteredSteps(prev => prev.includes(id) ? prev : [...prev, id]);
  }, []);

  // Only show one coachmark at a time — the first unseen registered step
  const currentStepId = isActive
    ? registeredSteps.find(id => !state.seen.includes(id)) || null
    : null;

  const isCurrentStep = useCallback(
    (id: string) => id === currentStepId,
    [currentStepId]
  );

  const markStepSeen = useCallback((id: string) => {
    setState((prev) => {
      if (prev.seen.includes(id)) return prev;
      const next = { ...prev, seen: [...prev.seen, id] };
      saveState(next);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setState((prev) => {
      const next = { ...prev, dismissed: true };
      saveState(next);
      return next;
    });
  }, []);

  const hasSeenStep = useCallback(
    (id: string) => !isActive || state.seen.includes(id),
    [isActive, state.seen]
  );

  return (
    <OnboardingContext.Provider value={{ isActive, seenSteps: state.seen, markStepSeen, dismissAll, hasSeenStep, registerStep, isCurrentStep }}>
      {children}
    </OnboardingContext.Provider>
  );
}
