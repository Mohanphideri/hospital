import { useRef, useEffect } from "react";

// Renders `length` separate boxes instead of one plain text field. Typing a
// digit auto-advances to the next box; backspace on an empty box moves back;
// pasting a full code fills every box at once. `value`/`onChange` behave
// like a normal controlled text input (a plain string of digits) so callers
// don't need to change how they store or submit the code.
export default function OtpInput({ length = 4, value, onChange, autoFocus = true, disabled = false }) {
  const inputRefs = useRef([]);

  useEffect(() => {
    if (autoFocus) inputRefs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const digits = Array.from({ length }, (_, i) => value[i] || "");

  const setDigit = (index, digit) => {
    const next = digits.slice();
    next[index] = digit;
    onChange(next.join(""));
  };

  const handleChange = (index, e) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) {
      setDigit(index, "");
      return;
    }
    // Handles both a single keystroke and a fast paste landing in one box.
    if (raw.length > 1) {
      const next = value.split("");
      raw.split("").forEach((ch, i) => {
        if (index + i < length) next[index + i] = ch;
      });
      onChange(next.join("").slice(0, length));
      const lastFilled = Math.min(index + raw.length, length) - 1;
      inputRefs.current[lastFilled]?.focus();
      return;
    }
    setDigit(index, raw);
    if (index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < length - 1) inputRefs.current[index + 1]?.focus();
  };

  const handlePaste = (index, e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = value.split("");
    pasted.split("").forEach((ch, i) => {
      if (index + i < length) next[index + i] = ch;
    });
    onChange(next.join("").slice(0, length));
    const lastFilled = Math.min(index + pasted.length, length) - 1;
    inputRefs.current[Math.max(lastFilled, 0)]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-3" role="group" aria-label="One-time passcode">
      {digits.map((digit, i) => (
        <input
          key={i}
          ref={(el) => (inputRefs.current[i] = el)}
          type="text"
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length} // allows a full paste to land in any box, see handleChange
          value={digit}
          disabled={disabled}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={(e) => handlePaste(i, e)}
          onFocus={(e) => e.target.select()}
          className="h-12 w-11 sm:h-14 sm:w-12 rounded-xl border-2 border-slate-200 bg-white text-center text-xl sm:text-2xl font-bold text-slate-900 shadow-sm transition focus:border-crimson focus:outline-none focus:ring-2 focus:ring-crimson/20 disabled:opacity-50"
          aria-label={`Digit ${i + 1} of ${length}`}
        />
      ))}
    </div>
  );
}
