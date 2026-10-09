// ProtectedRoute.js
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();

  if (!user) {
    // Если пользователя нет в состоянии, отправляем его на страницу логина
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
