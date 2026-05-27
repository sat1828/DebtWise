export interface User {
  id: string;
  email: string;
  fullName: string;
  plan: 'free' | 'pro' | 'premium';
  stateOfResidence: string;
  timezone: string;
  mfaEnabled: boolean;
  onboardingComplete: boolean;
  createdAt: string;
}

export interface Debt {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  originalCreditor: string;
  currentCollector: string | null;
  accountNumberLast4: string | null;
  debtType: DebtType;
  originalAmount: number | null;
  currentClaimedAmount: number | null;
  interestClaimed: number | null;
  feesClaimed: number | null;
  dateOfLastPayment: string | null;
  dateOfDefault: string | null;
  dateFirstDelinquent: string | null;
  collectionNoticeDate: string | null;
  status: DebtStatus;
  statuteOfLimitationsExpiresOn: string | null;
  isTimeBarred: boolean;
  legalRiskScore: number | null;
  collectorViolations: Violation[];
  aiAnalysisSummary: string | null;
  sourceDocumentUrl: string | null;
  sourceType: string | null;
  notes: string | null;
  sessionCount?: number;
  activeDeadlines?: number;
}

export type DebtType = 'credit_card' | 'medical' | 'student_loan' | 'auto_loan' | 'personal_loan' | 'utility' | 'rent' | 'mortgage' | 'other';
export type DebtStatus = 'analyzing' | 'valid' | 'disputed' | 'time_barred' | 'settled' | 'paid_in_full' | 'deleted' | 'in_litigation';

export interface Violation {
  type: string;
  description: string;
  date: string;
  statute: string;
}

export interface NegotiationSession {
  id: string;
  debtId: string;
  userId: string;
  createdAt: string;
  updatedAt?: string;
  goal: NegotiationGoal;
  userMaxLumpSum: number | null;
  userMonthlyIncome: number | null;
  userMaxMonthlyPayment: number | null;
  status: SessionStatus;
  finalSettlementAmount: number | null;
  finalPaymentPlan: PaymentPlanItem[];
  contacts: ContactLog[];
}

export type NegotiationGoal = 'full_settlement' | 'payment_plan' | 'dispute_validity' | 'cease_and_desist' | 'statute_defense' | 'violation_leverage';
export type SessionStatus = 'open' | 'offer_made' | 'counter_received' | 'settled' | 'abandoned';

export interface PaymentPlanItem {
  amount: number;
  dueDate: string;
  paid: boolean;
}

export interface ContactLog {
  id: string;
  date: string;
  contactPerson?: string;
  notes: string;
  outcome?: string;
  createdAt: string;
}

export interface DebtDocument {
  id: string;
  debtId: string;
  userId: string;
  createdAt: string;
  type: DocumentType;
  contentMarkdown: string;
  contentPdfUrl: string | null;
  sentAt: string | null;
  sentVia: string | null;
}

export type DocumentType = 'debt_validation_request' | 'cease_and_desist' | 'settlement_offer' | 'dispute_letter' | 'violation_complaint' | 'call_script' | 'payment_plan_proposal';

export interface Deadline {
  id: string;
  debtId: string;
  userId: string;
  deadlineDate: string;
  type: DeadlineType;
  description: string;
  isResolved: boolean;
  reminderSentAt: string | null;
  originalCreditor?: string;
  debtType?: string;
  currentClaimedAmount?: number;
}

export type DeadlineType = 'fdcpa_dispute_window' | 'response_to_lawsuit' | 'statute_of_limitations_reset_risk' | 'settlement_offer_expiry' | 'credit_report_dispute_followup';

export interface AIThread {
  id: string;
  debtId: string | null;
  userId: string;
  createdAt: string;
  threadType: 'analysis' | 'coaching' | 'document_gen' | 'call_companion';
  messages: ChatMessage[];
  contextSnapshot: any;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface DebtAnalysis {
  status: DebtStatus;
  solExpiresOn: string | null;
  isTimeBarred: boolean;
  riskScore: number;
  violations: Violation[];
  summary: string;
  validationStatus: string;
  settlementRange: { low: number; high: number; percentage: string };
  recommendedActions: string[];
}
