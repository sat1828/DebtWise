import { v4 as uuid } from 'uuid';
import { logger } from '../config';

const SOL_TABLE: Record<string, Record<string, number>> = {
  CA: { credit_card: 4, medical: 3, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 4, other: 4 },
  NY: { credit_card: 3, medical: 3, auto_loan: 4, student_loan: 3, personal_loan: 3, utility: 3, rent: 6, mortgage: 6, other: 3 },
  FL: { credit_card: 5, medical: 5, auto_loan: 5, student_loan: 5, personal_loan: 5, utility: 5, rent: 5, mortgage: 5, other: 5 },
  TX: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 4, other: 4 },
  IL: { credit_card: 5, medical: 5, auto_loan: 5, student_loan: 5, personal_loan: 5, utility: 5, rent: 5, mortgage: 10, other: 5 },
  OH: { credit_card: 6, medical: 6, auto_loan: 6, student_loan: 6, personal_loan: 6, utility: 6, rent: 6, mortgage: 6, other: 6 },
  GA: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 6, other: 4 },
  NC: { credit_card: 3, medical: 3, auto_loan: 3, student_loan: 3, personal_loan: 3, utility: 3, rent: 3, mortgage: 3, other: 3 },
  MI: { credit_card: 6, medical: 6, auto_loan: 6, student_loan: 6, personal_loan: 6, utility: 6, rent: 6, mortgage: 6, other: 6 },
  PA: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 4, other: 4 },
  NJ: { credit_card: 6, medical: 6, auto_loan: 6, student_loan: 6, personal_loan: 6, utility: 6, rent: 6, mortgage: 6, other: 6 },
  VA: { credit_card: 3, medical: 3, auto_loan: 4, student_loan: 3, personal_loan: 3, utility: 3, rent: 3, mortgage: 5, other: 3 },
  WA: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 6, other: 4 },
  AZ: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 6, other: 4 },
  CO: { credit_card: 6, medical: 6, auto_loan: 6, student_loan: 6, personal_loan: 6, utility: 6, rent: 6, mortgage: 6, other: 6 },
  MA: { credit_card: 6, medical: 6, auto_loan: 6, student_loan: 6, personal_loan: 6, utility: 6, rent: 6, mortgage: 6, other: 6 },
  default: { credit_card: 4, medical: 4, auto_loan: 4, student_loan: 4, personal_loan: 4, utility: 4, rent: 4, mortgage: 4, other: 4 },
};

const STATE_LAWS: Record<string, { name: string; providesMoreProtection: boolean }> = {
  CA: { name: 'California Rosenthal Fair Debt Collection Practices Act (Cal. Civ. Code §§ 1788 et seq.)', providesMoreProtection: true },
  FL: { name: 'Florida Consumer Collection Practices Act (FCCPA, Fla. Stat. §§ 559.55 et seq.)', providesMoreProtection: true },
  NY: { name: 'New York Consumer Credit Fairness Act (CCFA)', providesMoreProtection: true },
  default: { name: 'State consumer protection laws', providesMoreProtection: false },
};

export interface DebtAnalysis {
  status: string;
  solExpiresOn: string | null;
  isTimeBarred: boolean;
  riskScore: number;
  violations: Array<{ type: string; description: string; date: string; statute: string }>;
  summary: string;
  validationStatus: string;
  settlementRange: { low: number; high: number; percentage: string };
  recommendedActions: string[];
}

