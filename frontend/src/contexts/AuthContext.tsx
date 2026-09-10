/**
 * AuthContext - Manages authentication state using the API service layer.
 * When the Express.js backend is ready, just set USE_MOCK=false in api.ts.
 */
import React, { createContext, useContext, useState, useEffect } from "react";
import { authAPI, UserProfile } from "@/lib/api";

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
      const token = localStorage.getItem("alpha_token");
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const userProfile = await authAPI.getProfile();
        setUser(userProfile);
        setProfile(userProfile);
        // Still store minimal user info in localStorage for quick access
        localStorage.setItem("alpha_user", JSON.stringify(userProfile));
      } catch (error) {
        console.error("Failed to fetch profile:", error);
        localStorage.removeItem("alpha_token");
        localStorage.removeItem("alpha_user");
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
      localStorage.setItem("alpha_user", JSON.stringify(u));
    } else {
      localStorage.removeItem("alpha_user");
    }
  };

  const login = async (email: string, password: string) => {
    const { user: u, token } = await authAPI.login(email, password);
    localStorage.setItem("alpha_token", token);
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
    localStorage.setItem("alpha_token", token);
    persistUser(u);
  };

  const loginWithGoogle = async (credential: string) => {
    const { user: u, token } = await authAPI.loginWithGoogle(credential);
    localStorage.setItem("alpha_token", token);
    persistUser(u);
  };

  const loginWithGoogleCode = async (code: string, redirectUri: string) => {
    const { user: u, token } = await authAPI.loginWithGoogleCode(
      code,
      redirectUri,
    );
    localStorage.setItem("alpha_token", token);
    persistUser(u);
  };

  const logout = async () => {
    localStorage.removeItem("alpha_token");
    persistUser(null);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem("alpha_token");
    if (!token) return;
    try {
      const userProfile = await authAPI.getProfile();
      setUser(userProfile);
      setProfile(userProfile);
      localStorage.setItem("alpha_user", JSON.stringify(userProfile));
    } catch {
      localStorage.removeItem("alpha_token");
      localStorage.removeItem("alpha_user");
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
