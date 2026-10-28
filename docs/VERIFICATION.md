# Verification status

This is a development implementation, not a qualified production release.

## Automated checks

- TypeScript strict check.
- 101 core tests (23 original, 34 expansion, 22 compatibility and 22 compression cases): ranges, merge, source-byte preservation, page order/rotation, split/ZIP, image input, stamps, signatures, malformed input, 500-page fixture, and rewrite guards.
- Browser suite: navigation, responsive width, every tool, PDF download validity, undo, invalid ranges, observed network requests, and offline processing after a cache-ready check.
- 38 supported-browser checks passed online and again after stopping the server and reloading cached assets, including visual rotation/crop-box comparisons.
- Production build and content-derived offline asset manifest.

The browser suite defaults to Chromium. To run against a preinstalled Chromium binary set `LOCALPDF_CHROMIUM` to its executable. The configured tool suite is not a substitute for Firefox, Safari, mobile, and native-webview qualification.

## Manual release gates

- [ ] Firefox and Safari tools and cancellation.
- [ ] Android Chrome and iOS Safari file selection, downloads, and PWA installation.
- [x] macOS arm64 native merge and crop open/process/save smoke tests; saved PDFs parsed independently. Native document inspection report rendering verified. Native lossless/image compression and save verified; saved output size and selectable text independently checked.
- [ ] Actual Windows, macOS Intel, and Ubuntu native app smoke tests.
- [ ] Fresh offline install/first launch, open/save native dialogs, overwrite prompts, uninstall.
- [ ] Signature/notarization verification for public installers.
- [ ] Unicode/CJK, scanned, mixed-size, pre-rotated, damaged, encrypted, signed, and advanced-document corpus.
- [ ] Visual comparisons of exported content in independent renderers.
- [ ] Deliberate worker crash, cancellation during each operation, repeated jobs, memory pressure.
- [ ] All tools offline on every qualified platform.
- [ ] 50 MB document and 500-page performance measurements on a documented 8 GB machine.
- [ ] Keyboard/screen-reader and touch usability review.
- [ ] Third-party font/codecs and missing-license notice review.
- [ ] Actual repository/release URLs, reporting channel, and sponsor details configured.
- [ ] Staging and production CSP verified and custom domain configured.

No measured 50 MB/8 GB performance claim is made. This environment is not the reference qualification machine. The generated notice inventory is broader than the production dependency bundle; inspect it before publishing.

## OCR / 0.5.0

107 core tests and TypeScript pass. The production browser harness passes 47 checks with the production CSP, including real English OCR and pixel-identical original artwork across crop/rotation combinations. All 47 checks passed again after the HTTP server was stopped and the cached page reloaded. English OCR is qualified on synthetic printed scans; other language accuracy, additional browsers/platforms and large OCR workloads remain unqualified. See [OCR status](OCR_STATUS.md).

macOS arm64 native OCR open/recognize/save passed using bundled English assets. pypdf independently recovered the invoice number and total from the exported searchable PDF.

## Password tools / 0.6.0

TypeScript and 128 core tests pass (21 password cases). All 58 production browser checks passed with the production CSP, then passed again after stopping the HTTP server and reloading the cached harness. These include AES-256 protection with independent PDF.js opening, incorrect-password/retry, independently generated AES-128/RC4/owner/permission fixtures, encrypted signature/XFA guards, pixel-identical structure-preserving roundtrips, and cancellation/recovery. See [password status](PASSWORD_STATUS.md).

macOS 27.0.1 arm64 Tauri/WKWebView: native open/protect/save and encrypted open/incorrect-password/retry/unlock/save passed using bundled QPDF assets. pypdf independently confirmed AES-256 revision 6 and required-password behavior, then checked that the unlocked PDF opens without a password and retains fields, annotations, bookmarks and attachments. Password controls cleared after success and failure. Actual Windows/Linux qualification and signing/notarization remain pending.
