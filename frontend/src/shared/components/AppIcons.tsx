import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

function IconBase({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function LogoIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true" {...props}>
      <rect x="4" y="14" width="18" height="18" rx="4" fill="#4CC9F0" />
      <rect x="20" y="4" width="18" height="18" rx="4" fill="#2F80ED" />
      <rect x="20" y="26" width="18" height="18" rx="4" fill="#00B894" />
      <path
        d="M12 23h24M24 11v24"
        stroke="#fff"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 13h7V4H4zM13 20h7v-7h-7zM13 4h7v5h-7zM4 20h7v-5H4z" />
    </IconBase>
  );
}

export function InventoryIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 7h16l-1.5 10h-13z" />
      <path d="M7 7V5h10v2M9 11h6M9 15h4" />
    </IconBase>
  );
}

export function SalesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 5h14v14H5z" />
      <path d="M9 9h6M9 13h6M9 17h3" />
    </IconBase>
  );
}

export function PurchasesIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 8h12l2 3v8H4v-8z" />
      <path d="M9 8V5h6v3M12 12v4M10 14h4" />
    </IconBase>
  );
}

export function ReportsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 19V9M12 19V5M19 19v-8" />
      <path d="M3 19h18" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .16 1.7 1.7 0 0 0-.9 1.53V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-.9-1.53 1.7 1.7 0 0 0-1-.16 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.16-1 1.7 1.7 0 0 0-1.53-.9H2.9a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.53-.9 1.7 1.7 0 0 0 .16-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.16 1.7 1.7 0 0 0 .9-1.53V2.9a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 .9 1.53 1.7 1.7 0 0 0 1 .16 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c0 .35.06.69.16 1a1.7 1.7 0 0 0 1.53.9h.09a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.53.9c-.1.31-.16.65-.16 1z" />
    </IconBase>
  );
}

export function CatalogIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 4h10a3 3 0 0 1 3 3v13H9a3 3 0 0 0-3 3z" />
      <path d="M6 4v16a3 3 0 0 1 3-3h10" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function BellIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 8a6 6 0 0 1 12 0v5l2 3H4l2-3z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function MessageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H9l-4 3v-3H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z" />
      <path d="M8 11h8M8 15h5" />
    </IconBase>
  );
}

export function ShieldIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 3 5 6v6c0 5 3.5 8 7 9 3.5-1 7-4 7-9V6z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.4" />
    </IconBase>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20a6 6 0 0 1 12 0" />
    </IconBase>
  );
}

export function LogoutIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="M10 17l5-5-5-5M15 12H3" />
    </IconBase>
  );
}

export function ChevronDownIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function BoxIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 8 12 4l8 4-8 4z" />
      <path d="M4 8v8l8 4 8-4V8M12 12v8" />
    </IconBase>
  );
}

export function CreditCardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M3 10h18M7 15h4" />
    </IconBase>
  );
}

export function ReceiptIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M7 3h10v18l-2-1.5L12 21l-3-1.5L7 21z" />
      <path d="M9 8h6M9 12h6M9 16h4" />
    </IconBase>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4h6v3H9z" />
      <path d="M7 7h10v13H7z" />
    </IconBase>
  );
}
