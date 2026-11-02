import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const sharedRequirements = [
  'permanentBackendConfirmed', 'legacyLedgerReconciled', 'realPhoneVerificationPassed',
  'realAccountRecoveryPassed', 'realBookingAndCompletionPassed',
  'stickerOrderingControlsVerified', 'privacyAndRewardTermsApproved',
  'reviewerAccessVerified', 'storeScreenshotsAndDeclarationsApproved'
];

export function releaseBlockers(approval, platform = 'all') {
  if (!['all', 'android', 'ios'].includes(platform)) throw new Error('Choose all, android, or ios.');
  const requirements = approval.requirements || {};
  const required = new Set([...sharedRequirements, ...Object.keys(requirements)]);
  if (platform === 'android') required.delete('signedIosBuildTested');
  else if (platform === 'ios') required.delete('signedAndroidBuildTested');
  else { required.add('signedIosBuildTested'); required.add('signedAndroidBuildTested'); }
  if (platform !== 'all') required.add(platform === 'android' ? 'signedAndroidBuildTested' : 'signedIosBuildTested');
  required.add('developerAccountsVerified');
  const blockers = [...required].filter(name => {
    if (name === 'developerAccountsVerified' && platform !== 'all') {
      const account = platform === 'android' ? 'google' : 'apple';
      return requirements[name] !== true && approval.evidence?.[account]?.organizationVerified !== true;
    }
    return requirements[name] !== true;
  });
  if (approval.ownerApprovedSubmission !== true) blockers.push('ownerApprovedSubmission');
  return blockers;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--platform' || !['all', 'android', 'ios'].includes(args[1]))) {
    console.error('Usage: npm run release:check -- --platform all|android|ios');
    process.exitCode = 2;
  } else {
    const platform = args[1] || 'all';
    const approval = JSON.parse(await readFile('docs/store-release-approval.json', 'utf8'));
    const blockers = releaseBlockers(approval, platform);
    if (blockers.length) {
      console.error(`Store submission (${platform}) is blocked. Required evidence or approval is missing:`);
      for (const item of blockers) console.error('- ' + item);
      process.exitCode = 1;
    } else console.log(`Recorded release gates (${platform}) are complete. Reconfirm store requirements and the exact signed builds before any submission.`);
  }
}
