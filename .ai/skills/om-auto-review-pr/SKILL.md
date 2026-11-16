> **Repo-local override.** Allows the PR author to complete a truthful self-review without requiring a second GitHub account.

## Step 10 — same-author self-review (replace when the current user authored the PR)

Run the full `om-code-review` review and validation gate unchanged. When the authenticated GitHub user is the PR author, publish the complete report with `comment-pr`, headed `Self-review (not a GitHub approval)`. Do not call `review-pr --approve`; GitHub does not accept author approval. This repository accepts the documented self-review as its review record when no independent account is available.

For a passing self-review, use the `merge-queue` pipeline label only after required checks pass; explain in the label-rationale comment that this is a self-review and not a GitHub approval. For findings, publish them as a self-review comment and use `changes-requested`; because this PR is the current user's own, continue the normal autofix loop. Never claim that GitHub recorded an approval. Existing branch-protection requirements remain authoritative and cannot be bypassed by this override.
