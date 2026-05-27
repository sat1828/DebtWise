import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export function Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isAuthenticated) { navigate('/dashboard'); return; }

    const canvasEl = canvasRef.current!;
    const ctx = canvasEl.getContext('2d')!;

    canvasEl.width = window.innerWidth;
    canvasEl.height = window.innerHeight;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }> = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * canvasEl.width,
        y: Math.random() * canvasEl.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.1,
      });
    }

    let animId: number;
    function animate() {
      ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > canvasEl.width) p.vx *= -1;
        if (p.y < 0 || p.y > canvasEl.height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(99, 102, 241, ${p.alpha})`;
        ctx.fill();
      }
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i]!.x - particles[j]!.x;
          const dy = particles[i]!.y - particles[j]!.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 150) {
            ctx.beginPath();
            ctx.moveTo(particles[i]!.x, particles[i]!.y);
            ctx.lineTo(particles[j]!.x, particles[j]!.y);
            ctx.strokeStyle = `rgba(99, 102, 241, ${0.08 * (1 - dist / 150)})`;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(animate);
    }
    animate();

    const handleResize = () => {
      canvasEl.width = window.innerWidth;
      canvasEl.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, [isAuthenticated, navigate]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a14]">
      <canvas ref={canvasRef} className="fixed inset-0 z-0" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Floating 3D Orbs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-gradient-to-br from-debtwise-500/20 to-accent-500/20 blur-3xl animate-float" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full bg-gradient-to-br from-accent-500/20 to-debtwise-500/20 blur-3xl animate-float animation-delay-2000" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="text-center max-w-3xl"
        >
          {/* Logo */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center justify-center w-20 h-20 rounded-2xl gradient-bg mb-8 shadow-2xl shadow-debtwise-500/20"
          >
            <span className="text-3xl font-bold text-white">DW</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight text-balance"
          >
            You have more power than{' '}
            <span className="gradient-text">they want you to know</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed"
          >
            DebtWise is your AI-powered negotiation copilot. Know your rights, 
            understand your debt, and settle for less — without a lawyer.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <button
              onClick={() => navigate('/onboarding/state')}
              className="group relative px-8 py-4 rounded-2xl gradient-bg text-white font-semibold text-lg shadow-2xl shadow-debtwise-500/25 hover:shadow-debtwise-500/40 transition-all duration-300 active:scale-[0.98]"
            >
              <span className="relative z-10">Start for Free</span>
              <div className="absolute inset-0 rounded-2xl bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="px-8 py-4 rounded-2xl glass text-gray-300 font-medium text-lg border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              I already have an account
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-12 flex items-center justify-center gap-6 text-sm text-gray-500"
          >
            <span>🔒 End-to-end encrypted</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>We work for you only</span>
            <span className="w-1 h-1 rounded-full bg-gray-600" />
            <span>Never sell your data</span>
          </motion.div>
        </motion.div>

        {/* Bottom Trust Signals */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.6 }}
          className="absolute bottom-8 text-center text-xs text-gray-600"
        >
          DebtWise provides legal information, not legal advice. Not a law firm.
        </motion.div>
      </div>
    </div>
  );
}
