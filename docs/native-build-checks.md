# Native build checks

The `Native build checks` GitHub Actions workflow compiles the existing native
projects on Linux/Android and macOS/Xcode 26. It runs on the launch-readiness
branch when native source or build inputs change, and supports manual dispatch.
The repository is public, so these standard hosted-runner jobs do not require
a paid build service. No signing credentials or backend secrets are uploaded.

Artifacts are retained for 14 days:

- Android: unsigned release AAB, a debug-signed installation APK, and lint report.
- iOS: unsigned device archive and compiler log.
- Native launch evidence: the installed Android app on an API 36 emulator and
  the iPhone app on an available iOS simulator, with first-launch screenshots.
  These checks open the public company gallery and never request a verification
  text, make a booking, or change production records.

These artifacts use the existing review API origin. They establish native
compilation, not production readiness, device-test completion, app signing,
or store submission. The iOS archive cannot be uploaded to App Store Connect
until it has been built/exported with the organization's signing identity.
The Android release bundle also requires the organization's upload signing key.

The owner authorized continuing both enrollments and preparing/uploading the
app for store review on October 30, 2026, with payment handled by the owner.
The technical completion fields in `store-release-approval.json` must still be
supported by actual evidence; authorization does not complete those checks.
