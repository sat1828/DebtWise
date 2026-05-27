import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

const resourceSections = [
  {
    id: 'fdpa',
    title: 'Fair Debt Collection Practices Act (FDCPA)',
    icon: '⚖',
    content: `The FDCPA (15 U.S.C. § 1692) is your primary federal protection against abusive debt collection. It applies to third-party debt collectors and debt buyers.

Key Protections:
• **§ 1692c(a)(1)** — Collectors cannot call before 8 AM or after 9 PM (your time)
• **§ 1692c(b)** — Cannot discuss your debt with third parties (employer, family, neighbors)
• **§ 1692c(c)** — You can demand they stop contacting you (Cease and Desist)
• **§ 1692d** — No harassment, oppression, or abuse
• **§ 1692e** — No false, deceptive, or misleading representations
• **§ 1692e(2)** — Cannot falsely represent the amount of the debt
• **§ 1692e(5)** — Cannot threaten action they cannot or will not take
• **§ 1692f** — Cannot use unfair or unconscionable means to collect
• **§ 1692f(1)** — Cannot collect fees not authorized by the original agreement
• **§ 1692g** — Must send validation notice within 5 days of first contact
• **§ 1692k** — You can sue for actual damages + up to $1,000 statutory damages + attorney fees`,
  },
  {
    id: 'sol',
    title: 'Statute of Limitations',
    icon: '⏰',
    content: `The statute of limitations (SOL) is your deadline for when a debt can be collected through legal action. After SOL expires, the debt is "time-barred."

Key Facts:
• The SOL varies by state (3-10+ years) and debt type
• The clock typically starts from default, last payment, or first missed payment
• **Critical Warning**: In most states, ANY payment restarts the SOL
• If a debt is time-barred, the collector CANNOT sue you
• Threatening to sue on time-barred debt is an FDCPA violation
• Time-barred debts can still appear on your credit report for 7 years

Check Your State:
• California: 4 years (credit card), 4 years (written contract)
• New York: 3 years (credit card), 6 years (written contract)
• Texas: 4 years (all debt types)
• Florida: 5 years (all debt types)
• Illinois: 5 years (credit card), 10 years (written contract)`,
  },
  {
    id: 'validation',
    title: 'Debt Validation Rights',
    icon: '📋',
    content: `Under FDCPA § 1692g, you have the right to request validation of any debt within 30 days of first contact from a collector.

What to Do:
1. Send a written request via Certified Mail WITHIN 30 DAYS
2. Request: proof you owe it, original creditor details, amount breakdown, collector's license
3. During this period, collection activity must STOP until validation is provided
4. If they cannot validate, they must cease collection and may need to remove the tradeline

Sample Request Items:
• Copy of original signed contract or application
• Complete payment history
• Assignment agreement showing chain of custody
• Collector's state license/registration number
• Itemization of principal, interest, and fees`,
  },
  {
    id: 'credit',
    title: 'Credit Reporting & Disputes',
    icon: '📊',
    content: `The Fair Credit Reporting Act (FCRA) governs how debts appear on your credit report.

Your Rights:
• **7-Year Rule**: Most negative information stays 7 years from first delinquency
• **Chapter 7 Bankruptcy**: 10 years
• **Paid Debts**: Should be marked "Paid in Full" or "Paid as Settled"
• **Dispute**: You can dispute inaccurate information with credit bureaus
• **Investigation**: Bureaus must investigate within 30 days
• **Removal**: If disputed info can't be verified, it must be removed

Credit Bureaus:
• Experian: experian.com/dispute
• Equifax: equifax.com/personal/credit-dispute
• TransUnion: transunion.com/credit-disputes`,
  },
  {
    id: 'state',
    title: 'State-Specific Protections',
    icon: '🗺️',
    content: `Many states provide stronger protections than federal FDCPA. 

Strong State Laws:
• **California** — Rosenthal Fair Debt Collection Practices Act: applies to original creditors too (FDCPA only covers third-party collectors)
• **Florida** — Florida Consumer Collection Practices Act (FCCPA): broader definition of prohibited conduct
• **New York** — Consumer Credit Fairness Act: shorter SOL (3 years for credit card), expanded protections
• **Massachusetts** — Strong state regulations, 93A consumer protection act
• **Texas** — Texas Finance Code Chapter 392: state-specific debt collection rules

Check your state attorney general's website for additional protections specific to your situation.`,
  },
  {
    id: 'litigation',
    title: 'When to Get an Attorney',
    icon: '🛡️',
    content: `⚠️ DebtWise helps with negotiation and education, but some situations require a licensed attorney.

When to Hire a Lawyer:
• You've been served with a lawsuit or court summons
• A judgment has already been entered against you
• Wage garnishment has started or is threatened
• The debt amount is very large ($25,000+)
• The collector is a law firm or in-house counsel
• You're facing foreclosure or repossession
• You want to file an FDCPA lawsuit for damages

Where to Find Help:
• Your state bar association referral service
• Legal aid organizations (free for low-income)
• NACA (National Association of Consumer Advocates) — naca.net
• Consumer Financial Protection Bureau — consumerfinance.gov/complaint`,
  },
];

export function RightsHub() {
  const [activeSection, setActiveSection] = useState(resourceSections[0]!.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">⚖ Know Your Rights</h1>
        <p className="text-gray-400 mt-2">Every debt collector counts on you not knowing what they can and cannot do. Knowledge is your strongest weapon.</p>
      </div>

      {/* Navigation */}
      <div className="flex gap-2 overflow-x-auto scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
        {resourceSections.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
              activeSection === section.id
                ? 'bg-white/10 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/5'
            )}
          >
            <span>{section.icon}</span>
            <span className="hidden sm:inline">{section.title}</span>
            <span className="sm:hidden">{section.title.split('(')[0]}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {resourceSections.map((section) => (
        <motion.div
          key={section.id}
          initial={{ opacity: 0, y: 10 }}
          animate={activeSection === section.id ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          className={clsx(activeSection !== section.id && 'hidden')}
        >
          <div className="glass-card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="text-3xl">{section.icon}</span>
              <h2 className="text-xl font-bold text-white">{section.title}</h2>
            </div>
            <div className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
            <div className="glass-card p-5">
              <span className="text-xl block mb-2">📋</span>
              <h3 className="text-sm font-semibold text-white mb-1">Generate a Letter</h3>
              <p className="text-xs text-gray-400">Create a validation request, cease & desist, or settlement letter.</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xl block mb-2">📞</span>
              <h3 className="text-sm font-semibold text-white mb-1">Call Companion</h3>
              <p className="text-xs text-gray-400">Get real-time coaching during calls with collectors.</p>
            </div>
            <div className="glass-card p-5">
              <span className="text-xl block mb-2">🏛️</span>
              <h3 className="text-sm font-semibold text-white mb-1">File a Complaint</h3>
              <p className="text-xs text-gray-400">Report violations to CFPB or your state attorney general.</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

export default RightsHub;
