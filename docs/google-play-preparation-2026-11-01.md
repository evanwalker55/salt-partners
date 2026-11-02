# Google Play preparation — November 1, 2026

Simply Salt Partners exists as a free English (US) app draft in the verified Simply Salt organization account. Package: `com.simplysalt.partners`. Developer account: `9078068141318477297`. App: `4976444591082636366`. No release has been submitted or published.

## Saved console declarations

- Business category; public support `evan@simplysalt.com`, `+13173421173`, `https://simplysalt.com`.
- No ads; no government affiliation; no health features; target audience 18 and over.
- Advertising ID: **No**. Confirmed against the merged manifest dumped from the signed release bundle; no `AD_ID` permission is present. This resolves Google's initially incomplete declaration warning.
- Financial features: **Rewards, points, frequent flier miles, and other incentives**. Google required no additional financial documentation for this selection. The app records rewards and payout destinations; it does not transfer money.
- Restricted real accounts, with explicit public sample-workspace instructions for reviewers. The sample requires no SMS, invitation, login, payment, or location check. It creates no real deliveries, orders, or payouts.
- Privacy: `https://simply-salt-partner-demo.netlify.app/privacy.html`.
- Account deletion: `https://simply-salt-partner-demo.netlify.app/delete-account.html`.
- IARC agreement accepted only after the owner's explicit approval in this chat. Content answers disclose online company artwork and cash rewards, with no wagering, entrance fees, digital purchases, live location sharing, social exchange, or mature media. The questionnaire assigned ESRB Mature 17+ / Cash Rewards and various adult ratings elsewhere. Do not change truthful reward answers merely to obtain a lower rating. Reassess the questionnaire if app functionality changes.
- Main store listing saved, with the existing icon, original feature graphic, and four unchanged 1080×1920 native screenshots: sample dashboard, public gallery, sample account, and referral rewards. The feature graphic is labeled as created with AI assistance; the original logo and actual screenshot captures were not edited with AI. No app has been sent for review.

## Data safety source mapping

Source: `public/privacy.html`, `server/api.mjs`, `server/providers.mjs`, `server/state.mjs`, `public/app.js`, and native project permissions. Store preview saved pending review, not sent for review.

| Data type | Required for real account? | Purpose |
| --- | --- | --- |
| Name | Yes | App functionality, account management |
| Email address | No | App functionality (optional customer email/payout destination) |
| User IDs | Yes | App functionality, account management, fraud/security/compliance |
| Address | No | App functionality (delivery and sticker-request features) |
| Phone number | Yes | App functionality, account management, fraud/security/compliance |
| Other personal info | Yes | App functionality, account management (company membership) |
| User payment info | No | App functionality (chosen payout destination) |
| Purchase history | No | App functionality (requested deliveries and fulfillment) |
| Other financial info | No | App functionality (referral rewards and recorded payouts) |
| App interactions | Yes | App functionality, account management, fraud/security/compliance (operational audit events) |
| Other user-generated content | No | App functionality (delivery and fulfillment instructions) |
| Device or other IDs | Yes | App functionality, account management, fraud/security/compliance (session and rate-limit identifiers) |

These records are collected, not ephemeral. All app API/provider transport uses HTTPS. No camera, microphone, contacts, or device location permission is requested. There is no advertising or analytics SDK. Public sample data stays in memory on the device and is excluded from real record collection.

