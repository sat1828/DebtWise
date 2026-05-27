import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useAuthStore } from '../stores/authStore';

export function Login() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      if (err.message === 'MFA_REQUIRED') { navigate('/mfa'); return; }
      setError(err.message || 'Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a14]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-debtwise-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-1/3 right-1/3 w-64 h-64 bg-accent-500/10 rounded-full blur-3xl animate-float animation-delay-2000" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-xl font-bold mx-auto mb-4">DW</div>
            <h1 className="text-2xl font-bold text-white">Welcome back</h1>
            <p className="text-gray-400 mt-1">Sign in to your DebtWise account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Email" type="email" placeholder="alex@example.com" value={email}
              onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" placeholder="Enter your password" value={password}
              onChange={(e) => setPassword(e.target.value)} required />

            {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{error}</p>}

            <Button type="submit" loading={isLoading} className="w-full">Sign In</Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Demo: <span className="text-gray-400">demo@debtwise.ai / password123</span>
            </p>
            <p className="mt-4 text-sm text-gray-500">
              No account?{' '}
              <button onClick={() => navigate('/onboarding/state')} className="text-debtwise-400 hover:underline">Start free</button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
