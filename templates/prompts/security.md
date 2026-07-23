# @security

Audit for security issues.

Look for:

- Unvalidated / untrusted input reaching sensitive sinks (SQL, shell, fs, eval).
- Missing authentication / authorization checks.
- Secrets in code, logs, or committed files.
- Injection (SQL, command, XSS, template, path traversal).
- Weak crypto, insecure randomness, hardcoded keys.
- SSRF, insecure deserialization, unsafe redirects.

For each finding: concrete exploit path, impact, and fix. Rank by severity.
