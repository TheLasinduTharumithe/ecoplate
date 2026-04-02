// app/rate-us/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import {
    ArrowLeft,
    CheckCircle,
    Loader2,
    Sparkles,
    Star,
    MessageSquareText,
    HeartHandshake,
} from "lucide-react";

const OVERALL_LABELS: Record<number, { text: string; color: string }> = {
    1: { text: "Poor", color: "text-red-300" },
    2: { text: "Fair", color: "text-orange-300" },
    3: { text: "Good", color: "text-yellow-300" },
    4: { text: "Very Good", color: "text-lime-300" },
    5: { text: "Excellent", color: "text-emerald-300" },
};

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function StarRow({
                     value,
                     onChange,
                     size = "md",
                 }: {
    value: number;
    onChange: (v: number) => void;
    size?: "sm" | "md" | "lg";
}) {
    const [hovered, setHovered] = React.useState(0);
    const active = hovered || value;
    const sz = size === "lg" ? "h-10 w-10" : size === "sm" ? "h-5 w-5" : "h-6 w-6";

    return (
        <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
                <button
                    key={n}
                    type="button"
                    onClick={() => onChange(n)}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    className="focus:outline-none transition-transform hover:scale-125 active:scale-95"
                    aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                >
                    <Star
                        className={cx(sz, "transition-all duration-150")}
                        style={{
                            fill: n <= active ? "#FBBF24" : "transparent",
                            color: n <= active ? "#FBBF24" : "rgba(255,255,255,0.2)",
                        }}
                    />
                </button>
            ))}
        </div>
    );
}

export default function RateUsPage() {
    const router = useRouter();
    const [authUser, setAuthUser] = React.useState<User | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);

    const [overall, setOverall] = React.useState(0);
    const [comment, setComment] = React.useState("");

    const [submitting, setSubmitting] = React.useState(false);
    const [submitted, setSubmitted] = React.useState(false);
    const [alreadyRated, setAlreadyRated] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setAuthUser(u || null);
            setLoadingUser(false);

            if (!u) return;

            try {
                const q = query(collection(db, "ratings"), where("userId", "==", u.uid));
                const snap = await getDocs(q);
                if (!snap.empty) setAlreadyRated(true);
            } catch {}
        });

        return () => unsub();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);

        if (overall === 0) {
            setErr("Please select an overall rating.");
            return;
        }
        if (!authUser) {
            setErr("You must be logged in to rate.");
            return;
        }

        setSubmitting(true);
        try {
            await addDoc(collection(db, "ratings"), {
                userId: authUser.uid,
                userEmail: authUser.email,
                overall,
                comment: comment.trim(),
                createdAt: serverTimestamp(),
            });
            setSubmitted(true);
        } catch (e: any) {
            setErr(e?.message || "Failed to submit. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
            </div>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#04110d] px-4 py-8 text-white">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(163,230,53,0.12),transparent_18%),radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_34%)]" />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/35 via-[#04110d]/70 to-black/55" />

            <div className="relative z-10 mx-auto max-w-5xl">
                <button
                    onClick={() => router.back()}
                    className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/75 backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                </button>

                {alreadyRated && !submitted ? (
                    <div className="mx-auto max-w-2xl rounded-[34px] border border-white/10 bg-white/[0.08] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-10">
                        <div className="mb-5 flex justify-center gap-2">
                            {[1, 2, 3, 4, 5].map((n) => (
                                <Star key={n} className="h-8 w-8 fill-amber-400 text-amber-400" />
                            ))}
                        </div>

                        <h2 className="text-2xl font-semibold text-white">Already Rated</h2>
                        <p className="mt-3 text-sm leading-7 text-white/55">
                            You have already shared your feedback for EcoPlate. Thank you for helping us improve the platform.
                        </p>

                        <button
                            onClick={() => router.back()}
                            className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition hover:scale-[1.01]"
                        >
                            Go Back
                        </button>
                    </div>
                ) : submitted ? (
                    <div className="mx-auto max-w-2xl rounded-[34px] border border-white/10 bg-white/[0.08] p-8 text-center shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl sm:p-10">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/12">
                            <CheckCircle className="h-8 w-8 text-emerald-300" />
                        </div>

                        <h2 className="text-2xl font-semibold text-white">Thank You</h2>
                        <p className="mt-3 text-sm leading-7 text-white/55">
                            Your feedback helps us make EcoPlate better for restaurants, charities, and the communities they support.
                        </p>

                        <button
                            onClick={() => router.back()}
                            className="mt-6 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition hover:scale-[1.01]"
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                        {/* Left intro */}
                        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                Premium feedback experience
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                Rate
                                <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                  {" "}EcoPlate
                </span>
                            </h1>

                            <p className="mt-5 max-w-md text-sm leading-8 text-white/65 sm:text-base">
                                Your experience matters. Share how EcoPlate feels in real use so we can keep improving the platform for restaurants and charities.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-2">
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                        <HeartHandshake className="h-4 w-4 text-emerald-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-white">Impact Driven</p>
                                    <p className="mt-1 text-xs leading-6 text-white/45">
                                        Help improve a platform built around food rescue and community support.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                        <MessageSquareText className="h-4 w-4 text-emerald-300" />
                                    </div>
                                    <p className="text-sm font-semibold text-white">Your Voice</p>
                                    <p className="mt-1 text-xs leading-6 text-white/45">
                                        Short comments help us improve usability, performance, and trust.
                                    </p>
                                </div>
                            </div>
                        </section>

                        {/* Right form */}
                        <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold tracking-tight text-white">
                                    Share Your Feedback
                                </h2>
                                <p className="mt-1 text-sm text-white/52">
                                    Tell us how EcoPlate feels overall and anything we can improve.
                                </p>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-5">
                                {/* Overall rating */}
                                <div className="rounded-[28px] border border-white/10 bg-black/12 p-6 text-center">
                                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/12">
                                        <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                                    </div>

                                    <p className="text-sm font-semibold text-white">Overall Rating</p>
                                    <p className="mt-1 text-xs text-white/45">How would you rate EcoPlate overall?</p>

                                    <div className="mt-5 flex justify-center">
                                        <StarRow value={overall} onChange={setOverall} size="lg" />
                                    </div>

                                    <div className="mt-3">
                                        {overall > 0 ? (
                                            <span className={cx("text-sm font-semibold", OVERALL_LABELS[overall].color)}>
                        {OVERALL_LABELS[overall].text}
                      </span>
                                        ) : (
                                            <span className="text-xs text-white/35">Tap a star to rate</span>
                                        )}
                                    </div>
                                </div>

                                {/* Comment */}
                                <div>
                                    <label className="mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/55">
                                        Your Comments <span className="font-normal normal-case tracking-normal text-white/35">(optional)</span>
                                    </label>

                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Tell us what you think about EcoPlate — what you love, what could be better…"
                                        rows={5}
                                        maxLength={500}
                                        className="w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition duration-200 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20"
                                    />

                                    <p className="mt-2 text-right text-[11px] text-white/30">{comment.length}/500</p>
                                </div>

                                {err && (
                                    <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                        {err}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3.5 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Submitting…
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="h-4 w-4" />
                                            Submit Feedback
                                        </>
                                    )}
                                </button>
                            </form>
                        </section>
                    </div>
                )}
            </div>
        </main>
    );
}