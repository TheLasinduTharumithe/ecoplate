"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import {
    ChevronDown,
    LogOut,
    Menu,
    Star,
    User as UserIcon,
    UtensilsCrossed,
    X,
} from "lucide-react";

type NavItem = { href: string; label: string };

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function cleanStr(v: any) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s) return null;
    const invalid = ["null", "undefined", "false", "0"];
    if (invalid.includes(s.toLowerCase())) return null;
    return s;
}

function normalizeAvatar(v: any) {
    const s = cleanStr(v);
    if (!s) return null;
    if (s.startsWith("http://") || s.startsWith("https://")) return s;
    if (s.startsWith("data:image")) return s;
    if (/^[A-Za-z0-9+/=]+$/.test(s) && s.length > 200) return `data:image/png;base64,${s}`;
    return null;
}

export default function RestaurantNavbar() {
    const pathname = usePathname();

    const [authUser, setAuthUser] = useState<User | null>(null);
    const [userData, setUserData] = useState<any>(null);
    const [open, setOpen] = useState(false);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [imgSrc, setImgSrc] = useState("/default-avatar.png");

    const dropdownRef = useRef<HTMLDivElement>(null);

    const navItems: NavItem[] = useMemo(
        () => [
            { href: "/", label: "Dashboard" },
            { href: "/post-donation", label: "Post Donation" },
            { href: "/my-donations", label: "My Donations" },
        ],
        []
    );

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setAuthUser(u);
            if (!u) {
                setUserData(null);
                return;
            }

            const snap = await getDoc(doc(db, "users", u.uid));
            if (snap.exists()) setUserData(snap.data());
            else setUserData(null);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const firestoreAvatar = normalizeAvatar(userData?.avatar);
        const googleAvatar = cleanStr(authUser?.photoURL);
        setImgSrc(firestoreAvatar || googleAvatar || "/default-avatar.png");
    }, [userData, authUser]);

    useEffect(() => {
        setOpen(false);
        setDropdownOpen(false);
    }, [pathname]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const isActive = (href: string) => pathname === href || pathname?.startsWith(href + "/");
    const displayName = userData?.name || authUser?.displayName || "User";
    const email = userData?.email || authUser?.email || "";

    const dropdownItems = [
        { icon: <UserIcon className="h-4 w-4" />, label: "Profile", href: "/profile" },
        { icon: <Star className="h-4 w-4" />, label: "Rate Us", href: "/rate-us" },
    ];

    return (
        <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#04110d]/78 backdrop-blur-2xl">
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02)_35%,transparent)]" />

            <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                {/* Brand */}
                <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/25 to-lime-300/10 shadow-[0_8px_24px_rgba(16,185,129,0.18)]">
                        <UtensilsCrossed className="h-5 w-5 text-emerald-200" />
                    </div>

                    <div>
                        <div className="text-sm font-semibold tracking-wide text-white">
                            EcoPlate
                        </div>
                        <div className="text-xs font-medium text-emerald-200/75">
                            Restaurant Portal
                        </div>
                    </div>
                </div>

                {/* Desktop Nav */}
                <div className="hidden items-center gap-2 md:flex">
                    {navItems.map((item) => {
                        const active = isActive(item.href);

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cx(
                                    "rounded-2xl px-4 py-2.5 text-sm font-medium transition duration-200",
                                    active
                                        ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116] shadow-[0_10px_30px_rgba(52,211,153,0.22)]"
                                        : "border border-white/8 bg-white/5 text-white/80 backdrop-blur-xl hover:bg-white/10 hover:text-white"
                                )}
                            >
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Desktop User */}
                <div className="hidden items-center md:flex">
                    <div className="relative" ref={dropdownRef}>
                        <button
                            onClick={() => setDropdownOpen((v) => !v)}
                            className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-2.5 py-2 text-left text-white/90 backdrop-blur-xl transition hover:bg-white/[0.1]"
                        >
                            <img
                                src={imgSrc}
                                alt="Profile"
                                className="h-10 w-10 rounded-full border border-emerald-300/30 object-cover"
                                referrerPolicy="no-referrer"
                                onError={() => {
                                    if (imgSrc !== "/default-avatar.png") setImgSrc("/default-avatar.png");
                                }}
                            />

                            <div className="min-w-0">
                                <div className="max-w-[150px] truncate text-sm font-semibold text-white">
                                    {displayName}
                                </div>
                                <div className="max-w-[150px] truncate text-xs text-white/45">
                                    Restaurant account
                                </div>
                            </div>

                            <ChevronDown
                                className={cx(
                                    "h-4 w-4 text-white/45 transition-transform duration-200",
                                    dropdownOpen && "rotate-180"
                                )}
                            />
                        </button>

                        {dropdownOpen && (
                            <div className="absolute right-0 mt-3 w-64 overflow-hidden rounded-[26px] border border-white/10 bg-[#0a1813]/95 shadow-[0_20px_70px_rgba(0,0,0,0.38)] backdrop-blur-2xl">
                                <div className="border-b border-white/8 px-4 py-4">
                                    <div className="flex items-center gap-3">
                                        <img
                                            src={imgSrc}
                                            alt="Profile"
                                            className="h-11 w-11 rounded-full border border-emerald-300/30 object-cover"
                                            referrerPolicy="no-referrer"
                                            onError={() => {
                                                if (imgSrc !== "/default-avatar.png") setImgSrc("/default-avatar.png");
                                            }}
                                        />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold text-white">
                                                {displayName}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-white/45">{email}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-2">
                                    {dropdownItems.map((item) => (
                                        <Link
                                            key={item.href}
                                            href={item.href}
                                            onClick={() => setDropdownOpen(false)}
                                            className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-white/78 transition hover:bg-white/8 hover:text-white"
                                        >
                                            <span className="text-white/40">{item.icon}</span>
                                            {item.label}
                                        </Link>
                                    ))}

                                    <div className="my-2 border-t border-white/8" />

                                    <button
                                        onClick={() => {
                                            setDropdownOpen(false);
                                            signOut(auth);
                                        }}
                                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-red-300 transition hover:bg-red-500/10"
                                    >
                                        <LogOut className="h-4 w-4" />
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Mobile Toggle */}
                <button
                    onClick={() => setOpen((v) => !v)}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.06] text-white/80 backdrop-blur-xl transition hover:bg-white/[0.1] md:hidden"
                    aria-label="Toggle menu"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </nav>

            {/* Mobile Menu */}
            <div
                className={cx(
                    "overflow-hidden transition-[max-height] duration-300 md:hidden",
                    open ? "max-h-[700px]" : "max-h-0"
                )}
            >
                <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6">
                    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-4 backdrop-blur-2xl">
                        {/* User Info */}
                        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/8 bg-black/10 p-3">
                            <img
                                src={imgSrc}
                                alt="Profile"
                                className="h-11 w-11 rounded-full border border-emerald-300/30 object-cover"
                                referrerPolicy="no-referrer"
                                onError={() => {
                                    if (imgSrc !== "/default-avatar.png") setImgSrc("/default-avatar.png");
                                }}
                            />
                            <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-white">
                                    {displayName}
                                </div>
                                <div className="truncate text-xs text-white/45">{email}</div>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            {navItems.map((item) => {
                                const active = isActive(item.href);

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cx(
                                            "rounded-2xl px-4 py-3 text-sm font-medium transition",
                                            active
                                                ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116] shadow-[0_10px_30px_rgba(52,211,153,0.22)]"
                                                : "border border-white/8 bg-white/5 text-white/80 hover:bg-white/10"
                                        )}
                                    >
                                        {item.label}
                                    </Link>
                                );
                            })}

                            <div className="my-2 border-t border-white/8" />

                            <Link
                                href="/profile"
                                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
                            >
                                <UserIcon className="h-4 w-4 text-white/40" />
                                Profile
                            </Link>

                            <Link
                                href="/rate-us"
                                className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10"
                            >
                                <Star className="h-4 w-4 text-white/40" />
                                Rate Us
                            </Link>

                            <button
                                onClick={() => signOut(auth)}
                                className="flex items-center gap-3 rounded-2xl bg-red-500/10 px-4 py-3 text-left text-sm font-medium text-red-300 transition hover:bg-red-500/15"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}