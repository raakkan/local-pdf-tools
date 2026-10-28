# Feature expansion informed by PDFCraft

Research date: 28 October 2026. Batch 1 is implemented in version 0.2.0; later batches remain proposed. See [EXPANSION_STATUS.md](EXPANSION_STATUS.md) for the delivered features and verification.

References inspected: [PDFCraft overview and tool catalog](https://github.com/PDFCraftTool/pdfcraft), [tool registry](https://github.com/PDFCraftTool/pdfcraft/blob/main/src/config/tools.ts), [dependency manifest](https://github.com/PDFCraftTool/pdfcraft/blob/main/package.json), and [license](https://github.com/PDFCraftTool/pdfcraft/blob/main/LICENSE).

The upstream catalog is useful product research; listing a capability is not evidence that it preserves every document correctly. No upstream implementation or assets were copied. The upstream application uses AGPL-3.0; Local PDF Tools remains an independent MIT application. Review each new dependency and its distributed binaries separately.

## Product approach

Keep the shared workspace. Add capabilities that solve new user tasks, and expose convenient shortcuts to existing actions. Separate marketing entry points from the number of distinct processing operations. Keep every tool available locally and avoid unqualified promises about output fidelity or supported file sizes.

Already covered by our nine tools: file merging, range extraction, per-page splitting, page ordering/deletion/rotation, JPEG/PNG input/output, selectable text, text watermarks, page numbers, and signature images. Separate landing pages for individual actions can improve discovery without creating duplicate engines.

## Batch 1 — expand the existing engine

Recommended next implementation batch; use the installed PDF libraries and the existing worker/job interfaces.

| Capability | Intended behavior | Validation |
| --- | --- | --- |
| Page inspection | Display per-page dimensions, orientation, rotation, and document page count; export a small JSON report. | Mixed paper sizes and rotated pages report accurate units. |
| Metadata inspector/editor | View and edit standard document properties; offer an explicitly limited removal of standard metadata fields. | Verify saved fields and Info/XMP handling; never label this complete sanitization. |
| Page arrangement shortcuts | Add reverse order, duplicate selected pages, and insert blank pages to Organize. | Preserve chosen order and dimensions; provide undo; existing signed/advanced-document guards remain. |
| Interleaving | Alternate pages from two PDFs for separately scanned front/back stacks; support reversing the back stack. | Test unequal lengths and document order; append remaining pages deterministically. |
| Page size normalization | Fit selected content on A4 or Letter with orientation and margins; preserve aspect ratio. | Test mixed sizes, crop boxes, and rotations; avoid clipping. |
| Cropping | Set a visible crop rectangle with page preview and range selection. | Correctly transform coordinates on rotated pages; explicitly explain that cropped-away content can remain in the file. |
| Headers and footers | Add user text and page numbers to selected pages using a shared text-stamping implementation. | Check placement, selected ranges, and unsupported characters. |
| Print layouts | Place two or four source pages on each output sheet. | Verify order, scale, whitespace, and selectable text. |

The existing metadata and advanced-document guards must be reviewed per operation. Read-only inspection should remain available for documents that cannot safely be rewritten. Add jobs as typed operations, not special UI-only exports.

## Batch 2 — richer local workflows

- Comparison: render two documents side by side with synchronized paging. Add optional visual difference overlays later. Clearly distinguish pixel differences from semantic text differences.
- Plain-text creation: generate paginated PDFs from user-supplied TXT files. Bundle a suitably licensed Unicode font and test text wrapping, glyph coverage, and missing-character errors before adding more formats.
- Image input expansion: add formats only after confirming local decoder availability and preservation behavior across desktop webviews. Browser canvas conversion is suitable for some formats; HEIC and multipage TIFF need separate decoder evaluation.
- Workflow presets: start with an ordered list of operations rather than a node canvas. Validate compatible input/output types. Suggested presets: arrange → number → watermark, or images → PDF → number. Persist settings only, never document bytes.
- Batch execution shipped in 0.7.0 across 15 shared-settings tools: sequential workers, per-file progress/failures, partial results after cancellation and ZIP export. Inputs and completed outputs remain in session memory. Future work: streamed file loading/export and failed-only retries.

## Batch 3 — new engines and higher validation effort

- Compression: distinguish structural optimization from lossy image reduction. Show resulting size and quality tradeoffs; never promise a smaller file for every input.
- OCR shipped in 0.5.0: six language packs, local recognition, searchable text layers, and per-pack offline readiness. Future work includes additional languages, orientation correction, and broader layout/accuracy qualification.
- Password tools shipped in 0.6.0: QPDF 12.4.2 WASM, AES-256 protection and unlocking with known passwords. Future work includes broader browser/platform qualification and stronger memory/performance measurements.
- Forms: separate filling existing fields, creating fields, and flattening. Replace the current blanket form guard only after preservation and appearance tests pass.
- Attachments/bookmarks: introduce dedicated readers/editors with explicit preservation tests before relaxing the current name-tree/bookmark guards.
- Booklet layouts: build on the print-layout engine with binding direction, padding pages, and printing instructions.

## Features needing separate feasibility work

Office conversion, PDF-to-Word/Excel, true existing-text editing, true redaction, full sanitization, PDF/A conformance, and certificate signatures require more than a new toolbar button. Define their fidelity/security promises and validation tools before implementation. Rasterizing pages is not a substitute for an editable conversion or archival conformance.

## Release criteria for each addition

- Update the operation registry, options, worker behavior, user help, static route metadata, and applicable presets together.
- Add behavior-level fixtures, including rotated and mixed-size documents where relevant.
- Verify output independently of the UI and check source bytes remain unchanged.
- Run new jobs with the server stopped after caching, and smoke-test native dialogs and saving.
- Recheck the offline manifest and distributed license notices whenever assets or dependencies change.
- Keep compatibility limitations visible and publish only measured platform support.

Recommended sequence: read-only inspection and arrangement shortcuts first; interleaving and page geometry next; text stamping and print layouts afterward. Comparison and reusable presets provide a stronger long-term identity than inflating the homepage tool count.
