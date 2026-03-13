/**
 * System Settings - Refactored
 */

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Globe, Bell, CreditCard, Mail, Shield, Save, RotateCcw, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, Button, Input, Select, Badge } from '../../components/ui';

const TABS = [
  { id: 'general', label: 'General', icon: Globe },
  { id: 'payment', label: 'Payment', icon: CreditCard },
  { id: 'email', label: 'Email', icon: Mail },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'system', label: 'System Status', icon: Server },
];

const DEFAULT_SETTINGS = {
  siteName: 'QuickShow Ticket', siteDescription: 'Your premier destination for concert tickets',
  supportEmail: 'support@quickshow.com', contactPhone: '+84 123 456 789',
  timezone: 'Asia/Ho_Chi_Minh', currency: 'VND', language: 'vi',
  paymentGateway: 'momo',
  smtpHost: 'smtp.gmail.com', smtpPort: 587, smtpUsername: '', smtpPassword: '',
  emailFromName: 'QuickShow Ticket', emailFromAddress: 'noreply@quickshow.com',
  emailNotifications: true, orderConfirmation: true, ticketReminder: true, marketingEmails: false,
  twoFactorAuth: false, sessionTimeout: 30, passwordExpiry: 90, minPasswordLength: 8, maxLoginAttempts: 5,
  maxTicketsPerOrder: 10, bookingTimeout: 15, allowGuestCheckout: true
};

export default function SystemSettings() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(false);

  const handleChange = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 1000));
    toast.success('Settings saved successfully');
    setLoading(false);
  };

  const handleReset = () => { setSettings(DEFAULT_SETTINGS); toast.success('Settings reset to defaults'); };

  const renderInput = (label, key, type = 'text', props = {}) => (
    <Input label={label} type={type} value={settings[key]} onChange={e => handleChange(key, type === 'number' ? parseInt(e.target.value) : e.target.value)} {...props} />
  );

  const renderToggle = (label, key, description = '') => (
    <label className="flex items-center justify-between p-4 bg-white/5 rounded-lg cursor-pointer hover:bg-white/10">
      <div><p className="text-white">{label}</p>{description && <p className="text-sm text-gray-500">{description}</p>}</div>
      <div className={`w-12 h-6 rounded-full p-1 transition-colors ${settings[key] ? 'bg-primary' : 'bg-white/20'}`} onClick={() => handleChange(key, !settings[key])}>
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-6' : ''}`} />
      </div>
    </label>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput('Site Name', 'siteName')}
            {renderInput('Support Email', 'supportEmail', 'email')}
            {renderInput('Contact Phone', 'contactPhone', 'tel')}
            <Select label="Timezone" value={settings.timezone} onChange={e => handleChange('timezone', e.target.value)}
              options={[{ value: 'Asia/Ho_Chi_Minh', label: 'Asia/Ho Chi Minh (GMT+7)' }, { value: 'Asia/Bangkok', label: 'Asia/Bangkok (GMT+7)' }]} />
            <Select label="Currency" value={settings.currency} onChange={e => handleChange('currency', e.target.value)}
              options={[{ value: 'VND', label: 'Vietnamese Dong (₫)' }, { value: 'USD', label: 'US Dollar ($)' }]} />
            <Select label="Language" value={settings.language} onChange={e => handleChange('language', e.target.value)}
              options={[{ value: 'vi', label: 'Vietnamese' }, { value: 'en', label: 'English' }]} />
            <div className="md:col-span-2">
              <label className="block text-sm text-gray-400 mb-2">Site Description</label>
              <textarea value={settings.siteDescription} onChange={e => handleChange('siteDescription', e.target.value)} rows={3}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50" />
            </div>
          </div>
        );
      case 'payment':
        return (
          <div className="space-y-6">
            <Select label="Payment Gateway" value={settings.paymentGateway} onChange={e => handleChange('paymentGateway', e.target.value)}
              options={[{ value: 'momo', label: 'MoMo' }]} />
            <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-400 text-sm">⚠️ Payment credentials are sensitive. Contact admin for changes.</p>
            </div>
          </div>
        );
      case 'email':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderInput('SMTP Host', 'smtpHost')}
            {renderInput('SMTP Port', 'smtpPort', 'number')}
            {renderInput('SMTP Username', 'smtpUsername')}
            {renderInput('SMTP Password', 'smtpPassword', 'password')}
            {renderInput('From Name', 'emailFromName')}
            {renderInput('From Address', 'emailFromAddress', 'email')}
          </div>
        );
      case 'notifications':
        return (
          <div className="space-y-4">
            {renderToggle('Email Notifications', 'emailNotifications', 'Enable email notifications for users')}
            {renderToggle('Order Confirmation', 'orderConfirmation', 'Send confirmation email after purchase')}
            {renderToggle('Ticket Reminder', 'ticketReminder', 'Send reminder before event starts')}
            {renderToggle('Marketing Emails', 'marketingEmails', 'Send promotional emails to users')}
          </div>
        );
      case 'security':
        return (
          <div className="space-y-6">
            {renderToggle('Two-Factor Authentication', 'twoFactorAuth', 'Require 2FA for admin accounts')}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {renderInput('Session Timeout (min)', 'sessionTimeout', 'number')}
              {renderInput('Password Expiry (days)', 'passwordExpiry', 'number')}
              {renderInput('Min Password Length', 'minPasswordLength', 'number')}
              {renderInput('Max Login Attempts', 'maxLoginAttempts', 'number')}
            </div>
          </div>
        );
      case 'system':
        const status = [
          { name: 'API Server', status: 'healthy', uptime: '99.9%' },
          { name: 'Database', status: 'healthy', uptime: '99.8%' },
          { name: 'Cache Server', status: 'healthy', uptime: '99.9%' },
          { name: 'Storage', status: 'healthy', uptime: '100%' }
        ];
        return (
          <div className="space-y-4">
            {status.map(s => (
              <div key={s.name} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${s.status === 'healthy' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {s.status === 'healthy' ? <CheckCircle className="text-emerald-400" size={20} /> : <AlertCircle className="text-red-400" size={20} />}
                  </div>
                  <div><p className="text-white font-medium">{s.name}</p><p className="text-sm text-gray-500">Uptime: {s.uptime}</p></div>
                </div>
                <Badge variant={s.status === 'healthy' ? 'emerald' : 'red'}>{s.status === 'healthy' ? 'Healthy' : 'Issues'}</Badge>
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-white">System Settings</h1><p className="text-gray-400">Manage system configuration</p></div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleReset}><RotateCcw size={18} /> Reset</Button>
          <Button onClick={handleSave} loading={loading}><Save size={18} /> Save Changes</Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Tabs */}
        <div className="col-span-3">
          <Card className="sticky top-4">
            <nav className="space-y-1">
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left
                    ${activeTab === tab.id ? 'bg-primary text-white' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                  <tab.icon size={18} /> {tab.label}
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="col-span-9">
          <Card title={TABS.find(t => t.id === activeTab)?.label}>{renderContent()}</Card>
        </div>
      </div>
    </div>
  );
}
