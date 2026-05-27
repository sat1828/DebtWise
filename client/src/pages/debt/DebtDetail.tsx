import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Button } from '../../components/ui/Button';
import type { Debt, NegotiationSession, DebtDocument, Deadline, AIThread, DebtAnalysis } from '../../lib/types';

const tabs = ['Overview', 'Negotiate', 'Documents', 'Timeline', 'Deadlines', 'Rights'] as const;

export function DebtDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('Overview');

  const { data, isLoading } = useQuery({
    queryKey: ['debt', id],
    queryFn: () => api.debts.get(id!),
    enabled: !!id,
  });

  const analyzeMutation = useMutation({
    mutationFn: () => api.debts.analyze(id!),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['debt', id] }); },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-12 w-48" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  if (!data?.debt) {
    return (
      <div className="glass-card p-10 text-center">
        <p className="text-gray-400">Debt not found</p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')} className="mt-4">Back to Dashboard</Button>
      </div>
    );
  }

  const debt = data.debt as Debt;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-white mt-1">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">{debt.originalCreditor}</h1>
          <p className="text-gray-400 mt-1">
            ${(debt.currentClaimedAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} — {debt.debtType.replace('_', ' ')}
            {debt.currentCollector && <span> — Collected by {debt.currentCollector}</span>}
          </p>
        </div>
        <Button onClick={() => analyzeMutation.mutate()} loading={analyzeMutation.isPending} variant="secondary" size="sm">
          Re-analyze
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={clsx(
              'px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeTab === tab
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
        {activeTab === 'Overview' && <OverviewTab debt={debt} />}
        {activeTab === 'Negotiate' && <NegotiateTab debtId={debt.id} sessions={data.sessions as NegotiationSession[]} />}
        {activeTab === 'Documents' && <DocumentsTab debtId={debt.id} documents={data.documents as DebtDocument[]} />}
        {activeTab === 'Timeline' && <TimelineTab debt={debt} sessions={data.sessions as NegotiationSession[]} documents={data.documents as DebtDocument[]} />}
        {activeTab === 'Deadlines' && <DeadlinesTab debtId={debt.id} deadlines={data.deadlines as Deadline[]} />}
        {activeTab === 'Rights' && <RightsTab debt={debt} />}
      </motion.div>
    </div>
  );
}

function OverviewTab({ debt }: { debt: Debt }) {
  const analysis = debt.aiAnalysisSummary;

  // Simulated analysis if none exists
  const solExpiry = debt.statuteOfLimitationsExpiresOn || 'N/A';
  const amount = debt.currentClaimedAmount || debt.originalAmount || 0;
  const violations = debt.collectorViolations || [];

  return (
    <div className="space-y-6">
      {/* AI Analysis Summary */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">🤖 AI Analysis</h2>
        {analysis ? (
          <div className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {analysis}
          </div>
        ) : (
          <div>
            <p className="text-gray-500 mb-4">No analysis yet. Click "Re-analyze" to generate one.</p>
            <Button variant="secondary" onClick={() => {}}>Analyze Debt</Button>
          </div>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Risk Score</p>
          <p className={clsx(
            'text-3xl font-bold',
            debt.legalRiskScore !== null && debt.legalRiskScore <= 25 ? 'text-accent-400' :
            debt.legalRiskScore !== null && debt.legalRiskScore <= 50 ? 'text-debtwise-400' :
            debt.legalRiskScore !== null && debt.legalRiskScore <= 75 ? 'text-amber-400' : 'text-red-400'
          )}>
            {debt.legalRiskScore ?? '—'}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">SOL Expires</p>
          <p className="text-3xl font-bold text-white">{solExpiry}</p>
          <p className={clsx('text-xs mt-1', debt.isTimeBarred ? 'text-accent-400' : 'text-amber-400')}>
            {debt.isTimeBarred ? '✓ Time-barred' : 'Within statute of limitations'}
          </p>
        </div>
        <div className="glass-card p-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold mb-1">Debt Status</p>
          <p className="text-3xl font-bold text-white capitalize">{debt.status.replace('_', ' ')}</p>
          {violations.length > 0 && (
            <p className="text-red-400 text-xs mt-1">{violations.length} FDCPA violation{violations.length > 1 ? 's' : ''}</p>
          )}
        </div>
      </div>

      {/* Violation Flags */}
      {violations.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">🚩 FDCPA Violations</h3>
          <div className="space-y-3">
            {violations.map((v, i) => (
              <div key={i} className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-red-300">{v.type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-400 mt-1">{v.description}</p>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">{v.statute}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommended Actions */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">📋 Recommended Next Steps</h3>
        <div className="space-y-3">
          {debt.isTimeBarred ? (
            <>
              <ActionItem step={1} text="Send a Cease and Desist Letter" />
              <ActionItem step={2} text="Inform collector this debt is time-barred" />
              <ActionItem step={3} text="File CFPB complaint if contacted again" />
              <ActionItem step={4} text="DO NOT make any payment — even $1 resets the SOL" />
            </>
          ) : violations.length > 0 ? (
            <>
              <ActionItem step={1} text="Document all violations with dates and details" />
              <ActionItem step={2} text="Send Violation Complaint Letter" />
              <ActionItem step={3} text="Propose settlement at 25-35% given your leverage" />
            </>
          ) : (
            <>
              <ActionItem step={1} text="Send Debt Validation Letter via Certified Mail" />
              <ActionItem step={2} text="Do not make any payment until debt is validated" />
              <ActionItem step={3} text="Prepare settlement offer at 30% of claimed amount" />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ActionItem({ step, text }: { step: number; text: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5">
      <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
        {step}
      </div>
      <span className="text-sm text-gray-300">{text}</span>
    </div>
  );
}

function NegotiateTab({ debtId, sessions }: { debtId: string; sessions: NegotiationSession[] }) {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Start Negotiation</h2>
        <p className="text-gray-400 text-sm mb-6">Choose your goal and generate the documents you need.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { goal: 'full_settlement', label: 'Settle for Less', desc: 'Lump-sum settlement offer', icon: '💰', color: 'from-green-500/20 to-green-600/10' },
            { goal: 'payment_plan', label: 'Payment Plan', desc: 'Affordable monthly plan', icon: '📅', color: 'from-blue-500/20 to-blue-600/10' },
            { goal: 'dispute_validity', label: 'Dispute Debt', desc: 'Challenge validity', icon: '⚖', color: 'from-purple-500/20 to-purple-600/10' },
            { goal: 'cease_and_desist', label: 'Stop Contact', desc: 'Cease and desist letter', icon: '🛑', color: 'from-red-500/20 to-red-600/10' },
            { goal: 'statute_defense', label: 'SOL Defense', desc: 'Time-barred leverage', icon: '🛡️', color: 'from-accent-500/20 to-accent-600/10' },
            { goal: 'violation_leverage', label: 'Use Violations', desc: 'FDCPA leverage strategy', icon: '🚩', color: 'from-amber-500/20 to-amber-600/10' },
          ].map((item) => (
            <button key={item.goal}
              onClick={() => navigate(`/debts/${debtId}/negotiate?goal=${item.goal}`)}
              className={clsx(
                'p-5 rounded-xl border text-left hover:border-white/20 transition-all card-3d',
                'bg-gradient-to-br', item.color, 'border-white/5'
              )}
            >
              <span className="text-2xl block mb-2">{item.icon}</span>
              <p className="text-sm font-semibold text-white">{item.label}</p>
              <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Previous Sessions */}
      {sessions.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Previous Sessions</h3>
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div>
                  <p className="text-sm text-gray-300">{s.goal.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString()}</p>
                </div>
                <span className="text-xs text-gray-400 capitalize">{s.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ debtId, documents }: { debtId: string; documents: DebtDocument[] }) {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState<string | null>(null);

  const docTypes = [
    { type: 'debt_validation_request', label: 'Debt Validation Letter', icon: '📋', desc: 'Request proof of debt' },
    { type: 'cease_and_desist', label: 'Cease and Desist', icon: '🛑', desc: 'Stop collection calls' },
    { type: 'settlement_offer', label: 'Settlement Offer', icon: '💰', desc: 'Propose a settlement' },
    { type: 'dispute_letter', label: 'Dispute Letter', icon: '⚖', desc: 'Formally dispute debt' },
    { type: 'violation_complaint', label: 'Violation Complaint', icon: '🚩', desc: 'Document FDCPA violations' },
    { type: 'call_script', label: 'Call Script', icon: '📞', desc: 'Negotiation script' },
  ];

  const generateDoc = async (type: string) => {
    setGenerating(type);
    try {
      await api.documents.generate(debtId, type);
      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
    } finally {
      setGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Generate Documents</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docTypes.map((doc) => (
            <button key={doc.type}
              onClick={() => generateDoc(doc.type)}
              disabled={generating === doc.type}
              className="p-4 rounded-xl bg-white/5 border border-white/5 hover:border-white/20 transition-all text-left card-3d"
            >
              <span className="text-xl block mb-2">{doc.icon}</span>
              <p className="text-sm font-medium text-white">{doc.label}</p>
              <p className="text-xs text-gray-500 mt-1">{doc.desc}</p>
              {generating === doc.type && <p className="text-xs text-debtwise-400 mt-2">Generating...</p>}
            </button>
          ))}
        </div>
      </div>

      {documents.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Generated Documents</h3>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-white/5">
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {doc.type === 'settlement_offer' ? '💰' : doc.type === 'cease_and_desist' ? '🛑' : doc.type === 'call_script' ? '📞' : '📋'}
                  </span>
                  <div>
                    <p className="text-sm text-gray-300">{doc.type.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!doc.sentAt && (
                    <Button size="sm" variant="ghost" onClick={() => api.documents.update(doc.id, { sentAt: new Date().toISOString(), sentVia: 'email' })}>
                      Mark Sent
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => window.open(`/api/documents/${doc.id}/pdf`, '_blank')}>
                    View
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineTab({ debt, sessions, documents }: { debt: Debt; sessions: NegotiationSession[]; documents: DebtDocument[] }) {
  const events: Array<{ date: string; type: string; label: string; icon: string }> = [];

  events.push({ date: debt.createdAt, type: 'created', label: `Debt added — ${debt.originalCreditor}`, icon: '📋' });
  if (debt.aiAnalysisSummary) events.push({ date: debt.updatedAt, type: 'analyzed', label: 'AI Analysis completed', icon: '🤖' });

  for (const doc of documents) {
    events.push({ date: doc.createdAt, type: 'document', label: `Document generated: ${doc.type.replace(/_/g, ' ')}`, icon: '📄' });
    if (doc.sentAt) events.push({ date: doc.sentAt, type: 'sent', label: `Document sent via ${doc.sentVia}`, icon: '📨' });
  }

  for (const session of sessions) {
    events.push({ date: session.createdAt, type: 'session', label: `Negotiation started — ${session.goal.replace(/_/g, ' ')}`, icon: '🤝' });
    if (session.status === 'settled') events.push({ date: session.updatedAt || session.createdAt, type: 'settled', label: `Settled for $${session.finalSettlementAmount || 0}`, icon: '✅' });
  }

  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-6">Timeline</h2>
      {events.length === 0 ? (
        <p className="text-gray-500 text-sm">No events yet</p>
      ) : (
        <div className="relative space-y-0">
          {events.map((event, i) => (
            <div key={i} className="flex gap-4 pb-6 relative last:pb-0">
              {i < events.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-white/5" />
              )}
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-sm flex-shrink-0 relative z-10">
                {event.icon}
              </div>
              <div>
                <p className="text-sm text-gray-300">{event.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{new Date(event.date).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DeadlinesTab({ debtId, deadlines }: { debtId: string; deadlines: Deadline[] }) {
  const queryClient = useQueryClient();
  const sorted = [...deadlines].sort((a, b) => new Date(a.deadlineDate).getTime() - new Date(b.deadlineDate).getTime());

  return (
    <div className="glass-card p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Deadlines</h2>
      {sorted.length === 0 ? (
        <p className="text-gray-500 text-sm">No deadlines tracked for this debt</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((dl) => {
            const isOverdue = new Date(dl.deadlineDate) < new Date() && !dl.isResolved;
            return (
              <div key={dl.id} className={clsx(
                'flex items-center justify-between p-4 rounded-xl border transition-all',
                dl.isResolved ? 'bg-green-500/5 border-green-500/20' :
                isOverdue ? 'bg-red-500/10 border-red-500/20' :
                'bg-white/5 border-white/5'
              )}>
                <div>
                  <div className="flex items-center gap-2">
                    <p className={clsx(
                      'text-sm font-medium',
                      dl.isResolved ? 'text-green-400 line-through' : isOverdue ? 'text-red-300' : 'text-gray-300'
                    )}>
                      {dl.type.replace(/_/g, ' ')}
                    </p>
                    {dl.isResolved && <span className="text-xs text-green-400">✓ Done</span>}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{dl.description}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={clsx('text-sm', isOverdue ? 'text-red-400' : 'text-gray-400')}>
                    {new Date(dl.deadlineDate).toLocaleDateString()}
                  </span>
                  {!dl.isResolved && (
                    <Button size="sm" variant="ghost" onClick={async () => {
                      await api.deadlines.resolve(dl.id);
                      queryClient.invalidateQueries({ queryKey: ['debt', debtId] });
                    }}>
                      Resolve
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RightsTab({ debt }: { debt: Debt }) {
  const state = 'Your State'; // would come from user profile
  const stateName = debt.currentCollector ? 'federal' : 'federal';

  return (
    <div className="space-y-6">
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-white mb-4">⚖ Your Rights — {debt.debtType.replace('_', ' ')} Debt</h2>
        <p className="text-sm text-gray-400 mb-6">
          These rights apply specifically to your situation. Federal law (FDCPA) applies everywhere. 
          Your state may provide additional protections.
        </p>

        <div className="space-y-4">
          <RightSection
            title="What Collectors CAN Do"
            items={[
              'Contact you by phone between 8 AM and 9 PM (your local time)',
              'Send written collection notices',
              'Report the debt to credit bureaus (if accurate)',
              'File a lawsuit within the statute of limitations',
              'Contact your attorney (if you have one)',
            ]}
            color="text-amber-400"
            borderClass="border-amber-500/20 bg-amber-500/5"
          />
          <RightSection
            title="What Collectors CANNOT Do"
            items={[
              'Call before 8 AM or after 9 PM (FDCPA § 1692c(a)(1))',
              'Use harassment, threats, or abusive language (§ 1692d)',
              'Make false statements about the amount owed (§ 1692e(2))',
              'Threaten lawsuit on time-barred debt (§ 1692e, Reg F)',
              'Contact you after receiving a cease and desist letter (§ 1692c(c))',
              'Contact you at work if prohibited by your employer',
              'Tell third parties (other than your attorney) about your debt',
              'Add unauthorized fees or interest',
            ]}
            color="text-green-400"
            borderClass="border-green-500/20 bg-green-500/5"
          />
          <RightSection
            title="Your 30-Day Dispute Window"
            items={[
              'You have 30 days from the collector\'s first contact to request validation',
              'During this window, collection efforts must stop until validation is provided',
              'If they cannot validate, they must cease collection and remove the tradeline',
              'Send your request via Certified Mail with Return Receipt',
            ]}
            color="text-debtwise-400"
            borderClass="border-debtwise-500/20 bg-debtwise-500/5"
          />
          <RightSection
            title="What Happens If They Break the Law"
            items={[
              'You can sue for actual damages + statutory damages up to $1,000 per action',
              'If you win, the collector pays your attorney fees (FDCPA § 1692k)',
              'You can file a complaint with the CFPB at ConsumerFinance.gov',
              'Your state attorney general may also take enforcement action',
              'Document everything — violations are powerful settlement leverage',
            ]}
            color="text-purple-400"
            borderClass="border-purple-500/20 bg-purple-500/5"
          />
        </div>

        <div className="mt-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
          <p className="text-sm text-amber-300">
            ⚠️ This information is educational. If you are facing a lawsuit or need legal representation, 
            please consult a licensed attorney in your state.
          </p>
        </div>
      </div>
    </div>
  );
}

function RightSection({ title, items, color, borderClass }: { title: string; items: string[]; color: string; borderClass: string }) {
  return (
    <div className={clsx('p-4 rounded-xl border', borderClass)}>
      <h3 className={clsx('text-sm font-semibold mb-3', color)}>{title}</h3>
      <ul className="space-y-1.5">
        {items.map((item, i) => (
          <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
            <span className="text-gray-500 mt-0.5">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default DebtDetail;
