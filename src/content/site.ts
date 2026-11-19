export const site = {
  name: "HelloQR",
  title: "HelloQR: your digital business card",
  description:
    "One link and one QR code for your LinkedIn, X, GitHub, website and contact details. People scan it, save your contact, and open each profile in its app.",
  url: process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000",
};

/** Who runs HelloQR. Shown on the About, Privacy and Terms pages. */
export const owner = {
  name: "Kunal Singh Thakur",
  city: "Indore, India",
  email: "singhkunalthakur89@gmail.com",
  linkedin: "https://www.linkedin.com/in/kunal-singh-a066a22a0",
  card: "/kunal-singh",
};

export const legal = {
  effective: "18 November 2026",
  minimumAge: 18,
};
