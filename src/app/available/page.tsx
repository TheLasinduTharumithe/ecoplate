// app/available/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    addDoc,
} from "firebase/firestore";
import {
    ArrowRight,
    CheckCircle,
    Clock,
    Loader2,
    MapPin,
    Package,
    Sparkles,
    User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import CharityNavbar from "@/components/CharityNavbar";

/* -------------------------------- Types ----------------------------------- */

interface Donation {
    id: string;
    title: string;
    description: string;
    quantity: number;
    address: string;
    status: "available" | "claimed" | "expired";
    photo?: string;
    pickupTo: any;
    createdAt: any;
    restaurantId: string;
    restaurantName: string;
    restaurantAvatar?: string;
    restaurantEmail?: string;
    restaurantMobile?: string;
    claimedBy?: string;
    claimedAt?: any;
}

/* -------------------------------- Utils ----------------------------------- */

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function formatDate(ts: any): string {
    if (!ts) return "—";
    try {
        const d = ts.toDate ? ts.toDate() : new Date(ts);
        return d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "—";
    }
}

function sortDonationsByDate(donations: Donation[]): Donation[] {
    return [...donations].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });
}

const STATUS_CLS: Record<string, string> = {
    available: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    claimed: "border-blue-400/20 bg-blue-400/10 text-blue-200",
    expired: "border-white/10 bg-white/5 text-white/45",
};

/* -------------------------------- Page ------------------------------------ */

