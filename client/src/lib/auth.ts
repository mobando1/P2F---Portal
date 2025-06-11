import { apiRequest } from "./queryClient";

export interface AuthUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  username: string;
  level: string;
  avatar?: string;
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

export const getCurrentUser = (): AuthUser | null => {
  return currentUser;
};

export const setCurrentUser = (user: AuthUser | null) => {
  currentUser = user;
};

export const login = async (data: LoginData): Promise<AuthUser> => {
  const response = await apiRequest("POST", "/api/auth/login", data);
  const result = await response.json();
  
  if (result.user) {
    setCurrentUser(result.user);
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

export const logout = () => {
  setCurrentUser(null);
};

export const isAuthenticated = (): boolean => {
  return currentUser !== null;
};
