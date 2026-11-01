# Google Play preparation — November 1, 2026

Simply Salt Partners exists as a free English (US) app draft in the verified Simply Salt organization account. Package: `com.simplysalt.partners`. Developer account: `9078068141318477297`. App: `4976444591082636366`. No release has been submitted or published.

## Saved console declarations

- Business category; public support `evan@simplysalt.com`, `+13173421173`, `https://simplysalt.com`.
- No ads; no government affiliation; no health features; target audience 18 and over.
- Financial features: **Rewards, points, frequent flier miles, and other incentives**. Google required no additional financial documentation for this selection. The app records rewards and payout destinations; it does not transfer money.
- Restricted real accounts, with explicit public sample-workspace instructions for reviewers. The sample requires no SMS, invitation, login, payment, or location check. It creates no real deliveries, orders, or payouts.
- Privacy: `https://simply-salt-partner-demo.netlify.app/privacy.html`.
- Account deletion: `https://simply-salt-partner-demo.netlify.app/delete-account.html`.
- IARC agreement accepted only after the owner's explicit approval in this chat. Content answers disclose online company artwork and cash rewards, with no wagering, entrance fees, digital purchases, live location sharing, social exchange, or mature media. The questionnaire assigned ESRB Mature 17+ / Cash Rewards and various adult ratings elsewhere. Do not change truthful reward answers merely to obtain a lower rating. Reassess the questionnaire if app functionality changes.

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

## Remaining release work

Complete the main listing and upload a validated signed bundle built against the stable origin. Keep live booking paused until real phone authentication/recovery, controlled booking/completion, print artwork/QR attribution, privacy/reward operations, and native device behavior are verified. A simulator/sample test does not establish those checks. Apple enrollment is still processing; its iOS archive remains unsigned. `npm run release:check` reports the outstanding gates.
