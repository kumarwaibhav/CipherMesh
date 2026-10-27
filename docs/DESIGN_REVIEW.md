# Design review: CipherMesh web app (v2.2, glass build)

Reviewed against Apple's Human Interface Guidelines as design principles for a web app. Apple's platform conventions (menu bar, App Store rules) do not apply. The principles and foundations (accessibility, colour, typography, layout, materials, motion, writing) do. Platform: responsive web, desktop and phone. Framework: Next.js 14 + Tailwind. Audience: people at a company who are about to paste text into an AI tool, plus the reviewers and engineers who run the gateway. Artifact: running build, screenshots at 1280 px and 390 px in both appearances, and the source.

## Summary

The build is accessible and works end to end. Every text run passes 4.5:1 on the rendered glass, and axe reports 0 violations. Visually, though, it has no point of view. Every surface is frosted glass over four pastel colour blobs, so nothing reads as more important than anything else. Five teaching devices compete above the one text box that matters. Status colour is spent on tiles, chips, arrows and banners until it stops meaning anything.

**Thesis it should have:** a checkpoint that shows you, in place, exactly what leaves your company.
**What it is remembered by today:** nothing specific. It looks like the generic "aurora glass" template.

**Rating: Needs work.** No Critical findings. Six High findings.

## Improvements

### High: glass is applied to the content layer
- **What:** about 20 glass surfaces on the Check screen alone: the eyebrow pill, the welcome banner, the composer, the example chips, the verdict, the comparison, the reply, the details, the outcome tiles and the steps. They sit glass on glass, with no hierarchy.
- **Why:** `materials.md › Liquid Glass`: "Don't use Liquid Glass in the content layer… it can result in unnecessary complexity and a confusing visual hierarchy." And: "Use Liquid Glass effects sparingly… Limit these effects to the most important functional elements in your app."
- **Fix:** keep glass only on the functional layer: the sidebar, the toolbar, the phone tab bar, sheets and toasts. Content becomes solid surfaces (white on `#F5F5F7`, `#1C1C1E` on black) with hairline separators and an inset-grouped rhythm.

### High: the background is a template, not a material
- **What:** four saturated radial blobs (blue, violet, peach, mint) behind everything. They carry no meaning, and they tint the status colours that sit on top of them.
- **Why:** `color.md › Liquid Glass color`: "Avoid using similar colors in control labels if your app has a colorful background." `liquid-glass.md › Color on glass`: to express a brand through colour, "consider moving it into the content layer." Craft lens: a palette that arrives with no reason rooted in the product is a default.
- **Fix:** a near-neutral canvas (`#F5F5F7` light, `#000000` dark) with the product's own material: a faint hexagonal mesh lattice (the logo's geometry) and a single cool highlight. The glass then has something real to refract.

### High: the task sits below five teaching devices
- **What:** an eyebrow pill, a 48 px hero, a three-step stepper, a "New here?" banner, an examples header and a four-outcome legend all stand above or around the text box. On a 390 px phone the text box starts below the fold.
- **Why:** `layout.md › Visual hierarchy`: "Order content by relative importance." `design-principles.md › Simplicity`: "Include just what's necessary." `onboarding.md`: "Teach through interactivity" and "consider providing a collection of context-specific tips instead of a single onboarding flow."
- **Fix:** the page title, then the composer, then one quiet row of examples. Teaching happens through the examples and a placeholder that shows a real prompt. The tour moves behind Help, and the outcome legend becomes the result itself.

### High: the appearance switch lives in the navbar
- **What:** a three-way Light / Dark / Auto control takes space in the primary bar on every screen.
- **Why:** `dark-mode.md › Best practices`: "Avoid offering an app-specific appearance setting."
- **Fix (trade-off named):** follow the system by default. You asked for an explicit light/dark choice, so it stays, but only in Settings, under "Appearance: Automatic / Light / Dark". It is out of the primary bar.

### High: the colour budget is overspent
- **What:** blue primary buttons, and four status colours used on solid icon tiles, chip fills, coloured "next step" sentences, the stepper, the badges and the tile icons. A typical result screen has nine coloured elements.
- **Why:** `liquid-glass.md › Review checklist 4`: "One, at most two, tinted primary actions per view." `branding.md › Best practices`: "Minimize its use on controls and instead use it intentionally for primary actions or status indicators." `color.md`: "Avoid using the same color to mean different things."
- **Fix:** blue = action, and only one filled button per view. Status colour appears only on the status glyph, the status word and the redaction marks. Every sentence stays in label colours.

### High: the result does not show the product's one idea
- **What:** "You wrote" and "AI receives" sit in two equal grey wells, side by side. The moment a value is hidden, the reason the product exists, is invisible.
- **Why:** `design-principles.md › Delight`: "Create defining moments… Don't mistake delight for decoration."
- **Fix (signature):** a single document card with a segmented control (What you wrote / What the AI receives). When a result arrives, each private value is struck through by a redaction bar that sweeps across it, and the bar is then labelled ("Email hidden"). One orchestrated moment, tied to the product, turned off under Reduce Motion.

### Medium: typography has no scale
- **What:** 48 px hero, 34 px titles, and dozens of 13 px semibold labels; the weight carries everything.
- **Why:** `typography.md`: "Minimize the number of typefaces… a clear scale."
- **Fix:** SF Pro / Inter. Large title 34/40 bold for pages, title 22/28 semibold for the verdict, headline 17 semibold, body 15/22 (17 on phones), footnote 13. Mono only for the prompt text and IDs.

