# Contributing

Use Node.js 22.12+, pnpm 10.28.2, and Rust stable for desktop changes.

1. Open an issue describing the user problem, avoiding real private documents.
2. Make a focused change with synthetic PDF fixtures where possible.
3. Run `pnpm check`, `pnpm test`, `pnpm build`, and relevant browser tests.
4. For desktop changes, verify native dialogs and offline operation on the affected OS.

Preserve entirely local processing: no document uploads, telemetry, remote fonts, runtime CDNs, or automatic cloud fallback. Do not log documents or filenames. Maintain keyboard and mobile usability. Include third-party license notices when adding dependencies. Contributions are under the MIT license; retain upstream notices.

Use explicit user-facing errors for unsupported documents. A visual black box is not redaction, and a signature image is not a certificate signature. Do not label either as such.
