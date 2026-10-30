import React, { useState } from "react";
import { GraduationCap, Building, Compass, Trophy, HeartHandshake, Settings, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck, X } from "lucide-react";

export interface TemplateConfig {
  id: string;
  title: string;
  icon: any;
  defaultName: string;
  defaultDesc: string;
  suggestedQuorum: number;
  votingDurationDays: number;
  receiptGraceDays: number;
  sampleMembers: string[];
  governanceSummary: string[];
  spendingRule: string;
}

export const TEMPLATES: TemplateConfig[] = [
  {
    id: "college_club",
    title: "College Club / Student Society",
    icon: GraduationCap,
    defaultName: "Autonomous Drone & Robotics Club",
    defaultDesc: "Hardware components, 3D printing supplies, and competition travel logistics for university team.",
    suggestedQuorum: 2,
    votingDurationDays: 3,
    receiptGraceDays: 3,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    ],
    spendingRule: "Advance releases allowed for hardware purchases; itemized receipts required within 72 hours.",
    governanceSummary: [
      "2 of 3 authorized committee members must approve any expense.",
      "Proposers can request advance payouts for urgent vendor purchases.",
      "Advances require receipt hash confirmation by quorum before subsequent releases.",
      "Contract balance strictly equals available funds plus reserved funds.",
    ],
  },
  {
    id: "hostel_society",
    title: "Hostel / Housing Society",
    icon: Building,
    defaultName: "Sunrise Heights Block-B Residents Society",
    defaultDesc: "Common area elevator repairs, water pump maintenance, security guard compensation, and festival decor.",
    suggestedQuorum: 3,
    votingDurationDays: 5,
    receiptGraceDays: 7,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65",
    ],
    spendingRule: "Dual treasurer oversight; strict receipt confirmation before any subsequent advances.",
    governanceSummary: [
      "3 of 5 council members must approve any society disbursement.",
      "All vendor advances must submit invoices within 7 days.",
      "Unsolicited society maintenance deposits automatically credit to Available Funds.",
      "Non-custodial: no resident or manager can move funds unilaterally.",
    ],
  },
  {
    id: "group_trip",
    title: "Group Trip / Travel Pool",
    icon: Compass,
    defaultName: "Ladakh Himalayan Expedition 2026",
    defaultDesc: "Shared travel pool for vehicle permits, high-altitude homestays, fuel, and shared provisions.",
    suggestedQuorum: 2,
    votingDurationDays: 1,
    receiptGraceDays: 5,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    ],
    spendingRule: "Rapid 24-hour voting turnarounds for on-the-road booking advances.",
    governanceSummary: [
      "2 of 4 travel companions must approve emergency bookings or fuel payments.",
      "Advance disbursed immediately to designated trip organizer on affirmative vote.",
      "Post-trip receipt settlement within 5 days of trip completion.",
    ],
  },
  {
    id: "hackathon_prize",
    title: "Hackathon / Prize Pool",
    icon: Trophy,
    defaultName: "Web3 Builders Hackathon Prize Pool",
    defaultDesc: "Track bounties, judging awards, infrastructure grants, and pizza stipends for hacker teams.",
    suggestedQuorum: 2,
    votingDurationDays: 2,
    receiptGraceDays: 2,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    ],
    spendingRule: "Standard payment direct disbursements to winning hacker wallet addresses.",
    governanceSummary: [
      "2 of 2 lead organizers must co-sign every prize disbursement.",
      "Direct disbursement via standard payment with zero receipt grace period required.",
      "Transparent on-chain transaction hashes provide immutable proof of prize distribution.",
    ],
  },
  {
    id: "small_ngo",
    title: "Small NGO / Non-Profit",
    icon: HeartHandshake,
    defaultName: "Community Food Relief Initiative",
    defaultDesc: "Community dry ration distribution, disaster meal kits, and volunteer logistics across regional shelters.",
    suggestedQuorum: 3,
    votingDurationDays: 7,
    receiptGraceDays: 7,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "0x90F79bf6EB2c4f870365E785982E1f101E93b906",
    ],
    spendingRule: "Public audit trail for donors; mandatory receipt confirmation before advance settlement.",
    governanceSummary: [
      "3 of 4 board trustees must approve all grant disbursements.",
      "Donor contributions immutably tracked on MST Testnet block explorer.",
      "All grocery and distribution receipts anchored via SHA-256 digests.",
      "Complete CSV transaction logs exportable for external regulatory audits.",
    ],
  },
  {
    id: "custom",
    title: "Custom Organisation",
    icon: Settings,
    defaultName: "Custom Autonomous Treasury",
    defaultDesc: "Fully configurable multi-signature treasury for any arbitrary community or collective.",
    suggestedQuorum: 2,
    votingDurationDays: 3,
    receiptGraceDays: 3,
    sampleMembers: [
      "0x06e08cf0aed1663834E267E90333164a0276bbbD",
      "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    ],
    spendingRule: "Configured by treasury members upon initial factory deployment.",
    governanceSummary: [
      "M-of-N threshold determined by initial creator.",
      "Member addresses are bounded between 1 and 50 to prevent gas limits.",
      "All standard and advance workflows available.",
    ],
  },
];

