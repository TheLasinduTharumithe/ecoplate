import type { Config } from "tailwindcss";

const config: Config = {
    darkMode: "class",
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                background: "#04110d",
                foreground: "#f5fff9",

                surface: {
                    DEFAULT: "rgba(255,255,255,0.06)",
                    soft: "rgba(255,255,255,0.04)",
                    strong: "rgba(255,255,255,0.1)",
                },

                border: {
                    DEFAULT: "rgba(255,255,255,0.1)",
                    strong: "rgba(255,255,255,0.16)",
                },

                primary: {
                    DEFAULT: "#34d399",
                    light: "#6ee7b7",
                    soft: "#a7f3d0",
                    dark: "#10b981",
                    foreground: "#062116",
                },

                accent: {
                    DEFAULT: "#bef264",
                    soft: "#d9f99d",
                    dark: "#84cc16",
                    foreground: "#1a2e05",
                },

                luxury: {
                    emerald: "#34d399",
                    jade: "#10b981",
                    lime: "#bef264",
                    pearl: "#f5fff9",
                    graphite: "#071a14",
                    obsidian: "#03100c",
                    mist: "rgba(255,255,255,0.08)",
                },

                success: "#22c55e",
                warning: "#fbbf24",
                danger: "#f87171",
            },

            borderRadius: {
                sm: "0.875rem",
                DEFAULT: "1rem",
                lg: "1.25rem",
                xl: "1.5rem",
                "2xl": "2rem",
                "3xl": "2.25rem",
            },

            boxShadow: {
                soft: "0 10px 30px rgba(0,0,0,0.18)",
                glass: "0 24px 90px rgba(0,0,0,0.38)",
                glow: "0 0 30px rgba(52,211,153,0.18)",
                luxury: "0 18px 60px rgba(0,0,0,0.32)",
            },

            backdropBlur: {
                xs: "2px",
            },

            backgroundImage: {
                "eco-luxury-gradient":
                    "linear-gradient(135deg, #03100c 0%, #04110d 45%, #071a14 100%)",
                "premium-mesh":
                    "radial-gradient(circle at top left, rgba(16,185,129,0.22), transparent 24%), radial-gradient(circle at bottom right, rgba(190,242,100,0.10), transparent 18%), radial-gradient(circle at center, rgba(255,255,255,0.04), transparent 34%)",
                "glass-highlight":
                    "linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.02) 35%, transparent 100%)",
                "emerald-lime":
                    "linear-gradient(135deg, #34d399 0%, #bef264 100%)",
                "emerald-glow":
                    "radial-gradient(circle, rgba(52,211,153,0.18) 0%, rgba(52,211,153,0) 70%)",
            },

            keyframes: {
                floatSoft: {
                    "0%, 100%": { transform: "translateY(0px)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                pulseGlow: {
                    "0%, 100%": { boxShadow: "0 0 0 rgba(52,211,153,0.12)" },
                    "50%": { boxShadow: "0 0 28px rgba(52,211,153,0.18)" },
                },
                fadeUpLuxury: {
                    "0%": {
                        opacity: "0",
                        transform: "translateY(24px) scale(0.985)",
                        filter: "blur(8px)",
                    },
                    "100%": {
                        opacity: "1",
                        transform: "translateY(0) scale(1)",
                        filter: "blur(0)",
                    },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },

            animation: {
                "float-soft": "floatSoft 6s ease-in-out infinite",
                "pulse-glow": "pulseGlow 3.2s ease-in-out infinite",
                "fade-up-luxury": "fadeUpLuxury 0.7s cubic-bezier(0.22,1,0.36,1)",
                shimmer: "shimmer 2.8s linear infinite",
            },

            fontFamily: {
                sans: ["var(--font-geist-sans)", "Arial", "Helvetica", "sans-serif"],
                mono: ["var(--font-geist-mono)", "monospace"],
            },
        },
    },
    plugins: [],
};

export default config;