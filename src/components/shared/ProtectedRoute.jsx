// src/components/shared/ProtectedRoute.jsx

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../ui';

export const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <LoadingSpinner message="Authenticating…" />;
  if (!user)   return <Navigate to="/login" state={{ from: location }} replace />;
  return children;
};

export const StaffRoute = ({ children }) => {
  const { isStaff, loading } = useAuth();
  if (loading)  return <LoadingSpinner />;
  if (!isStaff) return <Navigate to="/dashboard" replace />;
  return children;
};

export const ManagerRoute = ({ children }) => {
  const { isManager, loading } = useAuth();
  if (loading)    return <LoadingSpinner />;
  if (!isManager) return <Navigate to="/dashboard" replace />;
  return children;
};

export const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();
  if (loading)  return <LoadingSpinner />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
};
