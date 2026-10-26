"use client";

import { authHeroImage, authLogoImage, pageBackgroundImage } from "@/config/auth-images";
import { getImageProps } from "next/image";
import { usePathname } from "next/navigation";

export default function ImagePreloads() {
  const pathname = usePathname();
  const isAuthPage = pathname === "/signin" || pathname === "/login";

  if (!isAuthPage && pathname !== "/") return null;

  const hero = getImageProps(authHeroImage).props;
  const logo = getImageProps(authLogoImage).props;

  // This component is server-rendered outside the client-only Redux/PersistGate.
  // The browser can fetch images before the login form mounts after hydration.
  return (
    <>
      <link rel="preload" as="image" href={pageBackgroundImage} />
      {isAuthPage && (
        <>
          <link
            rel="preload"
            as="image"
            href={hero.src}
            imageSrcSet={hero.srcSet}
            imageSizes={hero.sizes}
            media="(min-width: 1024px)"
            fetchPriority="high"
          />
          <link
            rel="preload"
            as="image"
            href={logo.src}
            imageSrcSet={logo.srcSet}
            imageSizes={logo.sizes}
            fetchPriority="high"
          />
        </>
      )}
    </>
  );
}
