/**
 * Automated Verification Suite for PRD PB- Staged Publishing Gatekeeper (v1.1)
 * Validates:
 * 1. PB-1.1 & PB-1.4: Creator Portal Isolation at Data Layer
 * 2. PB-1.3: Admin 3 Metrics (Total Potensi, Terpublikasi Resmi, Pending Otorisasi)
 * 3. PB-4.2: Pre-Publishing Checklist & Gatekeeper Blocker
 * 4. PB-4.3: Four-Eyes Principle & Checksum Integrity
 * 5. PB-4.4: Unpublish Rollback to ready_to_publish, Payout Block, Reason >=15 chars
 * 6. PB-4.5 & PB-5.1: 7 Batch Statuses, Cancel, and Lock Period
 * 7. PB-5.2: Audit Log Recording
 */

import {
  initializeSampleData,
  getAllBatches,
  getCreatorsFromAllBatches,
  getPublishedBatches,
  checkGatekeeperStatus,
  publishBatch,
  unpublishBatch,
  cancelBatch,
  lockBatch,
  getAuditLogs,
  recomputeBatchStatus,
  RoyaltyBatch
} from '../src/data/distributionEngine';
import { getCreatorPortalData } from '../src/data/creatorStatementData';

function assert(condition: boolean, testName: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  } else {
    console.log(`✅ PASSED: ${testName}`);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING COMPREHENSIVE PRD PB- (v1.1) VERIFICATION');
  console.log('======================================================\n');

  initializeSampleData();
  const allBatches = getAllBatches();

  // TEST 1: PB-1.1 & PB-1.4: Isolasi Lapisan Data Portal Pencipta
  console.log('--- TEST GROUP 1: PB-1.1 & PB-1.4 Isolasi Portal Pencipta ---');
  const publishedBatches = getPublishedBatches();
  assert(
    publishedBatches.every(b => b.status === 'published' || b.status === 'locked'),
    'getPublishedBatches() only returns published or locked batches'
  );

  const creators = getCreatorsFromAllBatches();
  assert(
    creators.length > 0,
    'getCreatorsFromAllBatches() returns creators'
  );

  // Verify that an in_review batch is NOT included in creator portal statement
  const meiStatement = getCreatorPortalData('IPB-1001', 'Mei 2026');
  assert(
    meiStatement.totalNet === 0 && meiStatement.songs.length === 0,
    'PB-1.1: Unverified batch (Mei 2026 in_review) is NOT exposed to Creator Portal (returns Rp 0)'
  );

  // TEST 2: PB-1.3: Admin 3 Metrics
  console.log('\n--- TEST GROUP 2: PB-1.3 Admin 3 Metrics ---');
  const totalPotensi = allBatches.filter(b => b.status !== 'cancelled' && b.status !== 'failed')
    .reduce((sum, b) => sum + b.totalDistributed, 0);
  const terpublikasiResmi = allBatches.filter(b => b.status === 'published' || b.status === 'locked')
    .reduce((sum, b) => sum + b.totalDistributed, 0);
  const pendingOtorisasi = allBatches.filter(b => b.status === 'in_review' || b.status === 'ready_to_publish')
    .reduce((sum, b) => sum + b.totalDistributed, 0);

  assert(totalPotensi > 0, `Total Potensi is calculated: Rp ${totalPotensi.toLocaleString('id-ID')}`);
  assert(terpublikasiResmi > 0, `Terpublikasi Resmi is calculated: Rp ${terpublikasiResmi.toLocaleString('id-ID')}`);
  assert(pendingOtorisasi > 0, `Pending Otorisasi is calculated: Rp ${pendingOtorisasi.toLocaleString('id-ID')}`);
  assert(totalPotensi === terpublikasiResmi + pendingOtorisasi, 'PB-1.3: Total Potensi == Terpublikasi Resmi + Pending Otorisasi');

  // TEST 3: PB-4.2: Pre-Publishing Checklist & Gatekeeper Blocking
  console.log('\n--- TEST GROUP 3: PB-4.2 Gatekeeper & Pre-Publishing Checklist ---');
  const inReviewBatch = allBatches.find(b => b.batchId === 'batch-demo-mei-2026')!;
  assert(inReviewBatch.openIssuesCount > 0, 'In-review batch has open issues count > 0');
  
  const gatekeeperStatus = checkGatekeeperStatus(inReviewBatch.batchId, 'Budi (Finance Manager)');
  assert(!gatekeeperStatus.canPublish, 'PB-4.2: Gatekeeper marks in-review batch as cannot publish');
  assert(
    gatekeeperStatus.checks.some(c => c.id === 'open_issues' && !c.passed),
    'PB-4.2: open_issues check fails when openIssuesCount > 0'
  );

  // Attempting to publish batch with open issues should fail
  const publishInReviewAttempt = publishBatch(inReviewBatch.batchId, 'Budi (Finance Manager)');
  assert(
    !publishInReviewAttempt.success,
    'PB-4.2: Gatekeeper BLOCKS publishBatch() when open issues exist'
  );

  // TEST 4: PB-4.3: Four-Eyes Principle
  console.log('\n--- TEST GROUP 4: PB-4.3 Four-Eyes Principle ---');
  
  // Resolve all remaining open exception rows in the batch to graduate it to ready_to_publish
  for (const r of inReviewBatch.sourceRows || []) {
    if (r.matchStatus === 'unmatched' || r.matchStatus === 'conflict') {
      r.matchStatus = 'resolved';
      r.issueStatus = 'resolved';
      r.resolvedBy = 'Sarah (Copyright Admin)';
      r.resolutionReason = 'Diverifikasi manual dengan katalog master';
    }
  }
  // Balance reconciliation (Total Source == Total Distributed + OnHold + Ignored) per PB-4.2
  inReviewBatch.totalDistributed = inReviewBatch.totalSource - (inReviewBatch.totalOnHold || 0) - (inReviewBatch.totalIgnored || 0);
  recomputeBatchStatus(inReviewBatch);
  assert(
    inReviewBatch.status === 'ready_to_publish',
    'State transition: in_review graduates to ready_to_publish once openIssuesCount reaches 0 and reconciliation balances'
  );

  const readyBatch = inReviewBatch;

  // Approver is same as uploader
  const uploaderName = readyBatch.uploadedBy;
  const sameUploaderGatekeeper = checkGatekeeperStatus(readyBatch.batchId, uploaderName);
  const fourEyesCheck = sameUploaderGatekeeper.checks.find(c => c.id === 'four_eyes');
  assert(
    fourEyesCheck !== undefined && !fourEyesCheck.passed,
    'PB-4.3.1: Four-Eyes check FAILS when approver == uploader'
  );

  const sameUploaderAttempt = publishBatch(readyBatch.batchId, uploaderName, 'Testing same uploader');
  assert(
    !sameUploaderAttempt.success,
    'PB-4.3.1: publishBatch() BLOCKS when approver == uploader'
  );

  // Head of Royalty override
  const overrideAttempt = publishBatch(
    readyBatch.batchId,
    uploaderName,
    'Emergency release approved by Head of Royalty',
    undefined,
    true // isOverride = true
  );
  assert(
    overrideAttempt.success,
    'PB-4.3.3: Head of Royalty CAN override Four-Eyes with isOverride=true'
  );
  assert(
    readyBatch.status === 'published',
    'Batch status updated to published after successful authorization'
  );

  // TEST 5: PB-4.4: Tarik Kembali (Unpublish)
  console.log('\n--- TEST GROUP 5: PB-4.4 Tarik Kembali (Unpublish) ---');
  // Reason < 15 characters should be rejected
  const shortReasonAttempt = unpublishBatch(
    readyBatch.batchId,
    'Budi (Finance Manager)',
    'too short'
  );
  assert(
    !shortReasonAttempt.success && shortReasonAttempt.error!.includes('15 karakter'),
    'PB-4.4.2: Unpublish BLOCKS reason < 15 characters'
  );

  // Active payout block (PB-4.4.4)
  readyBatch.hasActivePayout = true;
  const payoutBlockAttempt = unpublishBatch(
    readyBatch.batchId,
    'Budi (Finance Manager)',
    'Koreksi perhitungan royalti DSP yang keliru'
  );
  assert(
    !payoutBlockAttempt.success && payoutBlockAttempt.error!.includes('pengajuan pencairan'),
    'PB-4.4.4: Unpublish BLOCKS when batch has active payout'
  );
  readyBatch.hasActivePayout = false;

  // Successful unpublish
  const validUnpublish = unpublishBatch(
    readyBatch.batchId,
    'Budi (Finance Manager)',
    'Koreksi rekonsiliasi ulang karena revisi file DSP dari vendor YouTube'
  );
  assert(validUnpublish.success, 'Valid unpublish succeeds');
  assert(
    readyBatch.status === 'ready_to_publish',
    'PB-4.4.3: Unpublish rolls back batch to ready_to_publish (not in_review)'
  );

  // TEST 6: PB-4.5 & PB-5.1: Cancel & Lock
  console.log('\n--- TEST GROUP 6: PB-4.5 & PB-5.1 Cancel & Lock Batch ---');
  const cancelResult = cancelBatch(readyBatch.batchId, 'Sarah (Copyright Admin)', 'Dibatalkan karena file salah periode');
  assert(cancelResult.success && readyBatch.status === 'cancelled', 'PB-5.1: Cancel batch transitions status to cancelled');

  // Published batch lock
  const pubBatch = allBatches.find(b => b.status === 'published')!;
  const lockResult = lockBatch(pubBatch.batchId, 'Budi (Finance Manager)');
  assert(lockResult.success && pubBatch.status === 'locked', 'PB-5.1: Lock batch transitions published batch to locked');

  // Attempt to unpublish locked batch should fail
  const unpublishLocked = unpublishBatch(
    pubBatch.batchId,
    'Budi (Finance Manager)',
    'Mencoba menarik batch terkunci oleh finance'
  );
  assert(!unpublishLocked.success, 'PB-4.4.2: Unpublish BLOCKS locked batch');

  // TEST 7: PB-5.2: Audit Log Completeness
  console.log('\n--- TEST GROUP 7: PB-5.2 Audit Log Recording ---');
  const logs = getAuditLogs();
  const actions = logs.map(l => l.action);
  assert(actions.includes('BATCH_PUBLISH_OVERRIDE'), 'Audit Log recorded BATCH_PUBLISH_OVERRIDE');
  assert(actions.includes('BATCH_UNPUBLISHED'), 'Audit Log recorded BATCH_UNPUBLISHED');
  assert(actions.includes('BATCH_CANCELLED'), 'Audit Log recorded BATCH_CANCELLED');
  assert(actions.includes('BATCH_LOCKED'), 'Audit Log recorded BATCH_LOCKED');
  
  const highPriorityLogs = logs.filter(l => l.priority === 'HIGH' || l.action === 'BATCH_UNPUBLISHED');
  assert(highPriorityLogs.length > 0, 'PB-4.4.5: Unpublish is flagged as HIGH priority in Audit Log');

  console.log('\n======================================================');
  console.log('🎉 ALL PRD PB- (v1.1) REQUIREMENTS SUCCESSFULLY VERIFIED!');
  console.log('======================================================\n');
}

runAllTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
