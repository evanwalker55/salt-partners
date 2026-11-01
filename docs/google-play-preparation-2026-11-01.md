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

The live SMS test passed using the owner's expressly authorized mobile number. The owner received the Twilio Verify code; the app accepted it and displayed verified-phone onboarding, which survived a page refresh. No verification code is retained in files. The technician's company selection, profile creation, and a fresh-session recovery test are still pending. The original test to the business number was reported delivered by Twilio but was not visible in the owner's Housecall Pro inbox; it was not counted as successful.

The runtime dependency audit (`npm audit --omit=dev`) reports zero known vulnerabilities. The full development-tool audit reports four moderate findings through the Capacitor CLI's glob/rimraf/minimatch dependencies. They are not shipped in the app or server runtime. The suggested automatic fix is an incompatible Capacitor CLI downgrade, so it was not applied.

## Remaining release work

Keep the release as a draft and live booking paused until account recovery, controlled booking/completion, print artwork/QR attribution, privacy/reward operations, and native device behavior are verified. A simulator/sample test does not establish those checks. Apple enrollment is still processing; its iOS archive remains unsigned. `npm run release:check` reports the outstanding gates. Real mobile verification and browser session persistence have passed; the owner has been asked which company to use for the test profile.