export default function AvailablePage() {
    const router = useRouter();

    const [authUser, setAuthUser] = React.useState<FirebaseUser | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);

    const [donations, setDonations] = React.useState<Donation[]>([]);
    const [loadingDonations, setLoadingDonations] = React.useState(true);

    const [claimingId, setClaimingId] = React.useState<string | null>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoadingUser(true);
            setAuthUser(u || null);
            setLoadingUser(false);
        });
        return () => unsub();
    }, []);

    React.useEffect(() => {
        setLoadingDonations(true);

        const q = query(collection(db, "donations"), where("status", "==", "available"));

        const unsub = onSnapshot(
            q,
            (snap) => {
                const unsortedDonations = snap.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                })) as Donation[];

                setDonations(sortDonationsByDate(unsortedDonations));
                setLoadingDonations(false);
            },
            (error) => {
                console.error("Error fetching donations:", error);
                setError(error.message || "Failed to load donations");
                setLoadingDonations(false);
            }
        );

        return () => unsub();
    }, []);

    const handleClaim = async (donationId: string) => {
        if (!authUser) return;

        setClaimingId(donationId);
        setError(null);

        try {
            await updateDoc(doc(db, "donations", donationId), {
                status: "claimed",
                claimedBy: authUser.uid,
                claimedAt: new Date().toISOString(),
            });

            await addDoc(collection(db, "claims"), {
                donationId,
                userId: authUser.uid,
                userEmail: authUser.email,
                claimedAt: new Date().toISOString(),
                status: "pending",
            });

            router.push(`/navigate/${donationId}`);
        } catch (error: any) {
            console.error("Error claiming donation:", error);
            setError(error.message || "Failed to claim donation");
        } finally {
            setClaimingId(null);
        }
    };

    if (loadingUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
        );
    }

    if (!authUser) {
        return (
            <div className="min-h-screen bg-[#04110d] px-4 py-8 text-white">
                <div className="mx-auto max-w-2xl">
                    <div className="rounded-[34px] border border-white/10 bg-white/[0.08] p-10 text-center shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-400/12">
                            <Package className="h-8 w-8 text-emerald-300" />
                        </div>

                        <h2 className="text-2xl font-semibold text-white">Welcome to Food Donations</h2>
                        <p className="mt-3 text-sm leading-7 text-white/55">
                            Please sign in to view and claim available food donations.
                        </p>

                        <Link
                            href="/login"
                            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-6 py-3 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition hover:scale-[1.01]"
                        >
                            Sign In
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <>
                <CharityNavbar />
                <div className="min-h-screen bg-[#04110d] px-4 py-8 text-white">
                    <div className="mx-auto max-w-2xl">
                        <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-6 text-center backdrop-blur-2xl">
                            <p className="text-sm text-red-200">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-4 rounded-2xl bg-red-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-600"
                            >
                                Try Again
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <CharityNavbar />

            <div className="min-h-screen bg-[#04110d] px-4 py-8 text-white">
                <div className="mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="mb-6 grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
                        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                Real-time charity access
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                Available
                                <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                  {" "}Donations
                </span>
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-8 text-white/65 sm:text-base">
                                Browse active donations from restaurants, review details quickly,
                                and claim the right food packages for faster pickup and distribution.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {[
                                    {
                                        title: "Live Listings",
                                        desc: "New donations appear in real time.",
                                    },
                                    {
                                        title: "Fast Claim Flow",
                                        desc: "Claim and move straight to navigation.",
                                    },
                                    {
                                        title: "Clear Details",
                                        desc: "See timing, quantity, and pickup info.",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4"
                                    >
                                        <p className="text-sm font-semibold text-white">{item.title}</p>
                                        <p className="mt-1 text-xs leading-6 text-white/45">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                            <p className="text-sm font-medium uppercase tracking-[0.14em] text-emerald-200/75">
                                Overview
                            </p>

                            <div className="mt-6 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[24px] border border-white/10 bg-black/12 p-5">
                                    <div className="text-sm text-white/45">Available Now</div>
                                    <div className="mt-2 text-3xl font-bold text-emerald-200">
                                        {donations.length}
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-black/12 p-5">
                                    <div className="text-sm text-white/45">Fresh Pickup Flow</div>
                                    <div className="mt-2 text-3xl font-bold text-emerald-200">Live</div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-black/12 p-5">
                                    <div className="text-sm text-white/45">Claim Status</div>
                                    <div className="mt-2 text-3xl font-bold text-emerald-200">Instant</div>
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* List */}
                    {loadingDonations ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                        </div>
                    ) : donations.length === 0 ? (
                        <div className="rounded-[34px] border border-white/10 bg-white/[0.08] p-12 text-center shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/8">
                                <Package className="h-8 w-8 text-white/30" />
                            </div>

                            <p className="text-lg font-semibold text-white">No donations available</p>
                            <p className="mt-2 text-sm text-white/45">
                                Check back later for new donations.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {donations.map((d) => (
                                <div
                                    key={d.id}
                                    className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                                >
                                    {/* Card body */}
                                    <div className="flex gap-4 p-5">
                                        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/15">
                                            {d.photo ? (
                                                <img
                                                    src={d.photo}
                                                    alt={d.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="grid h-full w-full place-items-center">
                                                    <Package className="h-7 w-7 text-white/25" />
                                                </div>
                                            )}
                                        </div>

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="truncate text-lg font-semibold text-white">{d.title}</p>
                                                <span
                                                    className={cx(
                                                        "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                        STATUS_CLS[d.status] ?? STATUS_CLS.expired
                                                    )}
                                                >
                          {d.status}
                        </span>
                                            </div>

                                            <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/55">
                                                {d.description}
                                            </p>

                                            <div className="mt-3 flex items-center gap-2">
                                                {d.restaurantAvatar ? (
                                                    <img
                                                        src={d.restaurantAvatar}
                                                        alt={d.restaurantName}
                                                        className="h-6 w-6 rounded-full border border-white/10 object-cover"
                                                    />
                                                ) : (
                                                    <div className="grid h-6 w-6 place-items-center rounded-full bg-white/8">
                                                        <UserIcon className="h-3.5 w-3.5 text-white/40" />
                                                    </div>
                                                )}

                                                <span className="text-sm font-medium text-white/85">
                          {d.restaurantName}
                        </span>
                                            </div>

                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                            {d.quantity} packs
                        </span>
                                                <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          Until {formatDate(d.pickupTo)}
                        </span>
                                            </div>

                                            {d.address && (
                                                <p className="mt-2 flex items-start gap-2 text-xs leading-6 text-white/45">
                                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                                    <span className="truncate">{d.address}</span>
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between border-t border-white/8 px-5 py-4">
                    <span className="text-xs text-white/35">
                      Posted {formatDate(d.createdAt)}
                    </span>

                                        <button
                                            onClick={() => handleClaim(d.id)}
                                            disabled={claimingId === d.id}
                                            className={cx(
                                                "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition",
                                                claimingId === d.id
                                                    ? "cursor-not-allowed bg-white/10 text-white/45"
                                                    : "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116] shadow-[0_10px_30px_rgba(52,211,153,0.22)] hover:scale-[1.01]"
                                            )}
                                        >
                                            {claimingId === d.id ? (
                                                <>
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    Claiming...
                                                </>
                                            ) : (
                                                <>
                                                    <CheckCircle className="h-4 w-4" />
                                                    Claim
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}