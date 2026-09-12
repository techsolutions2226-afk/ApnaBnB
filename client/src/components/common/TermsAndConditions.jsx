/* ─── TermsAndConditions — reusable listing / marketplace terms panel ───
   Used by Create Listing (modal) and can be embedded anywhere else.
   Content describes ApnaBnB platform rules for Pakistan property listings;
   it is not a substitute for formal legal counsel. ───────────────────── */

import "./TermsAndConditions.css";

export const LISTING_TERMS_SECTIONS = [
  {
    id: "accuracy",
    title: "1. Accurate listing information",
    body: "You confirm that every detail you publish — title, price, size, location, purpose (sale or rent), property type, amenities, and description — is true and not misleading. You will update or remove the listing promptly if any material detail changes.",
  },
  {
    id: "authority",
    title: "2. Authority to list",
    body: "You confirm you are the property owner, an authorised agent/dealer, or otherwise legally allowed to advertise this property on ApnaBnB. You will not list properties you have no right to market or sell/rent.",
  },
  {
    id: "media",
    title: "3. Photos and media",
    body: "Photos and any optional walkthrough video must show the actual property being listed. Do not use stock images, another property’s media, or edited visuals that misrepresent the listing. You grant ApnaBnB a licence to display this media on the marketplace.",
  },
  {
    id: "contact",
    title: "4. Contact details",
    body: "The contact name, email, and Pakistani mobile number you provide may be shown to matched or entitled buyers so they can reach you. You agree to keep these details reachable and not use them to spam or harass other members.",
  },
  {
    id: "matching",
    title: "5. Matching, visits, and inquiries",
    body: "ApnaBnB may match your listing with buyer requirements, show it in search results, and facilitate visit requests or inquiries according to your role and subscription plan. Matching quality depends on the accuracy of the data you submit.",
  },
  {
    id: "fees",
    title: "6. Plans, fees, and unlocks",
    body: "Some features (for example contact unlocks, promoted visibility, or dealer tools) may require an active plan or payment. Fees already charged for completed unlocks or plan periods are handled under ApnaBnB’s payment practices; misrepresentation of a listing may lead to removal without a refund entitlement beyond what those practices allow.",
  },
  {
    id: "prohibited",
    title: "7. Prohibited content",
    body: "You must not post fraudulent, duplicate, discriminatory, illegal, or offensive listings. Fake pricing, bait-and-switch ads, and attempts to circumvent ApnaBnB verification or matching rules are not allowed.",
  },
  {
    id: "moderation",
    title: "8. Platform rights",
    body: "ApnaBnB may review, edit for clarity, hide, or permanently remove listings that violate these terms or harm marketplace trust. Repeated violations may lead to account suspension.",
  },
  {
    id: "local",
    title: "9. Local laws and disputes",
    body: "You remain responsible for complying with Pakistani property, tenancy, tax, and advertising laws that apply to your listing. Disputes between buyers, sellers, and dealers are primarily between those parties; ApnaBnB is a marketplace facilitator, not a party to the property transaction unless expressly stated otherwise.",
  },
];

/**
 * @param {{ className?: string, compact?: boolean }} props
 */
export default function TermsAndConditions({ className = "", compact = false }) {
  return (
    <div
      className={`tc-panel${compact ? " tc-panel--compact" : ""}${className ? ` ${className}` : ""}`}
    >
      <header className="tc-header">
        <h2 className="tc-title">ApnaBnB listing terms</h2>
        <p className="tc-intro">
          By publishing a listing on ApnaBnB you agree to the following rules for
          our Pakistan property marketplace (sale, rent, and dealer listings).
        </p>
      </header>

      <ol className="tc-list">
        {LISTING_TERMS_SECTIONS.map((section) => (
          <li key={section.id} className="tc-item" id={`tc-${section.id}`}>
            <h3 className="tc-item-title">{section.title}</h3>
            <p className="tc-item-body">{section.body}</p>
          </li>
        ))}
      </ol>

      <p className="tc-footnote">
        Questions? Contact{" "}
        <a href="mailto:support@apnabnb.com">support@apnabnb.com</a>.
      </p>
    </div>
  );
}
