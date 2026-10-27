import type { ActionDecision, Finding, InspectResponse } from "./api";
import { providerLabel } from "./api";

/** Plain-language names for detector categories, so nobody has to read rule IDs. */
const CATEGORY_NAMES: Record<string, string> = {
  email: "Email address",
  phone_in: "Phone number",
  phone_intl: "Phone number",
  ipv4: "IP address",
  payment_card: "Card number",
  aadhaar: "Aadhaar number",
  pan: "PAN number",
  us_ssn: "Social Security number",
  internal_url: "Internal company link",
  custom_redaction: "Custom private term",
  private_key_header: "Private key",
  db_connection_string: "Database password",
  aws_access_key: "AWS access key",
  aws_key_assignment: "AWS access key",
  aws_secret_key: "AWS secret key",
  gcp_service_account_key: "Google Cloud key",
  azure_sas_signature: "Azure access signature",
  azure_storage_key: "Azure storage key",
  github_token: "GitHub token",
  llm_api_key: "AI service API key",
  slack_token: "Slack token",
  google_api_key: "Google API key",
  stripe_secret_key: "Stripe secret key",
  jwt_token: "Login token (JWT)",
  generic_api_token: "API key",
  password_assignment: "Password",
};

export function categoryName(category: string): string {
  const known = CATEGORY_NAMES[category];
  if (known) return known;
  const words = category.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Sensitive value";
}

export type FindingKind = "secret" | "personal" | "internal";

export function findingKind(f: Pick<Finding, "severity" | "category">): FindingKind {
  const sev = f.severity.toUpperCase();
  if (sev === "CRITICAL" || sev === "SECRET" || sev === "HIGH") return "secret";
  if (sev === "CONFIDENTIAL" || f.category === "internal_url") return "internal";
  return "personal";
}

export const KIND_LABEL: Record<FindingKind, string> = {
  secret: "Secret",
  personal: "Personal data",
  internal: "Internal",
};

export const KIND_DECISION: Record<FindingKind, ActionDecision> = {
  secret: "BLOCK",
  personal: "REDACT",
  internal: "REVIEW",
};

/** Unique friendly names, in the order they appear in the text. */
export function foundNames(findings: Finding[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const f of [...findings].sort((a, b) => a.start - b.start)) {
    const n = categoryName(f.category);
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

const PROPER = /^(Aadhaar|PAN|AWS|Azure|Google|GitHub|Slack|Stripe|AI|API|IP|Social|Login)\b/;

/** Lower-cases common nouns for use mid-sentence; keeps names and acronyms ("Aadhaar", "IP"). */
function midSentence(s: string): string {
  return PROPER.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1);
}

export function listToText(items: string[]): string {
  const lower = items.map(midSentence);
  if (lower.length <= 1) return lower[0] ?? "";
  return `${lower.slice(0, -1).join(", ")} and ${lower[lower.length - 1]}`;
}

export interface VerdictCopy {
  /** Decision whose colour the card takes. */
  tone: ActionDecision;
  headline: string;
  body: string;
  next: string;
  /** Whether the AI received anything. */
  sent: boolean;
}

/** What happened, in one sentence a non-expert can act on. */
export function verdictCopy(result: InspectResponse): VerdictCopy {
  const names = foundNames(Array.isArray(result.findings) ? result.findings : []);
  const count = names.length;
  const provider = providerLabel(result.routed_provider);
  const what = listToText(names);

  switch (result.status) {
    case "DENIED":
      return {
        tone: "BLOCK",
        headline: "Denied. Nothing was sent.",
        body: "A reviewer decided this text should not go to any AI model.",
        next: "Remove the internal details and check it again if you still need an answer.",
        sent: false,
      };
    case "NO_ROUTE":
      return {
        tone: "REVIEW",
        headline: "No AI model could take this",
        body: "None of the available models met the privacy rules for this text, so nothing was sent.",
        next: "Try choosing “Best Match” or the private local model.",
        sent: false,
      };
    case "PROVIDER_FAILED":
      return {
        tone: "REDACT",
        headline: "The AI model didn’t answer",
        body: `Your text was checked and was safe to send, but ${provider} did not reply.`,
        next: "Try again in a moment.",
        sent: true,
      };
    case "RESPONSE_BLOCKED":
      return {
        tone: "REDACT",
        headline: "The reply was held back",
        body: "The AI answered, but its reply contained sensitive data, so CipherMesh hid it from you.",
        next: "Ask the question again without the private details.",
        sent: true,
      };
    default:
      break;
  }

  switch (result.action_decision) {
    case "ALLOW":
      return {
        tone: "ALLOW",
        headline: "Safe to send",
        body: `Nothing private was found. Your text went to ${provider} exactly as you wrote it.`,
        next: "You can read the AI’s reply below, or check another prompt.",
        sent: true,
      };
    case "REDACT":
      return {
        tone: "REDACT",
        headline: "Private details hidden",
        body: `${count === 1 ? "1 item" : `${count} items`} hidden${what ? ` (${what})` : ""}. Only the cleaned text went to ${provider}.`,
        next: "Compare your text with what the AI received below. Copy the cleaned text if you want to reuse it.",
        sent: true,
      };
    case "REVIEW":
      if (result.status === "COMPLETED") {
        return {
          tone: "ALLOW",
          headline: "Approved and sent privately",
          body: "A reviewer approved this text. It went only to the private local model, never to an outside cloud.",
          next: "The reply is below.",
          sent: true,
        };
      }
      if (result.status === "BLOCKED") {
        return {
          tone: "BLOCK",
          headline: "Blocked on a second check",
          body: "The text was approved, but a final check found something that must not leave. Nothing was sent.",
          next: "Remove the flagged details and check it again.",
          sent: false,
        };
      }
      return {
        tone: "REVIEW",
        headline: "Waiting for approval",
        body: `It mentions ${what || "something internal"}, so a person must approve it first. Nothing has been sent yet.`,
        next: "Open Approvals to approve or deny it. Approved text goes only to the private local model.",
        sent: false,
      };
    case "BLOCK":
    default:
      return {
        tone: "BLOCK",
        headline: "Blocked. Nothing was sent.",
        body: `It contains a secret${what ? ` (${what})` : ""}. Secrets must never be pasted into AI tools.`,
        next: "Change that secret now, because it may already be exposed, then remove it from your text.",
        sent: false,
      };
  }
}
