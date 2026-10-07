import Link, { type LinkProps } from "next/link";
import type { ComponentProps } from "react";

/** Avoid rendering every linked page on the server just because it is visible. */
export default function AppLink(props: ComponentProps<typeof Link> & LinkProps) {
  return <Link {...props} prefetch={false} />;
}
