// SPDX-License-Identifier: MPL-2.0
(function () {
  'use strict';

  // Optional internationalization powered by translate.js by Guan Leiming (管雷鸣):
  // https://github.com/xnx3/translate — upstream project licensed under the MIT License.
  // Security note: the upstream source is pinned to the exact commit reviewed on
  // 2026-08-13. The library is fetched only after explicit operator consent.
  const TRANSLATE_JS_COMMIT = '3758b0d9946214a480bd4a2a61d10ed1a56d2109';
  const TRANSLATE_JS_URL = `https://cdn.jsdelivr.net/gh/xnx3/translate@${TRANSLATE_JS_COMMIT}/translate.js/translate.min.js`;

  const enableButton = document.getElementById('enableTranslation');
  const status = document.getElementById('translationStatus');
  const mount = document.getElementById('translateMount');

  if (!enableButton || !status || !mount) return;

  // Translation is allowlisted, not whole-page. These roots contain ordinary
  // musical/synthesis/action prose only. E8/ETQ model controls, mathematical
  // identifiers, claim text, ledgers, measurements and provenance receipts are
  // deliberately outside this scope and therefore never submitted for translation.
  const SAFE_TRANSLATION_ROOT_IDS = [
    'musicalReceiverSection',
    'synthesisMasterSection',
    'rackActions',
    'transportPanel'
  ];

  // Defense in depth for operator-entered data inside an otherwise safe UI root.
  const protectedIds = ['seed'];

  function configureTranslate() {
    if (
      !window.translate ||
      typeof window.translate.execute !== 'function' ||
      typeof window.translate.setDocuments !== 'function'
    ) {
      throw new Error('translate.js loaded without the expected API');
    }

    const safeDocuments = SAFE_TRANSLATION_ROOT_IDS.map((id) => document.getElementById(id));
    if (safeDocuments.some((element) => !element)) {
      throw new Error('Safe translation scope is incomplete; refusing whole-page fallback');
    }

    window.translate.language.setLocal('english');
    window.translate.service.use('client.edge');
    window.translate.selectLanguageTag.show = true;
    window.translate.selectLanguageTag.documentId = 'translateMount';
    window.translate.setDocuments(safeDocuments);

    protectedIds.forEach((id) => window.translate.ignore.id.push(id));
    window.translate.ignore.class.push('notranslate');

    // The listener is constrained by setDocuments() to the same safe roots, so
    // dynamic mathematical/provenance content elsewhere in the DOM is never scanned.
    window.translate.listener.start();
    window.translate.execute();

    enableButton.textContent = 'TRANSLATION ON';
    enableButton.disabled = true;
    status.textContent = 'ONLINE TRANSLATION ACTIVE';
    status.dataset.state = 'online';
  }

  function loadTranslate() {
    if (window.translate && typeof window.translate.execute === 'function') {
      configureTranslate();
      return;
    }

    status.textContent = 'LOADING TRANSLATION…';
    status.dataset.state = 'loading';
    enableButton.disabled = true;

    const script = document.createElement('script');
    script.src = TRANSLATE_JS_URL;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.referrerPolicy = 'no-referrer';
    script.dataset.e8TranslationLibrary = TRANSLATE_JS_COMMIT;

    script.addEventListener('load', () => {
      try {
        configureTranslate();
      } catch (error) {
        console.error('translate.js initialization failed', error);
        status.textContent = 'TRANSLATION INITIALIZATION FAILED';
        status.dataset.state = 'error';
        enableButton.disabled = false;
      }
    }, { once: true });

    script.addEventListener('error', () => {
      status.textContent = 'TRANSLATION UNAVAILABLE · CORE REMAINS OFFLINE';
      status.dataset.state = 'error';
      enableButton.disabled = false;
      script.remove();
    }, { once: true });

    document.head.appendChild(script);
  }

  enableButton.addEventListener('click', () => {
    const consent = window.confirm(
      'Enable online translation powered by translate.js by Guan Leiming (管雷鸣)? ' +
      'Only allowlisted non-mathematical interface text will be sent to the translate.js translation service. ' +
      'Audio rendering, recipes, operator-entered seed values, mathematical identifiers and provenance receipts remain local. Continue?'
    );

    if (!consent) {
      status.textContent = 'TRANSLATION OFF · CORE OFFLINE';
      return;
    }

    loadTranslate();
  });
}());
