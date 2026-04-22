# Venn `optauth` autofill

Venn’s `otpauth` page is a Next.js/React app using a Chakra UI `PinInput` component. It renders six separate `<input>` elements — one per digit — all with `autocomplete="off"`:

```html
<input type="tel" inputmode="numeric" id="pin-input-:r2:-0" data-index="0"
       autocomplete="off" class="chakra-pin-input" value="">
<!-- × 6, data-index 0–5 -->
```

Chakra UI `PinInput` does include its own paste handler, which intercepts the `paste` event on the focused input, reads `ClipboardEvent.clipboardData`, splits the string across all six fields, and calls its internal `onChange` for each one. This path generally works correctly when a user manually pastes or uses the double-tap `AutoFill` on iOS; a real `ClipboardEvent` fires and Chakra handles it.

The failure occurs when the code is delivered via **keyboard AutoFill** rather than a paste action:

1. iOS detects a TOTP code from the registered authenticator app and displays it in the QuickType suggestion bar above the keyboard.
2. When the user taps the suggestion, iOS sets the value of the focused input directly using its internal autofill mechanism. This fires an `input` event, not a `ClipboardEvent`.
3. The archaic paste handler never fires or miss-fires. React’s `onChange` fires for `input[data-index="0"]` with `value = "123456"`, but Chakra’s per-field handler only expects a single character. The full six-digit code ends up in the first field; the other five remain empty.
4. The six-input schema is never satisfied, so the form never submits.

In practice, the failure may present as fewer than six inputs filled rather than just one. iOS may attempt to distribute the code across the six inputs sequentially, simulating typed input one digit at a time. But Chakra’s `onChange` also advances focus to the next input after each digit — so both iOS and Chakra are competing for focus simultaneously. They fall out of sync mid-fill, iOS loses its place, and the result may be 4 or 5 filled inputs rather than 1 or 6. The exact count is timing-dependent, not deterministic — which explains why the failure can appear inconsistent even across identical interactions. This also reveals that an event-interception approach alone is insufficient: watching for a full six-digit value in `input[data-index="0"]` would never trigger if iOS is distributing digits across inputs rather than dumping them all in the first one.

## Userscript Fix

The userscript [`venn-fix-otp-autofill.user.js`](./venn-fix-otp-autofill.user.js) adds two interceptors at `document-start`:

### 1. Paste interceptor

Intercepts the `paste` event on any `.chakra-pin-input` at the capture phase (before Chakra’s own handler). If the clipboard contains six or more digits, it calls `event.preventDefault()` and `event.stopImmediatePropagation()` to suppress Chakra’s default handling, then distributes the digits itself. This is largely redundant with Chakra’s built-in paste handler, but ensures consistent behaviour across browsers and password managers that deliver paste differently.

### 2. Autofill interceptor

Intercepts the `input` event on `[data-index="0"]`. If that input’s value is exactly six characters long, it defers to the next event loop tick (to let React process the current event) and checks whether the other five inputs are still empty. If they are, it redistributes the six-digit value across all fields.

### React value setter trick

Plain DOM assignment (`input.value = "x"`) bypasses React’s property descriptor, so React never sees the change and its internal state stays stale. The fix uses the native setter directly:

```js
const nativeValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype, "value"
).set;

function reactSetValue(input, value) {
  nativeValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
```

Calling the native setter and then firing a bubbling `input` event causes React to compare the new DOM value against its tracked value, detect a change, and call the synthetic `onChange` handler — which is exactly what Chakra’s internal state management requires.


## Permanent Fix

The underlying problem is that six separate inputs cannot receive a single autofill value. The cleanest fix is **one real input, six decorative boxes** — the visual appearance of six separate fields without the autofill fragmentation.

- One input → one autofill target → iOS fills it correctly every time
- `autocomplete="one-time-code"` explicitly opts into native OTP autofill (SMS and authenticator app QuickType suggestions)
- Paste always goes to a single field; no distribution logic is needed at all
- No Chakra UI dependency for the OTP behaviour; the focus management, paste handling, and autofill all work via standard browser APIs

### Approach: single input with CSS letter-spacing overlay

Replace the six `PinInput` fields with a single `<input>` that has `maxLength={6}` and `autocomplete="one-time-code"`. The `one-time-code` value signals to iOS that this is an OTP field, enabling native autofill from the QuickType bar (SMS and authenticator app codes). Draw six decorative bordered boxes behind the input using CSS; use letter-spacing to align each digit over its corresponding box.

#### HTML / JSX

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

The `<span>` children inside `.otp-box` mirror the current `value` state so the digits appear to be inside the boxes. The real `<input>` is positioned over the entire row, transparent, so it receives focus and keyboard input.

#### CSS

```css
.otp-field-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
}

/* Six decorative boxes — purely visual, pointer-events disabled */
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

/* The real input: overlaid, transparent, captures all interaction */
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

/* Show focus ring on the wrapper when the hidden input is focused */
.otp-field-wrapper:focus-within .otp-box {
  border-color: #6366f1;
}
```

The `<input>` is invisible (`opacity: 0`) but covers the full wrapper, so clicking or tapping anywhere on the six boxes focuses it. The visible digits are rendered by the React state mirrored into `.otp-box > span` elements, not by the input’s own text rendering — so the visual appearance is pixel-identical to six separate fields.
