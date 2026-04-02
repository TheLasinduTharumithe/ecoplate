// app/claims/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
    collection,
    query,
    where,
    getDocs,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    Loader2,
    MapPin,
    Calendar,
    Clock,
    Store,
    CheckCircle,
    AlertCircle,
    Eye,
    Navigation,
    X,
    Phone,
    Mail,
    Package,
    XCircle,
    Sparkles,
    Filter,
} from "lucide-react";
import Link from "next/link";
import CharityNavbar from "@/components/CharityNavbar";

/* -------------------------------- Types ----------------------------------- */

interface Claim {
    id: string;
    donationId: string;
    userId: string;
    userEmail: string;
    status: "pending" | "completed" | "cancelled";
    claimedAt: string;
    completedAt?: string;
    cancelledAt?: string;
    createdAt?: any;
}

interface Donation {
    id: string;
    title: string;
    description: string;
    quantity: number;
    address: string;
    status: string;
    photo?: string;
    pickupTo: any;
    restaurantId: string;
    restaurantName: string;
    restaurantEmail?: string;
    restaurantMobile?: string;
    location: {
        lat: number;
        lng: number;
    };
}

interface ClaimWithDonation {
    id: string;
    donationId: string;
    userId: string;
    userEmail: string;
    status: "pending" | "completed" | "cancelled";
    claimedAt: string;
    completedAt?: string;
    cancelledAt?: string;
    createdAt?: any;
    donation: Donation | null;
}

/* -------------------------------- Utils ----------------------------------- */

