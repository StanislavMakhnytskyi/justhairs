import { DM_Sans, Bricolage_Grotesque } from "next/font/google";

// Product UI face.
export const sans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

// Display face — used only for the logo/wordmark, so the brand mark never looks
// like body copy.
export const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "800"],
});
