import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import type { Debt, Deadline } from '../../lib/types';

function RiskGauge({ score }: { score: number | null }) {
  const safe = score ?? 50;
  const rotation = -90 + (safe / 100) * 180;
  const color = safe <= 25 ? '#14b8a6' : safe <= 50 ? '#6366f1' : safe <= 75 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="6" className="text-white/5" />
        <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${(safe / 100) * 327} 327`} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold" style={{ color }}>{safe}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string }> = {
    analyzing: { label: 'Analyzing', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/20' },
    valid: { label: 'Valid', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
    disputed: { label: 'Disputed', color: 'bg-purple-500/20 text-purple-400 border-purple-500/20' },
    time_barred: { label: 'Time-Barred', color: 'bg-green-500/20 text-green-400 border-green-500/20' },
    settled: { label: 'Settled', color: 'bg-accent-500/20 text-accent-400 border-accent-500/20' },
    paid_in_full: { label: 'Paid in Full', color: 'bg-accent-500/20 text-accent-400 border-accent-500/20' },
    in_litigation: { label: 'In Litigation', color: 'bg-red-500/20 text-red-400 border-red-500/20' },
  };
  const c = config[status] || { label: status, color: 'bg-white/5 text-gray-400 border-white/10' };
  return (
    <span className={clsx('px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider border', c.color)}>
      {c.label}
    </span>
  );
}

function DebtCard({ debt, onClick }: { debt: Debt; onClick: () => void }) {
  const amount = debt.currentClaimedAmount || debt.originalAmount || 0;
  const violationsCount = debt.collectorViolations?.length || 0;

  return (
    <motion.button
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="glass-card p-5 text-left w-full card-3d"
    >
      <div className="flex items-start gap-4">
        <RiskGauge score={debt.legalRiskScore} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={debt.status} />
            {violationsCount > 0 && (
              <span className="px-2 py-0.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/20 text-[10px] font-semibold">
                {violationsCount} violation{violationsCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <h3 className="text-base font-semibold text-white truncate">{debt.originalCreditor}</h3>
          {debt.currentCollector && (
            <p className="text-xs text-gray-500">Collected by {debt.currentCollector}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-gray-300">${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            <span className="text-gray-600">·</span>
            <span className="text-gray-400 capitalize">{debt.debtType.replace('_', ' ')}</span>
          </div>
          {debt.isTimeBarred && (
            <div className="mt-2 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
              <span className="text-xs text-green-400 font-medium">Time-barred — cannot be sued</span>
            </div>
          )}
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
            <span>📅 SOL: {debt.statuteOfLimitationsExpiresOn || 'N/A'}</span>
            {debt.activeDeadlines ? debt.activeDeadlines > 0 && (
              <span className="text-amber-400">⏰ {debt.activeDeadlines} deadline{debt.activeDeadlines > 1 ? 's' : ''}</span>
            ) : null}
          </div>
        </div>
        <span className="text-gray-600 mt-1">→</span>
      </div>
    </motion.button>
  );
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();

  const { data: debtsData, isLoading: debtsLoading } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.debts.list(),
  });

  const { data: deadlinesData } = useQuery({
    queryKey: ['deadlines'],
    queryFn: () => api.deadlines.list(),
  });

  // Mark onboarding as complete
  useEffect(() => {
    if (!user?.onboardingComplete) {
      api.auth.updateMe({ onboardingComplete: true }).then(() => {
        updateUser({ onboardingComplete: true });
      }).catch(() => {});
    }
  }, []);

  const debts: Debt[] = debtsData?.debts || [];
  const deadlines: Deadline[] = deadlinesData?.deadlines || [];
  const activeDeadlines = deadlines.filter(d => !d.isResolved).slice(0, 5);
  const urgentDeadlines = activeDeadlines.filter(d => new Date(d.deadlineDate) <= new Date(Date.now() + 7 * 86400000));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-2xl sm:text-3xl font-bold text-white">
          Welcome back, {user?.fullName?.split(' ')[0] || 'User'}
        </motion.h1>
        <p className="text-gray-400 mt-1">
          {debts.length === 0
            ? 'Let\'s start by adding your first debt.'
            : `You have ${debts.length} active debt${debts.length > 1 ? 's' : ''}.`}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Debts', value: debts.filter(d => !['settled', 'paid_in_full', 'deleted'].includes(d.status)).length, icon: '📋', color: 'from-debtwise-500/20 to-debtwise-600/10' },
          { label: 'Upcoming Deadlines', value: activeDeadlines.length, icon: '⏰', color: 'from-amber-500/20 to-amber-600/10' },
          { label: 'Violations Found', value: debts.reduce((sum, d) => sum + (d.collectorViolations?.length || 0), 0), icon: '🚩', color: 'from-red-500/20 to-red-600/10' },
          { label: 'Potential Savings', value: `$${debts.reduce((sum, d) => {
            const amount = d.currentClaimedAmount || d.originalAmount || 0;
            return sum + Math.round(amount * 0.4);
          }, 0).toLocaleString()}`, icon: '💰', color: 'from-accent-500/20 to-accent-600/10' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="glass-card p-4 sm:p-5"
          >
            <div className={clsx('w-9 h-9 rounded-xl bg-gradient-to-br flex items-center justify-center text-lg mb-3', stat.color)}>
              {stat.icon}
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Debt List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Debts</h2>
            <button onClick={() => navigate('/onboarding/debt-entry')}
              className="text-sm text-debtwise-400 hover:text-debtwise-300 transition-colors">
              + Add Debt
            </button>
          </div>

          {debtsLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="glass-card p-5"><div className="skeleton h-20" /></div>)}
            </div>
          ) : debts.length === 0 ? (
            <div className="glass-card p-10 text-center">
              <span className="text-4xl block mb-4">📋</span>
              <h3 className="text-lg font-semibold text-white mb-2">No debts yet</h3>
              <p className="text-gray-400 mb-6">Add your first debt to get started with AI-powered analysis and negotiation tools.</p>
              <button onClick={() => navigate('/onboarding/debt-entry')}
                className="px-6 py-3 rounded-xl gradient-bg text-white font-medium">
                Add Your First Debt
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {debts.map((debt, i) => (
                <motion.div key={debt.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <DebtCard debt={debt} onClick={() => navigate(`/debts/${debt.id}`)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-6">
          {/* Urgent Deadlines */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <span>⏰</span> Urgent Deadlines
              {urgentDeadlines.length > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">{urgentDeadlines.length}</span>
              )}
            </h3>
            {activeDeadlines.length === 0 ? (
              <p className="text-sm text-gray-500">No upcoming deadlines</p>
            ) : (
              <div className="space-y-2">
                {activeDeadlines.map((dl) => {
                  const isUrgent = new Date(dl.deadlineDate) <= new Date(Date.now() + 7 * 86400000);
                  const isOverdue = new Date(dl.deadlineDate) < new Date();
                  return (
                    <div key={dl.id} className={clsx(
                      'p-3 rounded-xl border text-sm transition-all',
                      isOverdue ? 'bg-red-500/10 border-red-500/20' :
                      isUrgent ? 'bg-amber-500/10 border-amber-500/20' :
                      'bg-white/5 border-white/5'
                    )}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={clsx(
                          'text-xs font-semibold uppercase tracking-wider',
                          isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-gray-400'
                        )}>
                          {isOverdue ? 'Overdue' : isUrgent ? 'This week' : 'Upcoming'}
                        </span>
                        <span className="text-xs text-gray-500">{dl.deadlineDate}</span>
                      </div>
                      <p className="text-gray-300 text-xs">{dl.description}</p>
                      {dl.originalCreditor && (
                        <p className="text-gray-500 text-[11px] mt-1">{dl.originalCreditor}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: 'Know Your Rights', icon: '⚖', path: '/rights', color: 'text-debtwise-400' },
                { label: 'Debt Analysis Guide', icon: '📊', path: '#', color: 'text-accent-400' },
                { label: 'Upgrade to Pro', icon: '⭐', path: '/upgrade', color: 'text-amber-400' },
              ].map((action) => (
                <button key={action.label}
                  onClick={() => navigate(action.path)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors text-sm text-gray-400 hover:text-white"
                >
                  <span className="text-lg">{action.icon}</span>
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Chat Quick Access */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-2">💬 Need help?</h3>
            <p className="text-xs text-gray-400 mb-3">Ask DebtWise AI about your rights, debt strategies, or next steps.</p>
            <button onClick={() => debts.length > 0 ? navigate(`/debts/${debts[0]?.id}`) : navigate('/onboarding/debt-entry')}
              className="w-full px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300">
              Ask AI Assistant →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
