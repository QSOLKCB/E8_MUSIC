# translate.js integration audit

Reviewed: 2026-08-13

## Upstream identity

- Project: `xnx3/translate`
- Author attribution: 管雷鸣 (Guan Leiming)
- Upstream head reviewed: `3758b0d9946214a480bd4a2a61d10ed1a56d2109`
- Package version at that head: `4.1.0`
- Browser source version string at that head: `4.1.0.20260526`
- License: MIT
- Integration URL is pinned to the exact reviewed Git commit through jsDelivr rather than a floating branch or unversioned asset.

## Claim verification

The upstream claim is substantially accurate:

- It can scan page DOM text and create a language selector without restructuring the page.
- It does not require the integrating site to obtain an API key for the upstream translation service.
- The checked-in supported-language table contains well over 100 language identifiers.
- Dynamic DOM monitoring is available through `translate.listener.start()`.

The important qualification is that automatic machine translation is not offline by default. When enabled, visible page text selected for translation is sent to a translation service. Upstream also documents custom/private service endpoints and offline/config-driven translation modes, but those are different deployment models.

## Static review notes

The review focused on the browser library and its integration surface rather than every optional server/admin/demo component in the upstream monorepo.

- Package metadata declares no runtime dependencies.
- The browser source is human-readable and openly licensed.
- Repository code search did not surface `eval(` or `new Function(` in the current core `translate.js/translate.js` file. Matches for those patterns were confined to other optional/legacy/demo components.
- Repository code search did not surface `document.cookie` in the current core browser file; cookie access exists in older/other integration code in the monorepo.
- No open upstream GitHub issues matching `security`, `vulnerability`, or `XSS` were found during this review.
- The browser source exposes explicit translation-service host/API configuration, confirming that translated text crosses a network boundary unless an offline/private service mode is used.

This is a source review, not a formal security proof or penetration test.

## E8_MUSIC containment rules

The integration is intentionally narrower than the upstream quick-start:

1. Core E8/ETQ sonification remains fully functional with no network connection.
2. translate.js is not present in the startup HTML as a remote script.
3. The remote library is loaded only after the operator clicks **LANGUAGE** and accepts a disclosure.
4. The upstream library revision is commit-pinned.
5. Deterministic seed values, model/root status, event-ledger content, numeric render measurements, WAV hashes, format receipts, and mathematical-fixture receipts are excluded from translation.
6. Translation failure cannot block rendering or alter the deterministic audio engine.
7. No analytics or telemetry were added by E8_MUSIC.

## Residual risk

Enabling translation introduces two external trust boundaries: the content-delivery path used to fetch the pinned library and the remote translation service used by translate.js. Users who require a strictly air-gapped workflow should leave translation disabled. The core application remains designed for that mode.
