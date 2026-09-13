'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building, Shield, User, Loader2, LogIn } from 'lucide-react';
import { login } from '../lib/api';
import toast from 'react-hot-toast';

type Role = 'citizen' | 'government' | 'admin';

export default function LoginForm({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Role>('citizen');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login({ identifier, password, roleType: activeTab });
      localStorage.setItem('cc_token', res.data.token);
      localStorage.setItem('cc_user_role', res.data.user.role);
      toast.success(`Welcome back, ${res.data.user.full_name || 'User'}!`);
      onLoginSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const getLabel = () => {
    switch (activeTab) {
      case 'citizen': return 'Email Address';
      case 'government': return 'Jurisdiction Area (Ward Number)';
      case 'admin': return 'Admin ID / Email';
      default: return 'Email';
    }
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'citizen': return 'e.g. citizen@example.com';
      case 'government': return 'e.g. 73';
      case 'admin': return 'admin@civicconnect.gov';
      default: return '';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 max-w-md w-full mx-auto animate-fade-in-up">
      {/* Tabs */}
      <div className="flex bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => { setActiveTab('citizen'); setIdentifier(''); setPassword(''); }}
          className={`flex-1 py-4 text-sm font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'citizen' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <User size={18} />
          Citizen
        </button>
        <button
          onClick={() => { setActiveTab('government'); setIdentifier(''); setPassword(''); }}
          className={`flex-1 py-4 text-sm font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'government' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Building size={18} />
          Government
        </button>
        <button
          onClick={() => { setActiveTab('admin'); setIdentifier(''); setPassword(''); }}
          className={`flex-1 py-4 text-sm font-bold flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'admin' ? 'text-blue-600 bg-white border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Shield size={18} />
          Admin
        </button>
      </div>

      <div className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {activeTab === 'citizen' ? 'Citizen Portal' : activeTab === 'government' ? 'Municipal Portal' : 'System Admin'}
          </h2>
          <p className="text-sm text-gray-500">
            {activeTab === 'citizen' ? 'Sign in to report issues and join the community.' : 
             activeTab === 'government' ? 'Sign in to manage and resolve ward issues.' : 
             'Secure access for platform administrators.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">{getLabel()}</label>
            <input
              type={activeTab === 'citizen' ? 'email' : 'text'}
              required
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={getPlaceholder()}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all shadow-md hover:shadow-lg disabled:opacity-70 flex justify-center items-center gap-2 mt-2"
          >
            {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
            Secure Login
          </button>
        </form>

        {activeTab === 'citizen' && (
          <p className="text-center text-sm text-gray-600 mt-6">
            Don't have an account? <a href="#" className="text-blue-600 font-bold hover:underline">Register here</a>
          </p>
        )}
      </div>
    </div>
  );
}
