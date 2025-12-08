/**
 * Terms & Agreements Page
 * Parency Legal Attorney & Law Firm End-User License Agreement (EULA)
 */

import { Metadata } from "next";
import Header from "@/components/header";
import LegalFooter from "../components/legal-footer";

export const metadata: Metadata = {
  title: "Terms & Agreements | Parency Legal",
  description: "Parency Legal Attorney & Law Firm End-User License Agreement (EULA)",
};

export default function TermsPage() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <Header />
      <main className="container mx-auto max-w-4xl px-4 py-12 md:py-16">
        <article className="prose prose-slate max-w-none">
          <h1 className="text-3xl md:text-4xl font-bold text-brand-navy mb-2">
            PARENCY LEGAL
          </h1>
          <h2 className="text-xl md:text-2xl font-semibold text-brand-navy-light mb-6">
            ATTORNEY & LAW FIRM END-USER LICENSE AGREEMENT (EULA)
          </h2>

          <div className="text-sm text-muted-foreground mb-8">
            <p><strong>Last Updated:</strong> {currentDate}</p>
            <p><strong>Effective Upon Acceptance</strong></p>
          </div>

          <div className="bg-brand-teal/5 border border-brand-teal/20 rounded-lg p-6 mb-8">
            <p className="text-foreground leading-relaxed">
              This Parency Legal End-User License Agreement ("Agreement" or "EULA") is a binding contract between:
            </p>
            <ul className="mt-4 space-y-2">
              <li><strong>Parency Legal, LLC</strong>, an Indiana limited liability company ("Parency Legal," "we," "us," or "our"), and</li>
              <li><strong>The individual legal professional or entity</strong> accepting this Agreement ("Legal User," "you," or "your").</li>
            </ul>
            <p className="mt-4 text-foreground leading-relaxed">
              This Agreement governs your access to and use of Parency Legal, including any related web applications, mobile applications, software, AI services, integrations, and documentation (collectively, the "Platform").
            </p>
          </div>

          <div className="bg-brand-orange/5 border border-brand-orange/20 rounded-lg p-6 mb-8">
            <p className="text-foreground leading-relaxed">
              By clicking "I Agree," creating a Parency Legal account, or accessing the Platform, you:
            </p>
            <ul className="mt-4 space-y-2">
              <li>Represent that you are a licensed attorney, supervised legal professional, or authorized law firm representative; and</li>
              <li>Agree to be bound by this Agreement, the Parency Legal Terms of Use, and the Parency Legal Privacy Policy (collectively, the "Parency Legal Terms").</li>
            </ul>
            <p className="mt-4 font-semibold text-brand-orange-dark">
              If you do not agree to this Agreement, you may not use Parency Legal.
            </p>
          </div>

          {/* Section 1 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              1. SCOPE & RELATIONSHIP TO OTHER TERMS
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">1.1 Supplement to General Terms.</h4>
            <p className="text-foreground leading-relaxed">
              This Agreement supplements and is in addition to the general Parency Legal Terms of Use. In the event of a conflict between this Agreement and the general Terms of Use, this Agreement will control with respect to Parency Legal and Legal Users.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">1.2 Professional Use Only.</h4>
            <p className="text-foreground leading-relaxed">
              Parency Legal is intended solely for use by legal professionals (attorneys, paralegals, law firm staff) in connection with their legal services. It is not intended for direct consumer use without professional supervision.
            </p>
          </section>

          {/* Section 2 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              2. ELIGIBILITY & PROFESSIONAL STATUS
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">2.1 Eligibility Criteria.</h4>
            <p className="text-foreground leading-relaxed mb-2">By using the Platform, you represent and warrant that:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>You are a licensed attorney in good standing in at least one jurisdiction; or</li>
              <li>You are a paralegal, legal assistant, or staff member acting under direct supervision of a licensed attorney; or</li>
              <li>You are an authorized representative of a law firm or legal entity with full authority to bind such entity to this Agreement.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">2.2 Duty to Maintain Status.</h4>
            <p className="text-foreground leading-relaxed mb-2">You agree to promptly cease use of the Platform and/or remove access for affected users if:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>You lose your license or are suspended/disbarred;</li>
              <li>A supervised individual ceases to be supervised or employed; or</li>
              <li>Your firm or entity loses authority or standing to provide legal services.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">2.3 Firm Responsibility.</h4>
            <p className="text-foreground leading-relaxed mb-2">Where the Platform is used by or on behalf of a law firm, that firm:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Is responsible for all use of the Platform by its users;</li>
              <li>Must ensure proper onboarding, training, and supervision; and</li>
              <li>Must ensure compliance with all ethical, regulatory, and confidentiality requirements.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              3. NATURE OF THE PLATFORM & NO LEGAL ADVICE
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">3.1 Legal Support Tool Only.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal is a technology platform that assists with:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Organizing and structuring user-provided materials;</li>
              <li>Summarizing communications, documents, and timelines;</li>
              <li>Providing AI-generated draft insights, pattern indicators, and narratives;</li>
              <li>Supporting document assembly and case preparation workflows.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">3.2 No Legal Advice or Legal Services.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Does not provide legal advice, opinions, or legal representation;</li>
              <li>Does not determine legal strategies, case theory, or likelihood of success;</li>
              <li>Does not undertake any duty to your clients, including no duty to warn, advise, or protect.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2 font-medium">
              You acknowledge that all legal analysis, advice, and representation are solely your responsibility.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">3.3 No Attorney–Client Relationship with Parency Legal.</h4>
            <p className="text-foreground leading-relaxed mb-2">Nothing in your use of the Platform creates:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>An attorney–client relationship between Parency Legal and you; or</li>
              <li>An attorney–client relationship between Parency Legal and any of your clients.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              4. LICENSE GRANT & USE RIGHTS
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">4.1 License Grant.</h4>
            <p className="text-foreground leading-relaxed">
              Subject to this Agreement, Parency Legal grants you a limited, non-exclusive, non-transferable, revocable license to access and use Parency Legal for your internal professional legal services.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">4.2 Authorized Users.</h4>
            <p className="text-foreground leading-relaxed mb-2">You may permit:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Attorneys, paralegals, and legal staff within your firm</li>
              <li>Contract professionals under your supervision</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2">
              to access the Platform under your account, in accordance with your subscription level and this Agreement.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">4.3 Restrictions.</h4>
            <p className="text-foreground leading-relaxed mb-2">You may not:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Copy, modify, or create derivative works from the Platform;</li>
              <li>Reverse engineer, decompile, or attempt to access source code;</li>
              <li>Use the Platform to build or train a competing product;</li>
              <li>Sell, resell, or sublicense the Platform to third parties;</li>
              <li>Circumvent any usage limits, access controls, or security features.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              5. PROFESSIONAL & ETHICAL RESPONSIBILITIES
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">5.1 Exclusive Responsibility for Legal Work.</h4>
            <p className="text-foreground leading-relaxed mb-2">You retain exclusive responsibility for:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Case strategy and legal decision-making;</li>
              <li>Accuracy and completeness of all filings and submissions;</li>
              <li>Compliance with all procedural and evidentiary rules;</li>
              <li>Providing competent representation (including technological competence);</li>
              <li>Supervising non-attorney staff and users.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">5.2 Duty to Review and Verify.</h4>
            <p className="text-foreground leading-relaxed mb-2">You agree to:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Treat all AI-generated content as draft material only;</li>
              <li>Review, verify, and correct any output before using it in practice;</li>
              <li>Confirm that all timelines, facts, and characterizations are accurate;</li>
              <li>Ensure all materials you rely on meet governing legal standards.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2 font-medium">
              Failure to do so constitutes professional error by you, not a failure of Parency Legal.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">5.3 Compliance with Bar & Regulatory Rules.</h4>
            <p className="text-foreground leading-relaxed mb-2">You are solely responsible for ensuring that your use of Parency Legal complies with:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>State bar rules and opinions;</li>
              <li>Ethics requirements regarding the use of AI and cloud-based tools;</li>
              <li>Confidentiality and privilege standards;</li>
              <li>Rules on outsourcing, nonlawyer involvement, and technological competence.</li>
            </ul>
          </section>

          {/* Section 6 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              6. CLIENT DATA, PRIVILEGE & CONFIDENTIALITY
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">6.1 Ownership of Case Data.</h4>
            <p className="text-foreground leading-relaxed">
              As between you and Parency Legal, you (or your client) own all documents, messages, and case-related content that you upload ("Case Data").
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">6.2 License to Process Case Data.</h4>
            <p className="text-foreground leading-relaxed mb-2">You grant Parency Legal a limited, non-exclusive, revocable license to:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Store, process, transform, analyze, and display Case Data;</li>
              <li>Generate derived content (summaries, timelines, drafts) solely to provide the Platform;</li>
              <li>Maintain backups and logs as necessary for security, debugging, and compliance.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2 font-medium">
              Parency Legal does not sell or license Case Data to third parties.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">6.3 Privilege & Confidentiality.</h4>
            <p className="text-foreground leading-relaxed mb-2">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Determining whether use of Parency Legal complies with privilege rules;</li>
              <li>Obtaining any necessary client consent to upload and process Case Data;</li>
              <li>Ensuring you do not upload materials in violation of protective orders, sealing orders, or client agreements.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">6.4 No Intentional Waiver by Parency Legal.</h4>
            <p className="text-foreground leading-relaxed">
              Parency Legal does not intend for its involvement as a third-party technology provider to waive attorney–client privilege or work product protection.
              However, you are responsible for understanding how your jurisdiction treats cloud providers and AI tools in the context of privilege.
            </p>
          </section>

          {/* Section 7 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              7. AI-GENERATED CONTENT & LIMITATIONS
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">7.1 AI Features.</h4>
            <p className="text-foreground leading-relaxed mb-2">The Platform may use generative AI and related technologies to:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Summarize communications or documents;</li>
              <li>Propose issue lists or behavioral patterns;</li>
              <li>Draft preliminary chronologies, narratives, or talking points;</li>
              <li>Highlight potential patterns (e.g., high conflict, DARVO-like patterns).</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">7.2 No Guarantees on AI Output.</h4>
            <p className="text-foreground leading-relaxed mb-2">You acknowledge that AI-generated outputs:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>May be incomplete, inaccurate, or misleading;</li>
              <li>May misinterpret tone, context, or legal significance;</li>
              <li>Are dependent on the quality and completeness of the Case Data provided;</li>
              <li>Are not legal research, legal analysis, or legal advice.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">7.3 Use of AI Output.</h4>
            <p className="text-foreground leading-relaxed mb-2">You agree:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Not to rely solely on AI output without independent professional judgment;</li>
              <li>To treat all AI output as a tool, not an authority;</li>
              <li>To verify any factual assertions, timelines, and claims before using them in any legal context.</li>
            </ul>
          </section>

          {/* Section 8 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              8. PROHIBITED USES (LEGAL-SPECIFIC)
            </h3>

            <p className="text-foreground leading-relaxed mb-2">You may not use the Platform to:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Fabricate, alter, or manipulate evidence or communications;</li>
              <li>Generate misleading or deceptive content intended to misrepresent facts;</li>
              <li>Circumvent discovery obligations or conceal responsive information;</li>
              <li>Upload sealed or restricted materials in violation of court orders;</li>
              <li>Engage in vexatious, abusive, or bad-faith litigation tactics;</li>
              <li>Facilitate harassment, intimidation, or unlawful coercion of any party;</li>
              <li>Allow direct client access to attorney-only tools in a way that misleads them into believing Parency Legal is providing legal advice.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4 font-medium">
              Parency Legal reserves the right to suspend or terminate access in case of suspected misuse.
            </p>
          </section>

          {/* Section 9 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              9. SECURITY, DATA HANDLING & COMPLIANCE
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">9.1 Security Measures.</h4>
            <p className="text-foreground leading-relaxed">
              Parency Legal uses industry-standard safeguards (e.g., encryption, access controls, secure hosting) to protect Case Data; however, no system is entirely secure.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">9.2 Your Security Obligations.</h4>
            <p className="text-foreground leading-relaxed mb-2">You are responsible for:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Maintaining secure usernames and passwords;</li>
              <li>Limiting access within your firm to authorized users;</li>
              <li>Logging out of sessions on shared or public devices;</li>
              <li>Implementing your own firm-level security measures (VPNs, device policies, etc.).</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">9.3 Data Retention & Deletion.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal may retain data for:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Maintaining service functionality;</li>
              <li>Security and backup purposes;</li>
              <li>Compliance with legal obligations.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2">
              Subject to applicable laws and our data retention schedule, you may request deletion of certain Case Data; however, aggregated, anonymized, or log information may be retained.
            </p>
          </section>

          {/* Section 10 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              10. FEES, BILLING & SUBSCRIPTION
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">10.1 Paid Use.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal may require subscription fees. By subscribing, you:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Authorize Parency Legal (or its payment processor) to charge your chosen payment method;</li>
              <li>Acknowledge that subscriptions may auto-renew unless canceled.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">10.2 Refunds.</h4>
            <p className="text-foreground leading-relaxed">
              Fees are generally non-refundable, except as required by law or expressly stated otherwise in a written subscription agreement.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">10.3 Changes to Fees.</h4>
            <p className="text-foreground leading-relaxed">
              Parency Legal may update fees or billing models upon reasonable notice. Continued use after such notice constitutes acceptance of the changes.
            </p>
          </section>

          {/* Section 11 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              11. INTELLECTUAL PROPERTY OWNERSHIP
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">11.1 Parency Legal IP.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal and its licensors own all rights, title, and interest in:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>The Platform;</li>
              <li>Underlying software and AI models;</li>
              <li>UI, branding, and related IP;</li>
              <li>Any generic or anonymized insights or learnings.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-2">
              This Agreement does not grant you ownership of any Parency Legal IP.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">11.2 Feedback.</h4>
            <p className="text-foreground leading-relaxed">
              If you provide feedback, suggestions, or ideas regarding the Platform, Parency Legal may use them without restriction or obligation, and you assign all rights in such feedback to Parency Legal.
            </p>
          </section>

          {/* Section 12 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              12. WARRANTY DISCLAIMER
            </h3>

            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
              <p className="text-foreground leading-relaxed font-medium uppercase text-sm">
                THE PLATFORM IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT ANY WARRANTY OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO:
              </p>
              <ul className="list-disc pl-6 space-y-1 text-foreground mt-2 uppercase text-sm">
                <li>WARRANTIES OF MERCHANTABILITY;</li>
                <li>FITNESS FOR A PARTICULAR PURPOSE;</li>
                <li>NON-INFRINGEMENT;</li>
                <li>ACCURACY OR RELIABILITY;</li>
                <li>SUITABILITY FOR ANY LEGAL PURPOSE OR PROCEEDING.</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4 font-medium">
                You assume all risks arising from your use of the Platform.
              </p>
            </div>
          </section>

          {/* Section 13 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              13. LIMITATION OF LIABILITY
            </h3>

            <div className="bg-gray-100 border border-gray-200 rounded-lg p-4">
              <p className="text-foreground leading-relaxed font-medium uppercase text-sm mb-4">
                TO THE MAXIMUM EXTENT PERMITTED BY LAW:
              </p>
              <p className="text-foreground leading-relaxed uppercase text-sm">
                PARENCY LEGAL WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, CONSEQUENTIAL, SPECIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOST PROFITS, LOST CLIENTS, LOST REPUTATION, OR LOSS OF DATA.
              </p>
              <p className="text-foreground leading-relaxed mt-4 uppercase text-sm">PARENCY LEGAL WILL NOT BE LIABLE FOR:</p>
              <ul className="list-disc pl-6 space-y-1 text-foreground mt-2 uppercase text-sm">
                <li>LEGAL CASE OUTCOMES;</li>
                <li>PROFESSIONAL DISCIPLINE OR MALPRACTICE CLAIMS;</li>
                <li>ERRORS OR OMISSIONS IN AI OUTPUT;</li>
                <li>MISUSE OF DATA BY YOU OR YOUR STAFF;</li>
                <li>BREACHES RESULTING FROM YOUR FAILURE TO SECURE ACCESS.</li>
              </ul>
              <p className="text-foreground leading-relaxed mt-4 uppercase text-sm font-medium">
                IN ALL CASES, PARENCY LEGAL'S TOTAL LIABILITY UNDER THIS AGREEMENT IS LIMITED TO THE AMOUNTS PAID BY YOU FOR ACCESS TO THE PLATFORM IN THE TWELVE (12) MONTHS PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
              </p>
            </div>
          </section>

          {/* Section 14 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              14. INDEMNIFICATION
            </h3>

            <p className="text-foreground leading-relaxed mb-2">
              You agree to indemnify, defend, and hold harmless Parency Legal and its officers, directors, employees, contractors, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to:
            </p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Your use of the Platform in connection with legal services;</li>
              <li>Any alleged malpractice, negligence, or ethical violation;</li>
              <li>Your failure to review or verify AI outputs;</li>
              <li>Your breach of confidentiality or privilege obligations;</li>
              <li>Your violation of laws, court rules, or bar rules;</li>
              <li>Claims by your clients or third parties related to your professional representation.</li>
            </ul>
            <p className="text-foreground leading-relaxed mt-4 font-medium">
              This indemnification obligation survives termination of this Agreement.
            </p>
          </section>

          {/* Section 15 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              15. TERM, SUSPENSION & TERMINATION
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">15.1 Term.</h4>
            <p className="text-foreground leading-relaxed">
              This Agreement remains in effect as long as you maintain an active Parency Legal account or otherwise use the Platform.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">15.2 Suspension or Termination by Parency Legal.</h4>
            <p className="text-foreground leading-relaxed mb-2">Parency Legal may suspend or terminate your access, in whole or in part, if:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>You violate this Agreement or the Parency Legal Terms;</li>
              <li>Parency Legal reasonably suspects misuse or abuse of the Platform;</li>
              <li>Your use creates a risk of harm, liability, or reputational damage;</li>
              <li>Required by law, court order, or regulatory authority.</li>
            </ul>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">15.3 Effect of Termination.</h4>
            <p className="text-foreground leading-relaxed mb-2">Upon termination:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Your right to access the Platform immediately ceases;</li>
              <li>Parency Legal may retain certain data as required by law or for legitimate business purposes;</li>
              <li>Sections intended to survive (including but not limited to IP Ownership, Warranty Disclaimer, Limitation of Liability, Indemnification, and Governing Law) will remain in full force.</li>
            </ul>
          </section>

          {/* Section 16 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              16. GOVERNING LAW & DISPUTE RESOLUTION
            </h3>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">16.1 Governing Law.</h4>
            <p className="text-foreground leading-relaxed">
              This Agreement is governed by the laws of the State of Indiana, without regard to conflict-of-law principles.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">16.2 Arbitration.</h4>
            <p className="text-foreground leading-relaxed">
              Any dispute arising out of or relating to this Agreement or your use of the Platform shall be resolved exclusively by binding arbitration in Indianapolis, Indiana, administered by a recognized arbitration provider.
            </p>

            <h4 className="font-semibold text-brand-navy-light mt-4 mb-2">16.3 No Class Actions.</h4>
            <p className="text-foreground leading-relaxed mb-2">You agree that:</p>
            <ul className="list-disc pl-6 space-y-1 text-foreground">
              <li>Disputes will be resolved on an individual basis;</li>
              <li>You waive the right to participate in any class, collective, or representative action.</li>
            </ul>
          </section>

          {/* Section 17 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              17. CHANGES TO THIS AGREEMENT
            </h3>

            <p className="text-foreground leading-relaxed">
              Parency Legal may update this Agreement from time to time.
              You will be notified via the Platform, email, or other reasonable means.
              Continued use of Parency Legal after the effective date of any update constitutes your acceptance of the revised Agreement.
            </p>
          </section>

          {/* Section 18 */}
          <section className="mb-8">
            <h3 className="text-xl font-bold text-brand-navy border-b border-brand-teal/30 pb-2 mb-4">
              18. MISCELLANEOUS
            </h3>

            <ul className="space-y-4 text-foreground">
              <li>
                <strong>Entire Agreement.</strong> This Agreement, together with the Parency Legal Terms of Use and Privacy Policy, constitutes the entire agreement between you and Parency Legal regarding Parency Legal.
              </li>
              <li>
                <strong>Severability.</strong> If any provision is found invalid or unenforceable, the remaining provisions remain in full force.
              </li>
              <li>
                <strong>No Waiver.</strong> Failure to enforce a provision does not waive the right to enforce it later.
              </li>
              <li>
                <strong>Assignment.</strong> You may not assign this Agreement without Parency Legal's prior written consent. Parency Legal may assign this Agreement in connection with a merger, acquisition, or sale of assets.
              </li>
            </ul>
          </section>

        </article>
      </main>
      <LegalFooter />
    </div>
  );
}
