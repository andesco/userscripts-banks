// ==UserScript==
// @name         CIBC: Fix Password Autofill
// @namespace    https://andrewe.ca
// @version      1.4
// @description  Fixes new CIBC sign-in form to allow password autofill.
// @author       Andrew Escobar (andrewe.ca)
// @match        https://*.cibc.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/andesco/userscripts-banks/main/cibc-password-autofill.user.js
// @downloadURL  https://raw.githubusercontent.com/andesco/userscripts-banks/main/cibc-password-autofill.user.js
// ==/UserScript==

(function () {
    'use strict';

    let watchedCardInput = null;
    let cardInputObserver = null;
    let cardCaptureListenerAdded = false;

    function fixCardForm() {
        const form = document.querySelector('form[name="card-number-frm-cah"]');
        if (!form) return;

        if (!form.getAttribute('action')) form.setAttribute('action', window.location.href);

        const continueBtn = form.querySelector('[data-test-id="action-bar-primary-button"]');
        if (continueBtn && continueBtn.type !== 'submit') continueBtn.type = 'submit';

        const cardInput = form.querySelector('input[data-test-id="card-number-input"]');
        if (!cardInput) return;

        // Capture card number into sessionStorage when the user proceeds to step 2
        if (!cardCaptureListenerAdded) {
            form.addEventListener('click', (e) => {
                if (e.target.closest('[data-test-id="action-bar-primary-button"]') && cardInput.value) {
                    sessionStorage.setItem('cibc_card', cardInput.value.replace(/\s/g, ''));
                }
            });
            cardCaptureListenerAdded = true;
        }

        // Re-attach attribute observer if Vue recreated the element
        if (cardInput !== watchedCardInput) {
            if (cardInputObserver) cardInputObserver.disconnect();
            cardInput.setAttribute('autocomplete', 'username');
            cardInputObserver = new MutationObserver(() => {
                if (cardInput.getAttribute('autocomplete') !== 'username') {
                    cardInput.setAttribute('autocomplete', 'username');
                }
            });
            cardInputObserver.observe(cardInput, { attributes: true, attributeFilter: ['autocomplete'] });
            watchedCardInput = cardInput;
            console.log('[CIBC] Card number form fix applied');
        }
    }

    const fixed = { password: false };

    function fixPasswordForm() {
        if (fixed.password) return;
        const form = document.querySelector('form[name="password-frm-cah"]');
        if (!form) return;

        if (!form.getAttribute('action')) form.setAttribute('action', window.location.href);

        const signOnBtn = form.querySelector('[data-test-id="sign-on-form-primary-button"]');
        if (signOnBtn) signOnBtn.type = 'submit';

        // Inject a hidden username field so the password manager knows which credential to fill.
        // type="text" (not "hidden") because many managers ignore type="hidden" inputs.
        const cardNumber = sessionStorage.getItem('cibc_card') ||
            document.querySelector('input[data-test-id="card-number-input"]')?.value.replace(/\s/g, '') || '';
        const hint = document.createElement('input');
        hint.type = 'text';
        hint.setAttribute('autocomplete', 'username');
        hint.setAttribute('aria-hidden', 'true');
        hint.value = cardNumber;
        hint.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;';
        form.insertBefore(hint, form.firstChild);

        fixed.password = true;
        console.log('[CIBC] Password form fix applied, card hint:', cardNumber ? '(set)' : '(empty)');
    }

    function fixForms() {
        fixCardForm();
        fixPasswordForm();
    }

    const observer = new MutationObserver(fixForms);
    observer.observe(document.body, { childList: true, subtree: true });

    fixForms();
})();
