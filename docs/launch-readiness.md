# Launch readiness — updated November 1, 2026

The October 23 audit and fixes are recorded in `store-audit-2026-10-23.html`. On October 30 the owner authorized continuing enrollment and preparing/uploading the app for store review, with payment handled by the owner. Run `npm run release:check` to list evidence still required; authorization does not complete the technical and account-verification checks.

Google organization verification is complete. Simply Salt Partners has been created as a free app draft (`com.simplysalt.partners`), with its listing and content declarations saved pending review. The latest Android/iOS build check passed: https://github.com/evanwalker55/salt-partners/actions/runs/41352677603 (`d8af9c0`). The signed Android 1.0 (1) bundle has been accepted into a production-track draft; it has not been submitted or published. Apple organization enrollment is still processing. Detailed console preparation is recorded in `google-play-preparation-2026-11-01.md`.

## Implemented

Public company gallery; company-specific generated tank mockups; verified phone sign-in; recoverable accounts; remembered company membership; owner invitations/approval; individual technician payout destinations; server-authoritative referral attribution; duplicate-submit protection; HCP completion checks; manual payment records; approved-version free sticker requests; owner fulfillment management; server-side deletion; web deletion page; iOS and Android platform projects.

## Required before handing this to partners

1. Legacy reconciliation is satisfied by the owner's November 1 confirmation that the original alpha contained demos/tests only, with no real bookings, earned rewards, or payouts. The new store contained no technicians, referrals, or sticker requests. A guarded update recorded this confirmation without deleting old data; live booking remains paused.
2. Complete a real phone-verification and account-recovery check using the owner's number. No real SMS was sent during development. Confirm Twilio service budget, branding, geographic permissions, and production delivery behavior.
3. Approve real print artwork for each company. The AI tank images are illustrative only. Decode the original artwork's QR, confirm the destination and offer, and preserve a company/technician source identifier through the customer booking flow. The current implementation attributes authenticated technician bookings; it does not retrofit attribution into an external website reached by an old printed QR.
4. Review the privacy/retention wording and the operational process for settling outstanding rewards and erasing retained data. The code provides deletion controls, but privacy declarations must describe actual practice across Netlify, Twilio, HCP, payment services, and fulfillment providers.
5. Verify HCP credentials belong to the intended Simply Salt company. Test route availability and daylight-saving dates. Use an explicitly authorized controlled real booking and reconcile its effects; no production test booking was made in this task. Confirm the desired policy on repeat customers and rewards; this version preserves $25 per completed referred job from the alpha.
6. Verify owner exports, access controls, storage recovery, unpaid reward reconciliation, paused companies, invitation revocation, and a failed/uncertain booking. Resolve uncertain HCP outcomes by the embedded referral reference before any retry.
7. The stable app/API origin is now `https://simply-salt-partner-demo.netlify.app`, with privacy, support, and account-deletion pages available publicly. The native workflow uses that origin. The old GitHub Pages alpha remains untouched while real launch checks are pending. Remove the old public app credential from n8n booking authorization after cutover, preserving legitimate integrations. The new server already uses its own private availability credential. Deployment is for review, not the partner launch.

## iOS and Android release work

- The verified Google organization owns the new app draft and accepted package `com.simplysalt.partners`. Apple organization enrollment is processing; registration/signing on Apple remains pending.
- Android release compilation and lint passed on GitHub's Linux runner; an iOS device archive compiled on its Xcode 26 Mac runner. Both installed apps opened the public company gallery on simulators. Evidence: https://github.com/evanwalker55/salt-partners/actions/runs/41118505736 (source revision `8d10b74`).
- An Android upload key was generated and retained privately on the owner's computer. The release AAB was signed locally, its JAR signature verified, and Google bundletool 1.18.3 validation passed. No signing key or password was uploaded to GitHub.
- The iOS archive is unsigned. Finish Apple organization enrollment, establish the team's signing identity, then archive/export the store build. Build and signing preparation do not establish real-device testing or successful production authentication.
- Native first-launch screenshots were inspected for Android API 36 and the iPhone simulator. They exposed a startup crash caused by accessing an owner link omitted from native packaging; that crash is fixed and covered by a regression test. The earlier signed candidate was marked invalid and replaced with the `8d10b74` bundle. Keep real-phone verification, booking, account recovery, native sharing, and deletion evidence separate from simulator startup checks.
- Validate native cookie persistence and cross-origin network behavior with the final HTTPS backend. Ensure no development URL, sample account, debug code, or test fixture is bundled.
- Prepare accurate screenshots, descriptions, support/privacy URLs, age/content ratings, and Apple App Privacy/Google Data safety disclosures. Include names, phones, service/shipping addresses, payout identifiers, and app activity as applicable. Do not claim no data collection.
- Give reviewers a working account and sample QR if applicable. Reviewers must be able to inspect the actual functionality without contacting the owner for every action. Do not add a hidden review-only authentication bypass.
- Consider Apple's unlisted distribution for partner technicians. It is still subject to App Review, and an unlisted URL is not an access-control mechanism.
- If Google Play uses a personal developer account created after November 13, 2023, account-specific closed-testing requirements may apply (currently at least 12 continuously opted-in testers for 14 days before applying for production access).

## Policy references checked

- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ — useful, complete functionality; template/spam rules; privacy; in-app account deletion; reviewer access.
- Apple unlisted distribution: https://developer.apple.com/support/unlisted-app-distribution/ — partner sales tools are an example of suitable limited-audience apps.
- Google functionality: https://support.google.com/googleplay/android-developer/answer/9898783
- Google account deletion: https://support.google.com/googleplay/android-developer/answer/13327111 — an in-app route and external web deletion resource.
- Google testing: https://support.google.com/googleplay/android-developer/answer/14151465
- Google payments: https://support.google.com/googleplay/android-developer/answer/9858738 — physical goods and services are outside Play Billing. Free sticker requests have no payment checkout.
- Capacitor privacy manifests: https://capacitorjs.com/docs/ios/privacy-manifest — inspect the final installed SDKs and plugins before submission.

AI assistance is not itself a published blanket ban. Acceptance depends on the submitted app and review. No store acceptance is promised or recorded here.
