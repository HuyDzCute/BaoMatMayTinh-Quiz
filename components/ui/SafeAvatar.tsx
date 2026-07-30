"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";

/**
 * Avatar / photo image với graceful fallback khi URL lỗi.
 *
 * Dùng cho Google OAuth `photoURL` (URL từ bên ngoài, không whitelist được).
 * Nếu load fail → render placeholder initials.
 */
export interface SafeAvatarProps extends Omit<ImageProps, "src" | "alt" | "onError"> {
  src: string | null | undefined;
  alt: string;
  fallback: React.ReactNode;
  unoptimized?: boolean;
}

export function SafeAvatar({ src, alt, fallback, unoptimized = true, ...rest }: SafeAvatarProps) {
  const [errored, setErrored] = useState(false);
  if (!src || errored) return <>{fallback}</>;
  return (
    <Image
      {...rest}
      src={src}
      alt={alt}
      unoptimized={unoptimized}
      onError={() => setErrored(true)}
      referrerPolicy="no-referrer"
    />
  );
}
