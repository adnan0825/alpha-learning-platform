/**
 * AuthContext - Manages authentication state using the API service layer.
 * When the Express.js backend is ready, just set USE_MOCK=false in api.ts.
 */
import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI, UserProfile } from "@/lib/api";
import { clearStoredToken, setStoredToken } from "@/lib/authStorage";

export type UserRole = "student" | "instructor" | "admin";

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  loginWithGoogleCode: (code: string, redirectUri: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from database on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const userProfile = await authAPI.getProfile();
        setUser(userProfile);
        setProfile(userProfile);
        sessionStorage.setItem("alpha_user", JSON.stringify(userProfile));
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        clearStoredToken();
        sessionStorage.removeItem("alpha_user");
        setUser(null);
        setProfile(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const persistUser = (u: UserProfile | null) => {
    setUser(u);
    setProfile(u);
    if (u) {
      sessionStorage.setItem("alpha_user", JSON.stringify(u));
    } else {
      sessionStorage.removeItem("alpha_user");
    }
  };

  const login = async (email: string, password: string) => {
    const { user: u, token } = await authAPI.login(email, password);
    setStoredToken(token);
    persistUser(u);
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    role: UserRole,
  ) => {
    const { user: u, token } = await authAPI.signup(
      email,
      password,
      name,
      role,
    );
    setStoredToken(token);
    persistUser(u);
  };

  const loginWithGoogle = async (credential: string) => {
    const { user: u, token } = await authAPI.loginWithGoogle(credential);
    setStoredToken(token);
    persistUser(u);
  };

  const loginWithGoogleCode = async (code: string, redirectUri: string) => {
    const { user: u, token } = await authAPI.loginWithGoogleCode(
      code,
      redirectUri,
    );
    setStoredToken(token);
    persistUser(u);
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      clearStoredToken();
      persistUser(null);
    }
  };

  const refreshProfile = async () => {
    try {
      const userProfile = await authAPI.getProfile();
      setUser(userProfile);
      setProfile(userProfile);
      sessionStorage.setItem("alpha_user", JSON.stringify(userProfile));
    } catch {
      clearStoredToken();
      sessionStorage.removeItem("alpha_user");
      setUser(null);
      setProfile(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        login,
        signup,
        loginWithGoogle,
        loginWithGoogleCode,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