interface TemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (name: string, desc: string, members: string[], quorum: number) => Promise<void>;
  isDeploying?: boolean;
}

export const TemplateSelectorModal: React.FC<TemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onDeploy,
  isDeploying = false,
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("college_club");
  const [step, setStep] = useState<"choose" | "customize" | "review">("choose");

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || TEMPLATES[0];

  // Editable fields
  const [name, setName] = useState<string>(selectedTemplate.defaultName);
  const [desc, setDesc] = useState<string>(selectedTemplate.defaultDesc);
  const [membersInput, setMembersInput] = useState<string>(selectedTemplate.sampleMembers.join(", "));
  const [quorum, setQuorum] = useState<number>(selectedTemplate.suggestedQuorum);

  if (!isOpen) return null;

  const handleSelectTemplate = (template: TemplateConfig) => {
    setSelectedTemplateId(template.id);
    setName(template.defaultName);
    setDesc(template.defaultDesc);
    setMembersInput(template.sampleMembers.join(", "));
    setQuorum(template.suggestedQuorum);
    setStep("customize");
  };

  const parsedMembers = membersInput
    .split(",")
    .map((m) => m.trim())
    .filter((m) => m.length > 0);

  const handleProceedToReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || parsedMembers.length === 0) {
      alert("Please provide a name and at least one member address.");
      return;
    }
    if (quorum < 1 || quorum > parsedMembers.length) {
      alert(`Quorum must be between 1 and ${parsedMembers.length} (the total number of members).`);
      return;
    }
    setStep("review");
  };

  const handleFinalDeploy = async () => {
    await onDeploy(name, desc, parsedMembers, quorum);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: step === "choose" ? "760px" : "640px" }}
      >
        <div className="modal-header">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.75rem", fontFamily: "var(--font-mono)", color: "var(--accent-crimson)", fontWeight: 700 }}>
                {step === "choose" ? "STEP 1 OF 3: SELECT TEMPLATE" : step === "customize" ? "STEP 2 OF 3: CONFIGURE GOVERNANCE" : "STEP 3 OF 3: PLAIN-LANGUAGE REVIEW"}
              </span>
            </div>
            <h3 className="modal-title" style={{ marginTop: "0.2rem" }}>
              {step === "choose" && "Deploy New Club Treasury"}
              {step === "customize" && `Configure: ${selectedTemplate.title}`}
              {step === "review" && "Review Governance Rules Before Deployment"}
            </h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X style={{ width: "20px", height: "20px" }} />
          </button>
        </div>

        {/* STEP 1: Choose Template */}
        {step === "choose" && (
          <div>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "1.5rem" }}>
              Select an organization profile tailored to your collective's governance model. Defaults can be fully customized in the next step.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
                gap: "1rem",
                maxHeight: "55vh",
                overflowY: "auto",
                paddingRight: "0.5rem",
              }}
            >
              {TEMPLATES.map((tpl) => {
                const Icon = tpl.icon;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="glass-panel"
                    style={{
                      padding: "1.25rem",
                      borderRadius: "var(--radius-sm)",
                      cursor: "pointer",
                      border: "1px solid var(--border-subtle)",
                      transition: "var(--transition)",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.6rem" }}>
                        <div
                          style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "8px",
                            background: "rgba(255, 48, 59, 0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "var(--accent-crimson)",
                          }}
                        >
                          <Icon style={{ width: "18px", height: "18px" }} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: "1rem", color: "var(--text-primary)" }}>{tpl.title}</h4>
                          <span style={{ fontSize: "0.72rem", color: "var(--accent-emerald)", fontFamily: "var(--font-mono)" }}>
                            Default Quorum: {tpl.suggestedQuorum} of {tpl.sampleMembers.length}
                          </span>
                        </div>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.5, marginBottom: "0.85rem" }}>
                        {tpl.defaultDesc}
                      </p>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-subtle)", paddingTop: "0.65rem", fontSize: "0.75rem", color: "var(--accent-crimson)", fontWeight: 600 }}>
                      <span>Select Template</span>
                      <ArrowRight style={{ width: "14px", height: "14px" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Customize */}
        {step === "customize" && (
          <form onSubmit={handleProceedToReview}>
            <div className="form-group">
              <label className="form-label">Treasury / Organization Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mission / Description</label>
              <textarea
                className="form-control"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={2}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                Initial Authorized Members ({parsedMembers.length} addresses, 1-50 max)
              </label>
              <textarea
                className="form-control"
                value={membersInput}
                onChange={(e) => setMembersInput(e.target.value)}
                rows={3}
                placeholder="0xabc..., 0xdef..., 0x123..."
                required
              />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "0.25rem", display: "block" }}>
                Enter valid EVM addresses separated by commas. Each member gets 1 voting share.
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">Approval Quorum (Approvals Required)</label>
                <input
                  type="number"
                  className="form-control"
                  min={1}
                  max={parsedMembers.length || 1}
                  value={quorum}
                  onChange={(e) => setQuorum(parseInt(e.target.value) || 1)}
                  required
                />
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block", marginTop: "0.2rem" }}>
                  e.g. {quorum} of {parsedMembers.length} must vote YES
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">Template Spending Guide</label>
                <div style={{ padding: "0.75rem", background: "var(--bg-surface-elevated)", borderRadius: "var(--radius-sm)", fontSize: "0.75rem", color: "var(--text-secondary)", border: "1px solid var(--border-subtle)" }}>
                  {selectedTemplate.spendingRule}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginTop: "1.5rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep("choose")}>
                Back to Templates
              </button>
              <button type="submit" className="btn btn-primary">
                <span>Review Plain-Language Rules</span>
                <ArrowRight style={{ width: "16px", height: "16px" }} />
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: Plain-Language Review */}
        {step === "review" && (
          <div>
            <div className="disclaimer-banner" style={{ marginBottom: "1.5rem" }}>
              <div className="disclaimer-icon">
                <ShieldCheck style={{ width: "20px", height: "20px", color: "var(--accent-emerald)" }} />
              </div>
              <div className="disclaimer-text">
                <strong>Plain-Language Governance Contract Review:</strong> Before submitting the on-chain deployment
                transaction to the VaultFactory on MST Testnet, verify that these operational rules accurately reflect your organization's intentions.
              </div>
            </div>

            <div
              style={{
                background: "var(--bg-surface-elevated)",
                borderRadius: "var(--radius-sm)",
                padding: "1.25rem",
                border: "1px solid var(--border-subtle)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={{ fontSize: "0.8rem", textTransform: "uppercase", color: "var(--text-muted)", fontWeight: 700, marginBottom: "0.75rem", letterSpacing: "0.05em" }}>
                Operational Rules Summary:
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem", fontSize: "0.88rem", color: "var(--text-primary)" }}>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong>Quorum Consensus:</strong> Exactly <strong>{quorum} of {parsedMembers.length}</strong> authorized members must vote affirmative before any standard payment or advance can be released.
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong>Advance Safeguards:</strong> Advances disburse funds immediately upon quorum approval, locking reserved accounting on-chain until members confirm the uploaded receipt hash.
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong>Invariant Protection:</strong> Smart contract guarantees <code>Balance = Available + Reserved</code> at all times.
                  </span>
                </li>
                <li style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                  <CheckCircle2 style={{ width: "16px", height: "16px", color: "var(--accent-emerald)", flexShrink: 0, marginTop: "2px" }} />
                  <span>
                    <strong>Network & Execution:</strong> Deploys a new non-custodial <code>ClubVault</code> instance on MST Testnet (Chain ID 91562037).
                  </span>
                </li>
              </ul>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem" }}>
              <button type="button" className="btn btn-secondary" onClick={() => setStep("customize")}>
                Edit Details
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleFinalDeploy}
                disabled={isDeploying}
              >
                {isDeploying ? (
                  <span>Deploying on Testnet...</span>
                ) : (
                  <>
                    <ShieldCheck style={{ width: "16px", height: "16px" }} />
                    <span>Confirm & Deploy ClubVault</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
