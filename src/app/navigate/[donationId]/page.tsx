"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User as FirebaseUser } from "firebase/auth";
import {
    doc,
    getDoc,
    updateDoc,
    addDoc,
    collection,
    serverTimestamp,
    query,
    where,
    getDocs,
} from "firebase/firestore";
import {
    Loader2,
    MapPin,
    Navigation,
    ArrowLeft,
    Phone,
    Mail,
    Store,
    CheckCircle,
    AlertCircle,
    Sparkles,
    Clock3,
    Package,
    Route,
} from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
import CharityNavbar from "@/components/CharityNavbar";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components
const MapContainer = dynamic(
    () => import("react-leaflet").then((mod) => mod.MapContainer),
    { ssr: false }
);
const TileLayer = dynamic(
    () => import("react-leaflet").then((mod) => mod.TileLayer),
    { ssr: false }
);
const Marker = dynamic(
    () => import("react-leaflet").then((mod) => mod.Marker),
    { ssr: false }
);
const Popup = dynamic(
    () => import("react-leaflet").then((mod) => mod.Popup),
    { ssr: false }
);
const Polyline = dynamic(
    () => import("react-leaflet").then((mod) => mod.Polyline),
    { ssr: false }
);

const FitBoundsToMarkers = dynamic(
    () =>
        Promise.resolve(({ positions }: { positions: [number, number][] }) => {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { useMap } = require("react-leaflet");
            const map = useMap();
            const fittedRef = React.useRef(false);

            React.useEffect(() => {
                if (!fittedRef.current && positions.length >= 2) {
                    map.fitBounds(positions, { padding: [60, 60] });
                    fittedRef.current = true;
                }
            }, [map, positions]);

            return null;
        }),
    { ssr: false }
);

/* -------------------------------- Types ----------------------------------- */

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
    restaurantAvatar?: string;
    restaurantEmail?: string;
    restaurantMobile?: string;
    location: {
        lat: number;
        lng: number;
    };
}

interface RouteGeometry {
    coordinates: [number, number][];
}

interface Claim {
    id: string;
    donationId: string;
    userId: string;
    userEmail: string;
    status: "pending" | "completed" | "cancelled";
    claimedAt: string;
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

/* -------------------------------- Page ------------------------------------ */

export default function NavigatePage() {
    const router = useRouter();
    const params = useParams();
    const donationId = params.donationId as string;

    const [authUser, setAuthUser] = React.useState<FirebaseUser | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);
    const [donation, setDonation] = React.useState<Donation | null>(null);
    const [loadingDonation, setLoadingDonation] = React.useState(true);
    const [userLocation, setUserLocation] = React.useState<{ lat: number; lng: number } | null>(null);
    const [locationError, setLocationError] = React.useState<string | null>(null);
    const [leafletLoaded, setLeafletLoaded] = React.useState(false);
    const [customIcon, setCustomIcon] = React.useState<any>(null);
    const [userIcon, setUserIcon] = React.useState<any>(null);
    const [routeGeometry, setRouteGeometry] = React.useState<RouteGeometry | null>(null);
    const [routeLoading, setRouteLoading] = React.useState(false);
    const [routeDistance, setRouteDistance] = React.useState<string | null>(null);
    const [routeDuration, setRouteDuration] = React.useState<string | null>(null);

    const [claiming, setClaiming] = React.useState(false);
    const [claimError, setClaimError] = React.useState<string | null>(null);
    const [existingClaim, setExistingClaim] = React.useState<Claim | null>(null);
    const [checkingClaim, setCheckingClaim] = React.useState(false);

    const watchIdRef = React.useRef<number | null>(null);
    const routeDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const donationLocationRef = React.useRef<{ lat: number; lng: number } | null>(null);

    React.useEffect(() => {
        if (donation?.location) {
            donationLocationRef.current = donation.location;
        }
    }, [donation?.location]);

