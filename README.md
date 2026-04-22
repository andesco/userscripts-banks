# Userscripts — Banking & Finance

A personal collection of [userscripts](https://wikipedia.org/wiki/Userscript) for banking and financial websites.

## Prerequisites and Usage

To use [userscripts](https://wikipedia.org/wiki/Userscript), your browser needs a [userscript manager](https://wikipedia.org/wiki/Userscript_manager) extension:

- [Tampermonkey](https://www.tampermonkey.net) · Chrome
- [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) · Safari · open source
- [Violentmonkey](https://violentmonkey.github.io) · Chromium · open source

## Scripts

- [CIBC: Fix Password Autofill](./cibc-password-autofill.user.js): fixes CIBC's two-step sign-in form so password managers can autofill card number and password.
- [Scotiabank: Reverse Transaction Order](./scotiabank-reverse-transaction-order.user.js): adds a clickable Date column header to toggle transaction sort order.
- [Venn: Fix OTP Autofill](./venn-fix-otp-autofill.user.js): fixes autofill of 6-digit OTP codes on Venn's MFA page by redistributing codes across Chakra UI's split PinInput fields.
- [Wealthsimple Tax: Fix Paste](./wealthsimple-tax-fix-paste.user.js): fixes a bug where pasted values are cleared on blur in numeric fields.

### CIBC: Fix Password Autofill

The new CIBC sign-in is a two-step Vue single-page application (SPA) — the URL never changes, but the card number and password are collected on separate forms shown one at a time. CIBC breaks the way password managers autofill forms with four structural defects:

Card number form:
1. The form has no `action` attribute. Password managers will not treat a `<form>` without an action as a credential form and silently skip it.
2. The card number input has `autocomplete="cc-number"`, which is correct for a payment/checkout form but wrong for username and password credentials. Password managers see it and offer saved credit cards that may have no corresponding saved password.
3. The button is `type="button"` instead of `type="submit"`, which is used to confirm a submittable form.

Password form:
4. The password form has no username field and only a password input. Password managers associate usernames with passwords; a lone password field makes it difficult to suggest or autofill a password. The card number entered moments ago does not carry over as the username.

Fixes applied:
1. Both forms: synthetic `action` attribute added; submit buttons changed to `type="submit"`.
2. Card form: `autocomplete` changed from `cc-number` to `username`. A `MutationObserver` watches the input and immediately reverts any attempt by Vue to reset it. The card number value is saved to `sessionStorage` when the user clicks Continue.
3. Password form: a visually-hidden username input (`type="text"`, not `type="hidden"`; many password managers ignore hidden inputs) is injected with the card number from `sessionStorage`, giving the password manager the username context it needs to match and fill the saved credential.

### Scotiabank: Reverse Transaction Order

Scotiabank displays transactions oldest-first with no way to sort them. The script reverses the list on page load so the newest transactions appear first, and makes the Date column header clickable to toggle sort direction, with a chevron indicating the current order.

The transaction table loads asynchronously. The script detects it via a `MutationObserver` on the `<tbody>` and falls back to polling, then re-applies the header setup whenever the data is replaced (e.g. when switching accounts). Sorting is a pure DOM operation — rows are removed and re-inserted in reverse order — which doesn’t interact with React’s internal state.

### Venn: Fix OTP Autofill

Venn's MFA page uses Chakra UI's `PinInput` component, which renders six separate `<input type="tel" autocomplete="off">` elements — one per digit. Chakra has a built-in paste handler that works correctly when the user manually copies a code and selects "Paste" from the iOS context menu, because that action fires a `ClipboardEvent` that Chakra intercepts.

The failure occurs when the code is delivered via keyboard autofill rather than a paste action. When iOS detects a TOTP code from a registered authenticator app and displays it in the QuickType suggestion bar, tapping the suggestion triggers iOS's internal autofill mechanism, which sets the focused input's value directly and fires an `input` event — not a `ClipboardEvent`. Chakra's paste handler never fires. React's `onChange` fires on `input[data-index="0"]` with the full six-digit code, but Chakra's per-field handler only expects one character; the remaining five inputs stay empty and the form never submits.

The failure may be intermittent because the delivery path varies: long-press → Paste uses a real `ClipboardEvent` and succeeds; tapping the QuickType suggestion may use autofill instead, which would cause the failure described above. `autocomplete="off"` on all six inputs may also contribute — iOS Safari may suppress the QuickType suggestion entirely in some sessions, causing the user to fall back to manual copy-paste where it works.

The fix adds two event interceptors at `document-start`:

1. **Paste interceptor**: captures `paste` events on any `.chakra-pin-input`, prevents Chakra's default handling, and distributes digits across all six fields. Largely redundant with Chakra's built-in behaviour but ensures consistency across password managers that simulate paste differently.

2. **Autofill interceptor**: captures `input` events on `[data-index="0"]`. If the value is six characters and the other five inputs are still empty, it redistributes the code across all fields.

Both use the React native value setter trick to set values in a way React's synthetic event system recognises: calling `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` directly (bypassing React's overridden property descriptor) and then dispatching a bubbling `input` event, which causes React to detect the change and call its synthetic `onChange` handler.

See [VENN.md](./VENN.md) for a detailed root cause analysis and a proposed alternative implementation that eliminates the problem entirely — a single `<input autocomplete="one-time-code">` styled with CSS to look like six separate fields.

### Wealthsimple Tax: Fix Paste

Wealthsimple Tax clears pasted values in numeric fields on blur (clicking away, tabbing out) unless the field also receives a typed edit. The working theory is that Wealthsimple Tax is a React app, and React doesn’t observe native DOM value changes directly — it listens to its own synthetic event system. A paste sets the input's value at the DOM level, but React never sees a change event it recognises as user input, so it resets the field to whatever its internal state says the value should be (empty) on blur.

The fix intercepts `paste` and `beforeinput` events on numeric fields (`data-son-field='{"type":"Numeric"}'`) and immediately types `.00` into the field programmatically. This triggers the full React-visible input event chain, marking the field as "dirty" in React’s internal state and preventing the blur reset. Wealthsimple Tax strips trailing `.00` if decimal places are already present, so the appended characters don't affect the final value.

The script uses `document.execCommand('insertText')` to insert each character because it reliably triggers React’s synthetic event system — React intercepts `execCommand` calls at the browser level, which plain DOM manipulation or `setRangeText` does not. `execCommand` is deprecated by browsers (it was a legacy IE API never formally standardised), so the script falls back to `setRangeText` with manually dispatched `beforeinput` and `input` events if `execCommand` is unavailable. Whether that fallback is sufficient to satisfy React’s event system is untested — if `execCommand` is eventually removed and the script stops working, a more robust fix would be to use React’s internal value setter directly via `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set`.


