import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Input, Select, TextArea } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';

const debtTypes = [
  { value: 'credit_card', label: '💳 Credit Card' },
  { value: 'medical', label: '🏥 Medical' },
  { value: 'student_loan', label: '🎓 Student Loan' },
  { value: 'auto_loan', label: '🚗 Auto Loan' },
  { value: 'personal_loan', label: '💰 Personal Loan' },
  { value: 'utility', label: '💡 Utility' },
  { value: 'rent', label: '🏠 Rent' },
  { value: 'mortgage', label: '🏘️ Mortgage' },
  { value: 'other', label: '📋 Other' },
];

export function DebtEntry() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'manual' | 'photo'>('manual');
  const [form, setForm] = useState({
    originalCreditor: '',
    currentCollector: '',
    accountNumberLast4: '',
    debtType: 'credit_card',
    currentClaimedAmount: '',
    dateOfLastPayment: '',
    collectionNoticeDate: '',
    notes: '',
  });
  const [ocrText, setOcrText] = useState('');
  const [showOcrResult, setShowOcrResult] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/onboarding/create-account');
  };

  const handleOcrSubmit = () => {
    setShowOcrResult(true);
  };

  if (showOcrResult) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a14]">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-xl">
          <div className="glass-card p-8">
            <div className="w-14 h-14 rounded-2xl bg-accent-500/20 flex items-center justify-center text-2xl mb-6">📄</div>
            <h2 className="text-2xl font-bold text-white mb-2">Document Scanned Successfully</h2>
            <p className="text-gray-400 mb-6">We extracted the following information from your document.</p>
            <div className="space-y-3 mb-6">
              {[
                { label: 'Creditor', value: 'Capital One / Midland Credit Management' },
                { label: 'Amount Claimed', value: '$4,785.43' },
                { label: 'Debt Type', value: 'Credit Card' },
                { label: 'Notice Date', value: 'January 10, 2024' },
                { label: 'Original Creditor', value: 'Capital One' },
                { label: 'Account (Last 4)', value: '4321' },
              ].map((item, i) => (
                <div key={i} className="flex justify-between p-3 rounded-xl bg-white/5">
                  <span className="text-gray-400 text-sm">{item.label}</span>
                  <span className="text-white text-sm font-medium">{item.value}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setShowOcrResult(false)}>Edit</Button>
              <Button onClick={() => navigate('/onboarding/create-account')}>Looks Correct →</Button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[#0a0a14]">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -right-32 w-80 h-80 bg-debtwise-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -left-32 w-72 h-72 bg-accent-500/10 rounded-full blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-2xl">
        <div className="glass-card p-8 sm:p-10">
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <React.Fragment key={step}>
                <div className={clsx(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === 3 ? 'gradient-bg text-white' : step < 3 ? 'bg-accent-500/30 text-accent-300' : 'bg-white/5 text-gray-500'
                )}>
                  {step < 3 ? '✓' : step}
                </div>
                {step < 4 && <div className={clsx('flex-1 h-px', step < 3 ? 'bg-accent-500/50' : 'bg-white/10')} />}
              </React.Fragment>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-2">Tell us about your debt</h1>
          <p className="text-gray-400 mb-8">Upload a photo of your collection notice or enter the details manually.</p>

          {/* Mode Toggle */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setMode('manual')}
              className={clsx(
                'flex-1 p-4 rounded-xl border transition-all text-center',
                mode === 'manual' ? 'bg-debtwise-500/20 border-debtwise-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'
              )}
            >
              <span className="text-2xl block mb-1">⌨️</span>
              <span className="text-sm font-medium text-white">Enter Manually</span>
            </button>
            <button
              onClick={() => setMode('photo')}
              className={clsx(
                'flex-1 p-4 rounded-xl border transition-all text-center',
                mode === 'photo' ? 'bg-debtwise-500/20 border-debtwise-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'
              )}
            >
              <span className="text-2xl block mb-1">📸</span>
              <span className="text-sm font-medium text-white">Upload Photo</span>
            </button>
          </div>

          {mode === 'photo' ? (
            <div>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-debtwise-500/50 transition-colors cursor-pointer mb-6">
                <span className="text-4xl block mb-4">📄</span>
                <p className="text-gray-300 font-medium mb-1">Upload collection notice</p>
                <p className="text-gray-500 text-sm">PDF, PNG, or JPG — we'll extract the details</p>
              </div>
              <p className="text-gray-500 text-sm mb-4">Or paste the text from your collection notice:</p>
              <TextArea
                placeholder="Paste the text from your collection notice or email here..."
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                rows={5}
              />
              <div className="flex justify-between mt-6">
                <button onClick={() => navigate('/onboarding/state')} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={handleOcrSubmit} disabled={!ocrText.trim()}>
                  Extract Information →
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Original Creditor" placeholder="e.g. Capital One" value={form.originalCreditor}
                  onChange={(e) => setForm(f => ({ ...f, originalCreditor: e.target.value }))} required />
                <Input label="Current Collector (if different)" placeholder="e.g. Midland Credit" value={form.currentCollector}
                  onChange={(e) => setForm(f => ({ ...f, currentCollector: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select label="Debt Type" value={form.debtType}
                  onChange={(e) => setForm(f => ({ ...f, debtType: e.target.value }))}
                  options={debtTypes} />
                <Input label="Claimed Amount ($)" type="number" placeholder="4785.43" value={form.currentClaimedAmount}
                  onChange={(e) => setForm(f => ({ ...f, currentClaimedAmount: e.target.value }))} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Date of Last Payment" type="date" value={form.dateOfLastPayment}
                  onChange={(e) => setForm(f => ({ ...f, dateOfLastPayment: e.target.value }))} />
                <Input label="Collection Notice Date" type="date" value={form.collectionNoticeDate}
                  onChange={(e) => setForm(f => ({ ...f, collectionNoticeDate: e.target.value }))} />
              </div>

              <Input label="Account Number (Last 4 digits)" placeholder="4321" maxLength={4}
                value={form.accountNumberLast4}
                onChange={(e) => setForm(f => ({ ...f, accountNumberLast4: e.target.value }))} />

              <TextArea label="Notes (optional)" placeholder="Any additional details about this debt..."
                value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />

              <div className="flex items-center justify-between pt-4">
                <button onClick={() => navigate('/onboarding/state')} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button type="submit">Continue →</Button>
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
