// Shared by the rendered images and early preloads so responsive requests match.
export const authHeroImage = {
  src: "/auth-banner.webp",
  alt: "",
  width: 1536,
  height: 1024,
  sizes:
    "(max-width: 1023px) 1px, (min-width: 1564px) 799px, (min-width: 1280px) calc(55vw - 61.6px), calc(55vw - 52.8px)",
};

export const authLogoImage = {
  src: "/auth-logo.webp",
  alt: "Doctor Tracker",
  width: 912,
  height: 1148,
  sizes: "(min-width: 1280px) 152px, 128px",
};

export const pageBackgroundImage = "/background.webp";
