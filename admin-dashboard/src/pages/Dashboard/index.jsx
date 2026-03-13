/**
 * Dashboard Index - Route to appropriate dashboard based on role
 */

import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import OrganizerDashboard from './OrganizerDashboard';
import StaffDashboard from './StaffDashboard';

const Dashboard = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F84565]"></div>
      </div>
    );
  }

  switch (user?.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'ORG':
      return <OrganizerDashboard />;
    case 'STAFF':
      return <StaffDashboard />;
    default:
      return <AdminDashboard />;
  }
};

export default Dashboard;
