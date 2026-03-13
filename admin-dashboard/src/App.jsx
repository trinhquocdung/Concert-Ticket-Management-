/**
 * Admin Dashboard App - Role-based routing
 * Supports: ADMIN, ORG (Organizer), STAFF roles
 */

import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';

// Dashboard
import Dashboard from './pages/Dashboard';

// Events
import EventsList from './pages/Events/EventsList';
import EventForm from './pages/Events/EventForm';
import EventZonePainter from './pages/Events/EventZonePainter';

// Categories
import CategoriesList from './pages/Categories/CategoriesList';

// Users
import UsersList from './pages/Users/UsersList';

// Artists
import ArtistsList from './pages/Artists/ArtistsList';

// Venues
import VenuesList from './pages/Venues/VenuesList';

// Seats
import VisualSeatDesigner from './pages/Seats/VisualSeatDesigner';

// Orders
import OrdersList from './pages/Orders/OrdersList';
import CancellationRequests from './pages/Orders/CancellationRequests';

// Tickets
import TicketClassList from './pages/Tickets/TicketClassList';
import EventsTickets from './pages/Tickets/EventsTickets';

// Vouchers
import VouchersList from './pages/Vouchers/VouchersList';

// Staff Pages
import TicketScanner from './pages/Staff/TicketScanner';
import CheckInList from './pages/Staff/CheckInList';

// Reports
import SalesReport from './pages/Reports/SalesReport';

// Settings
import SystemSettings from './pages/Settings/SystemSettings';

// Protected Route Component - Requires authentication and role check
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F84565]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to dashboard if user doesn't have permission
    return <Navigate to="/" replace />;
  }

  return children;
};

// Auth Route - Only accessible when NOT logged in
const AuthRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F84565]"></div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return children;
};

// Placeholder pages for routes not yet created
const PlaceholderPage = ({ title }) => (
  <div className="flex items-center justify-center h-64">
    <div className="text-center">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      <p className="text-gray-500 mt-2">This page is under construction</p>
    </div>
  </div>
);

// Protected Layout wrapper
const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F84565]"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<ProtectedLayout />}>
        {/* Dashboard - All roles */}
        <Route index element={<Dashboard />} />
        
        {/* Events - Admin & Organizer */}
        <Route path="events" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <EventsList />
          </ProtectedRoute>
        } />
        <Route path="events/create" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <EventForm />
          </ProtectedRoute>
        } />
        <Route path="events/:id/edit" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <EventForm />
          </ProtectedRoute>
        } />
        <Route path="events/:id/zones" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <EventZonePainter />
          </ProtectedRoute>
        } />
        <Route path="events/categories" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CategoriesList />
          </ProtectedRoute>
        } />
        <Route path="events/drafts" element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <PlaceholderPage title="Draft Events" />
          </ProtectedRoute>
        } />

        {/* Venues - Admin only */}
        <Route path="venues" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VenuesList />
          </ProtectedRoute>
        } />
        <Route path="venues/:venueId/designer" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <VisualSeatDesigner />
          </ProtectedRoute>
        } />

        {/* Artists - Admin only */}
        <Route path="artists" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <ArtistsList />
          </ProtectedRoute>
        } />

        {/* Users - Admin only */}
        <Route path="users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <UsersList />
          </ProtectedRoute>
        } />
          {/* Organizer and Staff specific management removed - consolidated under All Users */}

        {/* Orders - Admin & Organizer */}
        <Route path="orders" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <OrdersList />
          </ProtectedRoute>
        } />
        <Route path="orders/cancellations" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <CancellationRequests />
          </ProtectedRoute>
        } />

        {/* Tickets - Admin & Organizer */}
          <Route path="tickets" element={
            <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
              <EventsTickets />
            </ProtectedRoute>
          } />
        <Route path="events/:concertId/tickets" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <TicketClassList />
          </ProtectedRoute>
        } />

        {/* Vouchers - Admin & Organizer */}
        <Route path="vouchers" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <VouchersList />
          </ProtectedRoute>
        } />

        {/* Reports - Admin & Organizer */}
        <Route path="reports" element={
          <ProtectedRoute allowedRoles={['ADMIN', 'ORG']}>
            <SalesReport />
          </ProtectedRoute>
        } />
        <Route path="reports/sales" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SalesReport />
          </ProtectedRoute>
        } />
        <Route path="reports/events" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlaceholderPage title="Events Report" />
          </ProtectedRoute>
        } />
        <Route path="reports/users" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <PlaceholderPage title="User Analytics" />
          </ProtectedRoute>
        } />

        {/* Staff Pages */}
        <Route path="scanner" element={
          <ProtectedRoute allowedRoles={['STAFF']}>
            <TicketScanner />
          </ProtectedRoute>
        } />
        <Route path="check-in" element={
          <ProtectedRoute allowedRoles={['STAFF']}>
            <CheckInList />
          </ProtectedRoute>
        } />
        <Route path="my-events" element={
          <ProtectedRoute allowedRoles={['STAFF']}>
            <PlaceholderPage title="My Assigned Events" />
          </ProtectedRoute>
        } />

        {/* Staff Management - Organizer */}
        <Route path="staff" element={
          <ProtectedRoute allowedRoles={['ORG']}>
            <PlaceholderPage title="My Staff" />
          </ProtectedRoute>
        } />

        {/* Settings - Admin only */}
        <Route path="settings" element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <SystemSettings />
          </ProtectedRoute>
        } />
      </Route>

      {/* Login Page */}
      <Route path="/login" element={
        <AuthRoute>
          <Login />
        </AuthRoute>
      } />
      
      {/* 404 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
