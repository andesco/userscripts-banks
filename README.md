# Userscripts — Banking & Finance

A personal collection of [userscripts](https://wikipedia.org/wiki/Userscript) for banking and financial websites.

## Prerequisites and Usage

To use [userscripts](https://wikipedia.org/wiki/Userscript), your browser needs a [userscript manager](https://wikipedia.org/wiki/Userscript_manager) extension:

- [Tampermonkey](https://www.tampermonkey.net) · Chrome
- [Userscripts](https://apps.apple.com/app/userscripts/id1463298887) · Safari · open source
- [Violentmonkey](https://violentmonkey.github.io) · Chromium · open source

## Scripts

- [CIBC: Fix Password Autofill](./cibc-password-autofill.user.js) · [details](./CIBC.md): fixes CIBC's two-step sign-in form so password managers can autofill card number and password.
- [Scotiabank: Reverse Transaction Order](./scotiabank-reverse-transaction-order.user.js) · [details](./Scotiabank.md): adds a clickable Date column header to toggle transaction sort order.
- [Venn: Fix OTP Autofill](./venn-fix-otp-autofill.user.js) · [details](./Venn.md): replaces Venn's split Chakra UI PinInput with a single `autocomplete="one-time-code"` input styled to look identical, fixing autofill of 6-digit OTP codes.
- [Wealthsimple Tax: Fix Paste](./wealthsimple-tax-fix-paste.user.js) · [details](./Wealthsimple-Tax.md): fixes a bug where pasted values are cleared on blur in numeric fields.
