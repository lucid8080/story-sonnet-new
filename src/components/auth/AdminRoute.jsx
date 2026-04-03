import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute.jsx';
import { useAdmin } from '../../hooks/useAdmin.js';

export default function AdminRoute({ children }) {
  const { isAdmin } = useAdmin();
  const location = useLocation();

  return (
    <ProtectedRoute>
      {isAdmin ? (
        children
      ) : (
        <Navigate to="/" replace state={{ from: location, reason: 'not-admin' }} />
      )}
    </ProtectedRoute>
  );
}