export async function runDebtAnalysis(debt: any, state: string): Promise<DebtAnalysis> {
  logger.info({ debtId: debt.id, state }, 'Running debt analysis');

  await new Promise(r => setTimeout(r, 800));

  const solYears = SOL_TABLE[state]?.[debt.debt_type] || SOL_TABLE.default![debt.debt_type] || 4;
  const stateLaw = STATE_LAWS[state] || STATE_LAWS.default!;

  const lastPaymentDate = debt.date_of_last_payment ? new Date(debt.date_of_last_payment) : null;
  const defaultDate = debt.date_of_default ? new Date(debt.date_of_default) : null;

  const solStartDate = defaultDate || lastPaymentDate || new Date(debt.created_at);
  const solExpiry = new Date(solStartDate);
  solExpiry.setFullYear(solExpiry.getFullYear() + solYears);

  const today = new Date();
  const isTimeBarred = today > solExpiry;
  const remainingMs = solExpiry.getTime() - today.getTime();
  const remainingYears = remainingMs / (365.25 * 24 * 60 * 60 * 1000);

  const amount = debt.current_claimed_amount || debt.original_amount || 1000;
  const violations: Array<{ type: string; description: string; date: string; statute: string }> = [];

  if (debt.collector_violations && typeof debt.collector_violations === 'string') {
    try {
      const existingViolations = JSON.parse(debt.collector_violations);
      if (Array.isArray(existingViolations)) violations.push(...existingViolations);
    } catch { /* ignore */ }
  }

  let riskScore = 50;

  if (isTimeBarred) {
    riskScore -= 30;
  } else {
    riskScore += Math.max(0, Math.min(30, Math.round((1 - remainingYears / solYears) * 30)));
  }

  if (debt.status === 'valid') riskScore += 10;
  if (debt.status === 'disputed') riskScore -= 10;
  if (violations.length > 0) riskScore -= violations.length * 5;
  if (amount < 1000) riskScore -= 10;
  if (amount > 10000) riskScore += 10;

  riskScore = Math.max(0, Math.min(100, riskScore));

  const settlementPctLow = isTimeBarred ? 15 : 30;
  const settlementPctHigh = isTimeBarred ? 30 : 50;
  const settlementLow = Math.round(amount * settlementPctLow / 100);
  const settlementHigh = Math.round(amount * settlementPctHigh / 100);

  let status = debt.status || 'analyzing';
  if (status === 'analyzing') {
    if (isTimeBarred) status = 'time_barred';
    else if (violations.length > 0) status = 'disputed';
    else status = 'valid';
  }

  const solExpiresOn = solExpiry.toISOString().split('T')[0] || null;

  const summaryLines: string[] = [];
  summaryLines.push(`**Debt Analysis for ${debt.original_creditor}**`);
  summaryLines.push('');
  summaryLines.push(`**Claimed Amount:** $${amount.toFixed(2)}`);
  summaryLines.push(`**Debt Type:** ${debt.debt_type.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}`);
  summaryLines.push(`**State:** ${state} | **SOL:** ${solYears} years`);
  summaryLines.push('');

  if (isTimeBarred) {
    summaryLines.push(`⚠️ **STATUS: TIME-BARRED** — This debt is beyond the ${solYears}-year statute of limitations in ${state}. The collector **cannot** sue you for this debt. Any payment — even $1 — could restart the SOL clock.`);
  } else {
    summaryLines.push(`✅ **Within SOL** — The ${solYears}-year SOL expires ${solExpiresOn} (${Math.round(remainingYears * 12)} months remaining).`);
  }
  summaryLines.push('');

  if (violations.length > 0) {
    summaryLines.push(`🚩 **${violations.length} Potential FDCPA Violation(s) Detected**`);
    for (const v of violations) {
      summaryLines.push(`  - ${v.description} (${v.statute})`);
    }
    summaryLines.push('These violations give you significant leverage in negotiations.');
    summaryLines.push('');
  }

  summaryLines.push(`**Settlement Landscape:**`);
  summaryLines.push(`  - Realistic settlement range: **$${settlementLow} – $${settlementHigh}** (${settlementPctLow}%–${settlementPctHigh}% of claimed amount)`);
  summaryLines.push(`  - Recommended opening offer: **$${settlementLow}**`);
  summaryLines.push(`  - Walkaway position: **$${settlementHigh}**`);
  summaryLines.push('');

  summaryLines.push(`**Risk Score: ${riskScore}/100**`);
  if (riskScore <= 25) summaryLines.push('You have maximum leverage — strong position to negotiate or dispute.');
  else if (riskScore <= 50) summaryLines.push('Moderate leverage — good opportunity for favorable settlement.');
  else if (riskScore <= 75) summaryLines.push('Limited leverage — focus on validating debt and checking for collector errors.');
  else summaryLines.push('Limited leverage — consider attorney consultation.');

  if (stateLaw.providesMoreProtection) {
    summaryLines.push('');
    summaryLines.push(`📋 **${stateLaw.name}** — ${state} law provides additional protections beyond federal FDCPA. Make sure to reference both in your letters.`);
  }

  const recommendedActions: string[] = [];
  if (!isTimeBarred && violations.length === 0) {
    recommendedActions.push('Send a Debt Validation Letter via Certified Mail within the 30-day window');
    recommendedActions.push('Do not make any payment until debt is validated');
    recommendedActions.push('Prepare a settlement offer at 30% of claimed amount');
  } else if (isTimeBarred) {
    recommendedActions.push('Send a Cease and Desist Letter immediately');
    recommendedActions.push(`Inform collector the debt is time-barred under ${state} law (${solYears}-year SOL)`);
    recommendedActions.push('File a CFPB complaint if collector continues contact or threatens lawsuit');
    recommendedActions.push('DO NOT make any payment — even $1 resets the SOL');
  } else if (violations.length > 0) {
    recommendedActions.push('Document all violations with dates, times, and details');
    recommendedActions.push('Send Violation Complaint Letter using collector violations as leverage');
    recommendedActions.push('Propose settlement at 25-35% given your leverage');
    recommendedActions.push('File CFPB complaint if violations are not addressed');
  }

  return {
    status,
    solExpiresOn,
    isTimeBarred,
    riskScore,
    violations,
    summary: summaryLines.join('\n'),
    validationStatus: isTimeBarred ? 'time_barred' : violations.length > 0 ? 'disputed' : 'needs_validation',
    settlementRange: {
      low: settlementLow,
      high: settlementHigh,
      percentage: `${settlementPctLow}%–${settlementPctHigh}%`,
    },
    recommendedActions,
  };
}

