import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

const steps = ['Set Your Goal', 'Financial Reality Check', 'Strategy', 'Generate Documents', 'Execute & Track'];

const goalOptions = [
  { value: 'full_settlement', label: 'Settle for Less (Lump Sum)', icon: '💰', desc: 'I want to pay less than I owe in one payment' },
  { value: 'payment_plan', label: 'Payment Plan', icon: '📅', desc: 'I need a monthly plan I can actually afford' },
  { value: 'dispute_validity', label: 'Dispute This Debt', icon: '⚖', desc: 'I don\'t think this debt is valid' },
  { value: 'cease_and_desist', label: 'Stop All Contact', icon: '🛑', desc: 'I want them to stop calling me' },
  { value: 'violation_leverage', label: 'Use My Rights', icon: '🚩', desc: 'I know my rights were violated' },
];

export function NegotiationWizard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialGoal = searchParams.get('goal') || '';
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState(initialGoal);
  const [finances, setFinances] = useState({ monthlyIncome: '', monthlyExpenses: '', maxLumpSum: '' });
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [callActive, setCallActive] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<Array<{ suggested: string; reason: string }>>([]);

  const { data } = useQuery({
    queryKey: ['debt', id],
    queryFn: () => api.debts.get(id!),
    enabled: !!id,
  });

  const createSession = useMutation({
    mutationFn: () => api.negotiations.create(id!, {
      goal: goal || 'full_settlement',
      userMaxLumpSum: finances.maxLumpSum ? parseFloat(finances.maxLumpSum) : undefined,
      userMonthlyIncome: finances.monthlyIncome ? parseFloat(finances.monthlyIncome) : undefined,
    }),
    onSuccess: (res) => { setSessionId(res.session.id); },
  });

  const debt = data?.debt;
  const amount = debt?.currentClaimedAmount || debt?.originalAmount || 0;

  const generateDoc = useMutation({
    mutationFn: (type: string) => api.documents.generate(id!, type),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['debt', id] }); },
  });

  const handleNext = () => {
    if (step === 0 && goal) setStep(1);
    else if (step === 1) setStep(2);
    else if (step === 2) { createSession.mutate(); setStep(3); }
    else if (step === 3) setStep(4);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <React.Fragment key={s}>
            <div className={clsx(
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
              i === step ? 'gradient-bg text-white' : i < step ? 'bg-accent-500/20 text-accent-400' : 'bg-white/5 text-gray-500'
            )}>
              <span>{i < step ? '✓' : i + 1}</span>
              <span className="hidden sm:inline">{s}</span>
            </div>
            {i < steps.length - 1 && <div className={clsx('flex-1 h-px', i < step ? 'bg-accent-500/50' : 'bg-white/10')} />}
          </React.Fragment>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          {step === 0 && (
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">What do you want to do?</h2>
              <p className="text-gray-400 mb-6">Choose your negotiation goal. This will determine the strategy and documents we generate.</p>
              <div className="grid gap-3">
                {goalOptions.map((opt) => (
                  <button key={opt.value}
                    onClick={() => setGoal(opt.value)}
                    className={clsx(
                      'flex items-start gap-4 p-4 rounded-xl border transition-all text-left card-3d',
                      goal === opt.value
                        ? 'bg-debtwise-500/20 border-debtwise-500/50'
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                    )}
                  >
                    <span className="text-2xl">{opt.icon}</span>
                    <div>
                      <p className="text-sm font-semibold text-white">{opt.label}</p>
                      <p className="text-xs text-gray-400 mt-1">{opt.desc}</p>
                    </div>
                    {goal === opt.value && <span className="ml-auto text-debtwise-400">✓</span>}
                  </button>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => navigate(`/debts/${id}`)} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={handleNext} disabled={!goal}>Continue →</Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Your Financial Reality Check</h2>
              <p className="text-gray-400 mb-6">This helps us determine a realistic settlement budget — your "power number."</p>
              <div className="space-y-4 max-w-md">
                <Input label="Monthly Income (after tax)" type="number" placeholder="3500"
                  value={finances.monthlyIncome} onChange={(e) => setFinances(f => ({ ...f, monthlyIncome: e.target.value }))} />
                <Input label="Monthly Expenses" type="number" placeholder="2800"
                  value={finances.monthlyExpenses} onChange={(e) => setFinances(f => ({ ...f, monthlyExpenses: e.target.value }))} />
                <Input label="Max Lump Sum You Could Pay" type="number" placeholder="1000"
                  value={finances.maxLumpSum} onChange={(e) => setFinances(f => ({ ...f, maxLumpSum: e.target.value }))} />
                {finances.monthlyIncome && finances.monthlyExpenses && (
                  <div className="p-4 rounded-xl bg-accent-500/10 border border-accent-500/20">
                    <p className="text-sm text-accent-300">
                      Your discretionary income:{' '}
                      <strong>${(parseFloat(finances.monthlyIncome) - parseFloat(finances.monthlyExpenses)).toFixed(2)}/month</strong>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">This is your realistic negotiation power number.</p>
                  </div>
                )}
              </div>
              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(0)} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={handleNext}>Continue →</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Your Strategy</h2>
              <p className="text-gray-400 mb-6">Based on your debt analysis, here's the recommended approach.</p>

              <div className="space-y-4">
                <div className="p-5 rounded-xl bg-gradient-to-br from-debtwise-500/10 to-accent-500/10 border border-white/10">
                  <p className="text-sm font-semibold text-white mb-2">Recommended Strategy</p>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {goal === 'full_settlement' && `Open with an offer of $${Math.round(amount * 0.3).toLocaleString()} (30% of $${amount.toLocaleString()}). Collectors typically accept 40-60% for this debt type. Your walkaway position is $${Math.round(amount * 0.5).toLocaleString()}. Never pay without a written settlement agreement.`}
                    {goal === 'cease_and_desist' && 'Send a Cease and Desist letter via Certified Mail. The collector may contact you one more time to confirm cessation or announce legal action. This does not make the debt go away — it only stops calls.'}
                    {goal === 'dispute_validity' && 'Send a Debt Validation Letter immediately. The collector must provide proof within 30 days. If they cannot, they must stop collection and may need to remove the tradeline from your credit report.'}
                    {goal === 'violation_leverage' && 'Document all violations and use them as leverage. File a CFPB complaint if the collector does not address them. Statutory damages of up to $1,000 per action under FDCPA.'}
                    {(!goal || goal === 'payment_plan') && 'A payment plan should only be considered if the collector agrees in writing to freeze interest and fees. Never agree to a plan that restarts the statute of limitations.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Opening Offer</p>
                    <p className="text-xl font-bold text-white">${Math.round(amount * 0.3).toLocaleString()}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-white/5">
                    <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Walkaway</p>
                    <p className="text-xl font-bold text-white">${Math.round(amount * 0.5).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(1)} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={handleNext} loading={createSession.isPending}>Generate Documents →</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Generate Your Documents</h2>
              <p className="text-gray-400 mb-6">Create the documents you need for your chosen strategy.</p>

              <div className="grid gap-3">
                {goal === 'cease_and_desist' && (
                  <DocButton icon="🛑" label="Cease and Desist Letter" onClick={() => generateDoc.mutate('cease_and_desist')} loading={generateDoc.isPending} />
                )}
                {goal === 'dispute_validity' && (
                  <DocButton icon="📋" label="Debt Validation Request" onClick={() => generateDoc.mutate('debt_validation_request')} loading={generateDoc.isPending} />
                )}
                {goal === 'full_settlement' && (
                  <>
                    <DocButton icon="💰" label="Settlement Offer Letter" onClick={() => generateDoc.mutate('settlement_offer')} loading={generateDoc.isPending} />
                    <DocButton icon="📞" label="Call Script" onClick={() => generateDoc.mutate('call_script')} loading={generateDoc.isPending} />
                  </>
                )}
                {goal === 'violation_leverage' && (
                  <>
                    <DocButton icon="🚩" label="Violation Complaint Letter" onClick={() => generateDoc.mutate('violation_complaint')} loading={generateDoc.isPending} />
                    <DocButton icon="💰" label="Settlement Offer Letter" onClick={() => generateDoc.mutate('settlement_offer')} loading={generateDoc.isPending} />
                  </>
                )}
                {(!goal || goal === 'payment_plan') && (
                  <>
                    <DocButton icon="📅" label="Payment Plan Proposal" onClick={() => generateDoc.mutate('payment_plan_proposal')} loading={generateDoc.isPending} />
                    <DocButton icon="📞" label="Call Script" onClick={() => generateDoc.mutate('call_script')} loading={generateDoc.isPending} />
                  </>
                )}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-xs text-amber-300">
                  📋 Remember: Send all documents via Certified Mail with Return Receipt. Keep copies for your records. 
                  These are templates — verify all facts before sending.
                </p>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(2)} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={handleNext}>Execute Plan →</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="glass-card p-6 sm:p-8">
              <h2 className="text-2xl font-bold text-white mb-2">Execute & Track</h2>
              <p className="text-gray-400 mb-6">Now it's time to take action. Track every step here.</p>

              <div className="space-y-6">
                {/* Call Companion */}
                <div className="p-5 rounded-xl bg-gradient-to-br from-debtwise-500/10 to-accent-500/10 border border-white/10">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">📞 Live Call Companion</h3>
                      <p className="text-xs text-gray-400">Real-time coaching while you're on the phone</p>
                    </div>
                    <Button
                      variant={callActive ? 'danger' : 'primary'}
                      size="sm"
                      onClick={() => setCallActive(!callActive)}
                    >
                      {callActive ? 'End Call' : 'Start Call'}
                    </Button>
                  </div>

                  {callActive && (
                    <div className="space-y-3">
                      <div className="p-3 rounded-xl bg-white/5">
                        <p className="text-xs text-gray-500 mb-2">What did the collector say? Type it here for suggestions:</p>
                        <div className="flex gap-2">
                          <input
                            value={transcript}
                            onChange={(e) => setTranscript(e.target.value)}
                            placeholder="Type what they said..."
                            className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-debtwise-500"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && transcript.trim()) {
                                setAiSuggestions(prev => [...prev, {
                                  suggested: '"I need to review that in writing before I can agree."',
                                  reason: 'Never agree to terms verbally. Get everything in writing.'
                                }]);
                                setTranscript('');
                              }
                            }}
                          />
                          <Button size="sm" variant="secondary">Send</Button>
                        </div>
                      </div>

                      {aiSuggestions.map((s, i) => (
                        <div key={i} className="p-3 rounded-xl bg-debtwise-500/10 border border-debtwise-500/20">
                          <p className="text-sm text-debtwise-300 font-medium">{s.suggested}</p>
                          <p className="text-xs text-gray-400 mt-1">{s.reason}</p>
                        </div>
                      ))}

                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                        <p className="text-xs text-amber-300">
                          ⚠️ DebtWise coaching is informational only. You are responsible for everything you say on this call.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Contact Log */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">📝 Log Contact</h3>
                  <div className="flex gap-2">
                    <input placeholder="Date, person spoken to, outcome..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-debtwise-500" />
                    <Button size="sm" variant="secondary">Log</Button>
                  </div>
                </div>

                {/* Status Update */}
                <div className="p-5 rounded-xl bg-white/5 border border-white/10">
                  <h3 className="text-sm font-semibold text-white mb-3">Update Status</h3>
                  <div className="flex gap-2 flex-wrap">
                    {['offer_made', 'counter_received', 'settled', 'abandoned'].map((s) => (
                      <button key={s}
                        onClick={async () => {
                          if (sessionId) {
                            await api.negotiations.update(id!, sessionId, { status: s });
                            queryClient.invalidateQueries({ queryKey: ['debt', id] });
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-gray-300 hover:bg-white/10 transition-colors capitalize"
                      >
                        {s.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button onClick={() => setStep(3)} className="text-gray-400 hover:text-white text-sm">← Back</button>
                <Button onClick={() => navigate(`/debts/${id}`)}>Done — Back to Debt →</Button>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DocButton({ icon, label, onClick, loading }: { icon: string; label: string; onClick: () => void; loading: boolean }) {
  return (
    <button onClick={onClick} disabled={loading}
      className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all text-left card-3d"
    >
      <span className="text-xl">{icon}</span>
      <span className="text-sm text-gray-300 flex-1">{label}</span>
      {loading ? <span className="text-xs text-debtwise-400">Generating...</span> : <span className="text-gray-500">→</span>}
    </button>
  );
}

export default NegotiationWizard;
