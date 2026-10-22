# Salt Partners

The Simply Salt partner app for plumbing, water treatment, and home-service technicians. The existing GitHub Pages alpha remains at https://evanwalker55.github.io/salt-partners/. This branch contains its next version, a Netlify-backed web app plus Capacitor iOS and Android projects. The original root HTML files are retained as legacy source; **publish only `dist/`**, never the repository root.

## Behavior

- Anyone can browse the company gallery. A company opens a branded sign-in page with its generated tank/sticker mockup.
- Phone verification creates or recovers an account. New registrations join the selected company. Invitations activate company membership; other registrations wait for owner approval. Returning accounts use their saved company, regardless of the link opened.
- Venmo, Zelle, and Apple Cash recipient details are collected from the individual technician. These are manual payout destinations, not linked bank accounts or automatic payment rails. Changes require a recent phone verification.
- Bookings use server-owned company and technician attribution, integer-cent reward amounts, durable request claims, and a Housecall Pro job ID. The claim is saved before any external write. Unknown outcomes require review and are never automatically retried. Existing exact phone/address matches reuse their HCP customer record; ambiguity requires owner review.
- Delivery status checks run in rotating bounded batches. Only completed HCP jobs become earned rewards; payout recording rechecks completion. An owner records an external payment reference after sending it. The app never transfers funds.
- Approved sticker requests preserve the design version, quantity, shipping information, $0 total, and fulfillment history. The owner uploads approved print artwork separately from illustrative AI mockups.
- Individual account access is stored in random, hashed server sessions and HttpOnly secure cookies. No public app credential, technician token, owner secret, or private customer data is included in the new frontend. Owner login uses a separate cookie and role.
- Account deletion revokes all technician sessions and removes active profile details. Limited outstanding-service/payment information is retained for reconciliation; paid accounting records remain an owner responsibility. The public web deletion page works without reinstalling the mobile app.

## Storage

Netlify Blobs store `salt-partners-v2`. A single state document uses ETag compare-and-set transactions for companies, memberships, sessions, invitations, referrals, requests, payment records, and audit entries. Print designs and gallery images are separate private blobs. Only explicitly assigned company photos/logos have public media access. Draft and production deploys on the same Netlify project share this site store; do not put demo or test accounts there. The local sandbox uses memory only.

Current Netlify target: `simply-salt-partner-demo`, ID `5ed0cc76-d282-4f4a-b6bc-3a77b90d889b`. Review deployments are drafts. The original GitHub Pages app has not been replaced.

Current review: https://partner-app-review--simply-salt-partner-demo.netlify.app. Verification evidence is recorded in `docs/verification-2026-10-22.md`.

## Local development

```powershell
npm ci
npm test
npm run build
npm run dev
```

Open http://localhost:4391. This loopback-only sandbox has fake SMS, fake HCP jobs, and memory storage. Code: `123456`. Owner password: `preview-owner`. The sandbox does not read provider credentials. Production functions do not contain a demo-code branch. Delete or restart the sandbox to discard sample records.

## Deployment

Set the server variables from `.env.example` in Netlify. The prepared review environment has phone verification configured and **live HCP booking disabled**. No real verification texts, HCP bookings, rewards, or print orders were triggered by implementation/testing.

```powershell
npm test
netlify deploy --context deploy-preview --json
```

This creates a draft; use its returned deploy URL to review. Owner login uses the operations hub password hash copied at setup time. Rotating the hub password later does not automatically update this app's owner password. Never copy `.private`, environment files, provider credentials, test fixtures, or the source root into static hosting.

## Native projects

`android/` and `ios/` are real Capacitor platform projects. They bundle the app locally and call the configured HTTPS backend; there is no remote website URL in Capacitor's server configuration. The app integrates native sharing, back navigation, app-resume refresh, and confirmation haptics. No camera, contacts, microphone, or location access is requested.

```powershell
$env:SALT_NATIVE_API_ORIGIN = 'https://APPROVED-BACKEND-ORIGIN'
npm run native:sync
```

Native sync requires an explicit HTTPS API origin. Build Android with a configured JDK/Android SDK and release signing. Build iOS on a Mac with Xcode and the owner's Apple signing account. Generated projects alone are not signed apps. Device tests must check cookie/session persistence, SMS verification, account recovery, sharing, navigation, keyboard layouts, and deletion. App Store and Play Console submissions remain outstanding; see `docs/launch-readiness.md`.

## Assets

Generated illustrative mockups are saved in `public/mockups/`. Exact prompts and reference roles are recorded in `docs/image-prompts.json`; built-in ImageGen was used. They are visual previews, not approved print artwork. In particular, an image-generated QR pattern is not a production referral QR code. Verify every real sticker's QR destination, offer, phone number, and attribution before printing or approving it.

## Legacy migration blocker

On October 22, 2026, the saved n8n API key returned 401 and the old partner-admin overview returned 500. No legacy table records were changed. New bookings stay paused until the legacy technicians, referrals, status events, and paid rewards are exported and reconciled. Never infer historical payments from HCP completion alone, delete the original ledger, or silently move users to an empty earnings history.

Legacy tables: `partner_techs`, `partner_referrals`, `partner_ref_events`. Preserve stable HCP job IDs and the latest status event per job. Import verified phone ownership by recovery sign-in, not by copying old public browser credentials. Review test records separately. Keep a private original export, reconciliation counts, paid totals, and a per-job mapping before switching links.
