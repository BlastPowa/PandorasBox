import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function BaseIcon({ size = 20, children, style, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="var(--pbox-icon-stroke, 1.8)"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ opacity: "var(--pbox-icon-opacity, 1)", ...style }}
      {...props}
    >
      {children}
    </svg>
  );
}

export function PBoxPlayIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M8.2 6.2v11.6l9-5.8-9-5.8Z" fill="currentColor" stroke="none" /><path d="M4.5 4.5h15v15h-15z" opacity=".34" /></BaseIcon>;
}

export function PBoxPauseIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M8.5 7.2v9.6M15.5 7.2v9.6" strokeWidth="2.5" /><path d="M4.5 4.5h15v15h-15z" opacity=".34" /></BaseIcon>;
}

export function PBoxBack10Icon(props: IconProps) {
  return <BaseIcon {...props}><path d="M7 7H3.8V3.8" /><path d="M4.2 7.1A8.2 8.2 0 1 1 4 16" /><path d="M9.1 10.2 7.4 12h1.7v2.3M12.2 10.2v4.1M12.2 10.2h2.2v4.1h-2.2" /></BaseIcon>;
}

export function PBoxForward10Icon(props: IconProps) {
  return <BaseIcon {...props}><path d="M17 7h3.2V3.8" /><path d="M19.8 7.1A8.2 8.2 0 1 0 20 16" /><path d="M9.1 10.2 7.4 12h1.7v2.3M12.2 10.2v4.1M12.2 10.2h2.2v4.1h-2.2" /></BaseIcon>;
}

export function PBoxVolumeIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 10v4h3l4 3V7L8 10H5Z" /><path d="M15 9.4c1.2 1.4 1.2 3.8 0 5.2M17.6 7.1c2.7 2.7 2.7 7.1 0 9.8" /></BaseIcon>;
}

export function PBoxMuteIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 10v4h3l4 3V7L8 10H5Z" /><path d="m16 10 4 4m0-4-4 4" /></BaseIcon>;
}

export function PBoxCaptionsIcon(props: IconProps) {
  return <BaseIcon {...props}><rect x="3.5" y="5.5" width="17" height="13" rx="2.5" /><path d="M10 10.2c-.5-.6-1.1-.9-1.9-.9-1.5 0-2.6 1.1-2.6 2.7s1.1 2.7 2.6 2.7c.8 0 1.4-.3 1.9-.9M18.5 10.2c-.5-.6-1.1-.9-1.9-.9-1.5 0-2.6 1.1-2.6 2.7s1.1 2.7 2.6 2.7c.8 0 1.4-.3 1.9-.9" /></BaseIcon>;
}

export function PBoxPipIcon(props: IconProps) {
  return <BaseIcon {...props}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M12.5 12h6v4.5h-6z" fill="currentColor" stroke="none" /></BaseIcon>;
}

export function PBoxFullscreenIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M4.5 9V4.5H9M15 4.5h4.5V9M19.5 15v4.5H15M9 19.5H4.5V15" /><path d="M9.5 9.5h5v5h-5z" opacity=".35" /></BaseIcon>;
}

export function PBoxMirrorIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="m12 3 7.5 4.2v9.6L12 21l-7.5-4.2V7.2L12 3Z" /><path d="m4.8 7.4 7.2 4 7.2-4M12 11.4V21" /><circle cx="12" cy="11.4" r="1.5" fill="currentColor" stroke="none" /></BaseIcon>;
}

export function PBoxSettingsIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M5 7h8M17 7h2M5 12h2M11 12h8M5 17h6M15 17h4" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="13" cy="17" r="2" /></BaseIcon>;
}
