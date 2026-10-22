# Review verification

Hosted review: https://partner-app-review--simply-salt-partner-demo.netlify.app

Netlify draft deploy: `6ada7444d619f10a3ef425a6`, project `5ed0cc76-d282-4f4a-b6bc-3a77b90d889b`.

- 26 automated tests pass. They cover verified sessions, company membership, invitation scope, recovery, role/CSRF protection, payout edits, server-owned attribution, duplicate and uncertain bookings, source notes, existing-customer matching, daylight-saving boundaries, delivery sync, payout recording, sticker design snapshots, request replay, and account deletion.
- Production dependencies have no reported audit vulnerabilities at verification time.
- Hosted configuration returns four companies, phone verification ready, live booking disabled, and no demo mode.
- Unauthenticated technician and owner APIs return 401. Hosted owner sign-in and overview succeeded using the existing operations hub password, logout succeeded, and access after logout returned 401. Private sessions/rate-limit data are omitted from the owner overview.
- Hosted record counts are four companies and zero technicians, referrals, or sticker requests. No test identities or bookings were inserted in the hosted database. Owner authentication initialized private storage and revoked its test session.
- Browser sandbox verified public gallery → company mockup → code entry → registration under the selected company → approval → direct return to the saved company → booking confirmation. The sandbox used fake verification and fake jobs.
- Four built-in ImageGen tank mockups were saved in `public/mockups/`, with prompts in `docs/image-prompts.json`.
- iOS and Android project generation and native asset sync succeeded. Native review assets target the draft backend above. The platform launcher icons and splash images use existing Simply Salt artwork. No signed IPA/AAB or real-device execution was produced on this Windows host.
- Public compiled assets do not contain the legacy public application key or provider/owner secret variable names. `.private`, provider credentials, native signing files, dependencies, and build output are ignored by Git.

No real SMS, Housecall Pro mutation, payment, customer communication, or printer order was made during these checks. Twilio Verify service configuration was created without sending a verification. Review sign-ins requested by a user are real phone verifications and use Twilio's service.

The old GitHub Pages app was not replaced. Its n8n API key returned 401; its admin endpoint returned 500. The legacy history cannot yet be reconciled from this session. The n8n sign-in page was opened for the owner. See `launch-readiness.md` before enabling partner bookings or submitting either mobile build.
