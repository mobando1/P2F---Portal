import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  level: string;
  avatar?: string;
  trialCompleted?: boolean;
  userType?: string;
  classCredits?: number;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  username: string;
}

let currentUser: AuthUser | null = null;

const STORAGE_KEY = 'passport2fluency_user';

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
    localStorage.removeItem(STORAGE_KEY);
  }
  return null;
};

const saveUserToStorage = (user: AuthUser | null) => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    console.error('Error saving user to storage:', error);
  }
};

export const getCurrentUser = (): AuthUser | null => {
  if (!currentUser) {
    currentUser = loadUserFromStorage();
  }
  return currentUser;
};

export const setCurrentUser = (user: AuthUser | null) => {
  currentUser = user;
  saveUserToStorage(user);
};

export const login = async (data: LoginData): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/login", data);
  const result = await response.json();

  if (result.user) {
    setCurrentUser(result.user);

    const { queryClient } = await import("@/lib/queryClient");
    queryClient.clear();

    return result.user;
  }

  throw new Error("Login failed");
};

export const register = async (data: RegisterData): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/register", data);
  const result = await response.json();

  if (result.user) {
    setCurrentUser(result.user);
    return result.user;
  }

  throw new Error("Registration failed");
};

export const logout = async () => {
  try {
    await apiRequest("POST", "/api/auth/logout");
  } catch {
    // Continue with local logout even if server call fails
  }
  setCurrentUser(null);
};

export const validateSession = async (): Promise<AuthUser | null> => {
  try {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (response.ok) {
      const result = await response.json();
      if (result.user) {
        setCurrentUser(result.user);
        return result.user;
      }
    }
  } catch {
    // Session invalid
  }
  setCurrentUser(null);
  return null;
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};

export const getSmartRedirect = (user: AuthUser | null): string => {
  if (!user) return "/login";

  switch (user.userType) {
    case "admin":
      return "/admin";
    case "tutor":
      return "/tutor-portal";
    case "customer":
      return "/dashboard";
    case "lead":
      return "/packages";
    case "trial":
    default:
      if (user.trialCompleted) return "/packages";
      return "/home";
  }
};
