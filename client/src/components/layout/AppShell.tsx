import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '◈' },
  { path: '/debts', label: 'My Debts', icon: '⊞' },
  { path: '/rights', label: 'Know Your Rights', icon: '⚖' },
];

export function AppShell() {
  const { user, logout } = useAuthStore();
  const { isDark, toggle: toggleTheme } = useThemeStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-gray-100">
      {/* Ambient Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-debtwise-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-float animation-delay-2000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-debtwise-600/5 rounded-full blur-3xl animate-pulse-slow" />
      </div>

      {/* Top Navigation */}
      <header className="relative z-50 glass border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg"
            >
              <span className="text-xl">☰</span>
            </button>
            <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-sm font-bold">
                DW
              </div>
              <span className="text-lg font-semibold tracking-tight hidden sm:block">
                Debt<span className="text-accent-400">Wise</span>
              </span>
            </button>
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {navItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-white/5 transition-colors text-lg"
              title="Toggle theme"
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <div className="relative group">
              <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 transition-colors">
                <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-xs font-bold">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm hidden sm:block">{user?.fullName || 'User'}</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 glass rounded-xl border border-white/10 p-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <button onClick={() => navigate('/settings')} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors">
                  Settings
                </button>
                <div className="h-px bg-white/5 my-1" />
                <button
                  onClick={() => { logout(); navigate('/'); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Sidebar (Desktop) */}
      <aside className={clsx(
        'fixed left-0 top-16 z-40 h-[calc(100vh-4rem)] glass border-r border-white/5 transition-all duration-300 hidden lg:block',
        sidebarOpen ? 'w-60' : 'w-16'
      )}>
        <nav className="p-3 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                (location.pathname === item.path || location.pathname.startsWith(item.path + '/'))
                  ? 'text-white bg-debtwise-500/20 border border-debtwise-500/20'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              )}
            >
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              {sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}

          {sidebarOpen && (
            <>
              <div className="h-px bg-white/5 my-3" />
              <div className="px-3 py-2">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-medium">Plan</p>
                <div className={clsx(
                  'mt-1.5 px-2.5 py-1 rounded-lg text-xs font-medium inline-block',
                  user?.plan === 'premium' ? 'bg-accent-500/20 text-accent-400' :
                  user?.plan === 'pro' ? 'bg-debtwise-500/20 text-debtwise-400' :
                  'bg-white/5 text-gray-400'
                )}>
                  {user?.plan || 'free'}
                </div>
              </div>
            </>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className={clsx(
        'transition-all duration-300 pt-6 pb-12 px-4 sm:px-6 lg:px-8',
        sidebarOpen ? 'lg:ml-60' : 'lg:ml-16'
      )}>
        <div className="max-w-6xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5">
        <div className="flex items-center justify-around h-16 px-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={clsx(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                location.pathname === item.path
                  ? 'text-accent-400'
                  : 'text-gray-500 hover:text-gray-300'
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
