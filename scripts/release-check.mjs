import { readFile } from 'node:fs/promises';

const approval = JSON.parse(await readFile('docs/store-release-approval.json', 'utf8'));
const blockers = Object.entries(approval.requirements).filter(([, passed]) => passed !== true).map(([name]) => name);
if (!approval.ownerApprovedSubmission) blockers.push('ownerApprovedSubmission');
if (blockers.length) {
  console.error('Store submission is blocked. Required evidence or approval is missing:');
  for (const item of blockers) console.error('- ' + item);
  process.exitCode = 1;
} else console.log('Recorded release gates are complete. Reconfirm store requirements and the exact signed builds before any submission.');
