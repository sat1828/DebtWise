import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const states = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA',
  'HI','ID','IL','IN','IA','KS','KY','LA','ME','MD',
  'MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC',
  'SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
];

export function StateSelection() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a14]">
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 -left-32 w-96 h-96 bg-debtwise-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 -right-32 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-2xl"
      >
        <div className="glass-card p-8 sm:p-10">
          {/* Progress */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === 2 ? 'gradient-bg text-white' : step < 2 ? 'bg-accent-500/30 text-accent-300' : 'bg-white/5 text-gray-500'
                )}>
                  {step < 2 ? '✓' : step}
                </div>
                {step < 4 && <div className={clsx('flex-1 h-px', step < 2 ? 'bg-accent-500/50' : 'bg-white/10')} />}
              </React.Fragment>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Where do you live?</h1>
          <p className="text-gray-400 mb-8">
            Your state determines which laws protect you. This matters a lot — 
            some states have much stronger consumer protection laws than others.
          </p>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-7 gap-2 mb-8 max-h-80 overflow-y-auto scrollbar-thin pr-2">
            {states.map((state) => (
              <button
                key={state}
                onClick={() => setSelected(state)}
                className={clsx(
                  'px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border',
                  selected === state
                    ? 'bg-debtwise-500/20 border-debtwise-500/50 text-debtwise-300 shadow-lg shadow-debtwise-500/10'
                    : 'bg-white/5 border-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                )}
              >
                {state}
              </button>
            ))}
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-8 p-4 rounded-xl bg-accent-500/10 border border-accent-500/20"
            >
              <p className="text-sm text-accent-300">
                <span className="font-semibold">Good choice.</span> {selected} has a {selected === 'CA' ? '4-year' : selected === 'NY' ? '3-year' : selected === 'FL' ? '5-year' : '4-year'} statute of limitations for credit card debt and 
                {['CA', 'NY', 'FL', 'MA', 'CT'].includes(selected) ? ' provides additional consumer protections beyond federal law.' : ' follows federal FDCPA standards.'}
              </p>
            </motion.div>
          )}

          <div className="flex items-center justify-between">
            <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white transition-colors text-sm">
              ← Back
            </button>
            <button
              onClick={() => selected && navigate('/onboarding/debt-entry')}
              disabled={!selected}
              className="px-6 py-3 rounded-xl gradient-bg text-white font-medium disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:shadow-lg hover:shadow-debtwise-500/20"
            >
              Continue →
            </button>
          </div>

          <p className="mt-4 text-xs text-gray-600">
            We use your state to apply the correct laws. You can change this later in settings.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function clsx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}
