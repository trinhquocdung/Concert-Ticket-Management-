/**
 * Header Component - Dark Theme with user info
 */

import { useAuth } from '../context/AuthContext';
import { 
  Menu, 
  Bell, 
  Search,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';

const Header = ({ onMenuToggle }) => {
  const { user, logout, getRoleDisplayName } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    { id: 1, title: 'New order received', time: '5 min ago', read: false },
    { id: 2, title: 'Event "Concert ABC" is live', time: '1 hour ago', read: false },
    { id: 3, title: 'New user registered', time: '2 hours ago', read: true },
  ];

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="h-20 bg-zinc-900/50 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 lg:px-6">
      {/* Left side */}
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuToggle}
          className="lg:hidden p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
        >
          <Menu size={22} />
        </button>

        {/* Search */}
        <div className="hidden md:flex items-center gap-3 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-2.5 w-80 group focus-within:border-primary/50 transition-colors">
          <Search size={18} className="text-gray-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text"
            placeholder="Search events, users, orders..."
            className="bg-transparent border-none outline-none flex-1 text-sm text-white placeholder:text-gray-500"
          />
          <kbd className="hidden lg:inline-flex text-[10px] text-gray-600 bg-white/5 px-2 py-0.5 rounded border border-white/10">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-primary text-white 
                text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowNotifications(false)} 
              />
              <div className="absolute right-0 mt-2 w-80 bg-zinc-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 z-20 overflow-hidden">
                <div className="p-4 border-b border-white/5">
                  <h3 className="font-semibold text-white">Notifications</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map(notif => (
                    <div 
                      key={notif.id}
                      className={`px-4 py-3 border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors
                        ${!notif.read ? 'bg-primary/5' : ''}`}
                    >
                      <p className="text-sm font-medium text-white">{notif.title}</p>
                      <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-white/5">
                  <button className="text-sm text-primary font-medium hover:underline">
                    View all notifications
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* User Avatar with Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-3 pl-3 border-l border-white/10 hover:bg-white/5 rounded-lg pr-2 py-1 transition-colors"
          >
            <img 
              src={user?.avatar}
              alt={user?.name}
              className="w-9 h-9 rounded-full ring-2 ring-white/10"
            />
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">
                {getRoleDisplayName ? getRoleDisplayName() : user?.role}
              </p>
            </div>
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-10" 
                onClick={() => setShowUserMenu(false)} 
              />
              <div className="absolute right-0 mt-2 w-48 bg-zinc-800/90 backdrop-blur-xl rounded-xl shadow-xl border border-white/10 z-20 overflow-hidden">
                <div className="p-3 border-b border-white/5">
                  <p className="text-sm font-medium text-white">{user?.name}</p>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10
                      flex items-center gap-3 transition-colors"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
