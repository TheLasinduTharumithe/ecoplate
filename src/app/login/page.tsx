"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
    signInWithEmailAndPassword,
    GoogleAuthProvider,
    signInWithPopup,
} from "firebase/auth";
import {
    Eye,
    EyeOff,
    Loader2,
    Leaf,
    ShieldCheck,
    Sparkles,
    ArrowRight,
} from "lucide-react";
import { gsap } from "gsap";
import ThreeHeroBackground from "@/components/ThreeHeroBackground";

/* -------------------------------- Utilities -------------------------------- */

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

/* --------------------------------- Page ---------------------------------- */

export default function LoginPage() {
    const router = useRouter();

    const [email, setEmail] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [showPassword, setShowPassword] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const shellRef = React.useRef<HTMLDivElement | null>(null);
    const leftRef = React.useRef<HTMLDivElement | null>(null);
    const cardRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) return;
        if (!leftRef.current || !cardRef.current || !shellRef.current) return;

        const ctx = gsap.context(() => {
            gsap.set([".intro-chip", ".hero-title", ".hero-copy", ".hero-stat", ".login-card"], {
                opacity: 0,
                y: 24,
            });

            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

            tl.to(".intro-chip", { opacity: 1, y: 0, duration: 0.6 })
                .to(".hero-title", { opacity: 1, y: 0, duration: 0.8 }, "-=0.3")
                .to(".hero-copy", { opacity: 1, y: 0, duration: 0.7 }, "-=0.45")
                .to(".hero-stat", { opacity: 1, y: 0, duration: 0.55, stagger: 0.08 }, "-=0.35")
                .to(".login-card", { opacity: 1, y: 0, duration: 0.75 }, "-=0.55");

            gsap.to(".floating-orb-1", {
                y: -18,
                x: 8,
                duration: 5,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });

            gsap.to(".floating-orb-2", {
                y: 14,
                x: -10,
                duration: 6,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });

            gsap.to(".floating-orb-3", {
                y: -12,
                x: -8,
                duration: 7,
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut",
            });
        }, shellRef);

        return () => ctx.revert();
    }, []);

    React.useEffect(() => {
        const shell = shellRef.current;
        const card = cardRef.current;
        if (!shell || !card) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion) return;

        const handleMove = (e: MouseEvent) => {
            const rect = card.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;

            const rotateY = (px - 0.5) * 8;
            const rotateX = (0.5 - py) * 8;

            gsap.to(card, {
                rotateX,
                rotateY,
                transformPerspective: 1200,
                transformOrigin: "center",
                duration: 0.45,
                ease: "power3.out",
            });
        };

        const resetCard = () => {
            gsap.to(card, {
                rotateX: 0,
                rotateY: 0,
                duration: 0.6,
                ease: "power3.out",
            });
        };

        const handleClickBurst = (e: MouseEvent) => {
            const burst = document.createElement("div");
            burst.className =
                "pointer-events-none absolute rounded-full border border-emerald-300/30 bg-emerald-400/10";
            burst.style.left = `${e.clientX}px`;
            burst.style.top = `${e.clientY}px`;
            burst.style.width = "16px";
            burst.style.height = "16px";
            burst.style.transform = "translate(-50%, -50%)";
            burst.style.filter = "blur(0px)";
            burst.style.zIndex = "5";

            shell.appendChild(burst);

            gsap.fromTo(
                burst,
                {
                    scale: 0.3,
                    opacity: 0.75,
                },
                {
                    scale: 12,
                    opacity: 0,
                    duration: 0.9,
                    ease: "power3.out",
                    onComplete: () => burst.remove(),
                }
            );

            const core = document.createElement("div");
            core.className = "pointer-events-none absolute rounded-full";
            core.style.left = `${e.clientX}px`;
            core.style.top = `${e.clientY}px`;
            core.style.width = "10px";
            core.style.height = "10px";
            core.style.transform = "translate(-50%, -50%)";
            core.style.background =
                "radial-gradient(circle, rgba(110,231,183,0.95) 0%, rgba(52,211,153,0.45) 45%, rgba(52,211,153,0) 75%)";
            core.style.zIndex = "6";

            shell.appendChild(core);

            gsap.fromTo(
                core,
                { scale: 0.4, opacity: 0.95 },
                {
                    scale: 5,
                    opacity: 0,
                    duration: 0.65,
                    ease: "power2.out",
                    onComplete: () => core.remove(),
                }
            );
        };

        card.addEventListener("mousemove", handleMove);
        card.addEventListener("mouseleave", resetCard);
        shell.addEventListener("click", handleClickBurst);

        return () => {
            card.removeEventListener("mousemove", handleMove);
            card.removeEventListener("mouseleave", resetCard);
            shell.removeEventListener("click", handleClickBurst);
        };
    }, []);

    const inputCls =
        "w-full rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition duration-200 focus:border-emerald-400/50 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20";
    const labelCls = "mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/55";

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            router.push("/");
        } catch (error: any) {
            setErr(error?.message || "Login failed. Please check your credentials.");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        setErr(null);
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
            router.push("/");
        } catch (error: any) {
            setErr(error?.message || "Google sign-in failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main
            ref={shellRef}
            className="relative min-h-screen overflow-hidden bg-[#04110d] text-white"
        >
            {/* 3D background */}
            <ThreeHeroBackground className="absolute inset-0 z-0 opacity-80" />

            {/* layered overlays */}
            <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.24),transparent_22%),radial-gradient(circle_at_top_right,rgba(190,242,100,0.10),transparent_18%),radial-gradient(circle_at_bottom_right,rgba(52,211,153,0.10),transparent_22%),radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_30%)]" />
            <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-br from-black/35 via-[#04110d]/72 to-black/60" />

            {/* floating ambient blobs */}
            <div className="floating-orb-1 pointer-events-none absolute left-[8%] top-[12%] z-0 h-44 w-44 rounded-full bg-emerald-400/12 blur-3xl" />
            <div className="floating-orb-2 pointer-events-none absolute bottom-[10%] right-[10%] z-0 h-52 w-52 rounded-full bg-lime-300/10 blur-3xl" />
            <div className="floating-orb-3 pointer-events-none absolute right-[32%] top-[20%] z-0 h-36 w-36 rounded-full bg-emerald-300/8 blur-3xl" />

            <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-10 lg:px-8">
                <div className="grid w-full items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
                    {/* Left brand / story */}
                    <section ref={leftRef} className="hidden lg:block">
                        <div className="intro-chip inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200 backdrop-blur-xl">
                            <Sparkles className="h-4 w-4" />
                            Premium access experience
                        </div>

                        <h1 className="hero-title mt-6 max-w-2xl text-5xl font-semibold leading-[1.02] tracking-tight">
                            Welcome back to
                            <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                {" "}EcoPlate
              </span>
                        </h1>

                        <p className="hero-copy mt-6 max-w-xl text-base leading-8 text-white/68">
                            A modern food donation platform connecting restaurants with charities
                            through trusted, real-time coordination, cleaner logistics, and a
                            premium digital experience.
                        </p>

                        <div className="mt-10 grid max-w-2xl gap-4 sm:grid-cols-3">
                            {[
                                {
                                    icon: <Leaf className="h-4 w-4 text-emerald-300" />,
                                    value: "Reduce Waste",
                                    label: "Turn surplus into impact",
                                },
                                {
                                    icon: <ShieldCheck className="h-4 w-4 text-emerald-300" />,
                                    value: "Trusted Access",
                                    label: "Secure user authentication",
                                },
                                {
                                    icon: <ArrowRight className="h-4 w-4 text-emerald-300" />,
                                    value: "Real-Time Flow",
                                    label: "Fast restaurant-charity matching",
                                },
                            ].map((item) => (
                                <div
                                    key={item.value}
                                    className="hero-stat rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_10px_40px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                                >
                                    <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                        {item.icon}
                                    </div>
                                    <div className="text-sm font-semibold text-white">{item.value}</div>
                                    <div className="mt-1 text-xs leading-6 text-white/50">{item.label}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Right login card */}
                    <section className="mx-auto w-full max-w-md lg:max-w-none">
                        <div
                            ref={cardRef}
                            className="login-card relative overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-8 will-change-transform"
                            style={{ transformStyle: "preserve-3d" }}
                        >
                            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.10),rgba(255,255,255,0.02)_35%,transparent_60%)]" />
                            <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-emerald-400/12 blur-3xl" />
                            <div className="pointer-events-none absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-lime-300/8 blur-3xl" />

                            <div className="relative">
                                {/* mobile heading */}
                                <div className="mb-6 lg:hidden">
                                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-emerald-200">
                                        <Sparkles className="h-3.5 w-3.5" />
                                        EcoPlate access
                                    </div>
                                </div>

                                {/* header */}
                                <div className="mb-6 flex items-center gap-4">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/25 to-lime-300/10 shadow-[0_8px_24px_rgba(16,185,129,0.18)]">
                                        <span className="text-lg font-bold text-white">E</span>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-semibold tracking-tight text-white">
                                            Welcome Back
                                        </h2>
                                        <p className="mt-1 text-sm text-white/52">
                                            Sign in to continue your EcoPlate journey
                                        </p>
                                    </div>
                                </div>

                                {err && (
                                    <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                        {err}
                                    </div>
                                )}

                                <form onSubmit={handleLogin} className="space-y-4">
                                    <div>
                                        <label className={labelCls}>Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            required
                                            placeholder="name@example.com"
                                            className={inputCls}
                                        />
                                    </div>

                                    <div>
                                        <div className="mb-2 flex items-center justify-between">
                                            <label className={cx(labelCls, "mb-0")}>Password</label>
                                            <Link
                                                href="/forgot-password"
                                                className="text-xs font-medium text-emerald-300 transition hover:text-emerald-200"
                                            >
                                                Forgot password?
                                            </Link>
                                        </div>

                                        <div className="relative">
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                required
                                                placeholder="••••••••"
                                                className={cx(inputCls, "pr-12")}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/8 hover:text-white/70"
                                                aria-label={showPassword ? "Hide password" : "Show password"}
                                            >
                                                {showPassword ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="group mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3.5 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Signing In...
                                            </>
                                        ) : (
                                            <>
                                                Sign In
                                                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                                            </>
                                        )}
                                    </button>
                                </form>

                                <div className="my-5 flex items-center gap-3">
                                    <div className="h-px flex-1 bg-white/10" />
                                    <span className="text-xs uppercase tracking-[0.14em] text-white/35">
                    or continue
                  </span>
                                    <div className="h-px flex-1 bg-white/10" />
                                </div>

                                <button
                                    onClick={handleGoogleLogin}
                                    disabled={loading}
                                    className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/6 px-4 py-3.5 text-sm font-medium text-white/88 backdrop-blur-xl transition duration-200 hover:bg-white/10 disabled:opacity-60"
                                >
                                    <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0" aria-hidden>
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Continue with Google
                                </button>

                                <p className="mt-6 text-center text-sm text-white/48">
                                    Don&apos;t have an account?{" "}
                                    <Link
                                        href="/register"
                                        className="font-semibold text-emerald-300 transition hover:text-emerald-200"
                                    >
                                        Create one
                                    </Link>
                                </p>

                                <p className="mt-4 text-center text-[11px] leading-5 text-white/32">
                                    Secure access for restaurants and charities on the EcoPlate platform.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </main>
    );
}