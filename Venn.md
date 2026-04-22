# Venn `otpauth` autofill

## Problem

Venn’s OTP page is a Next.js/React app using Chakra UI `PinInput` — six `<input>` elements with `autocomplete="off"`. iOS keyboard AutoFill works sometimes but fails intermittently. When it fails, the result varies: 5 or fewer fields are filled, leaving the form incomplete and unsubmittable.

The suspected cause is a race condition between iOS and Chakra. Chakra’s `onChange` advances focus to the next input after each digit; iOS may be distributing digits one at a time across the six inputs simultaneously, causing them to fall out of sync. This would explain both the inconsistency and the varying number of filled fields.

## Userscript Fix

[`venn-fix-otp-autofill.user.js`](./venn-fix-otp-autofill.user.js) adds two interceptors at `document-start`:

**Paste interceptor** — captures `paste` on `.chakra-pin-input` before Chakra’s handler. If the clipboard holds ≥6 digits, it suppresses Chakra’s handling and distributes the digits itself.

**Autofill interceptor** — watches `input` on `[data-index="0"]`. If the value is six digits and the other five fields are still empty (checked after one event loop tick), it redistributes across all fields. Uses the native `HTMLInputElement` value setter plus a bubbling `input` event to trigger React’s synthetic `onChange` — plain DOM assignment bypasses React’s property descriptor and leaves internal state stale.

## Permanent Fix

The underlying issue is that six separate inputs can't reliably share a single autofill target. The cleaner fix is **one `<input maxLength={6} autocomplete="one-time-code">` with six decorative CSS boxes**. `one-time-code` signals to iOS that this is an OTP field, enabling native autofill from QuickType suggestions. Digits from React state are mirrored into `<span>` elements inside each box, keeping the visual appearance similar to six separate fields. This would likely eliminate the distribution logic and the Chakra focus race.

```jsx
<div className="otp-field-wrapper">
  <input
    ref={inputRef}
    type="text"
    inputMode="numeric"
    maxLength={6}
    autoComplete="one-time-code"
    pattern="\d{6}"
    value={value}
    onChange={(e) => {
      const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
      setValue(digits);
      if (digits.length === 6) onComplete(digits);
    }}
    className="otp-input"
    aria-label="One-time passcode"
  />
  <div className="otp-boxes" aria-hidden="true">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className={`otp-box ${value[i] ? "otp-box--filled" : ""}`}>
        <span>{value[i] ?? ""}</span>
      </div>
    ))}
  </div>
</div>
```

```css
.otp-field-wrapper {
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

/* invisible but covers the full wrapper to capture all interaction */
.otp-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: text;
  font-size: 24px;
  z-index: 1;
}

.otp-field-wrapper:focus-within .otp-box {
  border-color: #6366f1;
}
```
