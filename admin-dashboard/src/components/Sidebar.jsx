/**
 * Sidebar Component - Role-based navigation (Dark Theme)
 */

import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Calendar,
  Users,
  MapPin,
  Mic2,
  Ticket,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  QrCode,
  ClipboardList,
  Gift,
  ChevronDown,
  ChevronRight,
  X,
} from 'lucide-react';
import { useState } from 'react';

const Sidebar = ({ isOpen, onToggle }) => {
  const { user, logout, isAdmin, isOrganizer, isStaff, getRoleDisplayName } = useAuth();
  const location = useLocation();
  const [expandedMenus, setExpandedMenus] = useState(['events']);

  const toggleMenu = (menu) => {
    setExpandedMenus(prev => 
      prev.includes(menu) 
        ? prev.filter(m => m !== menu)
        : [...prev, menu]
    );
  };

  // Menu items based on role
  const getMenuItems = () => {
    const items = [];

    // Dashboard - All roles
    items.push({
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/',
    });

    // Admin Menu
    if (isAdmin()) {
      items.push(
        {
          id: 'events',
          label: 'Events',
          icon: Calendar,
          children: [
            { label: 'All Events', path: '/events' },
            { label: 'Create Event', path: '/events/create' },
            { label: 'Categories', path: '/events/categories' },
          ],
        },
          {
            id: 'tickets',
            label: 'Ticket Classes',
            icon: Ticket,
            path: '/tickets',
          },
        {
          id: 'venues',
          label: 'Venues',
          icon: MapPin,
          path: '/venues',
        },
        {
          id: 'artists',
          label: 'Artists',
          icon: Mic2,
          path: '/artists',
        },
        {
          id: 'users',
          label: 'Users',
          icon: Users,
          path: '/users',
        },
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          path: '/orders',
        },
        {
          id: 'vouchers',
          label: 'Vouchers',
          icon: Gift,
          path: '/vouchers',
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: BarChart3,
          children: [
            { label: 'Sales Report', path: '/reports/sales' },
            { label: 'Events Report', path: '/reports/events' },
            { label: 'User Analytics', path: '/reports/users' },
          ],
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          path: '/settings',
        }
      );
    }

    // Organizer Menu
    if (isOrganizer()) {
      items.push(
        {
          id: 'my-events',
          label: 'My Events',
          icon: Calendar,
          children: [
            { label: 'All Events', path: '/events' },
            { label: 'Create Event', path: '/events/create' },
            { label: 'Draft Events', path: '/events/drafts' },
          ],
        },
        {
          id: 'tickets',
          label: 'Ticket Classes',
          icon: Ticket,
          path: '/tickets',
        },
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingCart,
          path: '/orders',
        },
        {
          id: 'vouchers',
          label: 'Vouchers',
          icon: Gift,
          path: '/vouchers',
        },
        {
          id: 'reports',
          label: 'Reports',
          icon: BarChart3,
          path: '/reports',
        },
        {
          id: 'staff',
          label: 'My Staff',
          icon: Users,
          path: '/staff',
        }
      );
    }

    // Staff Menu
    if (isStaff()) {
      items.push(
        {
          id: 'scanner',
          label: 'Ticket Scanner',
          icon: QrCode,
          path: '/scanner',
        },
        {
          id: 'check-in',
          label: 'Check-in List',
          icon: ClipboardList,
          path: '/check-in',
        },
        {
          id: 'assigned-events',
          label: 'My Events',
          icon: Calendar,
          path: '/my-events',
        }
      );
    }

    return items;
  };

  const menuItems = getMenuItems();

  const MenuItem = ({ item }) => {
    const Icon = item.icon;
    const hasChildren = item.children?.length > 0;
    const isExpanded = expandedMenus.includes(item.id);
    const isActive = item.path === location.pathname || 
      item.children?.some(child => child.path === location.pathname);

    if (hasChildren) {
      return (
        <div className="mb-1">
          <button
            onClick={() => toggleMenu(item.id)}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200
              ${isActive 
                ? 'bg-primary text-white shadow-lg shadow-primary/25' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
          >
            <div className="flex items-center gap-3">
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </div>
            {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </button>
          {isExpanded && (
            <div className="ml-4 mt-1 border-l border-white/10 pl-4">
              {item.children.map((child, idx) => (
                <NavLink
                  key={idx}
                  to={child.path}
                  end
                  className={({ isActive }) =>
                    `block px-4 py-2.5 rounded-lg text-sm transition-all duration-200 mb-1
                    ${isActive 
                      ? 'bg-primary/20 text-primary font-medium' 
                      : 'text-gray-500 hover:text-white hover:bg-white/5'}`
                  }
                >
                  {child.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      );
    }

    return (
      <NavLink
        to={item.path}
        end
        className={({ isActive }) =>
          `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 mb-1
          ${isActive 
            ? 'bg-primary text-white shadow-lg shadow-primary/25' 
            : 'text-gray-400 hover:bg-white/5 hover:text-white'}`
        }
      >
        <Icon size={20} />
        <span className="font-medium">{item.label}</span>
      </NavLink>
    );
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-72 bg-zinc-900/80 backdrop-blur-xl border-r border-white/5 flex flex-col
        transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/30">
              <Ticket size={22} className="text-white" />
            </div>
            <div>
              <span className="text-white font-bold text-xl">QuickShow</span>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Admin Panel</p>
            </div>
          </div>
          <button 
            onClick={onToggle}
            className="lg:hidden text-gray-400 hover:text-white p-2 hover:bg-white/5 rounded-lg"
          >
            <X size={20} />
          </button>
        </div>

        {/* Role Badge */}
        <div className="px-6 py-4">
          <div className={`
            inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold
            backdrop-blur-sm border
            ${user?.role === 'ADMIN' ? 'bg-red-500/10 border-red-500/20 text-red-400' : ''}
            ${user?.role === 'ORG' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : ''}
            ${user?.role === 'STAFF' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : ''}
          `}>
            <span className={`w-2 h-2 rounded-full animate-pulse
              ${user?.role === 'ADMIN' ? 'bg-red-400' : ''}
              ${user?.role === 'ORG' ? 'bg-blue-400' : ''}
              ${user?.role === 'STAFF' ? 'bg-emerald-400' : ''}
            `}></span>
            {getRoleDisplayName ? getRoleDisplayName() : user?.role}
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 overflow-y-auto px-4 pb-4">
          <p className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold px-4 mb-3">
            Main Menu
          </p>
          {menuItems.map((item) => (
            <MenuItem key={item.id} item={item} />
          ))}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 mb-3">
            <img 
              src={user?.avatar} 
              alt={user?.name}
              className="w-10 h-10 rounded-full ring-2 ring-primary/30"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate text-sm">{user?.name}</p>
              <p className="text-gray-500 text-xs truncate">{user?.email}</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
              text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-200"
          >
            <LogOut size={18} />
            <span className="text-sm">Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