    React.useEffect(() => {
        if (typeof window !== "undefined") {
            import("leaflet").then((L) => {
                delete (L.Icon.Default.prototype as any)._getIconUrl;
                L.Icon.Default.mergeOptions({
                    iconRetinaUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
                    iconUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
                    shadowUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                });

                const restaurantIcon = L.icon({
                    iconUrl:
                        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
                    shadowUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                });

                const userMarkerIcon = L.icon({
                    iconUrl:
                        "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                    shadowUrl:
                        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41],
                });

                setCustomIcon(restaurantIcon);
                setUserIcon(userMarkerIcon);
                setLeafletLoaded(true);
            });
        }
    }, []);

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
        if (!donationId || !authUser) return;

        const fetchDonationAndClaims = async () => {
            try {
                const docRef = doc(db, "donations", donationId);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setDonation({ id: docSnap.id, ...docSnap.data() } as Donation);
                } else {
                    router.push("/available");
                    return;
                }

                setCheckingClaim(true);
                const claimsQuery = query(
                    collection(db, "claims"),
                    where("donationId", "==", donationId),
                    where("userId", "==", authUser.uid)
                );
                const claimsSnapshot = await getDocs(claimsQuery);

                if (!claimsSnapshot.empty) {
                    const claimDoc = claimsSnapshot.docs[0];
                    const claimData = claimDoc.data();
                    setExistingClaim({
                        id: claimDoc.id,
                        donationId: claimData.donationId,
                        userId: claimData.userId,
                        userEmail: claimData.userEmail,
                        status: claimData.status,
                        claimedAt: claimData.claimedAt,
                    } as Claim);
                }
            } catch (error) {
                console.error("Error fetching donation:", error);
            } finally {
                setLoadingDonation(false);
                setCheckingClaim(false);
            }
        };

        fetchDonationAndClaims();
    }, [donationId, router, authUser]);

    React.useEffect(() => {
        if (!donation) return;

        if (!navigator.geolocation) {
            setLocationError("Geolocation is not supported by your browser");
            return;
        }

        const handleSuccess = (position: GeolocationPosition) => {
            const newLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
            };

            setUserLocation(newLocation);
            setLocationError(null);

            if (routeDebounceRef.current) clearTimeout(routeDebounceRef.current);
            routeDebounceRef.current = setTimeout(() => {
                if (donationLocationRef.current) {
                    fetchRoute(newLocation, donationLocationRef.current);
                }
            }, 3000);
        };

        const handleError = (error: GeolocationPositionError) => {
            switch (error.code) {
                case error.PERMISSION_DENIED:
                    setLocationError("Please allow location access to see directions");
                    break;
                case error.POSITION_UNAVAILABLE:
                    setLocationError("Location information is unavailable");
                    break;
                case error.TIMEOUT:
                    setLocationError("Location request timed out");
                    break;
                default:
                    setLocationError("An unknown error occurred");
            }
        };

        watchIdRef.current = navigator.geolocation.watchPosition(handleSuccess, handleError, {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000,
        });

        return () => {
            if (watchIdRef.current !== null) {
                navigator.geolocation.clearWatch(watchIdRef.current);
                watchIdRef.current = null;
            }
            if (routeDebounceRef.current) {
                clearTimeout(routeDebounceRef.current);
            }
        };
    }, [donation]);

    const fetchRoute = async (
        start: { lat: number; lng: number },
        end: { lat: number; lng: number }
    ) => {
        setRouteLoading(true);
        try {
            const response = await fetch(
                `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`
            );
            if (!response.ok) throw new Error("Failed to fetch route");

            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                setRouteGeometry({
                    coordinates: route.geometry.coordinates.map((coord: number[]) => [coord[1], coord[0]]),
                });
                setRouteDistance(`${(route.distance / 1000).toFixed(1)} km`);
                setRouteDuration(`${Math.round(route.duration / 60)} min`);
            } else {
                setRouteGeometry(null);
            }
        } catch (error) {
            console.error("Error fetching route:", error);
            setRouteGeometry(null);
        } finally {
            setRouteLoading(false);
        }
    };

    const handleClaimDonation = async () => {
        if (!authUser || !donation) return;

        setClaiming(true);
        setClaimError(null);

        try {
            if (donation.status !== "available") {
                setClaimError("This donation is no longer available");
                setClaiming(false);
                return;
            }

            const claimData = {
                donationId: donation.id,
                userId: authUser.uid,
                userEmail: authUser.email,
                status: "pending",
                claimedAt: new Date().toISOString(),
                createdAt: serverTimestamp(),
            };

            const claimRef = await addDoc(collection(db, "claims"), claimData);

            const donationRef = doc(db, "donations", donation.id);
            await updateDoc(donationRef, {
                status: "claimed",
                claimedBy: authUser.uid,
                claimedAt: serverTimestamp(),
            });

            setExistingClaim({
                id: claimRef.id,
                donationId: claimData.donationId,
                userId: claimData.userId,
                userEmail: claimData.userEmail,
                status: claimData.status,
                claimedAt: claimData.claimedAt,
            } as Claim);
        } catch (error) {
            console.error("Error claiming donation:", error);
            setClaimError("Failed to claim donation. Please try again.");
        } finally {
            setClaiming(false);
        }
    };

    const handleMarkAsCompleted = async () => {
        if (!authUser || !donation || !existingClaim) return;

        setClaiming(true);
        setClaimError(null);

        try {
            const claimRef = doc(db, "claims", existingClaim.id);
            await updateDoc(claimRef, {
                status: "completed",
                completedAt: serverTimestamp(),
            });

            const donationRef = doc(db, "donations", donation.id);
            await updateDoc(donationRef, {
                status: "completed",
            });

            setExistingClaim({ ...existingClaim, status: "completed" });
            setDonation((prev) => (prev ? { ...prev, status: "completed" } : prev));
        } catch (error) {
            console.error("Error marking as completed:", error);
            setClaimError("Failed to mark as completed. Please try again.");
        } finally {
            setClaiming(false);
        }
    };

    if (loadingUser || loadingDonation || checkingClaim) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
        );
    }

    if (!donation) {
        return (
            <div className="min-h-screen bg-[#04110d] px-4 py-8 text-white">
                <div className="mx-auto max-w-md text-center">
                    <p className="text-white/60">Donation not found</p>
                    <Link
                        href="/available"
                        className="mt-4 inline-block text-emerald-300 hover:text-emerald-200"
                    >
                        Back to available donations
                    </Link>
                </div>
            </div>
        );
    }

    const fitBoundsPositions: [number, number][] | null =
        userLocation && donation.location
            ? [
                [donation.location.lat, donation.location.lng],
                [userLocation.lat, userLocation.lng],
            ]
            : null;

    return (
        <>
            <CharityNavbar />

            <div className="min-h-screen bg-[#04110d] px-4 py-8 text-white">
                <div className="mx-auto max-w-6xl">
                    <button
                        onClick={() => router.back()}
                        className="mb-6 inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-medium text-white/75 backdrop-blur-xl transition hover:bg-white/[0.1] hover:text-white"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </button>

                    <div className="grid gap-6 lg:grid-cols-[0.94fr_1.06fr]">
                        <div className="space-y-6">
                            <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
                                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                                    <Sparkles className="h-4 w-4" />
                                    Live donation navigation
                                </div>

                                <div className="mt-6 flex items-center gap-4">
                                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/25 to-lime-300/10 shadow-[0_8px_24px_rgba(16,185,129,0.18)]">
                                        <Store className="h-6 w-6 text-emerald-200" />
                                    </div>

                                    <div>
                                        <h1 className="text-2xl font-semibold tracking-tight text-white">
                                            Navigate to Restaurant
                                        </h1>
                                        <p className="mt-1 text-sm text-white/50">{donation.restaurantName}</p>
                                    </div>
                                </div>

                                <div className="mt-6 rounded-[28px] border border-white/10 bg-black/12 p-4">
                                    <div className="flex gap-4">
                                        {donation.photo ? (
                                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10">
                                                <img
                                                    src={donation.photo}
                                                    alt={donation.title}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5">
                                                <Package className="h-7 w-7 text-white/25" />
                                            </div>
                                        )}

                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="truncate text-lg font-semibold text-white">{donation.title}</p>
                                                <span
                                                    className={cx(
                                                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                        donation.status === "available"
                                                            ? "border border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
                                                            : donation.status === "claimed"
                                                                ? "border border-amber-400/20 bg-amber-400/10 text-amber-200"
                                                                : donation.status === "completed"
                                                                    ? "border border-green-400/20 bg-green-400/10 text-green-200"
                                                                    : "border border-white/10 bg-white/5 text-white/45"
                                                    )}
                                                >
                          {donation.status}
                        </span>
                                            </div>

                                            <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/55">
                                                {donation.description}
                                            </p>

                                            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                        <span className="inline-flex items-center gap-1.5">
                          <Package className="h-3.5 w-3.5" />
                            {donation.quantity} packs
                        </span>
                                                <span className="inline-flex items-center gap-1.5">
                          <Clock3 className="h-3.5 w-3.5" />
                          Pickup by {formatDate(donation.pickupTo)}
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {claimError && (
                                    <div className="mt-5 rounded-[24px] border border-red-400/20 bg-red-500/10 p-4">
                                        <div className="flex items-start gap-3">
                                            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
                                            <div>
                                                <h3 className="font-semibold text-red-200">Error</h3>
                                                <p className="mt-1 text-sm text-red-200/80">{claimError}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                                <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
                                    <Route className="h-5 w-5 text-emerald-300" />
                                    Navigation Details
                                </h2>

                                {!userLocation && !locationError && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
                                        <span className="ml-2 text-sm text-white/55">Getting your location...</span>
                                    </div>
                                )}

                                {locationError && <p className="mt-4 text-sm text-red-300">{locationError}</p>}

                                {userLocation && routeDistance && routeDuration && (
                                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                                        <div className="rounded-[24px] border border-white/10 bg-black/12 p-5">
                                            <div className="text-sm text-white/45">Distance</div>
                                            <div className="mt-2 text-3xl font-bold text-emerald-200">
                                                {routeDistance}
                                            </div>
                                        </div>

                                        <div className="rounded-[24px] border border-white/10 bg-black/12 p-5">
                                            <div className="text-sm text-white/45">Est. Time</div>
                                            <div className="mt-2 text-3xl font-bold text-emerald-200">
                                                {routeDuration}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {userLocation && !routeGeometry && routeDistance && (
                                    <p className="mt-4 text-xs text-white/40">
                                        * Showing straight line preview because the full route is unavailable.
                                    </p>
                                )}

                                <div className="mt-6 rounded-[24px] border border-white/10 bg-black/12 p-5">
                                    <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                                        <MapPin className="h-4 w-4 text-emerald-300" />
                                        Restaurant Location
                                    </h3>
                                    <p className="text-sm leading-7 text-white/60">{donation.address}</p>
                                </div>
                            </section>

                            {(donation.restaurantMobile || donation.restaurantEmail) && (
                                <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                                    <h2 className="mb-4 text-lg font-semibold text-white">Contact Restaurant</h2>

                                    <div className="space-y-3">
                                        {donation.restaurantMobile && (
                                            <a
                                                href={`tel:${donation.restaurantMobile}`}
                                                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.1]"
                                            >
                                                <Phone className="h-4 w-4 text-emerald-300" />
                                                {donation.restaurantMobile}
                                            </a>
                                        )}

                                        {donation.restaurantEmail && (
                                            <a
                                                href={`mailto:${donation.restaurantEmail}`}
                                                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white/75 transition hover:bg-white/[0.1]"
                                            >
                                                <Mail className="h-4 w-4 text-emerald-300" />
                                                {donation.restaurantEmail}
                                            </a>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="space-y-6">
                            <section className="overflow-hidden rounded-[34px] border border-white/10 bg-white/[0.08] shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl">
                                <div className="border-b border-white/8 px-6 py-5">
                                    <h2 className="text-lg font-semibold text-white">Live Route Map</h2>
                                    <p className="mt-1 text-sm text-white/50">
                                        Track your location and navigate to the restaurant.
                                    </p>
                                </div>

                                <div className="relative h-[520px] w-full bg-black/10">
                                    {leafletLoaded && donation.location && (
                                        <MapContainer
                                            center={[donation.location.lat, donation.location.lng]}
                                            zoom={15}
                                            style={{ height: "100%", width: "100%" }}
                                            scrollWheelZoom={true}
                                        >
                                            <TileLayer
                                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            />

                                            {fitBoundsPositions && (
                                                <FitBoundsToMarkers positions={fitBoundsPositions} />
                                            )}

                                            {customIcon && (
                                                <Marker
                                                    position={[donation.location.lat, donation.location.lng]}
                                                    icon={customIcon}
                                                >
                                                    <Popup>
                                                        <div className="text-sm">
                                                            <strong>{donation.restaurantName}</strong>
                                                            <br />
                                                            {donation.address}
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            )}

                                            {userLocation && userIcon && (
                                                <Marker position={[userLocation.lat, userLocation.lng]} icon={userIcon}>
                                                    <Popup>
                                                        <div className="text-sm">
                                                            <strong>Your Location</strong>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            )}

                                            {userLocation &&
                                                donation.location &&
                                                (routeGeometry ? (
                                                    <>
                                                        <Polyline
                                                            positions={routeGeometry.coordinates}
                                                            pathOptions={{
                                                                color: "#ffffff",
                                                                weight: 10,
                                                                opacity: 1,
                                                                lineCap: "round",
                                                                lineJoin: "round",
                                                            }}
                                                        />
                                                        <Polyline
                                                            positions={routeGeometry.coordinates}
                                                            pathOptions={{
                                                                color: "#4285F4",
                                                                weight: 6,
                                                                opacity: 1,
                                                                lineCap: "round",
                                                                lineJoin: "round",
                                                            }}
                                                        />
                                                    </>
                                                ) : (
                                                    <Polyline
                                                        positions={[
                                                            [userLocation.lat, userLocation.lng],
                                                            [donation.location.lat, donation.location.lng],
                                                        ]}
                                                        pathOptions={{
                                                            color: "#4285F4",
                                                            weight: 4,
                                                            opacity: 0.7,
                                                            dashArray: "8, 10",
                                                            lineCap: "round",
                                                        }}
                                                    />
                                                ))}
                                        </MapContainer>
                                    )}

                                    {userLocation && (
                                        <div className="absolute bottom-4 left-4 z-[1000] rounded-2xl border border-white/10 bg-[#071510]/92 px-4 py-3 shadow-lg backdrop-blur-xl">
                                            <div className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                        </span>
                                                <span className="text-xs text-white/75">Live tracking</span>
                                            </div>
                                        </div>
                                    )}

                                    {routeLoading && (
                                        <div className="absolute right-4 top-4 z-[1000] rounded-2xl border border-white/10 bg-[#071510]/92 px-4 py-3 shadow-lg backdrop-blur-xl">
                                            <div className="flex items-center gap-2">
                                                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
                                                <span className="text-xs text-white/75">Updating route...</span>
                                            </div>
                                        </div>
                                    )}

                                    {locationError && (
                                        <div className="absolute left-4 right-4 top-4 z-[1000] rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 backdrop-blur-xl">
                                            <p className="text-xs text-red-200">{locationError}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {!existingClaim && donation.status === "available" && (
                                <button
                                    onClick={handleClaimDonation}
                                    disabled={claiming}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-5 py-4 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition duration-200 hover:scale-[1.01] disabled:opacity-60"
                                >
                                    {claiming ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4" />
                                            Take This Donation
                                        </>
                                    )}
                                </button>
                            )}

                            {!existingClaim && donation.status === "claimed" && (
                                <div className="rounded-[28px] border border-red-400/20 bg-red-500/10 p-5 text-center text-sm font-semibold text-red-200">
                                    This donation has been claimed by another charity
                                </div>
                            )}

                            {existingClaim?.status === "pending" && (
                                <button
                                    onClick={handleMarkAsCompleted}
                                    disabled={claiming}
                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 text-sm font-semibold text-white/88 backdrop-blur-xl transition duration-200 hover:bg-white/[0.1] disabled:opacity-60"
                                >
                                    {claiming ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Updating...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="h-4 w-4 text-emerald-300" />
                                            Mark As Completed
                                        </>
                                    )}
                                </button>
                            )}

                            {existingClaim?.status === "completed" && (
                                <div className="rounded-[28px] border border-green-400/20 bg-green-500/10 p-5 text-center">
                                    <p className="text-sm font-semibold text-green-200">
                                        Donation completed successfully
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}