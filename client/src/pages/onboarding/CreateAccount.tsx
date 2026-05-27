import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { useAuthStore } from '../../stores/authStore';

export function CreateAccount() {
  const navigate = useNavigate();
  const { register, isLoading } = useAuthStore();
  const [form, setForm] = useState({ fullName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [agree, setAgree] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (!agree) { setError('You must agree to the terms'); return; }

    try {
      await register({ email: form.email, password: form.password, fullName: form.fullName, stateOfResidence: 'CA', timezone: 'America/New_York' });
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a14]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-br from-debtwise-500/10 to-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg">
        <div className="glass-card p-8 sm:p-10">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === 4 ? 'gradient-bg text-white' : 'bg-accent-500/30 text-accent-300'
                )}>
                  {step < 4 ? '✓' : step}
                </div>
                {step < 4 && <div className="flex-1 h-px bg-accent-500/50" />}
              </React.Fragment>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
          <p className="text-gray-400 mb-8">Free forever. No payment required.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Full Name" placeholder="Alex Rivera" value={form.fullName}
              onChange={(e) => setForm(f => ({ ...f, fullName: e.target.value }))} required />
            <Input label="Email" type="email" placeholder="alex@example.com" value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} required />
            <Input label="Password" type="password" placeholder="Min 8 characters" value={form.password}
              onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required />
            <Input label="Confirm Password" type="password" placeholder="Repeat password" value={form.confirmPassword}
              onChange={(e) => setForm(f => ({ ...f, confirmPassword: e.target.value }))} required />

            {error && <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl">{error}</p>}

            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-xs text-amber-300 leading-relaxed">
                DebtWise provides legal information, not legal advice. We are not a law firm and no 
                attorney-client relationship is created by using this service. For legal advice, consult 
                a licensed attorney in your state.
              </p>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-gray-600 bg-white/5 text-debtwise-500 focus:ring-debtwise-500" />
              <span className="text-xs text-gray-400">
                I agree to the{' '}
                <a href="#" className="text-debtwise-400 hover:underline">Terms of Service</a> and{' '}
                <a href="#" className="text-debtwise-400 hover:underline">Privacy Policy</a>. I understand 
                that DebtWise is not a law firm.
              </span>
            </label>

            <Button type="submit" loading={isLoading} className="w-full">
              Create My Account →
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-debtwise-400 hover:underline">Sign in</button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function clsx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