function formatDate(dateString: string): string {
    try {
        const d = new Date(dateString);
        if (isNaN(d.getTime())) return "";
        return d.toLocaleString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

function formatFirestoreDate(ts: any): string {
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

function getStatusColor(status: string): string {
    switch (status) {
        case "pending":
            return "border-amber-400/20 bg-amber-400/10 text-amber-200";
        case "completed":
            return "border-green-400/20 bg-green-400/10 text-green-200";
        case "cancelled":
            return "border-red-400/20 bg-red-400/10 text-red-200";
        default:
            return "border-white/10 bg-white/5 text-white/45";
    }
}

function getStatusIcon(status: string) {
    switch (status) {
        case "pending":
            return <Clock className="h-4 w-4" />;
        case "completed":
            return <CheckCircle className="h-4 w-4" />;
        case "cancelled":
            return <AlertCircle className="h-4 w-4" />;
        default:
            return null;
    }
}

/* -------------------------------- Detail Modal ----------------------------- */

function DetailModal({
                         claim,
                         onClose,
                     }: {
    claim: ClaimWithDonation;
    onClose: () => void;
}) {
    const donation = claim.donation;

    React.useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);

    React.useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#091812]/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:max-w-2xl sm:rounded-[30px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-white/8 px-5 py-4 shrink-0">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Claim Details</h2>
                        <p className="mt-1 text-sm text-white/45">Review the full donation information</p>
                    </div>

                    <button
                        onClick={onClose}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white/75"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
                    <div className="flex items-center gap-3">
            <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusColor(
                    claim.status
                )}`}
            >
              {getStatusIcon(claim.status)}
                {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
            </span>

                        <span className="text-xs text-white/40">Claimed {formatDate(claim.claimedAt)}</span>
                    </div>

                    {donation ? (
                        <>
                            {donation.photo && (
                                <div className="h-52 w-full overflow-hidden rounded-[24px] border border-white/10">
                                    <img
                                        src={donation.photo}
                                        alt={donation.title}
                                        className="h-full w-full object-cover"
                                    />
                                </div>
                            )}

                            <div>
                                <h3 className="text-2xl font-semibold text-white">{donation.title}</h3>
                                <p className="mt-2 text-sm leading-7 text-white/55">{donation.description}</p>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <p className="text-xs text-white/40 mb-1">Quantity</p>
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-emerald-300" />
                                        <p className="text-sm font-semibold text-white">{donation.quantity} packs</p>
                                    </div>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <p className="text-xs text-white/40 mb-1">Pickup By</p>
                                    <div className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-emerald-300" />
                                        <p className="text-sm font-semibold text-white">
                                            {formatFirestoreDate(donation.pickupTo)}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Store className="h-4 w-4 text-emerald-300 shrink-0" />
                                    <p className="text-sm font-semibold text-white">{donation.restaurantName}</p>
                                </div>

                                <div className="flex items-start gap-2">
                                    <MapPin className="h-4 w-4 text-white/40 shrink-0 mt-0.5" />
                                    <p className="text-sm leading-7 text-white/60">{donation.address}</p>
                                </div>

                                {donation.restaurantMobile && (
                                    <a
                                        href={`tel:${donation.restaurantMobile}`}
                                        className="flex items-center gap-2 text-sm text-emerald-300 transition hover:text-emerald-200"
                                    >
                                        <Phone className="h-4 w-4" />
                                        {donation.restaurantMobile}
                                    </a>
                                )}

                                {donation.restaurantEmail && (
                                    <a
                                        href={`mailto:${donation.restaurantEmail}`}
                                        className="flex items-center gap-2 text-sm text-emerald-300 transition hover:text-emerald-200"
                                    >
                                        <Mail className="h-4 w-4" />
                                        {donation.restaurantEmail}
                                    </a>
                                )}
                            </div>

                            {(() => {
                                const completedStr = claim.completedAt ? formatDate(claim.completedAt) : "";
                                const cancelledStr = claim.cancelledAt ? formatDate(claim.cancelledAt) : "";
                                if (!completedStr && !cancelledStr) return null;

                                return (
                                    <div className="text-xs text-white/40 space-y-1">
                                        {completedStr && <p>Completed: {completedStr}</p>}
                                        {cancelledStr && <p>Cancelled: {cancelledStr}</p>}
                                    </div>
                                );
                            })()}
                        </>
                    ) : (
                        <p className="py-8 text-center text-sm text-red-300">
                            Donation details not available
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- Page ------------------------------------ */

export default function ClaimsPage() {
    const router = useRouter();

    const [authUser, setAuthUser] = React.useState<FirebaseUser | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);
    const [claims, setClaims] = React.useState<ClaimWithDonation[]>([]);
    const [loadingClaims, setLoadingClaims] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const [filter, setFilter] = React.useState<"all" | "pending" | "completed" | "cancelled">("all");
    const [sortOrder, setSortOrder] = React.useState<"newest" | "oldest">("newest");
    const [selectedClaim, setSelectedClaim] = React.useState<ClaimWithDonation | null>(null);
    const [actionLoading, setActionLoading] = React.useState<string | null>(null);

    const handleMarkCompleted = async (claimId: string, donationId: string) => {
        setActionLoading(claimId);
        try {
            const now = new Date().toISOString();
            await updateDoc(doc(db, "claims", claimId), {
                status: "completed",
                completedAt: now,
                updatedAt: serverTimestamp(),
            });

            await updateDoc(doc(db, "donations", donationId), {
                status: "completed",
            });

            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId ? { ...c, status: "completed", completedAt: now } : c
                )
            );
        } catch (err) {
            console.error("Error marking completed:", err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleCancelClaim = async (claimId: string, donationId: string) => {
        setActionLoading(claimId);
        try {
            const now = new Date().toISOString();
            await updateDoc(doc(db, "claims", claimId), {
                status: "cancelled",
                cancelledAt: now,
                updatedAt: serverTimestamp(),
            });

            await updateDoc(doc(db, "donations", donationId), {
                status: "available",
                claimedBy: null,
                claimedAt: null,
            });

            setClaims((prev) =>
                prev.map((c) =>
                    c.id === claimId ? { ...c, status: "cancelled", cancelledAt: now } : c
                )
            );
        } catch (err) {
            console.error("Error cancelling claim:", err);
        } finally {
            setActionLoading(null);
        }
    };

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoadingUser(true);
            setAuthUser(u || null);
            setLoadingUser(false);
            if (!u) router.push("/login");
        });
        return () => unsub();
    }, [router]);

    React.useEffect(() => {
        if (!authUser) return;

        const fetchClaims = async () => {
            setLoadingClaims(true);
            setError(null);

            try {
                const claimsQuery = query(collection(db, "claims"), where("userId", "==", authUser.uid));
                const claimsSnapshot = await getDocs(claimsQuery);

                if (claimsSnapshot.empty) {
                    setClaims([]);
                    setLoadingClaims(false);
                    return;
                }

                const claimsWithDonations: ClaimWithDonation[] = await Promise.all(
                    claimsSnapshot.docs.map(async (claimDoc) => {
                        const claimData = claimDoc.data() as Omit<Claim, "id">;
                        const donationRef = doc(db, "donations", claimData.donationId);
                        const donationSnap = await getDoc(donationRef);

                        return {
                            id: claimDoc.id,
                            donationId: claimData.donationId,
                            userId: claimData.userId,
                            userEmail: claimData.userEmail,
                            status: claimData.status,
                            claimedAt: claimData.claimedAt,
                            completedAt: claimData.completedAt,
                            cancelledAt: claimData.cancelledAt,
                            createdAt: claimData.createdAt,
                            donation: donationSnap.exists()
                                ? ({ id: donationSnap.id, ...donationSnap.data() } as Donation)
                                : null,
                        };
                    })
                );

                setClaims(claimsWithDonations);
            } catch (error) {
                console.error("Error fetching claims:", error);
                setError("Failed to load your claims. Please try again.");
            } finally {
                setLoadingClaims(false);
            }
        };

        fetchClaims();
    }, [authUser]);

    const filteredAndSortedClaims = React.useMemo(() => {
        const filtered = filter === "all" ? claims : claims.filter((c) => c.status === filter);

        return filtered.sort((a, b) => {
            const dateA = new Date(a.claimedAt).getTime();
            const dateB = new Date(b.claimedAt).getTime();
            return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
        });
    }, [claims, filter, sortOrder]);

    const stats = React.useMemo(
        () => ({
            total: claims.length,
            pending: claims.filter((c) => c.status === "pending").length,
            completed: claims.filter((c) => c.status === "completed").length,
            cancelled: claims.filter((c) => c.status === "cancelled").length,
        }),
        [claims]
    );

    if (loadingUser || loadingClaims) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
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
                                Donation claim management
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                My
                                <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                  {" "}Claims
                </span>
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-8 text-white/65 sm:text-base">
                                Track all claimed donations, review details, navigate to collection points,
                                and complete or cancel claims when needed.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <p className="text-sm font-semibold text-white">Active Claims</p>
                                    <p className="mt-1 text-xs leading-6 text-white/45">
                                        Manage pending pickups in one place.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <p className="text-sm font-semibold text-white">Quick Actions</p>
                                    <p className="mt-1 text-xs leading-6 text-white/45">
                                        Complete or cancel claims with fewer steps.
                                    </p>
                                </div>

                                <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                    <p className="text-sm font-semibold text-white">Full Visibility</p>
                                    <p className="mt-1 text-xs leading-6 text-white/45">
                                        Review timing, restaurant info, and donation status clearly.
                                    </p>
                                </div>
                            </div>
                        </section>

                        <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                                {[
                                    { label: "Total Claims", value: stats.total, color: "text-white" },
                                    { label: "Pending", value: stats.pending, color: "text-amber-200" },
                                    { label: "Completed", value: stats.completed, color: "text-green-200" },
                                    { label: "Cancelled", value: stats.cancelled, color: "text-red-200" },
                                ].map(({ label, value, color }) => (
                                    <div
                                        key={label}
                                        className="rounded-[24px] border border-white/10 bg-black/12 p-5"
                                    >
                                        <p className="text-sm text-white/45">{label}</p>
                                        <p className={`mt-2 text-3xl font-bold ${color}`}>{value}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-wrap items-center gap-3">
                                <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/70">
                                    <Filter className="h-4 w-4 text-emerald-300" />
                                    Filters and sorting help you focus on the right claims faster.
                                </div>
                            </div>
                        </section>
                    </div>

                    {error && (
                        <div className="mb-6 rounded-[28px] border border-red-400/20 bg-red-500/10 p-4">
                            <div className="flex items-start gap-3">
                                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Filters */}
                    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                        <div className="inline-flex flex-wrap rounded-2xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur-xl">
                            {(["all", "pending", "completed", "cancelled"] as const).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setFilter(f)}
                                    className={`rounded-xl px-4 py-2 text-sm font-medium capitalize transition ${
                                        filter === f
                                            ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116]"
                                            : "text-white/65 hover:text-white"
                                    }`}
                                >
                                    {f}
                                </button>
                            ))}
                        </div>

                        <div className="inline-flex rounded-2xl border border-white/10 bg-white/[0.06] p-1 backdrop-blur-xl">
                            <button
                                onClick={() => setSortOrder("newest")}
                                className={`flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                                    sortOrder === "newest"
                                        ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116]"
                                        : "text-white/65"
                                }`}
                            >
                                <Clock className="h-3 w-3" />
                                Newest First
                            </button>

                            <button
                                onClick={() => setSortOrder("oldest")}
                                className={`flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-medium transition ${
                                    sortOrder === "oldest"
                                        ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116]"
                                        : "text-white/65"
                                }`}
                            >
                                <Calendar className="h-3 w-3" />
                                Oldest First
                            </button>
                        </div>
                    </div>

                    {/* Claims List */}
                    {filteredAndSortedClaims.length === 0 ? (
                        <div className="rounded-[34px] border border-white/10 bg-white/[0.08] p-12 text-center shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/8">
                                <Store className="h-8 w-8 text-white/30" />
                            </div>

                            <h3 className="text-lg font-semibold text-white">No claims found</h3>
                            <p className="mt-2 text-sm text-white/45">
                                {filter === "all"
                                    ? "You haven't claimed any donations yet"
                                    : `You don't have any ${filter} claims`}
                            </p>

                            <Link
                                href="/available"
                                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-5 py-3 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition hover:scale-[1.01]"
                            >
                                <Eye className="h-4 w-4" />
                                Browse Available Donations
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {filteredAndSortedClaims.map((claim) => (
                                <div
                                    key={claim.id}
                                    className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                                >
                                    <div className="p-6">
                                        {/* Top row */}
                                        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                            <div className="flex flex-wrap items-center gap-3">
                        <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${getStatusColor(
                                claim.status
                            )}`}
                        >
                          {getStatusIcon(claim.status)}
                            {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                        </span>

                                                <span className="text-xs text-white/40">
                          Claimed: {formatDate(claim.claimedAt)}
                        </span>
                                            </div>

                                            {claim.status === "pending" && (
                                                <Link
                                                    href={`/navigate/${claim.donationId}`}
                                                    className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-2 text-xs font-semibold text-[#062116] transition hover:scale-[1.01]"
                                                >
                                                    <Navigation className="h-3 w-3" />
                                                    Navigate
                                                </Link>
                                            )}
                                        </div>

                                        {claim.donation ? (
                                            <div className="flex gap-4">
                                                {claim.donation.photo ? (
                                                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                                                        <img
                                                            src={claim.donation.photo}
                                                            alt={claim.donation.title}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
                                                        <Package className="h-7 w-7 text-white/25" />
                                                    </div>
                                                )}

                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div className="min-w-0">
                                                            <h3 className="text-lg font-semibold text-white">
                                                                {claim.donation.title}
                                                            </h3>
                                                            <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/55">
                                                                {claim.donation.description}
                                                            </p>

                                                            <div className="mt-3 flex items-center gap-2">
                                                                <Store className="h-4 w-4 text-white/40" />
                                                                <span className="text-sm text-white/75">
                                  {claim.donation.restaurantName}
                                </span>
                                                            </div>

                                                            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-white/45">
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                    {claim.donation.address}
                                </span>
                                                                <span>{claim.donation.quantity} packs</span>
                                                            </div>

                                                            {claim.donation.pickupTo && (
                                                                <p className="mt-2 text-xs text-white/40">
                                                                    Pickup by: {formatFirestoreDate(claim.donation.pickupTo)}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <button
                                                            onClick={() => setSelectedClaim(claim)}
                                                            className="shrink-0 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white/75 transition hover:bg-white/[0.1]"
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                            View Details
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center py-8">
                                                <p className="text-sm text-red-300">Donation details not available</p>
                                            </div>
                                        )}

                                        {claim.status === "pending" && (
                                            <div className="mt-5 flex gap-3 border-t border-white/8 pt-5">
                                                <button
                                                    onClick={() => handleMarkCompleted(claim.id, claim.donationId)}
                                                    disabled={actionLoading === claim.id}
                                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3 text-sm font-semibold text-[#062116] transition disabled:opacity-60"
                                                >
                                                    {actionLoading === claim.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <CheckCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    Taken
                                                </button>

                                                <button
                                                    onClick={() => handleCancelClaim(claim.id, claim.donationId)}
                                                    disabled={actionLoading === claim.id}
                                                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300 transition hover:bg-red-500/15 disabled:opacity-60"
                                                >
                                                    {actionLoading === claim.id ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <XCircle className="h-3.5 w-3.5" />
                                                    )}
                                                    Cancel
                                                </button>
                                            </div>
                                        )}

                                        {(() => {
                                            const completedStr = claim.completedAt ? formatDate(claim.completedAt) : "";
                                            const cancelledStr = claim.cancelledAt ? formatDate(claim.cancelledAt) : "";
                                            if (!completedStr && !cancelledStr) return null;

                                            return (
                                                <div className="mt-5 border-t border-white/8 pt-4">
                                                    <p className="text-xs text-white/40">
                                                        {completedStr && `Completed on: ${completedStr}`}
                                                        {cancelledStr && `Cancelled on: ${cancelledStr}`}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedClaim && (
                <DetailModal claim={selectedClaim} onClose={() => setSelectedClaim(null)} />
            )}
        </>
    );
}