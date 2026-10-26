# CipherMesh brand guidelines (internal)

Internal reference for anyone building CipherMesh material. Not shown in the product.

## Logo

- **Mark:** an open hexagon of six mesh nodes (every model) around a red core (the protected prompt), with one red path leaving through the open side (the inspected gate).
- **Files:** `mark-light-ink.svg` (dark backgrounds), `mark-dark-ink.svg` (light backgrounds), `mark-mono-black.svg`, `mark-mono-white.svg`, `app-icon.svg`.
- **Clear space:** two node-diameters on every side.
- **Minimum size:** 16 px for the simple mark (hexagon + core only), 120 px wide for a lockup.
- **Never** rotate the gate, stretch the mark, recolour the core, or place the red core on a red background (use the mono white mark).

## Product colour (Apple system colours, WCAG AA)

| Role | Meaning | Light text | Dark text | Fill |
|:--|:--|:--|:--|:--|
| Tint (actions) | Trust, "do this" | `#0058B0` | `#64AAFF` | `#0068D6` (white text 5.3:1) |
| Safe | Done, nothing private | `#176A2E` | `#30D158` | `#34C759` |
| Cleaned | Changed, caution | `#9A4300` | `#FFB340` | `#FF9500` |
| Waiting | Needs a person | `#4B48C4` | `#A5A3FF` | `#5856D6` |
| Blocked | Stopped | `#B0101A` | `#FF7870` | `#FF3B30` |

Text: label `#1D1D1F` / `#F5F5F7`, secondary `#48484D` / `#C7C7CC`, tertiary `#636369` / `#A2A2A8`.
Grounds: `#F2F2F7` (light) and `#000000` (dark) under soft colour fields, with frosted glass panels on top.

Brand red `#E5202A` is reserved for the logo core. In the product, red only ever means "stopped".

Every text pairing is measured against the real rendered glass (pixel sampling in both themes, desktop and phone): 0 runs below 4.5:1.

## Type

- Interface: SF Pro on Apple devices, Inter elsewhere.
- Machine output (IDs, hashes, traces, prompts): SF Mono, otherwise JetBrains Mono.

## Voice: the calm guard

- Precise, not technical. Calm, not alarming. Plain, not clever. Accountable, not vague.
- Say: check, hide, hold, stop, sent / not sent, reviewer, change the key.
- Avoid: military-grade, unhackable, 100% secure, AI magic, blaming the user.
- Results: "Safe to send" · "Private details hidden" · "Waiting for approval" · "Blocked. Nothing was sent."

## Brand check before shipping

1. Mark untouched, clear space kept.
2. Red appears only for the logo core and "Blocked".
3. Decision colours only on the four results, always with their word.
4. All text at 4.5:1 or better in both themes.
5. No real secrets, keys or personal data in examples.
6. No claims beyond what the system proves.
