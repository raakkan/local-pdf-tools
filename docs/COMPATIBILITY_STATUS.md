# Step 1 — Broader PDF compatibility (0.3.0)

Implemented as an independent improvement to the existing 16 tools. No new processing dependency or upstream implementation was added.

## Supported behavior

Metadata, crop, headers/footers, page numbers, text watermark, and visual signature operations retain the source document/page tree. Standard AcroForm fields and their existing appearance streams are preserved, as are annotations/links, bookmarks, attachments/name trees, layer entries, and tag entries.

Saving explicitly disables form appearance regeneration. Compatibility checks inspect low-level objects and do not call the form editor, which can strip XFA. Document metadata removal avoids deleting an object that remains referenced elsewhere.

Inspect PDF now reports detected features, supported edit IDs, restricted edit IDs, and any blocking reason. It continues to work without rewriting the source. Supported edit IDs describe document edits; image rendering and text extraction remain separate read-only operations.

Merge, split, organize, alternate merge, resize, and pages-per-sheet retain conservative guards for structured documents because rebuilding pages requires additional preservation work. Signed/certified documents and XFA forms remain blocked for rewriting. Signature detection includes direct nested dictionaries; an empty unsigned signature field alone does not count as an applied signature.

## Limits

This does not implement form filling, form creation, flattening, compression, OCR, passwords, or workflow automation. Preserving tag/layer catalog entries is not full accessibility/archival validation; added stamps are not accessibility-tagged. A crop can hide an existing field without removing it. Metadata removal remains limited and is not sanitization.

Tests use valid synthetic bookmarks, URI annotations, embedded attachments, text fields and checkboxes. Real-world document corpus/platform qualification is still required before a stable public launch.

## Sequential roadmap

1. Broader compatibility — implemented in this version.
2. Compression — next.
3. OCR/searchable scans.
4. Password protection/removal with a supplied password.
5. Batch execution and reusable workflows.

Further editing/conversion features remain on FEATURE_ROADMAP.md. Public hosting, signed release distribution, and Windows/Linux qualification are separate unfinished release work.

## Verification results

- Strict TypeScript check and production website build passed.
- 78 core tests passed, including 21 compatibility regressions.
- 32 production browser checks passed online and again after stopping the verification server and reloading cached assets.
- Browser checks read preserved form values, bookmark targets, URI annotations and embedded attachment bytes through PDF.js, and compare rendered pixels before/after metadata editing.
- Existing tests continue covering all 16 tool operations, rotated crop boxes, image formats, cancellation and source-byte preservation.
- The final website excludes developer verification pages.

The generic Playwright command-line suite remains unverified here because of the environment's Chromium launch restriction. Windows/Linux and broader browser/mobile qualification remain unfinished.

Native macOS arm64 smoke test passed: opened the structured fixture, changed its title, saved through the native dialog, and independently verified the title, form field values/checkbox state, bookmark/name trees and three annotations in the saved output.
