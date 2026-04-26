import { C } from "../../config/constants";

// Labeled text input used in owner-side forms.
export default function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  autoFocus,
}) {
  return (
    <label className="block">
      <span className="block text-xs font-bold uppercase tracking-wider mb-2 text-neutral-700">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoFocus={autoFocus}
        className="w-full px-4 py-2.5 border text-base focus:outline-none focus:ring-2"
        style={{ borderColor: C.lightGray }}
      />
    </label>
  );
}
