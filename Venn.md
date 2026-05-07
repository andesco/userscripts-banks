# Venn `otpauth` autofill

## Problem

Venn's OTP page is a Next.js/React app using Chakra UI `PinInput` — six `<input>` elements. The structure creates a race condition with iOS autofill: Chakra's `onChange` advances focus to the next input after each digit, while iOS distributes digits across all six inputs simultaneously. This causes intermittent failures where some inputs are left empty and the form cannot be submitted.

## Venn's Fix

In May 2026 (build `202605051526-82b78e4`), Venn added `autocomplete="one-time-code"` and `type="tel"` to all six PinInput elements. This enables iOS QuickType to recognise the fields as an OTP target and resolves the most common failure mode.

The split-input structure remains, so the Chakra focus-advance race condition is theoretically still possible — but has not been observed in practice since the fix was applied.

## Userscript

[`venn-fix-otp-autofill.user.js`](./venn-fix-otp-autofill.user.js) provides a more robust solution by eliminating the race condition entirely.

It hides the six Chakra inputs — setting `autocomplete="off"` on each to prevent any autofill conflict — and overlays a single `<input autocomplete="one-time-code">` styled to look identical to the original six boxes. When the injected input receives a complete six-digit code, each hidden input is filled via React's native value setter so Chakra submits the form normally.
