# Security policy

Treat PDFs as untrusted input. This application is a PDF utility, not a malware sanitizer.

For vulnerabilities, use the repository's private GitHub security advisory facility after the public repository is created. Do not attach confidential documents or exploit details to public issues. Until a private reporting channel is configured, this distribution is a development preview and should not be announced as a security-audited stable release.

Provide the affected version, operation, platform, and a synthetic reproduction. The project has no formal response-time guarantee. Dependency updates must include regression checks and refreshed license notices. Supported security fixes initially target the latest published version.

The browser policy restricts requests to the application origin; desktop permissions expose only dialogs and scoped file reads/writes. No shell or network plugins are included. Browser caches store only application assets, never document inputs or outputs. The offline status confirms asset caching, not operating-system privacy or protection against compromised extensions/devices.
