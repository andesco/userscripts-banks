// ==UserScript==
// @name         Wealthsimple Tax: Fix Paste
// @namespace    https://andrewe.ca
// @version      0.2.1
// @description  Fixes a bug where pasted values are cleared on blur in numeric fields.
// @author       Andrew Escobar (andrewe.ca)
// @match        https://my.wealthsimple.com/tax/*
// @grant        none
// @run-at       document-start
// @updateURL    https://raw.githubusercontent.com/andesco/userscripts-banks/main/wealthsimple-tax-fix-paste.user.js
// @downloadURL  https://raw.githubusercontent.com/andesco/userscripts-banks/main/wealthsimple-tax-fix-paste.user.js
// ==/UserScript==

// Wealthsimple Tax clears pasted values on blur (click, tap, tab out) for numeric fields unless the field also receives a typed edit or change. When this script detects a paste action in a numeric field (`data-son-field='{"type":"Numeric"}'`), it immediately types `.00`, which Wealthsimple Tax drops only if one or more decimal places already exist in the field, thereby preserving the numeric value.

(() => {
  "use strict";

  const queuedPasteTimes = new WeakMap();
  const INSERTION_TEXT = ".00";

  function getEventInput(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (node instanceof HTMLInputElement) {
        return node;
      }
    }

    return event.target instanceof HTMLInputElement ? event.target : null;
  }

  function parseSonField(input) {
    const rawValue = input.getAttribute("data-son-field");
    if (!rawValue) {
      return null;
    }

    try {
      return JSON.parse(rawValue);
    } catch {
      const typeMatch = rawValue.match(/"type"\s*:\s*"([^"]+)"/i);
      if (!typeMatch) {
        return null;
      }

      return { type: typeMatch[1] };
    }
  }

  function isNumericInput(input) {
    if (!(input instanceof HTMLInputElement) || input.disabled || input.readOnly) {
      return false;
    }

    const sonField = parseSonField(input);
    return sonField?.type === "Numeric";
  }

  function getKeyMeta(character) {
    if (character === ".") {
      return { code: "Period", keyCode: 190, charCode: 46 };
    }

    return {
      code: `Digit${character}`,
      keyCode: 48 + Number(character),
      charCode: 48 + Number(character),
    };
  }

  function dispatchKeyboardEvent(input, type, character) {
    const { code, keyCode, charCode } = getKeyMeta(character);
    input.dispatchEvent(
      new KeyboardEvent(type, {
        key: character,
        code,
        bubbles: true,
        cancelable: true,
        composed: true,
        keyCode,
        which: keyCode,
        charCode,
      }),
    );
  }

  function insertCharacter(input, character) {
    dispatchKeyboardEvent(input, "keydown", character);
    dispatchKeyboardEvent(input, "keypress", character);

    const beforeInput = new InputEvent("beforeinput", {
      bubbles: true,
      cancelable: true,
      composed: true,
      inputType: "insertText",
      data: character,
    });

    const beforeInputAllowed = input.dispatchEvent(beforeInput);
    let inserted = false;

    if (beforeInputAllowed) {
      input.setSelectionRange(input.value.length, input.value.length);

      try {
        inserted = document.execCommand("insertText", false, character);
      } catch {
        inserted = false;
      }

      if (!inserted && typeof input.setRangeText === "function") {
        const end = input.selectionEnd ?? input.value.length;
        input.setRangeText(character, end, end, "end");
        inserted = true;
      }
    }

    if (inserted) {
      input.dispatchEvent(
        new InputEvent("input", {
          bubbles: true,
          composed: true,
          inputType: "insertText",
          data: character,
        }),
      );
    }

    dispatchKeyboardEvent(input, "keyup", character);
  }

  function typeInsertionText(input) {
    input.focus({ preventScroll: true });
    input.setSelectionRange(input.value.length, input.value.length);

    for (const character of INSERTION_TEXT) {
      insertCharacter(input, character);
    }
  }

  function applyPasteFix(input) {
    if (!input.isConnected || !isNumericInput(input)) {
      return;
    }

    if (!input.value) {
      return;
    }

    typeInsertionText(input);
  }

  function queuePasteFix(input) {
    if (!isNumericInput(input)) {
      return;
    }

    const now = Date.now();
    const lastQueuedAt = queuedPasteTimes.get(input) || 0;
    if (now - lastQueuedAt < 50) {
      return;
    }

    queuedPasteTimes.set(input, now);
    window.setTimeout(() => applyPasteFix(input), 30);
  }

  document.addEventListener(
    "paste",
    (event) => {
      const input = getEventInput(event);
      if (input) {
        queuePasteFix(input);
      }
    },
    true,
  );

  document.addEventListener(
    "beforeinput",
    (event) => {
      if (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromPasteAsQuotation") {
        return;
      }

      const input = getEventInput(event);
      if (input) {
        queuePasteFix(input);
      }
    },
    true,
  );
})();
