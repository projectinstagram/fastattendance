import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "ghostDark" | "danger" | "success";
type Size = "sm" | "md";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-ink-950 text-paper hover:bg-ink-800",
  secondary: "border border-ink-900/15 bg-white text-ink-950 hover:bg-ink-900/5",
  ghost: "text-ink-700 hover:bg-ink-900/5",
  ghostDark: "border border-paper/25 bg-transparent text-paper hover:bg-paper/10",
  danger: "bg-signal-absent text-paper hover:bg-[#963522]",
  success: "bg-signal-present text-paper hover:bg-[#186f4b]",
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-5 py-2.5 text-sm",
};

type BaseProps = {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  className?: string;
};

type ButtonAsButton = BaseProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
    href?: undefined;
    loading?: boolean;
  };

type ButtonAsLink = BaseProps & {
  href: string;
  disabled?: boolean;
};

export default function Button(props: ButtonAsButton | ButtonAsLink) {
  const { variant = "primary", size = "md", children, className = "" } = props;
  const classes = `inline-flex items-center justify-center gap-2 rounded-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`;

  if ("href" in props && props.href) {
    if (props.disabled) {
      return (
        <span className={classes} aria-disabled="true">
          {children}
        </span>
      );
    }
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    );
  }

  const { variant: _v, size: _s, children: _c, className: _cn, href: _h, loading, ...rest } = props as ButtonAsButton;

  return (
    <button {...rest} disabled={rest.disabled || loading} className={classes}>
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
        />
      )}
      {children}
    </button>
  );
}
