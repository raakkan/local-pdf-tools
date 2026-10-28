# Step 3 — OCR (0.5.0)

OCR PDF runs Tesseract.js 7 locally in a dedicated worker. The selected pages are rendered by bundled PDF.js at 150, 200, or 300 DPI with a 16 million pixel limit per page. A second worker adds text-only PDF layers over the original page artwork. Source bytes are never overwritten; source crop, rotation, forms, links, attachments and bookmarks are retained. Signed, certified and XFA documents cannot be rewritten. Text-only recognition does not rewrite them.

Outputs: searchable PDF, UTF-8 text, or both. Pages with existing selectable text are skipped by default. An explicit option recognizes them again and warns about duplicate text. Blank scans produce an actionable error. Low engine-confidence pages are listed for review; confidence is not measured accuracy. Rotate sideways scans first with Organize pages. Handwriting and complex layouts are not qualified.

English, Spanish, French, German, Hindi and Tamil models are shipped in desktop builds. Website users explicitly download the selected model and three possible WASM engine variants; bytes are checked against a generated SHA-256 manifest before entering a separate optional cache. Base PWA readiness does not imply OCR pack readiness. No document bytes or filenames are sent in these asset requests. Browser eviction can remove downloaded assets. Tesseract's own persistent cache is disabled.

## Verification

- TypeScript and 107 core tests pass, including source structure preservation and rewrite guards.
- 47 production browser checks pass with the restrictive production CSP, including real English OCR, UTF-8 and searchable output, unchanged rendered pixels for cropped pages at all four rotations, blank scans, cancellation during recognition and recovery.
- All 47 checks passed again after stopping the HTTP server and reloading the cached harness.
- macOS arm64 bundled app recognized a synthetic scanned invoice and saved a searchable PDF; invoice number and total were independently extracted with pypdf. No language download was needed.
- Bundled models are available; recognition accuracy for languages other than English is not yet qualified.
- Windows/Linux, other browsers, low-memory mobile devices and 50 MB/500-page OCR performance remain unqualified. OCR does not promise unlimited processing.
