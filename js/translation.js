// SPDX-License-Identifier: MPL-2.0
(function () {
  'use strict';

  // Security note: the upstream source is pinned to the exact commit reviewed on
  // 2026-08-13. The library is fetched only after explicit operator consent.
  const TRANSLATE_JS_COMMIT = '3758b0d9946214a480bd4a2a61d10ed1a56d2109';
  const TRANSLATE_JS_URL = `https://cdn.jsdelivr.net/gh/xnx3/translate@${TRANSLATE_JS_COMMIT}/translate.js/translate.min.js`;

  const enableButton = document.getElementById('enableTranslation');
  const status = document.getElementById('translationStatus');
  const mount = document.getElementById('translateMount');

  if (!enableButton || !status || !mount) return;

  const protectedIds = [
    'rootStatus',
    'activeModel',
    'renderClock',
    'progressPercent',
    'sourceMetric',
    'sourceMetricLabel',
    'projectionMetric',
    'eventMetric',
    'levelMetric',
    'hashReceipt',
    'formatReceipt',
    'fixtureReceipt',
    'eventTable',
    'seed'
  ];

  function configureTranslate() {
    if (!window.translate || typeof window.translate.execute !== 'function') {
      throw new Error('translate.js loaded without the expected API');
    }

    window.translate.language.setLocal('english');
    window.translate.service.use('client.edge');
    window.translate.selectLanguageTag.show = true;
    window.translate.selectLanguageTag.documentId = 'translateMount';

    protectedIds.forEach((id) => window.translate.ignore.id.push(id));
    window.translate.ignore.class.push('notranslate');

    // Dynamic interface prose can be translated, while deterministic receipts,
    // root/state labels and operator-entered values remain outside translation.
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
      'Enable online translation? Visible interface text will be sent to the translate.js translation service. ' +
      'Audio rendering, recipes, operator-entered seed values, mathematical identifiers and provenance receipts remain local. Continue?'
    );

    if (!consent) {
      status.textContent = 'TRANSLATION OFF · CORE OFFLINE';
      return;
    }

    loadTranslate();
  });
}());
