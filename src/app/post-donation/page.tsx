// app/post-donation/page.tsx
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, type User } from "firebase/auth";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import {
    CalendarClock,
    ImageIcon,
    Loader2,
    MapPin,
    Navigation,
    Package2,
    Search,
    Sparkles,
    Upload,
    X,
} from "lucide-react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import RestaurantNavbar from "@/components/RestaurantNavbar";

// ─── Types / Utils ────────────────────────────────────────────────────────────
type Role = "restaurant" | "charity";
type LatLng = { lat: number; lng: number };
type NominatimResult = { display_name: string; lat: string; lon: string };

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

function toISODateTimeLocal(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch {
        return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
}

async function geocodeSearch(query: string): Promise<NominatimResult[]> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=6`,
            { headers: { "Accept-Language": "en" } }
        );
        return await res.json();
    } catch {
        return [];
    }
}

// ─── Leaflet Map (dynamically imported — no SSR) ──────────────────────────────
interface MapPickerProps {
    marker: LatLng | null;
    flyTarget: [number, number] | null;
    onMarkerPlace: (lat: number, lng: number) => void;
    onLocateMe: () => void;
    locating: boolean;
}

const LeafletMap = dynamic(
    () =>
        import("leaflet").then(async (L) => {
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            const { MapContainer, TileLayer, Marker, useMapEvents, useMap } = await import("react-leaflet");

            function FlyTo({ position }: { position: [number, number] }) {
                const map = useMap();
                React.useEffect(() => {
                    map.flyTo(position, 16, { duration: 1.2 });
                }, [position, map]);
                return null;
            }

            function ClickHandler({ onMarker }: { onMarker: (lat: number, lng: number) => void }) {
                useMapEvents({
                    click: (e) => onMarker(e.latlng.lat, e.latlng.lng),
                });
                return null;
            }

            function MapPicker({ marker, flyTarget, onMarkerPlace, onLocateMe, locating }: MapPickerProps) {
                return (
                    <div
                        className="relative overflow-hidden rounded-[24px] border border-white/10 bg-black/15"
                        style={{ height: 300 }}
                    >
                        <MapContainer
                            center={marker ? [marker.lat, marker.lng] : [7.8731, 80.7718]}
                            zoom={marker ? 15 : 8}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />
                            <ClickHandler onMarker={onMarkerPlace} />
                            {flyTarget && <FlyTo position={flyTarget} />}
                            {marker && <Marker position={[marker.lat, marker.lng]} />}
                        </MapContainer>

                        <button
                            type="button"
                            onClick={onLocateMe}
                            disabled={locating}
                            className="absolute bottom-3 right-3 z-[999] inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#071510]/90 px-3 py-2 text-xs font-medium text-white/85 shadow-lg backdrop-blur-xl transition hover:bg-[#0b1a14] disabled:opacity-60"
                        >
                            {locating ? (
                                <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                            ) : (
                                <Navigation className="h-3.5 w-3.5 text-emerald-300" />
                            )}
                            {locating ? "Locating…" : "My Location"}
                        </button>
                    </div>
                );
            }

            return MapPicker;
        }),
    {
        ssr: false,
        loading: () => (
            <div
                className="flex items-center justify-center rounded-[24px] border border-white/10 bg-white/[0.05]"
                style={{ height: 300 }}
            >
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
        ),
    }
) as React.ComponentType<MapPickerProps>;

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PostDonationPage() {
    const router = useRouter();

    const [authUser, setAuthUser] = React.useState<User | null>(null);
    const [userData, setUserData] = React.useState<any>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);

    const [title, setTitle] = React.useState("");
    const [description, setDescription] = React.useState("");
    const [quantity, setQuantity] = React.useState(10);
    const [pickupTo, setPickupTo] = React.useState(() => {
        const d = new Date();
        d.setHours(d.getHours() + 3);
        return toISODateTimeLocal(d);
    });
    const [photo, setPhoto] = React.useState<string | null>(null);
    const [uploading, setUploading] = React.useState(false);
    const [submitting, setSubmitting] = React.useState(false);
    const [msg, setMsg] = React.useState<string | null>(null);
    const [err, setErr] = React.useState<string | null>(null);

    const [marker, setMarker] = React.useState<LatLng | null>(null);
    const [flyTarget, setFlyTarget] = React.useState<[number, number] | null>(null);
    const [address, setAddress] = React.useState("");
    const [locating, setLocating] = React.useState(false);
    const [locErr, setLocErr] = React.useState<string | null>(null);

    const [searchQ, setSearchQ] = React.useState("");
    const [searchResults, setSearchResults] = React.useState<NominatimResult[]>([]);
    const [searching, setSearching] = React.useState(false);
    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const role: Role | "" = (userData?.role as Role) || "";

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setAuthUser(u || null);
            setLoadingUser(true);
            if (!u) {
                setUserData(null);
                setLoadingUser(false);
                return;
            }
            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                setUserData(snap.exists() ? snap.data() : null);
            } catch {
                setUserData(null);
            } finally {
                setLoadingUser(false);
            }
        });
        return () => unsub();
    }, []);

    React.useEffect(() => {
        if (!loadingUser && !authUser) router.push("/login");
    }, [loadingUser, authUser, router]);

    React.useEffect(() => {
        if (!loadingUser && authUser && role && role !== "restaurant") {
            router.push("/charity/dashboard");
        }
    }, [loadingUser, authUser, role, router]);

    React.useEffect(() => {
        locateMe();
    }, []);

    const placeMarker = async (lat: number, lng: number) => {
        setMarker({ lat, lng });
        setFlyTarget([lat, lng]);
        setSearchResults([]);
        setSearchQ("");
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
    };

    const locateMe = () => {
        if (!navigator.geolocation) {
            setLocErr("Geolocation not supported.");
            return;
        }

        setLocating(true);
        setLocErr(null);

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                placeMarker(pos.coords.latitude, pos.coords.longitude);
                setLocating(false);
            },
            () => {
                setLocErr("Could not get location. Click the map to set manually.");
                setLocating(false);
            }
        );
    };

    const handleSearchInput = (val: string) => {
        setSearchQ(val);
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!val.trim()) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            const results = await geocodeSearch(val);
            setSearchResults(results);
            setSearching(false);
        }, 400);
    };

    const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.currentTarget.value = "";
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setErr("Please select an image file.");
            return;
        }
        if (file.size > 500_000) {
            setErr("Image too large. Max 500KB.");
            return;
        }

        setErr(null);
        setUploading(true);

        try {
            const b64 = await new Promise<string>((res, rej) => {
                const r = new FileReader();
                r.onerror = () => rej(new Error("Failed to read image"));
                r.onloadend = () => res(String(r.result));
                r.readAsDataURL(file);
            });
            setPhoto(b64);
        } catch (e: any) {
            setErr(e?.message || "Upload failed.");
        } finally {
            setUploading(false);
        }
    };

    const canSubmit =
        !loadingUser &&
        !!authUser &&
        role === "restaurant" &&
        !uploading &&
        !submitting &&
        title.trim().length > 0 &&
        description.trim().length > 0 &&
        quantity > 0 &&
        address.trim().length > 0 &&
        !!pickupTo;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);
        setMsg(null);

        if (!authUser) {
            setErr("Please login first.");
            router.push("/login");
            return;
        }
        if (role !== "restaurant") {
            setErr("Only restaurants can post donations.");
            return;
        }

        setSubmitting(true);

        try {
            const pickupEnd = new Date(pickupTo);

            await addDoc(collection(db, "donations"), {
                title: title.trim(),
                description: description.trim(),
                quantity,
                address: address.trim(),
                location: marker ?? null,
                pickupTo: pickupEnd,
                expiresAt: pickupEnd,
                status: "available",
                photo: photo || "",
                restaurantId: authUser.uid,
                restaurantName: userData?.name || authUser.displayName || "Restaurant",
                restaurantEmail: userData?.email || authUser.email || "",
                restaurantMobile: userData?.mobile || "",
                restaurantAvatar: userData?.avatar || authUser.photoURL || "/default-avatar.png",
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

            setMsg("Donation posted successfully!");
            setTitle("");
            setDescription("");
            setQuantity(10);
            setAddress("");
            setPhoto(null);
            setMarker(null);

            setTimeout(() => router.push("/my-donations"), 600);
        } catch (e: any) {
            setErr(e?.message || "Failed to post donation.");
        } finally {
            setSubmitting(false);
        }
    };

    const inputCls =
        "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition duration-200 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20";
    const labelCls =
        "mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/55";

    if (loadingUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
        );
    }

    return (
        <>
            <RestaurantNavbar />

            <div className="min-h-screen bg-[#04110d] px-4 py-8">
                <div className="mx-auto max-w-5xl">
                    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                        {/* Left intro panel */}
                        <section className="rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                Premium donation workflow
                            </div>

                            <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-tight text-white lg:text-5xl">
                                Post a new
                                <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                  {" "}food donation
                </span>
                            </h1>

                            <p className="mt-5 max-w-xl text-sm leading-8 text-white/65 sm:text-base">
                                Share surplus food with clear details, precise pickup location,
                                timing, and optional imagery so charities can claim and collect more efficiently.
                            </p>

                            <div className="mt-8 grid gap-4 sm:grid-cols-3">
                                {[
                                    {
                                        icon: <Package2 className="h-4 w-4 text-emerald-300" />,
                                        title: "Clear Listing",
                                        desc: "Add title, quantity, and notes.",
                                    },
                                    {
                                        icon: <MapPin className="h-4 w-4 text-emerald-300" />,
                                        title: "Live Pickup Point",
                                        desc: "Set an exact map location quickly.",
                                    },
                                    {
                                        icon: <CalendarClock className="h-4 w-4 text-emerald-300" />,
                                        title: "Timed Collection",
                                        desc: "Define pickup availability clearly.",
                                    },
                                ].map((item) => (
                                    <div
                                        key={item.title}
                                        className="rounded-[28px] border border-white/10 bg-black/15 p-5"
                                    >
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                            {item.icon}
                                        </div>
                                        <div className="text-sm font-semibold text-white">{item.title}</div>
                                        <div className="mt-1 text-xs leading-6 text-white/50">{item.desc}</div>
                                    </div>
                                ))}
                            </div>

                            <div className="mt-8 rounded-[28px] border border-white/10 bg-gradient-to-r from-emerald-400/12 to-lime-300/8 p-5">
                                <p className="text-sm leading-7 text-white/68">
                                    Better donation cards improve visibility, reduce claim friction, and help charities act faster.
                                </p>
                            </div>
                        </section>

                        {/* Right form panel */}
                        <section className="rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                            <div className="mb-6">
                                <h2 className="text-2xl font-semibold tracking-tight text-white">
                                    Donation Details
                                </h2>
                                <p className="mt-1 text-sm text-white/50">
                                    Complete the form to publish a donation listing.
                                </p>
                            </div>

                            {err && (
                                <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {err}
                                </div>
                            )}

                            {msg && (
                                <div className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                    {msg}
                                </div>
                            )}

                            <form onSubmit={submit} className="space-y-5">
                                {/* Title */}
                                <div>
                                    <label className={labelCls}>Title</label>
                                    <input
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., 15 Rice Packs"
                                        className={inputCls}
                                        required
                                    />
                                </div>

                                {/* Description */}
                                <div>
                                    <label className={labelCls}>Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        placeholder="What's included? Any pickup notes or food details?"
                                        rows={4}
                                        className={cx(inputCls, "resize-none")}
                                        required
                                    />
                                </div>

                                {/* Quantity + Pickup */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className={labelCls}>Quantity</label>
                                        <div className="relative">
                                            <Package2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                            <input
                                                type="number"
                                                min={1}
                                                value={quantity}
                                                onChange={(e) => setQuantity(Number(e.target.value))}
                                                className={cx(inputCls, "pl-11")}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelCls}>Pickup Until</label>
                                        <div className="relative">
                                            <CalendarClock className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                            <input
                                                type="datetime-local"
                                                value={pickupTo}
                                                onChange={(e) => setPickupTo(e.target.value)}
                                                className={cx(inputCls, "pl-11 [color-scheme:dark]")}
                                                required
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Pickup Location */}
                                <div>
                                    <label className={labelCls}>Pickup Location</label>

                                    <div className="relative mb-3">
                                        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
                                        <input
                                            type="text"
                                            value={searchQ}
                                            onChange={(e) => handleSearchInput(e.target.value)}
                                            placeholder="Search for a location…"
                                            className={cx(inputCls, "pl-11 pr-10")}
                                        />

                                        {searching && (
                                            <div className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                                        )}

                                        {!searching && searchQ && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSearchQ("");
                                                    setSearchResults([]);
                                                }}
                                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                                            >
                                                <X className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>

                                    {searchResults.length > 0 && (
                                        <div
                                            className="mb-3 overflow-y-auto rounded-[22px] border border-white/10 bg-white/[0.06] shadow-lg"
                                            style={{ maxHeight: 180 }}
                                        >
                                            {searchResults.map((r, i) => (
                                                <button
                                                    key={i}
                                                    type="button"
                                                    onClick={() => placeMarker(parseFloat(r.lat), parseFloat(r.lon))}
                                                    className="flex w-full items-start gap-3 border-b border-white/8 px-4 py-3 text-left text-sm text-white/78 transition hover:bg-white/[0.08] last:border-0"
                                                >
                                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                                                    <span className="leading-6">{r.display_name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <LeafletMap
                                        marker={marker}
                                        flyTarget={flyTarget}
                                        onMarkerPlace={placeMarker}
                                        onLocateMe={locateMe}
                                        locating={locating}
                                    />

                                    {locErr && (
                                        <p className="mt-2 text-xs text-amber-300">{locErr}</p>
                                    )}

                                    {address && (
                                        <div className="mt-3 flex items-start gap-3 rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                                            <p className="text-sm leading-7 text-emerald-100/90">{address}</p>
                                        </div>
                                    )}

                                    <p className="mt-2 text-xs text-white/40">
                                        Search, click on the map, or use My Location to set the pickup point.
                                    </p>
                                </div>

                                {/* Photo */}
                                <div>
                                    <label className={labelCls}>
                                        Photo <span className="font-normal text-white/35">(optional · max 500KB)</span>
                                    </label>

                                    <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={uploading}
                                                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.1] disabled:opacity-60"
                                            >
                                                {uploading ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Uploading…
                                                    </>
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 text-emerald-300" />
                                                        Choose Image
                                                    </>
                                                )}
                                            </button>

                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={onPickPhoto}
                                            />

                                            {!photo && (
                                                <span className="text-sm text-white/40">No photo selected</span>
                                            )}
                                        </div>

                                        {photo && (
                                            <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                                                <img
                                                    src={photo}
                                                    alt="Preview"
                                                    className="h-14 w-14 rounded-xl border border-white/10 object-cover"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 text-sm font-medium text-white">
                                                        <ImageIcon className="h-4 w-4 text-emerald-300" />
                                                        Donation image attached
                                                    </div>
                                                    <p className="mt-1 text-xs text-white/45">
                                                        This image will be shown on the donation listing.
                                                    </p>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => setPhoto(null)}
                                                    className="text-sm font-medium text-red-300 transition hover:text-red-200"
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={!canSubmit}
                                    className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3.5 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                            Posting…
                                        </>
                                    ) : (
                                        <>
                                            Post Donation
                                            <Sparkles className="h-4 w-4 transition group-hover:scale-110" />
                                        </>
                                    )}
                                </button>

                                <p className="text-center">
                                    <button
                                        type="button"
                                        onClick={() => router.push("/my-donations")}
                                        className="text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
                                    >
                                        View My Donations →
                                    </button>
                                </p>
                            </form>
                        </section>
                    </div>
                </div>
            </div>
        </>
    );
}