"use client";

import Image from "next/image";
import { BookOpen } from "lucide-react";
import { useState } from "react";

interface BookCoverProps {
  src: string | null;
  title: string;
  sizes: string;
  priority?: boolean;
  className?: string;
  fallbackTitleClassName?: string;
}

export function BookCover({
  src,
  title,
  sizes,
  priority = false,
  className = "object-cover",
  fallbackTitleClassName = "text-sm",
}: BookCoverProps) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (!src || failedSrc === src) {
    return (
      <div className="grid size-full place-items-center bg-[linear-gradient(160deg,var(--bg-elevated),var(--bg-surface))] px-5 text-center">
        <div>
          <BookOpen className="mx-auto size-8 text-[var(--accent)]" aria-hidden="true" />
          <p className={`mt-3 line-clamp-4 font-display font-bold text-[var(--text-secondary)] ${fallbackTitleClassName}`}>
            {title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={title}
      fill
      sizes={sizes}
      priority={priority}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
