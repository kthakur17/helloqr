// Font styles for printed cards. Loaded only on the QR page (preload: false), so the rest of
// the site keeps its own two fonts.
import { DM_Sans, DM_Serif_Display, Inter, Montserrat, Outfit, Playfair_Display, Plus_Jakarta_Sans, Poppins, Space_Grotesk } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["700", "800"], preload: false, variable: "--cf-jakarta" });
const inter = Inter({ subsets: ["latin"], preload: false, variable: "--cf-inter" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "700"], preload: false, variable: "--cf-poppins" });
const montserrat = Montserrat({ subsets: ["latin"], preload: false, variable: "--cf-montserrat" });
const space = Space_Grotesk({ subsets: ["latin"], preload: false, variable: "--cf-space" });
const outfit = Outfit({ subsets: ["latin"], preload: false, variable: "--cf-outfit" });
const playfair = Playfair_Display({ subsets: ["latin"], preload: false, variable: "--cf-playfair" });
const dmSerif = DM_Serif_Display({ subsets: ["latin"], weight: "400", preload: false, variable: "--cf-dmserif" });
const dmSans = DM_Sans({ subsets: ["latin"], preload: false, variable: "--cf-dmsans" });

export interface CardFont {
  label: string;
  /** Font for the name. */
  heading: string;
  headingWeight: number;
  /** Font for everything else on the card. */
  body: string;
}

export const CARD_FONTS = {
  jakarta: { label: "Modern", heading: jakarta.style.fontFamily, headingWeight: 800, body: inter.style.fontFamily },
  inter: { label: "Neutral", heading: inter.style.fontFamily, headingWeight: 700, body: inter.style.fontFamily },
  poppins: { label: "Friendly", heading: poppins.style.fontFamily, headingWeight: 700, body: poppins.style.fontFamily },
  montserrat: { label: "Strong", heading: montserrat.style.fontFamily, headingWeight: 800, body: montserrat.style.fontFamily },
  space: { label: "Tech", heading: space.style.fontFamily, headingWeight: 700, body: inter.style.fontFamily },
  outfit: { label: "Clean", heading: outfit.style.fontFamily, headingWeight: 700, body: outfit.style.fontFamily },
  playfair: { label: "Classic", heading: playfair.style.fontFamily, headingWeight: 700, body: inter.style.fontFamily },
  dmserif: { label: "Elegant", heading: dmSerif.style.fontFamily, headingWeight: 400, body: dmSans.style.fontFamily },
} satisfies Record<string, CardFont>;

export type CardFontKey = keyof typeof CARD_FONTS;
export const CARD_FONT_KEYS = Object.keys(CARD_FONTS) as CardFontKey[];

/** Putting these classes on the page is what registers the @font-face rules. */
export const cardFontVariables = [jakarta, inter, poppins, montserrat, space, outfit, playfair, dmSerif, dmSans].map((f) => f.variable).join(" ");
