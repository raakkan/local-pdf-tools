# Step 4 — password tools (0.6.0)

Protect PDF encrypts an unencrypted input with AES-256, revision 6. It requires a new opening password and confirmation. A separate random 256-bit owner password is generated locally; printing, extraction and modification remain allowed after opening. This is opening protection, not a claim that permission flags prevent copying. No weak encryption is created. New passwords require 8 characters and at most 127 UTF-8 bytes; a long unique passphrase is preferable.

Unlock PDF accepts a known opening or owner password and returns an unencrypted copy. Blank input supports permission-only encrypted files. AES-256, AES-128 and legacy RC4 decryption have independent fixtures. Unsupported/public-key encryption and damaged files return an error. Unencrypted input returns a valid unencrypted copy. This feature does not recover forgotten passwords.

The source is preserved. Both tools check for signatures, certification/usage-rights permissions, and XFA before releasing rewritten output. QPDF keeps standard forms, widget appearance, links, bookmarks, attachments, crop and rotation. Warning exit status is treated as a failure rather than silently accepting a recovered document. Use an unsigned unrestricted copy for protected document features.

## Local runtime and password lifetime

QPDF 12.4.2 is pinned through `@ai-ecoverse/wasm-qpdf` 12.4.2-10. Its JavaScript glue and WASM are shipped unmodified with license, upstream NOTICE and third-party notices. This package has npm provenance and a published upstream build recipe. Build source: https://github.com/ai-ecoverse/homescoop/tree/main/packages/qpdf ; upstream: https://github.com/qpdf/qpdf/tree/v12.4.2 . The generated runtime notice is at `/password-assets/NOTICE.txt`.

A dedicated single-job worker owns a memory-only filesystem. It uses fixed internal filenames, suppresses runtime stdout/stderr, reports sanitized errors, removes temporary files and terminates after each job. Cancellation terminates the worker. Password fields clear after job completion, failure, cancellation, workspace reset and file changes. Neither passwords nor document contents enter local storage, URLs, logs or network requests. JavaScript strings cannot guarantee cryptographic zeroization of all memory copies. Engine assets are included in base PWA readiness and desktop installers; no runtime CDN or engine download is needed after offline preparation.

## Architecture

Desktop apps use Tauri 2: native Rust host/window/file dialogs with a bundled React interface rendered in the system WebView. Windows: WebView2; macOS: WKWebView; Linux: WebKitGTK. PDF work runs in local JavaScript/WASM workers. The same React UI runs in the website/PWA. Desktop assets are embedded; the app does not load the public website to work.

## Qualification

- TypeScript and 128 core tests pass, including 21 password cases using the actual WASM worker runtime.
- Independently generated pypdf AES-256, AES-128, RC4, owner-password, permission-only, signed and XFA fixtures exercise interoperability and guards.
- All 58 production browser checks passed with the restrictive CSP, then passed again after stopping the HTTP server and reloading the cached app. They cover independent PDF.js password opening, incorrect-password/retry, pixel-identical structure-preserving roundtrips, cancellation and recovery.
- macOS 27.0.1 arm64 native open/protect/save and incorrect-password/retry/unlock/save passed; pypdf independently verified encryption and structure preservation. See VERIFICATION.md.
- Windows/Linux, additional browsers, low-memory mobile devices and large encrypted PDFs remain unqualified. Signing/notarization and public deployment remain pending.