export async function generateDocumentContent(type: string, debt: any, analysis: DebtAnalysis, user: any): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const userName = user.full_name || 'Consumer';
  const userState = user.state_of_residence || 'CA';
  const amount = debt.current_claimed_amount || debt.original_amount || 1000;
  const solExpiresOn = analysis.solExpiresOn || 'TBD';

  const templates: Record<string, string> = {
    debt_validation_request: `# DEBT VALIDATION REQUEST

**Date:** ${today}
**To:** ${debt.current_collector || 'Collection Agency'}
**From:** ${userName}
**Re:** Alleged debt with ${debt.original_creditor} — Account # ending in ${debt.account_number_last4 || 'XXXX'}

---

**CERTIFIED MAIL — RETURN RECEIPT REQUESTED**

Dear Sir or Madam:

I am writing in response to your collection letter dated ${debt.collection_notice_date || 'recently'}. I dispute this debt and request validation pursuant to the Fair Debt Collection Practices Act, 15 U.S.C. § 1692g.

You have 30 days from your first contact with me to provide validation. As of this letter, you have failed to provide:
1. Proof that I am the debtor obligated to pay this amount
2. An itemized statement of the alleged debt, including principal, interest, and fees
3. The name and address of the original creditor
4. Proof that you are licensed to collect debts in ${userState}
5. A copy of the written agreement creating this debt

Until you provide this information, please cease all collection activities.

This letter is not a refusal to pay valid debts. It is a request for information to which I am legally entitled.

Sincerely,
${userName}

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`,

    cease_and_desist: `# CEASE AND DESIST LETTER

**Date:** ${today}
**To:** ${debt.current_collector || 'Collection Agency'}
**From:** ${userName}
**Re:** Alleged debt with ${debt.original_creditor} — Account # ending in ${debt.account_number_last4 || 'XXXX'}

---

**CERTIFIED MAIL — RETURN RECEIPT REQUESTED**

Dear Sir or Madam:

I am writing to exercise my rights under the Fair Debt Collection Practices Act, 15 U.S.C. § 1692c(c). Please cease and desist all further communication with me regarding the above-referenced alleged debt.

${analysis.isTimeBarred ? `Additionally, please note that this debt is TIME-BARRED under ${userState} law. The statute of limitations expired on ${solExpiresOn}. Any further attempt to collect this debt, including threats of litigation, violates both the FDCPA and ${userState} law.` : ''}

You may communicate with me one more time to confirm that you will cease communication or to notify me of specific legal action. Any other communication will be documented and reported to the CFPB and my state attorney general.

This demand does not constitute an admission that I owe this debt.

Sincerely,
${userName}

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`,

    settlement_offer: `# SETTLEMENT OFFER LETTER

**Date:** ${today}
**To:** ${debt.current_collector || 'Collection Agency'}
**From:** ${userName}
**Re:** Settlement offer — ${debt.original_creditor} — Account # ending in ${debt.account_number_last4 || 'XXXX'}
**Claimed Balance:** $${amount.toFixed(2)}

---

**CERTIFIED MAIL — RETURN RECEIPT REQUESTED**

Dear Sir or Madam:

This letter constitutes a formal offer to settle the above-referenced account.

**Offer:** I am prepared to pay $${analysis.settlementRange.low.toFixed(2)} as a one-time, lump-sum payment in full settlement of this matter.

**Conditions of Settlement:**
1. You agree to report this account as "Paid in Full" or "Paid as Settled" to all three credit bureaus (Experian, Equifax, TransUnion).
2. You agree to waive any and all remaining balance after this payment.
3. You agree that this payment does not restart the statute of limitations.
4. You provide written confirmation of these terms before any payment is made.

This offer is based on my current financial circumstances. ${amount > 5000 ? 'I have reviewed my budget and a lump-sum payment of this amount represents a significant sacrifice.' : ''}

${analysis.violations.length > 0 ? `Please note that I have documented ${analysis.violations.length} potential violations of the FDCPA in your handling of this account. I am willing to resolve this matter amicably, but I am prepared to file complaints with the CFPB and pursue statutory damages if necessary.` : ''}

This offer expires 30 days from the date of this letter.

Sincerely,
${userName}

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`,

    dispute_letter: `# FORMAL DISPUTE LETTER

**Date:** ${today}
**To:** ${debt.current_collector || 'Collection Agency'}
**From:** ${userName}
**Re:** Dispute of alleged debt — ${debt.original_creditor}

---

**CERTIFIED MAIL — RETURN RECEIPT REQUESTED**

Dear Sir or Madam:

I formally dispute the validity of the above-referenced debt. I have reason to believe that:

1. The amount claimed may be incorrect
2. I may not be the person obligated to pay this debt
3. The statute of limitations may have expired
4. ${debt.current_collector ? 'The chain of custody from the original creditor to your agency is unclear' : 'The debt may not be properly documented'}

I request that you provide complete validation of this debt, including:
- The original contract or account statement
- A complete payment history
- The assignment or sale agreement showing your right to collect
- Your license to collect debts in ${userState}

Until such validation is provided, please cease all collection activities.

Sincerely,
${userName}

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`,

    violation_complaint: `# FDCPA VIOLATION COMPLAINT AND DEMAND LETTER

**Date:** ${today}
**To:** ${debt.current_collector || 'Collection Agency'}
**From:** ${userName}
**Re:** FDCPA Violations — ${debt.original_creditor} — Account # ending in ${debt.account_number_last4 || 'XXXX'}

---

**CERTIFIED MAIL — RETURN RECEIPT REQUESTED**

Dear Sir or Madam:

I am writing to document the following violations of the Fair Debt Collection Practices Act in your handling of the above-referenced account:

${analysis.violations.map((v, i) => `${i + 1}. **${v.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}** — ${v.description} (${v.statute}) — Date: ${v.date || 'Unknown'}`).join('\n')}

I demand:
1. Immediate cessation of all collection activities
2. A written agreement resolving this matter
3. Payment of statutory damages as provided under FDCPA § 1692k

Alternatively, I am willing to resolve this matter for a full and final settlement of $${analysis.settlementRange.low.toFixed(2)} (${analysis.settlementRange.percentage} of the claimed amount) in exchange for:
- Reporting to credit bureaus as "Paid in Full"
- Waiver of remaining balance
- No further collection activities

If this matter is not resolved within 15 days, I will file a complaint with the CFPB and consult with a consumer protection attorney regarding statutory damages.

Sincerely,
${userName}

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`,

    call_script: `# NEGOTIATION CALL SCRIPT

**Date:** ${today}
**Debt:** ${debt.original_creditor} — $${amount.toFixed(2)}
**Collector:** ${debt.current_collector || 'Collection Agency'}
**Your Goal:** Settle for $${analysis.settlementRange.low.toFixed(2)}–$${analysis.settlementRange.high.toFixed(2)}
**Walkaway:** $${analysis.settlementRange.high.toFixed(2)}
**Your Leverage:** ${analysis.violations.length > 0 ? `${analysis.violations.length} documented FDCPA violations` : 'Standard negotiation position'}

---

## BEFORE THE CALL
- [ ] Find a quiet, private space
- [ ] Have this script printed or on a second screen
- [ ] Take a deep breath. You have rights. You are in control.
- [ ] Record the call (if legal in your state — check one-party consent laws)

## OPENING

**You:** "Hello, this is ${userName}. I'm calling regarding the letter you sent about an account with ${debt.original_creditor}. I have your reference number. Before we begin, please confirm your name, your direct extension, and your company's mailing address for my records."

**Expected:** They will provide this. Write it down.

**You (if debt is time-barred):** "I understand that this debt is beyond the statute of limitations in ${userState}. I am willing to discuss a settlement as a courtesy, but please know that I am aware a lawsuit is not a legal option for this account."

**You (if violations exist):** "I also want to note that I have documented several issues with your communication regarding this account. I'm hoping we can resolve this productively today without needing to involve regulatory agencies."

## THE OFFER

**You:** "I've reviewed my financial situation carefully. I'm able to offer $${analysis.settlementRange.low.toFixed(2)} as a one-time, lump-sum settlement to close this account completely. This is what I can afford, and I believe it's a fair resolution."

## IF THEY COUNTER ($\$$$$)

**They might say:** "We can accept $X (higher than your offer)"
**You:** "I understand that's your starting position. Unfortunately, $${analysis.settlementRange.low.toFixed(2)} is truly the maximum I can manage as a single payment. I cannot commit to anything higher."

**They might say:** "We need a payment plan instead"
**You:** "I'm open to discussing that, but only if the total amount is significantly reduced and the terms are in writing."

## KEY PHRASES

- "I need that in writing before I can agree"
- "I'm not able to agree to that today"
- "Can you put me on hold while I review what you're offering?"
- "I'm recording this call for my records" (if one-party consent)

## WHAT NOT TO SAY
- ❌ "I can't afford this" (shows financial desperation)
- ❌ "I'll try to find the money" (implies ability to pay more)
- ❌ Admitting the debt is yours without validation
- ❌ Agreeing to any payment without written terms
- ❌ Giving bank account or credit card information on the call

## HANDLING PRESSURE TACTICS

**If they threaten lawsuit (on time-barred debt):**
**You:** "I understand you're stating that. I want to be clear that I'm aware of the statute of limitations in ${userState}, and I will document any misrepresentation of the legal status of this debt."

**If they get aggressive or raise their voice:**
**You:** "I'm going to end this call if you cannot communicate professionally. Please send me your best offer in writing."

**If they ask for bank info:**
**You:** "I don't provide payment information over the phone. If we reach an agreement, I'll need written terms and I'll send payment through a traceable method."

## CLOSING THE CALL

**If you reach agreement:**
**You:** "Thank you. Please send me written confirmation of these terms by email and certified mail. Once I receive and review the written agreement, I will process the payment."

**If no agreement:**
**You:** "I understand we're not able to reach an agreement today. Please send your best written offer to me. I'll review it and respond in writing. Thank you for your time."

## AFTER THE CALL
- [ ] Log the call in DebtWise (date, time, person spoken to, outcome)
- [ ] Note any new information revealed
- [ ] If they made threats or violated FDCPA, document immediately
- [ ] Follow up in writing confirming any verbal agreement

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney. DebtWise coaching is informational only. You are responsible for everything you say on this call.`,
  };

  return templates[type] || `# ${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}

Generated on ${today} for ${userName}.

**Debt:** ${debt.original_creditor} — $${amount.toFixed(2)}
**Collector:** ${debt.current_collector || 'Unknown'}

This is a template document. Please customize it to your specific situation.

---

**TEMPLATE** — Verify all facts before sending. DebtWise is not your attorney.`;
}

