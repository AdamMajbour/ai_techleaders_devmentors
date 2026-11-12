# Vault review rejection and refund boundary

A mentor review is a decision about whether the generated answer may be released, not an individual refund. One rejection therefore closes the entire answer and creates one payment refund approval. The refund must stay in the existing operator approval/execution path, and duplicate reviewer or expiry work must converge on the same approval.

Keep answer status, reviewer decision, and the refund approval in one DB transaction where possible. Keep the gateway refund call outside that transaction. Never put the question, answer text, or rejection reason in logs or domain event payloads; rejection reasons are operator-only.