The preview's **no data shared** wording uses Google's defined service-provider and expected user-initiated transfer exceptions. It does **not** mean no data leaves the device. Netlify hosts records, Twilio verifies phones, Railway hosts scheduling automation, Housecall Pro processes deliveries, and user-selected payment/fulfillment services receive the information needed to perform requested work. Recheck these answers before launch if providers, independent data uses, or operational practices change. See [Google's Data safety definitions](https://support.google.com/googleplay/android-developer/answer/10787469).

## Assets and build evidence

`docs/google-play-assets.mjs` generates the original 1024×500 RGB feature graphic and copies the existing 512×512 icon without changing it. Outputs and actual native screenshots are kept in the ignored private preparation folder. Browser audit images are not used as native store screenshots.

Android API 36 release compilation, lint, and public sample-workspace instrumentation passed for commit `77cf59d` in [run 41351918325](https://github.com/evanwalker55/salt-partners/actions/runs/41351918325). Screenshots are collected through Android's test-output storage so Gradle preserves them before uninstalling the test app. A later visual-state synchronization change improves screenshot timing. Capture and inspect the final images before uploading them.

The complete Android and iOS workflow passed for `d8af9c0` in [run 41352677603](https://github.com/evanwalker55/salt-partners/actions/runs/41352677603). This version includes the Railway scheduling-provider privacy disclosure and stable API origin. The Android bundle was signed locally with the existing private upload key; JAR signature verification and bundletool validation passed. SHA-256: `2f403dfd21a330c4ad9c0e8ca35ab64e836866eb150837c41ee20b0ed04f4a53`. Google accepted version 1.0 (code 1) into release draft 1 on its production track; future replacement bundles must use a new version code if Google rejects reuse. The private key and passwords were not uploaded.

Visual QA excluded the automated booking-screen PNG because its captured frame still showed the preceding dashboard despite the DOM navigation assertion passing. It is not used in the listing. Native real-phone booking behavior still requires direct verification; a passing instrumentation result is not a substitute for that check. The four uploaded screens were inspected directly.

The updated web policy is live in Netlify deploy `6ae7b0a6f1bd3d7b7fcb788a`; the policy returned HTTP 200 and includes Railway. The production config still reports `bookingEnabled=false` and `verificationReady=true`.

Production-track availability is targeted to **United States** only. The release review has no blocking validation errors; the remaining missing-deobfuscation-file warning does not apply to this non-minified build. Saving the release added it to **Changes not yet submitted for review**. Google's quick checks started automatically; the **Submit changes for review** action was not clicked. Catalog access preferences remain at Google's default and should be reviewed before publication.

Google's automated quick checks have since completed. Publishing overview states: **Your changes can now be sent for review.** This is eligibility to submit, not app-review approval. The submit action remains untouched.

The live SMS test passed using the owner's expressly authorized mobile number. The owner received the Twilio Verify code; the app accepted it and displayed verified-phone onboarding, which survived a page refresh. The owner selected Simply Water, and profile creation succeeded. After signing out and opening Prime's public company card, a fresh SMS verification returned the technician directly to the original Simply Water account. No verification code is retained in files. The store contains exactly one technician, zero referrals, and zero sticker orders; membership remains pending without an invitation, and live booking remains paused. The original test to the business number was reported delivered by Twilio but was not visible in the owner's Housecall Pro inbox; it was not counted as successful.

The authenticated HCP company endpoint returned Simply Salt and matched the configured company ID. A separate sticker audit found the existing Simply Water `sticker-v3.png` shares its QR URL with the original Summers sticker (`https://hovqr.co/b8e0a2ac`, currently Housecall Pro `attr=5472`). The QR scans and its booking page works, but it cannot distinguish these two company stickers by QR alone. No artwork was uploaded or approved. A dedicated Simply Water tracking link and print approval remain required.

The runtime dependency audit (`npm audit --omit=dev`) reports zero known vulnerabilities. The full development-tool audit reports four moderate findings through the Capacitor CLI's glob/rimraf/minimatch dependencies. They are not shipped in the app or server runtime. The suggested automatic fix is an incompatible Capacitor CLI downgrade, so it was not applied.

## Remaining release work

The internal-testing release `1.0 (1) - private Android test` reuses uploaded version 1.0 (code 1), track `4701464908151065210`, and was published privately on November 1 at approximately 11:44 p.m. Eastern. Google reports Available to internal testers and Not reviewed. Production's ten pending changes remain unsubmitted. The pre-launch report has no device results available yet. SDK/emulator tools were installed locally and a signed universal APK was generated from the uploaded AAB, but installation was attempted while Android was still booting and failed. No signed Android runtime check passed. The owner then requested browser-only controls; the emulator was closed. Do not equate mobile browser sizing with Android execution.

The internal track has the owner-only email list Simply Salt owner testing, containing the existing business Google account. No external tester was invited or messaged. Opt-in URL: `https://play.google.com/apps/internaltest/4701464908151065210`. The list was imported using Google's two-step CSV upload, not desktop cursor control.

The owner authorized a Test Tester live HCP booking with fictional details. The deployed d8af9c0 booking handler and providers were exercised through an isolated memory ledger, leaving production data and booking gates unchanged. HCP created job `job_719b0fc1ee3a4d2190f480b82121b2d2` (#1144), accepted company/technician/referral notes, and returned the correct Indianapolis schedule instant. The initial schedule was removed. After the owner signed into HCP, browser DOM controls marked this zero-dollar job finished with Notify customer off. Live API readback returned complete unrated; the deployed completion-sync code credited exactly 2500 cents in the restored isolated QA ledger. Repeated synchronization did not duplicate the reward, and replaying the original request returned the same job without a provider write. Undo Finish restored needs scheduling; another live sync moved the reward back to pending, with earned and paid totals both zero. Readback confirmed no schedule or employee assignments. The zero-dollar test job/customer remain labeled TEST ONLY - DO NOT DISPATCH. No production referral or payout was created. A first harness compared equivalent timestamp strings (`Z` versus `.000Z`); instant comparison subsequently passed without another job. The owner's authorized service address returned five scheduling options; fictional input also returned ZIP-based options, so this is not proof of exact-address validation. Completion proof: `outputs/google-play-preparation-2026-11-01/hcp-test-job-completed.png`.

Browser-only sandbox testing used clean d8af9c0 at 390 x 844. It verified uninvited membership gating, owner approval, booking, simulated completion and $25 technician credit, dummy payout setup and simulated reconciliation, free sticker requests and owner fulfillment, dynamically adding a company, saved-company recovery from another company's entry page, company pause/reactivation, and owner export. The export contained five companies, one technician, one referral and one sticker order; session tokens were excluded. All of these records were local fixtures. No live completion, payment, shipment, or SMS occurred in this sandbox. Screenshot: `outputs/google-play-preparation-2026-11-01/browser-qa-completed-ledger.png`. Mobile full-page screenshots rendered incorrectly in the browser capture tool, so the verified evidence uses a normal viewport capture; the live mobile page itself rendered correctly.

The production reviewer entry was exercised from the signed-out gallery on November 1: Explore sample workspace required no phone code or account, a sample booking reached confirmation, and a sample 50-sticker request showed $0 due. Exiting restored the public gallery. The production store was checked afterward: one technician, zero referrals, zero sticker requests, booking paused. Screenshot: `outputs/google-play-preparation-2026-11-01/reviewer-sample-sticker-test.png`. This clears reviewer-access evidence without establishing signed Android real-account or provider-booking behavior. The owner was asked for an Android tester account and explicitly authorized live-booking details before those tests proceed.

Keep production unsubmitted and live booking paused until the remaining privacy/reward business-rule confirmation and signed Android runtime checks pass. The live HCP booking/completion integration, reviewer access, browser lifecycle checks, ordering controls, and technical listing/declaration review now have evidence. Per-company print/QR approval remains required when the owner uploads manual artwork; deferred artwork is not a global submission blocker. The independent Android checker (`npm run release:check -- --platform android`) reports the remaining two gates. Apple enrollment is still processing and its archive remains unsigned; Apple does not block the independent Google check. The private internal test is published for testing, not publicly launched or app-review approved.
