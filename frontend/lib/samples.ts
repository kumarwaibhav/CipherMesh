/**
 * Real-world, role-based examples: the things people actually paste into AI tools at work, and the
 * mistakes they make while doing it. Every value is synthetic. Anything shaped like a live credential
 * is assembled at runtime so secret scanners on the repository never see a complete token.
 */
const j = (...parts: string[]) => parts.join("");

export type SampleKind = "safe" | "personal" | "secret" | "internal";

export interface Sample {
  id: string;
  role: string;
  team: "Engineering" | "Customer-facing" | "People & Legal" | "Product";
  label: string;
  mistake: string;
  kind: SampleKind;
  text: string;
}

export const SAMPLES: ReadonlyArray<Sample> = [
  {
    id: "support",
    role: "Customer Support",
    team: "Customer-facing",
    label: "Draft a Refund Reply",
    mistake: "Pastes the whole ticket, card number and phone included.",
    kind: "personal",
    text: [
      "Draft a polite refund reply to this ticket:",
      "Customer: Ananya Rao <ananya.rao@example.com>, +91 98450 12345",
      "Card charged twice: 4111 1111 1111 1111, ₹4,999 on 12 Oct.",
      "She wants the duplicate reversed today.",
    ].join("\n"),
  },
  {
    id: "backend",
    role: "Backend Engineer",
    team: "Engineering",
    label: "Why Does This Deploy Fail?",
    mistake: "Shares a production .env file with live credentials.",
    kind: "secret",
    text: [
      "Deploy fails with 'password authentication failed'. Here's my .env:",
      "NODE_ENV=production",
      j("DATABASE_URL=postgres://app_user:", "S3cure!Pass", "@db-prod.example.com:5432/orders"),
      j("STRIPE_KEY=", "sk_", "live_", "51HxDemo0nly", "CipherMesh9Q"),
    ].join("\n"),
  },
  {
    id: "hr",
    role: "HR & Payroll",
    team: "People & Legal",
    label: "Turn Notes into an Offer Letter",
    mistake: "Includes PAN and Aadhaar for the background check.",
    kind: "personal",
    text:
      "Write an offer letter for Rohan Mehta, Senior Data Engineer, CTC ₹32 LPA, joining 1 Dec. " +
      "For the verification section include PAN ABCPE1234F, Aadhaar 2345 6789 0124 and his phone 98765 43210.",
  },
  {
    id: "sre",
    role: "DevOps & SRE",
    team: "Engineering",
    label: "Summarise Last Night’s Incident",
    mistake: "Links internal dashboards and names a production host.",
    kind: "internal",
    text:
      "Summarise this incident for the status page. Alerts fired on https://grafana.corp.example.com/d/payments-latency " +
      "and we followed the runbook at https://wiki.internal/runbooks/pg-failover. Primary DB host 10.0.12.7 failed over at 02:14 IST.",
  },
  {
    id: "pm",
    role: "Product Manager",
    team: "Product",
    label: "Outline a PRD",
    mistake: "None. Everyday work flows straight through.",
    kind: "safe",
    text: "Draft a one-page PRD outline for adding passkey sign-in to our mobile app: goals, user stories, success metrics and open questions.",
  },
  {
    id: "sales",
    role: "Sales & RevOps",
    team: "Customer-facing",
    label: "Personalise Follow-up Emails",
    mistake: "Pastes a CRM export full of names, emails and numbers.",
    kind: "personal",
    text: [
      "Write a three-line follow-up for each lead:",
      "1. Priya Nair, CFO, priya.nair@example.com, +1 415 555 0134 (asked about SOC 2)",
      "2. David Chen, IT Director, d.chen@example.org, +44 20 7946 0958 (wants SSO)",
    ].join("\n"),
  },
  {
    id: "analyst",
    role: "Data Analyst",
    team: "Engineering",
    label: "Fix My Slow Query",
    mistake: "Leaves the password inside the connection string.",
    kind: "secret",
    text: j(
      "This aggregation times out after 30s. Connection: mongodb+srv://analyst:",
      "Q4report2026",
      "@cluster0.example.mongodb.net/sales. Pipeline: [{$match:{region:'APAC'}},{$group:{_id:'$sku',rev:{$sum:'$amount'}}}]",
    ),
  },
  {
    id: "mobile",
    role: "Mobile Engineer",
    team: "Engineering",
    label: "Review My CI Workflow",
    mistake: "A GitHub token is hard-coded in the YAML.",
    kind: "secret",
    text: j(
      "Why does this GitHub Actions step return 403?\n- run: git clone https://x-access-token:",
      "ghp_",
      "Demo0nlyCipherMesh",
      "Tok3nXYZ0123456789",
      "@github.com/acme/app.git",
    ),
  },
  {
    id: "legal",
    role: "Legal & Compliance",
    team: "People & Legal",
    label: "Summarise a Complaint",
    mistake: "Copies the employee’s SSN and email from the case file.",
    kind: "personal",
    text: "Summarise this HR complaint for outside counsel: employee John Carter (SSN 078-05-1120, john.carter@example.com) alleges unpaid overtime for Q2.",
  },
  {
    id: "security",
    role: "Security Engineer",
    team: "Engineering",
    label: "Decode a Session Token",
    mistake: "Pastes a live session token from a bug report.",
    kind: "secret",
    text: j(
      "A user keeps getting logged out. Decode this token and check the expiry: ",
      "eyJhbGciOiJIUzI1NiJ9",
      ".",
      "eyJzdWIiOiJ1c2VyXzQyIiwiZXhwIjoxNzYxNTAwMDAwfQ",
      ".",
      "Zm9vYmFyRGVtbzBubHlDaXBoZXJNZXNo",
    ),
  },
];

export const PENDING_EXAMPLE_KEY = "cm-pending-example";
export const RUN_EXAMPLE_EVENT = "ciphermesh:run-example";
