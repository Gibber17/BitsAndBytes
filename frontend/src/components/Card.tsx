import type { ReactNode } from "react";

export interface CardProps {
  /** Card heading. */
  title: string;
  /** Visual at the top of the card (e.g. the lined-paper preview on notes). */
  media?: ReactNode;
  /** Small pill above the title (e.g. "Verified offer", "Est. $"). */
  eyebrow?: ReactNode;
  /** Short text under the eyebrow. */
  note?: ReactNode;
  /** Line under the title (course and date, address). */
  subtitle?: ReactNode;
  /** Pill at the right of the subtitle line (e.g. note status). */
  badge?: ReactNode;
  /** Buttons for the card. Don't use together with onClick. */
  actions?: ReactNode;
  /** Bottom row with a divider (e.g. rating + link). Don't use together with onClick. */
  footer?: ReactNode;
  /** Dark border so the card stands out. */
  highlighted?: boolean;
  /** Makes the whole card one button. */
  onClick?: () => void;
  className?: string;
}

export default function Card({
  title,
  media,
  eyebrow,
  note,
  subtitle,
  badge,
  actions,
  footer,
  highlighted = false,
  onClick,
  className = "",
}: CardProps) {
  const clickable = onClick !== undefined;
  const hasTop = Boolean(eyebrow || note);

  const classes = [
    "flex h-full w-full flex-col rounded-[28px] border-2 bg-[#FDF8F2] text-left text-[#3E1230]",
    media ? "gap-3 p-3" : "p-5",
    highlighted ? "border-[#43102f]" : "border-transparent",
    clickable ? "cursor-pointer transition-transform hover:-translate-y-0.5" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Inside a <button> the heading role is ignored, so only add it on static cards
  const headingProps = clickable ? {} : { role: "heading", "aria-level": 3 };

  const content = (
    <>
      {media}

      <span className={`flex flex-1 flex-col ${media ? "px-1 pb-1" : ""}`}>
        {eyebrow && <span className="block">{eyebrow}</span>}
        {note && <span className="mt-1.5 block">{note}</span>}

        <strong
          {...headingProps}
          className={`block break-words text-[17px] font-semibold leading-tight ${hasTop ? "mt-3" : ""}`}
        >
          {title}
        </strong>

        {(subtitle || badge) && (
          <span className="mt-1.5 flex items-center justify-between gap-2 text-[13px] text-[#6B3A5C]">
            {subtitle && <span className="min-w-0">{subtitle}</span>}
            {badge && <span className="flex-none">{badge}</span>}
          </span>
        )}

        {actions && <span className="mt-4 flex flex-wrap items-center gap-2">{actions}</span>}

        {footer && (
          <span className="mt-auto block pt-4">
            <span className="flex items-center justify-between gap-2 border-t border-[#f0c8ec] pt-3 text-[12px]">
              {footer}
            </span>
          </span>
        )}
      </span>
    </>
  );

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {content}
      </button>
    );
  }

  return <article className={classes}>{content}</article>;
}