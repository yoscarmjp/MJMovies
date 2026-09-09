import React, { useEffect } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Components
import Navbar from './components/layout/Navbar';
import ToastContainer from './components/ui/ToastContainer';

// Pages
import HomeView from './pages/HomeView';
import CatalogView from './pages/CatalogView';
import MovieView from './pages/MovieView';
import ExternalMovieView from './pages/ExternalMovieView';
import PlayerView from './pages/PlayerView';
import ProfileView from './pages/ProfileView';
import LoginView from './pages/LoginView';
import RegisterView from './pages/RegisterView';
import NotFoundView from './pages/NotFoundView';

// Admin Pages
import AdminLayout from './pages/admin/AdminLayout';
import DashboardView from './pages/admin/DashboardView';
import MoviesView from './pages/admin/MoviesView';
import UploadView from './pages/admin/UploadView';
import UsersView from './pages/admin/UsersView';
import JobsView from './pages/admin/JobsView';

// Scroll to top helper
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Route Guard: Protected (User)
function ProtectedRoute({ children }) {
  const { isLoggedIn, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  return children;
}

// Route Guard: Admin only
function AdminRoute({ children }) {
  const { isLoggedIn, isAdmin, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

// Route Guard: Guest Only (e.g. Login, Register)
function GuestRoute({ children }) {
  const { isLoggedIn, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default function App() {
  const location = useLocation();
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    // Keyboard TV navigation helper
    const handleKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) {
        document.body.classList.add('keyboard-nav');
      }
    };
    const handleMouseMove = () => {
      document.body.classList.remove('keyboard-nav');
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [initialize]);

  const isPlayerRoute = location.pathname.startsWith('/watch');
  const isAdminRoute = location.pathname.startsWith('/admin');
  const showNavbar = !isPlayerRoute && !isAdminRoute;

  return (
    <div className="min-h-screen bg-background text-white selection:bg-primary selection:text-white">
      <ScrollToTop />
      {showNavbar && <Navbar />}

      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/catalog" element={<CatalogView />} />
        <Route path="/movie/:id" element={<MovieView />} />
        <Route path="/external/:id" element={<ExternalMovieView />} />
        <Route path="/watch/:id" element={<PlayerView />} />

        <Route
          path="/login"
          element={
            <GuestRoute>
              <LoginView />
            </GuestRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestRoute>
              <RegisterView />
            </GuestRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfileView />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardView />} />
          <Route path="movies" element={<MoviesView />} />
          <Route path="upload" element={<UploadView />} />
          <Route path="users" element={<UsersView />} />
          <Route path="jobs" element={<JobsView />} />
        </Route>

        <Route path="*" element={<NotFoundView />} />
      </Routes>

      <ToastContainer />
    </div>
  );
}
