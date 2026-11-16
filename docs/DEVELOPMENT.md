# Development

## Wdrożenie

Pełna, samodzielna procedura pierwszego wdrożenia i aktualizacji na Dokploy znajduje się w [instrukcji wdrożenia](DEPLOYMENT.md).

## Invitation batches

Operators open a batch in the Invitations page before creating outreach invitations. A batch accepts at most 20 invitations.

From the command line, create an invitation through the same service used by the operator form:

```sh
npm run invite -- create --email mentor@example.com --stack-tags typescript,nextjs
```

Supported stack tags are `typescript`, `nextjs`, `node-js`, and `python`. The command uses the first configured `OPERATOR_USER_IDS` entry as the operator actor and requires a current open batch. It prints only the email and batch number; the invitation link is sent by email.

The existing pilot access-list commands remain available:

```sh
npm run pilot:invite -- --email mentor@example.com --name "Mentor Name" --role mentor
npm run pilot:invite -- --list
```

`MENTOR_PUBLISH_WINDOW_DAYS` defaults to 14. It is read when the mentor accepts, then saved as that invitation's `publishDueAt`.
