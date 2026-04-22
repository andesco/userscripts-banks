# CIBC: Fix Password Autofill

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
