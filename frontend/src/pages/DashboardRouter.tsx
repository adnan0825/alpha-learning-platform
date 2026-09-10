/**
 * Dashboard Router - Redirects to the appropriate dashboard based on user role.
 */
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const DashboardRouter: React.FC = () => {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-accent" />
      </div>
    );
  }

  if (!profile) return <Navigate to="/login" replace />;

  switch (profile.role) {
    case "admin":
      return <Navigate to="/admin/dashboard" replace />;
    case "instructor":
      return <Navigate to="/instructor/dashboard" replace />;
    default:
      return <Navigate to="/student/dashboard" replace />;
  }
};

export default DashboardRouter;
