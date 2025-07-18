"use client"

import { FileText } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold " style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Terms & Conditions</h2>
        </div>
      </div>
      
      <div className="card rounded-lg p-4 sm:p-6 shadow-sm border">
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Terms & Conditions
          </h2>
          <FileText className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className=" overflow-y-auto pr-2 space-y-4">
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              1. General Terms
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              By accessing RANGERPT Modal, you acknowledge and agree to comply with these Terms & Conditions. 
              These Terms apply to all users, without exception.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              2. Eligibility
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You must be at least 18 years of age to use this service, as it involves wallet-based 
              transactions (real money). By using the platform, you confirm that you meet this age 
              requirement.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              3. Account Responsibility
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              You are solely responsible for maintaining the confidentiality of your account credentials, 
              including your password. All activity conducted under your account is your responsibility. 
              Please notify us immediately if you suspect unauthorized access.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              4. Prohibited conduct
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Any attempt to misuse, exploit, or interfere with the platform—including fraudulent behavior, 
              false claims, or attempts to manipulate wallet transactions—may result in immediate suspension 
              or termination of your account.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              5. Fraud and misuse policies
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Submitting false reports, such as claiming wallet deductions without receiving PT (points), will 
              be considered fraudulent behavior. In such cases, we reserve the right to suspend your account 
              and confiscate your wallet balance without prior notice.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              6. Refund Policy
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              All transactions made on RANGERPT Modal are final. No refunds will be issued under any 
              circumstances. Please review your actions carefully before making a transaction.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              7. Limitation of Liability
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              RANGERPT Modal is not liable for any indirect, incidental, special, consequential, or punitive 
              damages arising from your use of—or inability to use—the service, including but not limited to 
              loss of data, funds, or business interruption.
            </p>
          </div>
          
          <div>
            <h3 className="text-base font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              8. Changes to Terms
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              We reserve the right to update or modify these Terms at any time. Any changes will be effective 
              immediately upon posting. Continued use of the service after changes are made signifies your 
              acceptance of the revised Terms.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}