export async function getChatResponse(messages: Array<{ role: string; content: string }>, debtContext: any, userState: string): Promise<string> {
  const lastMessage = messages[messages.length - 1]?.content || '';

  await new Promise(r => setTimeout(r, 500));

  const debt = debtContext || {};
  const amount = debt.current_claimed_amount || debt.original_amount || 'unknown';

  if (lastMessage.toLowerCase().includes('settle') || lastMessage.toLowerCase().includes('offer')) {
    return `Based on your debt of $${amount} with ${debt.original_creditor || 'this creditor'}, I recommend starting with a settlement offer at 30% of the claimed amount. Collectors typically accept 40-60% for debts like yours. Here's a strategy:

1. **Opening offer**: ${Math.round(Number(amount) * 0.3)} (30%)
2. **Walkaway**: ${Math.round(Number(amount) * 0.5)} (50%)
3. **Key leverage**: Always demand the agreement in writing before paying

Remember: never give bank account info over the phone. Use a money order or certified check.`;
  }

  if (lastMessage.toLowerCase().includes('statute') || lastMessage.toLowerCase().includes('sol') || lastMessage.toLowerCase().includes('time-bar')) {
    return `Great question. The statute of limitations (SOL) determines how long a creditor has to sue you for a debt. In ${userState || 'your state'}, the SOL for this debt type varies.

**Key facts about SOL:**
- The SOL clock typically starts from your date of first default or last payment (whichever benefits you more)
- Once SOL expires, the debt becomes "time-barred" — they can still ask for payment but cannot sue
- **Critical warning**: ANY payment — even $1 — can restart the SOL in most states
- Making a payment on a time-barred debt can revive it

Want me to check the exact SOL for your state and debt type?`;
  }

  if (lastMessage.toLowerCase().includes('call') || lastMessage.toLowerCase().includes('phone')) {
    return `**Tips for your call with the collector:**

1. **Before you call**: Open the Call Companion in DebtWise for real-time coaching
2. **Stay in control**: You set the terms, not them
3. **Get everything in writing**: Never agree to anything verbally without written confirmation
4. **Know your rights**: They cannot call before 8 AM or after 9 PM, use abusive language, or threaten illegal action
5. **Record if legal**: Check your state's consent laws for call recording

Would you like me to generate a call script for this specific debt?`;
  }

  if (lastMessage.toLowerCase().includes('dispute') || lastMessage.toLowerCase().includes('validation')) {
    return `Under FDCPA § 1692g, you have the right to dispute a debt within 30 days of first contact. Here's what to do:

1. **Send a Debt Validation Letter** via Certified Mail with Return Receipt
2. **Do not make any payment** until they validate the debt
3. **During validation**, they must provide:
   - Proof you owe the debt
   - Itemized statement of the amount
   - Original creditor information
   - Proof they're licensed to collect in your state

If they can't validate, they must stop collection and remove the tradeline from your credit report.`;
  }

  return `I'm here to help you navigate this debt with ${debt.original_creditor || 'this creditor'}. 

Here's what I can help you with:
1. **📋 Analyze** your debt — check SOL, violations, and leverage
2. **✉️ Generate documents** — validation letters, settlement offers, cease & desist
3. **📞 Call coaching** — real-time guidance during collector calls
4. **📊 Settlement strategy** — what to offer and when to walk away
5. **⚖️ Know your rights** — personalized explainer of laws that protect you

What would you like to focus on?`;
}
