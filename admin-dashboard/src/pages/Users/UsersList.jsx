/**
 * Users List Page - Refactored
 * Uses shared UI components and separated API services
 * ~200 lines instead of 895
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Plus, Users, Building2, UserCog, User, RefreshCw, Edit, Trash2, Ban, UserCheck, Key, Mail, MoreVertical } from 'lucide-react';

// Shared UI Components
import { PageLoader, EmptyState, SearchInput, Select, Button, Card, StatCard, Badge, Pagination, Modal, ConfirmDialog, Input, ActionMenu } from '../../components/ui';

// API Service
import * as userService from '../../services/userService';

const UsersList = ({ filterRole = '' }) => {
  const { authFetch } = useAuth();
  
  // Data state
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ total: 0, byRole: {} });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  // Filter state
  const [filters, setFilters] = useState({ search: '', role: filterRole || '', status: '' });

  // Keep filters.role in sync when route prop changes (e.g. /users vs /users/organizers)
  useEffect(() => {
    setFilters((f) => ({ ...f, role: filterRole || '' }));
    setPagination((p) => ({ ...p, page: 1 }));
  }, [filterRole]);
  
  // Modal state
  const [modal, setModal] = useState({ type: null, user: null });
  const [formData, setFormData] = useState(userService.DEFAULT_USER_FORM);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, statsRes] = await Promise.all([
        userService.getUsers(authFetch, { ...filters, page: pagination.page }),
        userService.getUserStats(authFetch),
      ]);
      setUsers(usersRes.data.users);
      setPagination(prev => ({ ...prev, ...usersRes.data.pagination }));
      setStats(statsRes.data);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, [authFetch, filters, pagination.page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Handlers
  const handleCreate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await userService.createUser(authFetch, formData);
      toast.success('User created successfully');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await userService.updateUser(authFetch, modal.user._id, formData);
      toast.success('User updated successfully');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    setActionLoading(true);
    try {
      await userService.deleteUser(authFetch, modal.user._id);
      toast.success('User deleted successfully');
      closeModal();
      fetchData();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    try {
      const res = await userService.toggleUserStatus(authFetch, user._id);
      toast.success(res.message);
      fetchData();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await userService.resetUserPassword(authFetch, modal.user._id, formData.password);
      toast.success('Password reset successfully');
      closeModal();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Modal helpers
  const openModal = (type, user = null) => {
    setModal({ type, user });
    if (user && type === 'edit') {
      setFormData({ ...user, password: '' });
    } else {
      setFormData(userService.DEFAULT_USER_FORM);
    }
  };

  const closeModal = () => {
    setModal({ type: null, user: null });
    setFormData(userService.DEFAULT_USER_FORM);
  };

  // Role/Status badges
  const getRoleBadge = (role) => {
    const config = userService.ROLE_CONFIG[role];
    return <Badge variant={config.color}>{config.label}</Badge>;
  };

  const getStatusBadge = (status) => (
    <span className={`flex items-center gap-1.5 text-sm ${status ? 'text-emerald-400' : 'text-red-400'}`}>
      <span className={`w-2 h-2 rounded-full ${status ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
      {status ? 'Active' : 'Locked'}
    </span>
  );

  if (loading && users.length === 0) return <PageLoader />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">{filterRole === 'ORG' ? 'Organizers' : filterRole === 'STAFF' ? 'Staff' : 'User Management'}</h1>
          <p className="text-gray-400">{filterRole === 'ORG' ? 'Manage event organizers' : filterRole === 'STAFF' ? 'Manage staff accounts' : 'Manage all users in the system'}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" onClick={fetchData}><RefreshCw size={20} /></Button>
          <Button onClick={() => openModal('add')}><Plus size={18} /> Add User</Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard icon={Users} iconColor="primary" value={stats.total || 0} label="Total Users" />
        <StatCard icon={Building2} iconColor="blue" value={stats.byRole?.ORG || 0} label="Organizers" />
        <StatCard icon={UserCog} iconColor="emerald" value={stats.byRole?.STAFF || 0} label="Staff" />
        <StatCard icon={User} iconColor="orange" value={stats.byRole?.CUS || 0} label="Customers" />
      </div>

      {/* Filters */}
      <Card>
        <div className="flex flex-col sm:flex-row gap-4">
          <SearchInput
            value={filters.search}
            onChange={(e) => setFilters(f => ({ ...f, search: e.target.value }))}
            placeholder="Search by name, email..."
            className="flex-1"
          />
          <Select
            value={filters.role}
            onChange={(e) => setFilters(f => ({ ...f, role: e.target.value }))}
            options={[
              { value: '', label: 'All Roles' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'ORG', label: 'Organizer' },
              { value: 'STAFF', label: 'Staff' },
              { value: 'CUS', label: 'Customer' },
            ]}
          />
          <Select
            value={filters.status}
            onChange={(e) => setFilters(f => ({ ...f, status: e.target.value }))}
            options={[
              { value: '', label: 'All Status' },
              { value: 'true', label: 'Active' },
              { value: 'false', label: 'Locked' },
            ]}
          />
        </div>
      </Card>

      {/* Users Table */}
      <Card className="overflow-hidden">
        {users.length === 0 ? (
          <EmptyState icon={Users} title="No users found" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {['User', 'Contact', 'Role', 'Status', 'Joined', 'Actions'].map(h => (
                      <th key={h} className="text-left text-xs font-medium text-gray-400 uppercase px-5 py-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((user) => (
                    <UserRow 
                      key={user._id} 
                      user={user} 
                      getRoleBadge={getRoleBadge}
                      getStatusBadge={getStatusBadge}
                      onEdit={() => openModal('edit', user)}
                      onDelete={() => openModal('delete', user)}
                      onResetPassword={() => openModal('resetPassword', user)}
                      onToggleStatus={() => handleToggleStatus(user)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination
              page={pagination.page}
              totalPages={pagination.pages}
              total={pagination.total}
              onPageChange={(p) => setPagination(prev => ({ ...prev, page: p }))}
              itemLabel="users"
            />
          </>
        )}
      </Card>

      {/* Modals */}
      <UserFormModal
        isOpen={modal.type === 'add' || modal.type === 'edit'}
        isEdit={modal.type === 'edit'}
        user={modal.user}
        formData={formData}
        setFormData={setFormData}
        onSubmit={modal.type === 'edit' ? handleUpdate : handleCreate}
        onClose={closeModal}
        loading={actionLoading}
      />

      <ResetPasswordModal
        isOpen={modal.type === 'resetPassword'}
        user={modal.user}
        password={formData.password}
        setPassword={(p) => setFormData(f => ({ ...f, password: p }))}
        onSubmit={handleResetPassword}
        onClose={closeModal}
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={modal.type === 'delete'}
        title="Delete User?"
        message={`Are you sure you want to delete ${modal.user?.fullName || modal.user?.username}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={closeModal}
        loading={actionLoading}
        variant="danger"
      />
    </div>
  );
};

// ========================
// Sub-components
// ========================

const UserRow = ({ user, getRoleBadge, getStatusBadge, onEdit, onDelete, onResetPassword, onToggleStatus }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuBtnRef = React.useRef(null);

  const menuItems = [
    { icon: Edit, label: 'Edit User', onClick: onEdit },
    { icon: Key, label: 'Reset Password', onClick: onResetPassword },
    { icon: Mail, label: 'Send Email', onClick: () => {} },
  ];

  if (user.role !== 'ADMIN') {
    menuItems.push({
      icon: user.status ? Ban : UserCheck,
      label: user.status ? 'Lock Account' : 'Unlock Account',
      onClick: onToggleStatus,
      variant: user.status ? 'danger' : undefined
    });
    menuItems.push({ icon: Trash2, label: 'Delete User', onClick: onDelete, variant: 'danger' });
  }

  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <img src={userService.getUserAvatar(user)} alt="" className="w-10 h-10 rounded-full ring-2 ring-white/10" />
          <div>
            <p className="font-medium text-white">{user.fullName || user.username}</p>
            <p className="text-xs text-gray-500">@{user.username}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <p className="text-sm text-gray-300">{user.email}</p>
        <p className="text-xs text-gray-500">{user.phone || 'No phone'}</p>
      </td>
      <td className="px-5 py-4">{getRoleBadge(user.role)}</td>
      <td className="px-5 py-4">{getStatusBadge(user.status)}</td>
      <td className="px-5 py-4 text-sm text-gray-400">{new Date(user.createdAt).toLocaleDateString()}</td>
      <td className="px-5 py-4">
        <div className="relative">
          <button 
            ref={menuBtnRef}
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowMenu(!showMenu); }} 
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg"
          >
            <MoreVertical size={16} />
          </button>
          <ActionMenu
            isOpen={showMenu}
            onClose={() => setShowMenu(false)}
            buttonRef={menuBtnRef}
            items={menuItems}
          />
        </div>
      </td>
    </tr>
  );
};

const UserFormModal = ({ isOpen, isEdit, user, formData, setFormData, onSubmit, onClose, loading }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit User' : 'Add New User'} size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {isEdit && user && (
          <div className="flex items-center gap-4 pb-4 border-b border-white/10">
            <img src={userService.getUserAvatar(user)} alt="" className="w-16 h-16 rounded-full" />
            <div>
              <p className="text-white font-medium">{user.username}</p>
              <p className="text-gray-400 text-sm">{user.email}</p>
            </div>
          </div>
        )}
        
        {!isEdit && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Username *" required value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} placeholder="john_doe" />
              <Input label="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} placeholder="John Doe" />
            </div>
            <Input label="Email *" type="email" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} placeholder="john@example.com" />
            <Input label="Password *" type="password" required minLength={6} value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} placeholder="Min 6 characters" />
          </>
        )}
        
        {isEdit && (
          <Input label="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
        )}
        
        <Input label="Phone" type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="0901234567" />
        
        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            options={Object.entries(userService.ROLE_CONFIG).map(([value, { label }]) => ({ value, label }))}
            disabled={isEdit && user?.role === 'ADMIN'}
          />
          <Select
            label="Status"
            value={formData.status.toString()}
            onChange={(e) => setFormData({ ...formData, status: e.target.value === 'true' })}
            options={[{ value: 'true', label: 'Active' }, { value: 'false', label: 'Locked' }]}
            disabled={isEdit && user?.role === 'ADMIN'}
          />
        </div>
        
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">{isEdit ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </form>
    </Modal>
  );
};

const ResetPasswordModal = ({ isOpen, user, password, setPassword, onSubmit, onClose, loading }) => {
  if (!isOpen || !user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset Password" size="sm">
      <form onSubmit={onSubmit} className="space-y-4">
        <p className="text-gray-400 text-sm">
          Set a new password for <span className="text-white font-medium">{user.email}</span>
        </p>
        <Input label="New Password *" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" />
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button type="submit" loading={loading} className="flex-1">Reset Password</Button>
        </div>
      </form>
    </Modal>
  );
};

export default UsersList;