### Medium: B2B navigation should feel like a Mac app on desktop
- **What:** a floating pill nav works on a phone. On a 1440 px desktop, a security tool used all day wants a persistent sidebar.
- **Why:** `layout.md`: "Layout follows available space." The sidebar convention suits a desktop work tool.
- **Fix:** a translucent sidebar on wide screens (Check, Approvals with a badge, Activity, How it works), a toolbar with a scroll-edge effect, and an iOS tab bar on phones.

### Medium: Deny has no confirmation
- **What:** Deny discards a held prompt at once.
- **Why:** `alerts.md` / Lens 4: destructive, irreversible actions get a warning and a Cancel.
- **Fix:** an inline confirm ("Deny and discard this prompt?" with Cancel and Deny).

### Low: the logo is static and repeated
- **Why:** `branding.md`: "Resist the temptation to display your logo throughout your app."
- **Fix:** one mark, in the sidebar or top bar. It draws itself once on load, and its core breathes while a check is running, so the motion carries status. Reduce Motion gets a static mark.

## What works (keep)

- Plain-language verdicts with a concrete next step.
- Examples that run instantly. This is the best teaching device in the app (`onboarding.md › Teach through interactivity`).
- Highlighting the user's own text at the exact spans that were found.
- Technical detail folded away for engineers (progressive disclosure).
- Measured contrast in both appearances, full keyboard support, and reduced-transparency fallbacks.

## Token plan (implemented)

| Role | Light | Dark | Contrast |
|:--|:--|:--|:--|
| Canvas | `#F5F5F7` | `#000000` | — |
| Surface | `#FFFFFF` | `#1C1C1E` | — |
| Label | `#1D1D1F` | `#F5F5F7` | 16.8:1 / 16.0:1 |
| Secondary label | `#58585D` | `#AEAEB3` | 7.1:1 / 7.7:1 on surface |
| Tertiary label (placeholders) | `#626267` | `#A0A0A5` | 6.1:1 / 6.5:1 on surface |
| Accent (fill, white text) | `#0071E3` | `#0071E3` | 4.7:1 |
| Accent text | `#005EBE` | `#5CACFF` | 6.3:1 / 7.1:1 |
| Redaction bar | `#1D1D1F` | `#48484A` | label 16.8:1 / 8.4:1 |
| Destructive (badge, Deny) | `#D70015` | `#D70015` | 5.4:1 with white |
| Safe / Cleaned / Waiting / Blocked text | `#176A2E` `#9A4300` `#4B48C4` `#B0101A` | `#30D158` `#FF9F0A` `#7D7AFF` `#FF6961` | ≥ 5:1 on surface |

**Signature:** the redaction sweep. **Motion budget:** the logo drawing once, the sliding navigation indicator, and the redaction sweep. Nothing animates on frequent interactions beyond the system press feedback.

## Independent audit, round 2 (v2.3)

Three reviewers who had not seen the work being built tested the running app: functional QA (Playwright, every flow at 1440 and 390 px in both appearances), accessibility (axe-core plus a pixel sampler that measures each text run against the actual rendered background, because glass defeats axe's own contrast rule), and a HIG design critique. Everything below was fixed and re-tested.

| Area | Finding | Fix |
|:--|:--|:--|
| Interaction | Cancelling Deny left focus on Approve, so a second Enter approved the ticket | Separate keyed button groups; focus moves to Cancel on open and back to Deny… on close |
| Interaction | Approvals badge lagged up to 28 s | Badge refreshes the moment a check or decision is recorded |
| Interaction | Automatic appearance only followed the OS while Settings was open | System listener lives in the app shell |
| Interaction | Wrong reviewer key gave no feedback | "That key wasn’t accepted" alert |
| Accessibility | Focus ring 1.6–2.1:1; text box had none | Solid 2 px `accent-text` outline with offset; the composer card shows it when the text box is focused |
| Accessibility | Tabs ignored arrow keys | Roving tabindex with Arrow, Home and End; tabs and panels linked |
| Accessibility | Tab-bar labels 1.9–2.7:1 over busy content | Bars at 0.92/0.90 glass plus a scroll-edge fade; inactive labels at full label colour |
| Accessibility | Placeholders 2.6–3.4:1 | New tertiary label token (≥ 4.5:1 on every fill) |
| Accessibility | Results container announced 4,000+ characters | Short status line ("Cleaned. Private details hidden") |
| Accessibility | 40 px pills, 36 px select and segments on phones | 44 px on phones |
| Design | Signature swept over an empty placeholder | The real value shows for a beat; the bar covers exactly that value, then labels it |
| Design | Status colour spent four times per verdict; red logo core echoed Blocked | Stripe and uppercase eyebrow removed; logo core neutral, blue while checking; destructive red is one token |
| Design | Mobile composer: Check button weaker than the model menu | Compact menu left, Check right, on one row |
| Design | Templated stat hero and nine uppercase eyebrows | One summary sentence; sentence-weight section headers |
| Design | Mixed capitalisation, three names for one page, "we" | Title style for controls and headings, "How It Works" everywhere, no "we" |
| Design | Centred sheets and three ways out on phones | Bottom sheet with grabber and swipe-down; one way out |

After the fixes: axe reports no violations other than one example button partly under the tab bar at one scroll position; the pixel sampler measures 7,967 text runs and finds no failures in the sidebar, top bar, tab bar or sheets; the only near-misses are text passing under the deliberate scroll-edge fade at the bottom of a phone screen.
