# Futari Portal Security Specification (`security_spec.md`)

## 1. Data Invariants
1. **Global Default Deny**: Any path not explicitly matched in `firestore.rules` is denied for both read and write.
2. **Verified Identity**: All writes require `request.auth != null` and `request.auth.token.email_verified == true`.
3. **Owner Binding (`ownerId`)**: Every document in `staff_directory`, `attendance_logs`, `petty_cash_expenses`, and `event_budgets` must store `ownerId == request.auth.uid` on creation, and `ownerId` is strictly immutable during updates (`incoming().ownerId == existing().ownerId`).
4. **No Blanket List Reads**: Every `allow list` rule enforces `resource.data.ownerId == request.auth.uid || isAdmin()` so queries cannot scrape other users' records.
5. **Terminal State Locking**: Once an `AttendanceLog` reaches `status == 'completed'`, non-admin users cannot mutate it further.
6. **Temporal Integrity**: `createdAt` must equal `request.time` on creation and remain immutable on update; `updatedAt` must equal `request.time` on both creation and update.
7. **Strict Key & Size Boundaries**: Every string field enforces `.size() <= maxLength` matching `firebase-blueprint.json`, and every document creation enforces `hasAll` and `hasOnly` on allowed keys.

## 2. The "Dirty Dozen" Payloads (Adversarial Test Vectors)
1. **Payload 1 (Shadow Field Injection)**: Creating `attendance_logs/log_1` with an extra field `{"isVerified": true}` -> Rejected by `keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on Create)**: Creating `petty_cash_expenses/exp_1` with `ownerId: "victim_uid"` while signed in as `"attacker_uid"` -> Rejected by `data.ownerId == request.auth.uid`.
3. **Payload 3 (Unverified Email Spoof)**: Attempting admin access with `email: "nuginugroho2005@gmail.com"` and `email_verified: false` -> Rejected by `request.auth.token.email_verified == true`.
4. **Payload 4 (ID Poisoning / Oversized Path ID)**: Creating a document with a 300-character ID or special characters `log$bad/id` -> Rejected by `isValidId(id)`.
5. **Payload 5 (Owner Hijack on Update)**: Updating `ownerId` on an existing `event_budgets/evt_1` document -> Rejected by `incoming().ownerId == existing().ownerId` and `affectedKeys().hasOnly(...)`.
6. **Payload 6 (Terminal State Mutation)**: Updating `attendance_logs/log_1` when `existing().status == 'completed'` -> Rejected by `existing().status != 'completed'`.
7. **Payload 7 (Value Poisoning on Update)**: Updating `approvedBudget` in `event_budgets/evt_1` to a string `"10000000"` or negative number -> Rejected by `isValidEventBudget(incoming())`.
8. **Payload 8 (Denial of Wallet Oversized String)**: Submitting `overtimeNote` with a 5,000-character string -> Rejected by `data.overtimeNote.size() <= 500`.
9. **Payload 9 (Timestamp Forgery on Create)**: Setting `createdAt` to a past timestamp instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
10. **Payload 10 (CreatedAt Mutation on Update)**: Modifying `createdAt` during an update -> Rejected by `incoming().createdAt == existing().createdAt`.
11. **Payload 11 (Unauthorized Cross-User Get)**: Reading `attendance_logs/log_other` belonging to another `ownerId` as a non-admin -> Rejected by `existing().ownerId == request.auth.uid || isAdmin()`.
12. **Payload 12 (Invalid Enum Value)**: Creating `attendance_logs/log_1` with `mode: "WFH"` (not in `['WFO', 'WFE']`) -> Rejected by `data.mode in ['WFO', 'WFE']`.
