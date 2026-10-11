import { useState, type FormEvent, type ReactNode } from "react";
import type { Settings, TextSize, Theme } from "../lib/settings";

interface Props {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
  onReset: () => void;
  onLogOut: () => void;
  email: string;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "Match device" },
];

const TEXT_SIZES: { value: TextSize; label: string; sample: string }[] = [
  { value: "small", label: "Small", sample: "text-sm" },
  { value: "default", label: "Default", sample: "text-base" },
  { value: "large", label: "Large", sample: "text-lg" },
  { value: "xl", label: "Extra large", sample: "text-xl" },
];

export default function SettingsTab({ settings, onChange, onReset, onLogOut, email }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-6 px-4 py-6 text-[#3E1230] sm:px-12 sm:py-10">
      <header className="flex flex-col gap-2">
        <h2 className="font-['League_Spartan'] text-5xl font-bold leading-none sm:text-[64px]">Settings</h2>
        <p className="text-[17px] text-[#6B3A5C]">Make Knight Study Space work the way you like.</p>
      </header>

      {/* Profile */}
      <Card title="Profile" description="How your name shows up around the site.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Display name" htmlFor="display-name">
            <input
              id="display-name"
              type="text"
              value={settings.displayName}
              onChange={(e) => onChange({ displayName: e.target.value })}
              placeholder="What should we call you?"
              maxLength={40}
              className={inputClass}
            />
          </Field>
          <Field label="School email" htmlFor="email">
            <input id="email" type="email" value={email} readOnly className={`${inputClass} opacity-70`} />
          </Field>
        </div>
      </Card>

      {/* Appearance */}
      <Card title="Appearance" description="Theme and text size are saved on this device.">
        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">Theme</legend>
          <div className="flex flex-wrap gap-2">
            {THEMES.map((t) => (
              <Choice
                key={t.value}
                name="theme"
                checked={settings.theme === t.value}
                onSelect={() => onChange({ theme: t.value })}
              >
                <ThemeIcon theme={t.value} />
                {t.label}
              </Choice>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="mb-3 text-sm font-bold uppercase tracking-[0.12em]">Text size</legend>
          <div className="flex flex-wrap gap-2">
            {TEXT_SIZES.map((s) => (
              <Choice
                key={s.value}
                name="text-size"
                checked={settings.textSize === s.value}
                onSelect={() => onChange({ textSize: s.value })}
              >
                <span className={`font-['League_Spartan'] font-bold ${s.sample}`} aria-hidden="true">
                  Aa
                </span>
                {s.label}
              </Choice>
            ))}
          </div>
          <p className="rounded-2xl bg-[#F7DCF9] px-4 py-3 text-[15px]">
            Preview: this is how text will look across the site.
          </p>
        </fieldset>
      </Card>

      {/* Accessibility */}
      <Card title="Accessibility">
        <Toggle
          label="Reduce motion"
          description="Turns off animations and sliding effects."
          checked={settings.reduceMotion}
          onChange={(v) => onChange({ reduceMotion: v })}
        />
      </Card>

      {/* Password */}
      <Card title="Password" description="Change your password, or get a reset link by email.">
        <PasswordForm email={email} />
      </Card>

      {/* Account */}
      <Card title="Account">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              if (window.confirm("Reset all settings on this device back to the defaults?")) onReset();
            }}
            className={secondaryButton}
          >
            Reset settings to default
          </button>
        </div>

        <div className="flex flex-col gap-3 rounded-[20px] border-[1.5px] border-dashed border-[#B57AA8] p-5">
          <div className="flex flex-col gap-1">
            <h4 className="font-bold">Delete account</h4>
            <p className="text-sm text-[#6B3A5C]">Permanently removes your account and all of your notes.</p>
          </div>
          <button
            onClick={() => {
              if (window.confirm("Delete your account? This can't be undone.")) {
                // TODO(auth): call your backend's delete-account endpoint, then log out
                onLogOut();
              }
            }}
            className="inline-flex min-h-11 cursor-pointer items-center self-start rounded-full bg-[#9B1C3A] px-5 text-sm font-bold text-white transition-colors hover:bg-[#7A1530]"
          >
            Delete my account
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ---------- Password form ---------- */
function PasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setMessage(null);

    if (!current || !next || !confirm) return setMessage({ type: "error", text: "Fill in all three fields." });
    if (next.length < 8) return setMessage({ type: "error", text: "New password must be at least 8 characters." });
    if (next !== confirm) return setMessage({ type: "error", text: "New passwords don't match." });
    if (next === current) return setMessage({ type: "error", text: "New password must be different from your current one." });

    setSaving(true);
    try {
      // TODO(auth): send { current, next } to your backend's change-password endpoint
      await new Promise((r) => setTimeout(r, 600));
      setMessage({ type: "success", text: "Password updated." });
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch {
      setMessage({ type: "error", text: "Couldn't update your password. Try again." });
    } finally {
      setSaving(false);
    }
  }

  async function handleResetEmail() {
    // TODO(auth): call your backend's send-reset-email endpoint
    setMessage({ type: "success", text: `If an account exists for ${email}, we've sent a reset link.` });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Current password" htmlFor="pw-current">
          <input
            id="pw-current"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="New password" htmlFor="pw-new" hint="At least 8 characters">
          <input
            id="pw-new"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Confirm new password" htmlFor="pw-confirm">
          <input
            id="pw-confirm"
            type={show ? "text" : "password"}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <label className="flex min-h-11 cursor-pointer items-center gap-2.5 self-start text-sm font-bold">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-[#3E1230]"
        />
        Show passwords
      </label>

      {message && (
        <p
          role={message.type === "error" ? "alert" : "status"}
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            message.type === "error" ? "bg-[#F7DCF9]" : "bg-[#E9B8EF]"
          }`}
        >
          {message.text}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className={primaryButton}>
          {saving ? "Saving..." : "Update password"}
        </button>
        <button type="button" onClick={handleResetEmail} className="min-h-11 cursor-pointer px-2 text-sm font-bold underline">
          Forgot your password? Email me a reset link
        </button>
      </div>
    </form>
  );
}

/* ---------- Building blocks ---------- */
const inputClass =
  "min-h-12 w-full rounded-2xl border-[1.5px] border-[#EBC4E4] bg-white px-4 text-[15px] text-[#3E1230] placeholder:text-[#8F6A85] focus:border-[#3E1230] focus:outline-none";

const primaryButton =
  "inline-flex min-h-12 cursor-pointer items-center rounded-full bg-[#3E1230] px-6 font-bold text-[#FDF8F2] transition-colors hover:bg-[#8A2A6E] disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButton =
  "inline-flex min-h-11 cursor-pointer items-center rounded-full border-[1.5px] border-[#3E1230] px-5 text-sm font-bold transition-colors hover:bg-[#F2C9EF]";

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-5 rounded-[28px] bg-[#FDF8F2] p-6 sm:p-7">
      <div className="flex flex-col gap-1">
        <h3 className="font-['League_Spartan'] text-[26px] font-bold">{title}</h3>
        {description && <p className="text-sm text-[#6B3A5C]">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-bold">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-[#6B3A5C]">{hint}</p>}
    </div>
  );
}

function Choice({
  name,
  checked,
  onSelect,
  children,
}: {
  name: string;
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}) {
  return (
    <label
      className={`flex min-h-12 cursor-pointer items-center gap-2.5 rounded-full border-[1.5px] px-5 text-sm font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-[#8A2A6E]/45 ${
        checked ? "border-[#3E1230] bg-[#3E1230] text-[#FDF8F2]" : "border-[#B57AA8] hover:bg-[#F2C9EF]"
      }`}
    >
      <input type="radio" name={name} checked={checked} onChange={onSelect} className="sr-only" />
      {children}
    </label>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-[#8A2A6E]/45">
      <span className="flex flex-col gap-0.5">
        <span className="font-bold">{label}</span>
        {description && <span className="text-sm text-[#6B3A5C]">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only"
      />
      <span
        aria-hidden="true"
        className={`relative h-8 w-14 flex-none rounded-full transition-colors ${checked ? "bg-[#3E1230]" : "bg-[#B57AA8]"}`}
      >
        <span
          className={`absolute top-1 h-6 w-6 rounded-full bg-[#FDF8F2] transition-transform ${
            checked ? "translate-x-7" : "translate-x-1"
          }`}
        />
      </span>
    </label>
  );
}

function ThemeIcon({ theme }: { theme: Theme }) {
  const props = {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (theme === "light")
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  if (theme === "dark")
    return (
      <svg {...props}>
        <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
      </svg>
    );
  return (
    <svg {...props}>
      <rect x="2" y="4" width="20" height="13" rx="2" />
      <path d="M8 21h8M12 17v4" />
    </svg>
  );
}