# Step 2 — PDF compression (0.4.0)

Compress PDF is implemented as the seventeenth tool, with no new runtime dependency. The original PDF is retained in memory and every download creates a copy.

## Modes

**Lossless optimization (default):** repack objects into compressed object streams; compress eligible raw streams and recompress single-Flate streams at a higher level. Decoded stream bytes and existing filter/parameter pairings are preserved. Form appearance streams are not regenerated. Existing forms, links, bookmarks, attachments, tags and layers stay in the source document structure.

**Optimize images (optional, lossy):** a worker selects one eligible embedded image at a time, sends it to the local canvas encoder, and replaces its stream only when JPEG encoding is smaller. Text stays selectable, vectors remain vectors, and pages are not rasterized. The controls select JPEG quality and maximum pixel edge. This can reduce picture quality and is not intended for archival fidelity.

The result reports input/output sizes, saved bytes/percentage, and image replacement/skip counts. If the final candidate is larger or equal in size, the tool returns an unchanged `original-copy.pdf` with a clear no-smaller-result message. It does not promise a particular reduction or target file size.

## Preservation limits

- Image support: opaque 8-bit DeviceRGB/DeviceGray raw or simple Flate images, and RGB JPEGs without EXIF/ICC metadata.
- Skip images with masks/transparency, predictors/custom decode settings, unsupported codecs/color spaces, color/orientation metadata, or unsafe/inconsistent dimensions. Referenced mask images are excluded from lossy conversion too.
- A decoded stream is bounded to 32 MB; images are bounded to 16 million pixels. Some lower-resolution raw images also hit the decoded-byte bound. Unprocessable streams/images remain unchanged.
- Signed/certified, encrypted and XFA documents remain protected.
- Metadata removal, redaction, form filling and PDF/A conformance are not part of compression.

## Verification

- Strict TypeScript check and production build passed.
- 101 core tests: 23 original, 34 expansion, 22 compatibility and 22 compression cases.
- All 38 browser checks passed online and again with the verification server stopped and cached assets reloaded.
- Browser verification covers lossless size reduction, identical lossless rendering, retained selectable text, the actual worker/canvas image pipeline, JPEG roundtrip rendering, cancellation and filter-array preservation.
- Synthetic fixtures demonstrate substantial image reduction; this is not a prediction of savings for real documents.
- Final production output excludes the developer verification page; all runtime assets are served locally and included in the offline manifest.

Native macOS arm64 smoke checks passed for lossless mode and image mode. On the synthetic 591,330-byte image-heavy fixture, lossless mode saved 441 bytes, while default image mode produced a 193,478-byte PDF (67.3% smaller). An independent PDF.js read of the saved native export confirmed one page and retained selectable text. This fixture measurement is not a general savings promise. The CLI Playwright suite is extended but is not claimed to pass in this environment; the supported in-app browser runs the separate verification harness. Cross-platform qualification, public hosting, signed release distribution and larger real-world corpus testing remain outstanding.

## Next step

OCR/searchable scans, followed by password tools and batch workflows. These are not included in this version.
