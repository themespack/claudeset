# @review

Review a change for correctness and quality.

Check, in order:

1. **Correctness** — does it do what it claims? Edge cases, error paths.
2. **Tests** — meaningful coverage of the change.
3. **Security** — input validation, secrets, injection, authz.
4. **Simplicity** — is there a smaller equivalent?
5. **Consistency** — matches project conventions and memory.

Report most-severe first. Distinguish blocking issues from nits.
