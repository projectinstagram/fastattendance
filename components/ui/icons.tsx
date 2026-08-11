type IconProps = { className?: string };

const base = "h-[18px] w-[18px]";
const common = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function BookIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <path d="M4 5.5C4 4.67 4.67 4 5.5 4H12v16H5.5A1.5 1.5 0 0 1 4 18.5v-13Z" />
      <path d="M20 5.5c0-.83-.67-1.5-1.5-1.5H12v16h6.5c.83 0 1.5-.67 1.5-1.5v-13Z" />
    </svg>
  );
}

export function BroadcastIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <path d="M8.5 8.5a5 5 0 0 0 0 7" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M5.8 5.8a9 9 0 0 0 0 12.4" />
      <path d="M18.2 5.8a9 9 0 0 1 0 12.4" />
    </svg>
  );
}

export function ListIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <path d="M9 6h11" />
      <path d="M9 12h11" />
      <path d="M9 18h11" />
      <path d="M4.5 6h.01" />
      <path d="M4.5 12h.01" />
      <path d="M4.5 18h.01" />
    </svg>
  );
}

export function RingIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <circle cx="12" cy="12" r="7.5" />
      <path d="M12 4.5A7.5 7.5 0 0 1 19.5 12" />
    </svg>
  );
}

export function BadgeIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <circle cx="12" cy="8.5" r="3.2" />
      <path d="M7 20.5c.7-3 2.6-4.6 5-4.6s4.3 1.6 5 4.6" />
    </svg>
  );
}

export function MailIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" />
      <path d="m4.5 7 7.5 5.5L19.5 7" />
    </svg>
  );
}

export function InboxIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <path d="M4 12.5 6.2 5.8A1.5 1.5 0 0 1 7.6 4.8h8.8a1.5 1.5 0 0 1 1.4 1L20 12.5" />
      <path d="M4 12.5h4.8a2 2 0 0 1 1.9 1.3l.2.6a1.6 1.6 0 0 0 1.5 1.1h.8a1.6 1.6 0 0 0 1.5-1.1l.2-.6a2 2 0 0 1 1.9-1.3H20" />
      <path d="M4 12.5v5A1.6 1.6 0 0 0 5.6 19h12.8A1.6 1.6 0 0 0 20 17.5v-5" />
    </svg>
  );
}

export function CalendarIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17" />
      <path d="M8 3v4" />
      <path d="M16 3v4" />
    </svg>
  );
}

export function ArrowRightIcon({ className = "" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={`${base} ${className}`} {...common}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}
