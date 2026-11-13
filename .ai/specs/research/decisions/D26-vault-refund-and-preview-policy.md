# D26 — Vault refunds require operator approval; preview silence expires the answer

- Date, owner: 2026-11-12, founder A (Oliwia), decision relayed by the requester.
- Context: D17 requires founder-A/operator approval for refunds. The E02 implementation had left vault refund reasons configurable for automatic approval pending this decision.
- Decision:
  - Refunds after a mentor rejection, preview expiry, or generation failure require operator approval; they are not automatic.
  - A mentor preview is a request for an opinion. If a reviewer has not decided within 120 minutes, the answer expires and a refund request is created for operator approval.
  - At most three distinct mentors may be cited for one answer.
  - Only answers that reach `released` count toward the D08 vault outcome; refunded purchases are reported separately.
- Existing preview outcome rule: this decision does not supersede resolved E02 Q4: every cited mentor must approve before release, and one rejection rejects the answer. The mentor's preview is requested as an opinion, while the existing rule still makes that decision a release gate.
- Consequences: vault refund reasons must never be included in `REFUND_AUTO_APPROVE_REASONS`; the operator queue must be staffed before a live vault purchase. The default 120-minute preview window and three-mentor limit match the implementation.
- Scope: this records product policy only. It does not authorize live payment/AI flags or close the legal/staging launch gates.
- Status: active.
