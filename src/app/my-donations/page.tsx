// app/my-donations/page.tsx
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
    deleteDoc,
    doc,
    getDoc,
    updateDoc,
    serverTimestamp,
} from "firebase/firestore";
import {
    CalendarClock,
    CheckCircle,
    Clock,
    Loader2,
    MapPin,
    Navigation,
    Package,
    Pencil,
    Plus,
    Search,
    Sparkles,
    Trash2,
    User as UserIcon,
    X,
    ImageIcon,
    Upload,
} from "lucide-react";
import RestaurantNavbar from "@/components/RestaurantNavbar";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

/* -------------------------------- Types ----------------------------------- */

type Role = "restaurant" | "charity";
type LatLng = { lat: number; lng: number };
type NominatimResult = { display_name: string; lat: string; lon: string };

interface Donation {
    id: string;
    title: string;
    description: string;
    quantity: number;
    address: string;
    status: "available" | "claimed" | "expired" | "completed";
    photo?: string;
    pickupTo: any;
    createdAt: any;
    claimedBy?: string;
    claimedAt?: any;
    location?: LatLng;
}

interface Claim {
    id: string;
    donationId: string;
    userId: string;
    userEmail: string;
    status: "pending" | "approved" | "rejected";
    claimedAt: any;
}

interface ClaimWithDetails extends Claim {
    donation?: Donation;
    userName?: string;
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

function toISODateTimeLocal(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function sortDonationsByDate(donations: Donation[]): Donation[] {
    return [...donations].sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
        return dateB.getTime() - dateA.getTime();
    });
}

