import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_EMAIL = 'shermuhammadovabdulaziz1@gmail.com';

export const isAdmin = (user) => user?.email === ADMIN_EMAIL;

const AdminRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (!isAdmin(currentUser)) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
