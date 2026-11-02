import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { releaseBlockers } from '../scripts/release-check.mjs';

const recorded = JSON.parse(await readFile(new URL('../docs/store-release-approval.json', import.meta.url), 'utf8'));
function readyGoogle() {
  return { ownerApprovedSubmission: true,
    requirements: { ...Object.fromEntries(Object.keys(recorded.requirements).map(key => [key, true])), developerAccountsVerified: false, signedIosBuildTested: false },
    evidence: { google: { organizationVerified: true }, apple: { status: 'processing' } } };
}

test('Google can be ready independently while Apple enrollment and signing remain pending', () => {
  const approval = readyGoogle();
  assert.deepEqual(releaseBlockers(approval, 'android'), []);
  assert.deepEqual(new Set(releaseBlockers(approval)), new Set(['developerAccountsVerified', 'signedIosBuildTested']));
  assert.deepEqual(new Set(releaseBlockers(approval, 'ios')), new Set(['developerAccountsVerified', 'signedIosBuildTested']));
});

test('platform choice cannot waive shared checks, Android signing, or owner authorization', () => {
  const approval = readyGoogle();
  approval.requirements.realBookingAndCompletionPassed = false;
  approval.requirements.signedAndroidBuildTested = false;
  approval.ownerApprovedSubmission = 'yes';
  assert.deepEqual(new Set(releaseBlockers(approval, 'android')), new Set(['realBookingAndCompletionPassed', 'signedAndroidBuildTested', 'ownerApprovedSubmission']));
  delete approval.requirements.privacyAndRewardTermsApproved;
  assert.ok(releaseBlockers(approval, 'android').includes('privacyAndRewardTermsApproved'));
});

test('unverified accounts, missing evidence, new gates, and invalid platforms fail closed', () => {
  const approval = readyGoogle();
  approval.evidence.google.organizationVerified = 'true';
  approval.requirements.futureReviewRequirement = false;
  assert.ok(releaseBlockers(approval, 'android').includes('developerAccountsVerified'));
  assert.ok(releaseBlockers(approval, 'android').includes('futureReviewRequirement'));
  assert.ok(releaseBlockers({}, 'android').includes('signedAndroidBuildTested'));
  assert.throws(() => releaseBlockers(approval, 'unknown'));
});