function sortClaimsByDate(claims: ClaimWithDetails[]): ClaimWithDetails[] {
    return [...claims].sort(
        (a, b) => new Date(b.claimedAt || 0).getTime() - new Date(a.claimedAt || 0).getTime()
    );
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

async function geocodeSearch(queryStr: string): Promise<NominatimResult[]> {
    try {
        const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(queryStr)}&format=json&limit=6`,
            { headers: { "Accept-Language": "en" } }
        );
        return await res.json();
    } catch {
        return [];
    }
}

const DONATION_STATUS_CLS: Record<string, string> = {
    available: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    claimed: "border-blue-400/20 bg-blue-400/10 text-blue-200",
    completed: "border-green-400/20 bg-green-400/10 text-green-200",
    expired: "border-white/10 bg-white/5 text-white/45",
};

const CLAIM_STATUS_CLS: Record<string, string> = {
    pending: "border-amber-400/20 bg-amber-400/10 text-amber-200",
    approved: "border-green-400/20 bg-green-400/10 text-green-200",
    rejected: "border-red-400/20 bg-red-400/10 text-red-200",
};

/* -------------------------------- Leaflet Map ----------------------------- */

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
                        className="relative overflow-hidden rounded-[22px] border border-white/10 bg-black/15"
                        style={{ height: 240 }}
                    >
                        <MapContainer
                            center={marker ? [marker.lat, marker.lng] : [7.8731, 80.7718]}
                            zoom={marker ? 15 : 8}
                            style={{ height: "100%", width: "100%" }}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution="&copy; OpenStreetMap"
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
                className="flex items-center justify-center rounded-[22px] border border-white/10 bg-white/[0.05]"
                style={{ height: 240 }}
            >
                <Loader2 className="h-5 w-5 animate-spin text-emerald-300" />
            </div>
        ),
    }
) as React.ComponentType<MapPickerProps>;

/* -------------------------------- Edit Modal ------------------------------ */

function EditModal({
                       donation,
                       onClose,
                       onSaved,
                   }: {
    donation: Donation;
    onClose: () => void;
    onSaved: (updated: Partial<Donation>) => void;
}) {
    const [title, setTitle] = React.useState(donation.title);
    const [description, setDescription] = React.useState(donation.description);
    const [quantity, setQuantity] = React.useState(donation.quantity);
    const [pickupTo, setPickupTo] = React.useState(() => {
        try {
            const d = donation.pickupTo?.toDate ? donation.pickupTo.toDate() : new Date(donation.pickupTo);
            return toISODateTimeLocal(d);
        } catch {
            const d = new Date();
            d.setHours(d.getHours() + 3);
            return toISODateTimeLocal(d);
        }
    });

    const [photo, setPhoto] = React.useState<string | null>(donation.photo || null);
    const [marker, setMarker] = React.useState<LatLng | null>(donation.location || null);
    const [flyTarget, setFlyTarget] = React.useState<[number, number] | null>(
        donation.location ? [donation.location.lat, donation.location.lng] : null
    );
    const [address, setAddress] = React.useState(donation.address);
    const [locating, setLocating] = React.useState(false);
    const [searchQ, setSearchQ] = React.useState("");
    const [searchResults, setSearchResults] = React.useState<NominatimResult[]>([]);
    const [searching, setSearching] = React.useState(false);
    const [uploading, setUploading] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [err, setErr] = React.useState<string | null>(null);

    const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    const placeMarker = async (lat: number, lng: number) => {
        setMarker({ lat, lng });
        setFlyTarget([lat, lng]);
        setSearchResults([]);
        setSearchQ("");
        const addr = await reverseGeocode(lat, lng);
        setAddress(addr);
    };

    const locateMe = () => {
        if (!navigator.geolocation) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                placeMarker(pos.coords.latitude, pos.coords.longitude);
                setLocating(false);
            },
            () => {
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
            setSearchResults(await geocodeSearch(val));
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

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErr(null);

        if (!title.trim() || !description.trim() || !address.trim() || !pickupTo) {
            setErr("Please fill in all required fields.");
            return;
        }

        setSaving(true);
        try {
            const updates = {
                title: title.trim(),
                description: description.trim(),
                quantity,
                address: address.trim(),
                location: marker ?? donation.location ?? undefined,
                pickupTo: new Date(pickupTo),
                expiresAt: new Date(pickupTo),
                photo: photo || "",
                updatedAt: serverTimestamp(),
            };

            await updateDoc(doc(db, "donations", donation.id), updates);
            onSaved(updates);
            onClose();
        } catch (e: any) {
            setErr(e?.message || "Failed to save changes.");
        } finally {
            setSaving(false);
        }
    };

    const inputCls =
        "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition duration-200 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20";
    const labelCls =
        "mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/55";

    return (
        <div
            className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[30px] border border-white/10 bg-[#091812]/95 shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:max-w-2xl sm:rounded-[30px]">
                <div className="border-b border-white/8 px-5 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-white">Edit Donation</h2>
                            <p className="mt-1 text-sm text-white/45">Update the details below</p>
                        </div>

                        <button
                            onClick={onClose}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-white/75"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto px-5 py-5">
                    {err && (
                        <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {err}
                        </div>
                    )}

                    <form id="edit-form" onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className={labelCls}>Title</label>
                            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} required />
                        </div>

                        <div>
                            <label className={labelCls}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={4}
                                className={cx(inputCls, "resize-none")}
                                required
                            />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className={labelCls}>Quantity</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className={inputCls}
                                    required
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Pickup Until</label>
                                <input
                                    type="datetime-local"
                                    value={pickupTo}
                                    onChange={(e) => setPickupTo(e.target.value)}
                                    className={cx(inputCls, "[color-scheme:dark]")}
                                    required
                                />
                            </div>
                        </div>

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
                                    style={{ maxHeight: 160 }}
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

                            {address && (
                                <div className="mt-3 flex items-start gap-3 rounded-[22px] border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                                    <p className="text-sm leading-7 text-emerald-100/90">{address}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            <label className={labelCls}>
                                Photo <span className="font-normal text-white/35">(optional · max 500KB)</span>
                            </label>

                            <div className="rounded-[22px] border border-white/10 bg-black/10 p-4">
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
                                                Change Image
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

                                    {!photo && <span className="text-sm text-white/40">No photo</span>}
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
                                                This image will be shown on the donation card.
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
                    </form>
                </div>

                <div className="flex gap-3 border-t border-white/8 px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/75 transition hover:bg-white/10"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="edit-form"
                        disabled={saving}
                        className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition disabled:opacity-60"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving…
                            </>
                        ) : (
                            "Save Changes"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* -------------------------------- Page ------------------------------------ */

export default function MyDonationsPage() {
    const router = useRouter();

    const [authUser, setAuthUser] = React.useState<FirebaseUser | null>(null);
    const [role, setRole] = React.useState<Role | null>(null);
    const [loadingUser, setLoadingUser] = React.useState(true);

    const [donations, setDonations] = React.useState<Donation[]>([]);
    const [claims, setClaims] = React.useState<ClaimWithDetails[]>([]);
    const [loadingDonations, setLoadingDonations] = React.useState(true);
    const [loadingClaims, setLoadingClaims] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState<"donations" | "claims">("donations");

    const [confirmId, setConfirmId] = React.useState<string | null>(null);
    const [deletingId, setDeletingId] = React.useState<string | null>(null);
    const [editingDonation, setEditingDonation] = React.useState<Donation | null>(null);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoadingUser(true);
            setAuthUser(u || null);
            if (!u) {
                setLoadingUser(false);
                return;
            }

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                setRole((snap.data()?.role as Role) ?? null);
            } catch {
                setRole(null);
            } finally {
                setLoadingUser(false);
            }
        });

        return () => unsub();
    }, []);

    React.useEffect(() => {
        if (loadingUser) return;
        if (!authUser) {
            router.push("/login");
            return;
        }
        if (role && role !== "restaurant") router.push("/");
    }, [loadingUser, authUser, role, router]);

    React.useEffect(() => {
        if (!authUser || role !== "restaurant") return;

        setLoadingDonations(true);
        const q = query(collection(db, "donations"), where("restaurantId", "==", authUser.uid));

        const unsub = onSnapshot(
            q,
            (snap) => {
                setDonations(
                    sortDonationsByDate(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Donation)))
                );
                setLoadingDonations(false);
            },
            () => setLoadingDonations(false)
        );

        return () => unsub();
    }, [authUser, role]);

    React.useEffect(() => {
        if (!authUser || role !== "restaurant" || donations.length === 0) {
            setLoadingClaims(false);
            return;
        }

        setLoadingClaims(true);
        const donationIds = donations.map((d) => d.id);
        const q = query(collection(db, "claims"), where("donationId", "in", donationIds));

        const unsub = onSnapshot(
            q,
            async (snap) => {
                const claimsData = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Claim));

                const enriched: ClaimWithDetails[] = await Promise.all(
                    claimsData.map(async (c) => {
                        let userName: string | undefined;

                        try {
                            if (c.userId) {
                                const userSnap = await getDoc(doc(db, "users", c.userId));
                                const data = userSnap.data();
                                userName = data?.name || data?.displayName || undefined;
                            }
                        } catch (err) {
                            console.warn("Could not fetch user name for", c.userId, err);
                        }

                        return { ...c, donation: donations.find((d) => d.id === c.donationId), userName };
                    })
                );

                setClaims(sortClaimsByDate(enriched));
                setLoadingClaims(false);
            },
            () => setLoadingClaims(false)
        );

        return () => unsub();
    }, [authUser, role, donations]);

    const handleDelete = async (id: string) => {
        setDeletingId(id);
        try {
            await deleteDoc(doc(db, "donations", id));
        } catch (e: any) {
            alert(e?.message || "Failed to delete.");
        } finally {
            setDeletingId(null);
            setConfirmId(null);
        }
    };

    const handleSaved = (id: string, updates: Partial<Donation>) => {
        setDonations((prev) => prev.map((d) => (d.id === id ? { ...d, ...updates } : d)));
    };

    const statCards = [
        { label: "Total Donations", value: donations.length },
        { label: "Claims Received", value: claims.length },
        { label: "Available", value: donations.filter((d) => d.status === "available").length },
        { label: "Completed", value: donations.filter((d) => d.status === "completed").length },
    ];

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
                <div className="mx-auto max-w-6xl">
                    {/* Header */}
                    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                        <div>
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                                <Sparkles className="h-4 w-4" />
                                Premium donation management
                            </div>
                            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                My Donations
                            </h1>
                            <p className="mt-3 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
                                Review donation listings, see incoming claims, edit available posts,
                                and manage restaurant-side coordination from one place.
                            </p>
                        </div>

                        <button
                            onClick={() => router.push("/post-donation")}
                            className="inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-5 py-3.5 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition hover:scale-[1.01]"
                        >
                            <Plus className="h-4 w-4" />
                            New Donation
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {statCards.map((item) => (
                            <div
                                key={item.label}
                                className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                            >
                                <div className="text-sm text-white/45">{item.label}</div>
                                <div className="mt-2 text-3xl font-bold text-emerald-200">{item.value}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="mb-6 flex flex-wrap gap-3">
                        {(["donations", "claims"] as const).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={cx(
                                    "rounded-2xl px-5 py-3 text-sm font-medium capitalize transition",
                                    activeTab === tab
                                        ? "bg-gradient-to-r from-emerald-400 to-lime-300 text-[#062116] shadow-[0_10px_30px_rgba(52,211,153,0.22)]"
                                        : "border border-white/10 bg-white/[0.06] text-white/72 hover:bg-white/[0.1]"
                                )}
                            >
                                {tab === "donations"
                                    ? `My Donations (${donations.length})`
                                    : `Claims Received (${claims.length})`}
                            </button>
                        ))}
                    </div>

                    {/* Donations Tab */}
                    {activeTab === "donations" ? (
                        loadingDonations ? (
                            <div className="flex items-center justify-center py-24">
                                <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                            </div>
                        ) : donations.length === 0 ? (
                            <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
                                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/8">
                                    <Package className="h-6 w-6 text-white/35" />
                                </div>
                                <p className="text-lg font-semibold text-white">No donations yet</p>
                                <p className="mt-2 text-sm text-white/45">
                                    Post your first food donation to get started.
                                </p>
                                <button
                                    onClick={() => router.push("/post-donation")}
                                    className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-5 py-3 text-sm font-semibold text-[#062116]"
                                >
                                    Post a Donation
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-5 xl:grid-cols-2">
                                {donations.map((d) => (
                                    <div
                                        key={d.id}
                                        className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                                    >
                                        <div className="flex gap-4 p-5">
                                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-black/15">
                                                {d.photo ? (
                                                    <img src={d.photo} alt={d.title} className="h-full w-full object-cover" />
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
                                                            DONATION_STATUS_CLS[d.status] ?? DONATION_STATUS_CLS.expired
                                                        )}
                                                    >
                            {d.status}
                          </span>
                                                </div>

                                                <p className="mt-2 line-clamp-2 text-sm leading-7 text-white/55">
                                                    {d.description}
                                                </p>

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

                                                {d.claimedBy &&
                                                    (() => {
                                                        const claimMatch = claims.find((c) => c.donationId === d.id);
                                                        const claimerName = claimMatch?.userName || claimMatch?.userEmail || "a charity";
                                                        return (
                                                            <p className="mt-2 flex items-center gap-1.5 text-xs text-blue-200">
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                Claimed by {claimerName}
                                                            </p>
                                                        );
                                                    })()}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between border-t border-white/8 px-5 py-4">
                      <span className="text-xs text-white/35">
                        Posted {formatDate(d.createdAt)}
                      </span>

                                            <div className="flex items-center gap-3">
                                                {d.status === "available" && (
                                                    <button
                                                        onClick={() => setEditingDonation(d)}
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-300 transition hover:text-emerald-200"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                        Edit
                                                    </button>
                                                )}

                                                {d.status === "available" && confirmId === d.id ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-white/45">Delete?</span>
                                                        <button
                                                            onClick={() => handleDelete(d.id)}
                                                            disabled={deletingId === d.id}
                                                            className="inline-flex items-center gap-1 rounded-xl bg-red-500 px-3 py-2 text-xs font-medium text-white transition hover:bg-red-600 disabled:opacity-60"
                                                        >
                                                            {deletingId === d.id && <Loader2 className="h-3 w-3 animate-spin" />}
                                                            Yes
                                                        </button>
                                                        <button
                                                            onClick={() => setConfirmId(null)}
                                                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition hover:bg-white/10"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                ) : d.status === "available" ? (
                                                    <button
                                                        onClick={() => setConfirmId(d.id)}
                                                        className="inline-flex items-center gap-1.5 text-sm font-medium text-red-300 transition hover:text-red-200"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : loadingClaims ? (
                        <div className="flex items-center justify-center py-24">
                            <Loader2 className="h-6 w-6 animate-spin text-emerald-300" />
                        </div>
                    ) : claims.length === 0 ? (
                        <div className="rounded-[32px] border border-white/10 bg-white/[0.06] p-12 text-center shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl">
                            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-white/8">
                                <UserIcon className="h-6 w-6 text-white/35" />
                            </div>
                            <p className="text-lg font-semibold text-white">No claims yet</p>
                            <p className="mt-2 text-sm text-white/45">
                                When charities claim your donations, they will appear here.
                            </p>
                        </div>
                    ) : (
                        <div className="grid gap-5 xl:grid-cols-2">
                            {claims.map((claim) => (
                                <div
                                    key={claim.id}
                                    className="overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.06] shadow-[0_20px_60px_rgba(0,0,0,0.22)] backdrop-blur-2xl"
                                >
                                    <div className="p-5">
                                        <div className="mb-4 flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/12">
                                                    <UserIcon className="h-5 w-5 text-emerald-200" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-semibold text-white">
                                                        {claim.userName || claim.userEmail}
                                                    </p>
                                                    {claim.userName && (
                                                        <p className="truncate text-xs text-white/40">{claim.userEmail}</p>
                                                    )}
                                                    <p className="mt-1 text-xs text-white/40">
                                                        Claimed {formatDate(claim.claimedAt)}
                                                    </p>
                                                </div>
                                            </div>

                                            <span
                                                className={cx(
                                                    "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                                                    CLAIM_STATUS_CLS[claim.status] ?? "border-white/10 bg-white/5 text-white/50"
                                                )}
                                            >
                        {claim.status}
                      </span>
                                        </div>

                                        {claim.donation && (
                                            <div className="rounded-[24px] border border-white/8 bg-black/12 p-4">
                                                <p className="text-sm font-semibold text-white">
                                                    Donation: {claim.donation.title}
                                                </p>
                                                <p className="mt-2 text-sm leading-7 text-white/55">
                                                    {claim.donation.description}
                                                </p>

                                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-white/45">
                          <span className="inline-flex items-center gap-1.5">
                            <Package className="h-3.5 w-3.5" />
                              {claim.donation.quantity} packs
                          </span>
                                                    <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-3.5 w-3.5" />
                            Pickup until {formatDate(claim.donation.pickupTo)}
                          </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {editingDonation && (
                <EditModal
                    donation={editingDonation}
                    onClose={() => setEditingDonation(null)}
                    onSaved={(updates) => {
                        handleSaved(editingDonation.id, updates);
                        setEditingDonation(null);
                    }}
                />
            )}
        </>
    );
}