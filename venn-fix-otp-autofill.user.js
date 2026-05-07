// ==UserScript==
// @name         Venn: Fix OTP Autofill
// @namespace    https://andrewe.ca
// @version      2.1.0
// @description  Replaces Venn's split Chakra UI PinInput with a single autocomplete-enabled input, eliminating the focus race condition that can prevent reliable iOS autofill.
// @author       Andrew Escobar (andrewe.ca)
// @match        https://app.venn.ca/*
// @match        https://www.venn.ca/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/andesco/userscripts-banks/main/venn-fix-otp-autofill.user.js
// @downloadURL  https://raw.githubusercontent.com/andesco/userscripts-banks/main/venn-fix-otp-autofill.user.js
// ==/UserScript==

// Venn's MFA page uses Chakra UI's PinInput component: six separate <input> elements. Venn has
// added autocomplete="one-time-code" to each input, which addresses the primary autofill failure.
// However, a race condition remains possible: Chakra's onChange advances focus to the next input
// after each digit, which can interfere with iOS distributing digits across all six inputs
// simultaneously.
//
// This script provides a more robust solution by replacing the visual layer with a single
// <input autocomplete="one-time-code">. The six Chakra inputs are hidden and explicitly set to
// autocomplete="off" to prevent any conflict. React's state stays intact — when the injected
// input receives a complete code, each hidden input is filled via React's native value setter
// so Chakra submits the form normally.

(() => {
  "use strict";

  const PIN_INPUT_SELECTOR = ".chakra-pin-input";

  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value",
  ).set;

  function reactSetValue(input, value) {
    nativeValueSetter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  function fillHiddenInputs(code) {
    const digits = code.replace(/\D/g, "").slice(0, 6);
    if (digits.length !== 6) return;

    const inputs = Array.from(document.querySelectorAll(PIN_INPUT_SELECTOR));
    if (inputs.length < 6) return;

    digits.split("").forEach((d, i) => reactSetValue(inputs[i], d));
  }

  function buildOverlay(container) {
    if (container.dataset.otpOverlay) return;
    container.dataset.otpOverlay = "1";

    const pinInputs = Array.from(container.querySelectorAll(PIN_INPUT_SELECTOR));
    if (pinInputs.length !== 6) return;

    // Hide the real Chakra inputs — keep them in the DOM for React
    pinInputs.forEach((input) => {
      input.autocomplete = "off";
      input.style.cssText = "position:absolute;opacity:0;width:0;height:0;pointer-events:none;";
    });

    // Build the visual six-box display
    const boxes = document.createElement("div");
    boxes.className = "otp-boxes";
    boxes.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 6; i++) {
      const box = document.createElement("div");
      box.className = "otp-box";
      boxes.appendChild(box);
    }

    // The single real input
    const input = document.createElement("input");
    input.type = "text";
    input.inputMode = "numeric";
    input.maxLength = 6;
    input.autocomplete = "one-time-code";
    input.pattern = "\\d{6}";
    input.setAttribute("aria-label", "One-time passcode");
    input.className = "otp-input";

    input.addEventListener("input", () => {
      const digits = input.value.replace(/\D/g, "").slice(0, 6);
      input.value = digits;

      // Mirror digits into the visual boxes
      Array.from(boxes.children).forEach((box, i) => {
        box.textContent = digits[i] ?? "";
        box.classList.toggle("otp-box--filled", !!digits[i]);
      });

      if (digits.length === 6) fillHiddenInputs(digits);
    });

    const wrapper = document.createElement("div");
    wrapper.className = "otp-wrapper";
    wrapper.appendChild(boxes);
    wrapper.appendChild(input);

    container.appendChild(wrapper);
    input.focus();
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .otp-wrapper {
        position: relative;
        display: inline-flex;
        align-items: center;
      }
      .otp-boxes {
        display: flex;
        gap: 8px;
        pointer-events: none;
      }
      .otp-box {
        width: 48px;
        height: 56px;
        border: 1.5px solid #d1d5db;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: 600;
        color: #111;
        transition: border-color 0.15s;
      }
      .otp-box--filled {
        border-color: #111;
      }
      .otp-wrapper:focus-within .otp-box {
        border-color: #6366f1;
      }
      .otp-input {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        opacity: 0;
        cursor: text;
        z-index: 1;
      }
    `;
    document.head.appendChild(style);
  }

  function observe() {
    injectStyles();

    const observer = new MutationObserver(() => {
      const containers = document.querySelectorAll(PIN_INPUT_SELECTOR);
      if (!containers.length) return;

      // Find the immediate parent container of the pin inputs
      const parent = containers[0].parentElement;
      if (parent) buildOverlay(parent);
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.body) {
    observe();
  } else {
    document.addEventListener("DOMContentLoaded", observe);
  }
})();
