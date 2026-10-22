# Launch readiness — October 22, 2026

## Implemented

Public company gallery; company-specific generated tank mockups; verified phone sign-in; recoverable accounts; remembered company membership; owner invitations/approval; individual technician payout destinations; server-authoritative referral attribution; duplicate-submit protection; HCP completion checks; manual payment records; approved-version free sticker requests; owner fulfillment management; server-side deletion; web deletion page; iOS and Android platform projects.

## Required before handing this to partners

1. Export and reconcile the old n8n technician/referral/event tables. Current API access is expired. Existing paid/earned totals must match, and old records must not disappear when users sign in to the new app.
2. Complete a real phone-verification and account-recovery check using the owner's number. No real SMS was sent during development. Confirm Twilio service budget, branding, geographic permissions, and production delivery behavior.
3. Approve real print artwork for each company. The AI tank images are illustrative only. Decode the original artwork's QR, confirm the destination and offer, and preserve a company/technician source identifier through the customer booking flow. The current implementation attributes authenticated technician bookings; it does not retrofit attribution into an external website reached by an old printed QR.
4. Review the privacy/retention wording and the operational process for settling outstanding rewards and erasing retained data. The code provides deletion controls, but privacy declarations must describe actual practice across Netlify, Twilio, HCP, payment services, and fulfillment providers.
5. Verify HCP credentials belong to the intended Simply Salt company. Test route availability and daylight-saving dates. Use an explicitly authorized controlled real booking and reconcile its effects; no production test booking was made in this task. Confirm the desired policy on repeat customers and rewards; this version preserves $25 per completed referred job from the alpha.
6. Verify owner exports, access controls, storage recovery, unpaid reward reconciliation, paused companies, invitation revocation, and a failed/uncertain booking. Resolve uncertain HCP outcomes by the embedded referral reference before any retry.
7. Select the final app/API address and deployment. Switch the GitHub Pages entry point only after the original ledger is reconciled. Remove the old public app credential from n8n booking authorization after cutover, and give the new server its own private availability credential. Preserve legitimate partner-to-partner API integrations and keys. A draft deploy is for review, not the partner launch.

## iOS and Android release work

- Confirm Simply Salt owns the Apple Developer and Google Play developer accounts and final application IDs. The prepared ID is `com.simplysalt.partners`; registration availability has not been checked.
- Build, sign, and test on real iPhone and Android devices. Current host did not provide Xcode or a configured Java/Android build toolchain. Native projects were generated; no signed IPA/AAB was built.
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
