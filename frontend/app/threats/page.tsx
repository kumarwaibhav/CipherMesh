import type { Metadata } from "next";
import { PageHero, SiteSection, TextLink } from "../components/site";
import { ThreatDashboard } from "../components/ThreatDashboard";
import { focusRing } from "../components/ui";
import { FURTHER_INTEL, INCIDENTS, VERIFIED_THROUGH } from "@/lib/threats";

export const metadata: Metadata = {
  title: "AI Threat Intelligence",
  description: "Documented AI security incidents from 2023 to today: data leakage into AI, prompt injection, exposed AI platforms, poisoned supply chains and agents acting out of scope.",
};

export default function ThreatsPage() {
  return (
    <main>
      <PageHero
        kicker="Threat Intelligence"
        title="The AI threat landscape, documented."
        lead={`${INCIDENTS.length} AI-specific security incidents from 2023 to ${VERIFIED_THROUGH}, each dated, attributed and linked to its source, plus a live feed of new reports. Filter by vector, year or severity to see where the prompt itself is the attack surface.`}
      />
      <ThreatDashboard />
      <SiteSection
        id="further"
        kicker="Further Intelligence"
        title="Where we look, and where you can too."
        lead="These public trackers go deeper on specific slices of AI risk. Our dataset is a curated, security-focused subset; figures are quoted as each source reported them."
      >
        <ul className="grid gap-3 sm:grid-cols-2">
          {FURTHER_INTEL.map((f) => (
            <li key={f.url}>
              <a href={f.url} target="_blank" rel="noopener noreferrer" className={`surface block h-full rounded-3xl p-6 transition-transform duration-200 hover:-translate-y-0.5 ${focusRing}`}>
                <span className="text-[17px] font-semibold text-label">{f.name}</span>
                <span className="mt-1 block text-[15px] leading-relaxed text-label-2">{f.blurb}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-[720px] text-[13px] leading-relaxed text-label-2">
          Method: incidents are included when a public, attributable source describes a security failure that involves an AI model, agent or AI platform.
          General cyber-attack maps (DDoS, malware telemetry) are deliberately excluded. “CipherMesh acts” is our own assessment of whether a prompt
          checkpoint would have prevented, limited or partly addressed the incident.
        </p>
        <p className="mt-6">
          <TextLink href="/check">Check a prompt now</TextLink>
        </p>
      </SiteSection>
    </main>
  );
}
