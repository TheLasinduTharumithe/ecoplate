import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import GeminiChatbot from "@/components/GeminiChatbot";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    metadataBase: new URL("https://ecoplate-bay.vercel.app/"), // 🔴 CHANGE THIS to your real domain

    title: {
        default: "EcoPlate",
        template: "%s | EcoPlate",
    },

    description:
        "Reduce food waste with EcoPlate — a premium real-time donation platform powered by AI.",

    keywords: [
        "EcoPlate",
        "food donation",
        "reduce food waste",
        "charity",
        "AI donation platform",
    ],

    authors: [{ name: "EcoPlate Team" }],

    openGraph: {
        title: "EcoPlate - Reduce Food Waste",
        description:
            "Join EcoPlate to connect surplus food with those in need through a smart, real-time donation system.",
        url: "https://ecoplate-bay.vercel.app/",
        siteName: "EcoPlate",
        images: [
            {
                url: "/og-image.jpg", // 🔴 place this in public folder
                width: 1200,
                height: 630,
                alt: "EcoPlate Preview",
            },
        ],
        locale: "en_US",
        type: "website",
    },

    twitter: {
        card: "summary_large_image",
        title: "EcoPlate - Reduce Food Waste",
        description:
            "A premium AI-powered platform connecting surplus food to charities in real time.",
        images: ["/og-image.jpg"],
    },

    icons: {
        icon: "/favicon.ico",
        shortcut: "/favicon.ico",
        apple: "/apple-icon.png",
    },
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
        {children}

        <GeminiChatbot />
        </body>
        </html>
    );
}