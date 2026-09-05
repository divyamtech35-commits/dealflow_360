import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';

interface ProtectedRouteProps {
    allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
    const { user, isLoading } = useAuth();

    if (isLoading) return <div className="p-8 text-white">Loading Auth...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="p-8 bg-[#121212] min-h-screen text-red-500 font-bold border-t-4 border-red-500">
                403 - Forbidden: You do not have permissions to access this route.
            </div>
        );
    }

    return <Outlet />;
}
