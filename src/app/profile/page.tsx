"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
    onAuthStateChanged,
    signOut,
    updatePassword,
    EmailAuthProvider,
    reauthenticateWithCredential,
    type User,
} from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import {
    ArrowLeft,
    Camera,
    CheckCircle,
    Eye,
    EyeOff,
    KeyRound,
    Loader2,
    LogOut,
    Save,
    ShieldCheck,
    Sparkles,
    UserRound,
} from "lucide-react";
import { gsap } from "gsap";

/* -------------------------------- Utilities -------------------------------- */

function cleanStr(v: any) {
    if (!v) return null;
    const s = String(v).trim();
    if (!s || ["null", "undefined", "false", "0"].includes(s.toLowerCase())) return null;
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

function cx(...classes: Array<string | false | null | undefined>) {
    return classes.filter(Boolean).join(" ");
}

const inputCls =
    "w-full rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none transition duration-200 focus:border-emerald-400/50 focus:bg-white/[0.08] focus:ring-2 focus:ring-emerald-400/20";
const labelCls =
    "mb-2 block text-xs font-medium uppercase tracking-[0.14em] text-white/55";

/* --------------------------------- Page ---------------------------------- */

export default function ProfilePage() {
    const router = useRouter();

    const [authUser, setAuthUser] = React.useState<User | null>(null);
    const [loadingUser, setLoading] = React.useState(true);
    const [userData, setUserData] = React.useState<any>(null);

    const [name, setName] = React.useState("");
    const [mobile, setMobile] = React.useState("");
    const [imgSrc, setImgSrc] = React.useState("/default-avatar.png");
    const [avatarData, setAvatarData] = React.useState<string | null>(null);

    const [saving, setSaving] = React.useState(false);
    const [saveOk, setSaveOk] = React.useState(false);
    const [saveErr, setSaveErr] = React.useState<string | null>(null);

    const [pwOpen, setPwOpen] = React.useState(false);
    const [curPw, setCurPw] = React.useState("");
    const [newPw, setNewPw] = React.useState("");
    const [conPw, setConPw] = React.useState("");
    const [showCur, setShowCur] = React.useState(false);
    const [showNew, setShowNew] = React.useState(false);
    const [showCon, setShowCon] = React.useState(false);
    const [pwSaving, setPwSaving] = React.useState(false);
    const [pwOk, setPwOk] = React.useState(false);
    const [pwErr, setPwErr] = React.useState<string | null>(null);

    const fileRef = React.useRef<HTMLInputElement>(null);
    const shellRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const unsub = onAuthStateChanged(auth, async (u) => {
            setLoading(true);
            setAuthUser(u || null);

            if (!u) {
                setLoading(false);
                router.push("/login");
                return;
            }

            try {
                const snap = await getDoc(doc(db, "users", u.uid));
                if (snap.exists()) {
                    const d = snap.data();
                    setUserData(d);
                    setName(d.name || u.displayName || "");
                    setMobile(d.mobile || "");
                    setImgSrc(normalizeAvatar(d.avatar) || cleanStr(u.photoURL) || "/default-avatar.png");
                } else {
                    setName(u.displayName || "");
                    setImgSrc(cleanStr(u.photoURL) || "/default-avatar.png");
                }
            } finally {
                setLoading(false);
            }
        });

        return () => unsub();
    }, [router]);

    React.useEffect(() => {
        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReducedMotion || !shellRef.current || loadingUser) return;

        const ctx = gsap.context(() => {
            gsap.set([".profile-chip", ".profile-title", ".profile-copy", ".profile-card"], {
                opacity: 0,
                y: 22,
            });

            const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
            tl.to(".profile-chip", { opacity: 1, y: 0, duration: 0.55 })
                .to(".profile-title", { opacity: 1, y: 0, duration: 0.8 }, "-=0.28")
                .to(".profile-copy", { opacity: 1, y: 0, duration: 0.72 }, "-=0.42")
                .to(".profile-card", { opacity: 1, y: 0, duration: 0.72 }, "-=0.42");
        }, shellRef);

        return () => ctx.revert();
    }, [loadingUser]);

    const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.currentTarget.value = "";

        if (!file) return;
        if (!file.type.startsWith("image/")) {
            setSaveErr("Please select an image.");
            return;
        }
        if (file.size > 500_000) {
            setSaveErr("Image too large. Max 500KB.");
            return;
        }

        setSaveErr(null);

        const b64 = await new Promise<string>((res, rej) => {
            const r = new FileReader();
            r.onerror = () => rej();
            r.onloadend = () => res(String(r.result));
            r.readAsDataURL(file);
        });

        setImgSrc(b64);
        setAvatarData(b64);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!authUser) return;

        setSaving(true);
        setSaveErr(null);
        setSaveOk(false);

        try {
            const up: any = { name: name.trim(), mobile: mobile.trim() };
            if (avatarData) up.avatar = avatarData;
            await updateDoc(doc(db, "users", authUser.uid), up);
            setSaveOk(true);
            setTimeout(() => setSaveOk(false), 3000);
        } catch (err: any) {
            setSaveErr(err?.message || "Save failed.");
        } finally {
            setSaving(false);
        }
    };

    const handlePw = async (e: React.FormEvent) => {
        e.preventDefault();
        setPwErr(null);
        setPwOk(false);

        if (newPw !== conPw) {
            setPwErr("Passwords do not match.");
            return;
        }
        if (newPw.length < 6) {
            setPwErr("Password must be at least 6 characters.");
            return;
        }
        if (!authUser?.email) {
            setPwErr("Not available for this account type.");
            return;
        }

        setPwSaving(true);
        try {
            await reauthenticateWithCredential(
                authUser,
                EmailAuthProvider.credential(authUser.email, curPw)
            );
            await updatePassword(authUser, newPw);
            setPwOk(true);
            setCurPw("");
            setNewPw("");
            setConPw("");
            setTimeout(() => setPwOk(false), 3000);
        } catch (err: any) {
            setPwErr(
                err?.code === "auth/wrong-password" || err?.code === "auth/invalid-credential"
                    ? "Current password is incorrect."
                    : err?.message || "Failed."
            );
        } finally {
            setPwSaving(false);
        }
    };

    const isGoogle = authUser?.providerData?.some((p) => p.providerId === "google.com");

    if (loadingUser) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#04110d]">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-300" />
            </div>
        );
    }

    return (
        <main
            ref={shellRef}
            className="relative min-h-screen overflow-hidden bg-[#04110d] px-4 py-8 text-white"
        >
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

                <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                    {/* Left intro card */}
                    <section className="profile-card rounded-[34px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.35)] backdrop-blur-2xl lg:p-8">
                        <div className="profile-chip inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-medium tracking-[0.14em] text-emerald-200">
                            <Sparkles className="h-4 w-4" />
                            Premium profile settings
                        </div>

                        <h1 className="profile-title mt-6 text-4xl font-semibold tracking-tight lg:text-5xl">
                            My
                            <span className="bg-gradient-to-r from-emerald-300 via-green-200 to-lime-200 bg-clip-text text-transparent">
                {" "}Profile
              </span>
                        </h1>

                        <p className="profile-copy mt-5 max-w-md text-sm leading-8 text-white/65 sm:text-base">
                            Manage your EcoPlate account details, avatar, and password in one secure, polished profile experience.
                        </p>

                        <div className="mt-8 rounded-[28px] border border-white/10 bg-black/15 p-5">
                            <div className="flex items-center gap-4">
                                <button
                                    type="button"
                                    onClick={() => fileRef.current?.click()}
                                    className="group relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/6 transition hover:bg-white/10"
                                >
                                    <img
                                        src={imgSrc}
                                        alt="Avatar"
                                        className="h-full w-full object-cover"
                                        referrerPolicy="no-referrer"
                                        onError={() => {
                                            if (imgSrc !== "/default-avatar.png") setImgSrc("/default-avatar.png");
                                        }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition group-hover:opacity-100">
                                        <Camera className="h-4 w-4 text-white" />
                                    </div>
                                </button>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={onPhoto}
                                />

                                <div className="min-w-0">
                                    <p className="truncate text-lg font-semibold text-white">
                                        {name || "Your Name"}
                                    </p>
                                    <p className="mt-1 truncate text-sm text-white/45">{authUser?.email}</p>
                                    <p className="mt-2 text-xs uppercase tracking-[0.14em] text-emerald-200/75">
                                        {userData?.role || "user"}
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                    <UserRound className="h-4 w-4 text-emerald-300" />
                                </div>
                                <p className="text-sm font-semibold text-white">Identity</p>
                                <p className="mt-1 text-xs leading-6 text-white/45">
                                    Keep your profile details current for a trusted platform presence.
                                </p>
                            </div>

                            <div className="rounded-[24px] border border-white/10 bg-white/[0.05] p-4">
                                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8">
                                    <ShieldCheck className="h-4 w-4 text-emerald-300" />
                                </div>
                                <p className="text-sm font-semibold text-white">Security</p>
                                <p className="mt-1 text-xs leading-6 text-white/45">
                                    Update your password safely and protect access to your account.
                                </p>
                            </div>
                        </div>
                    </section>

                    {/* Right form card */}
                    <section className="profile-card rounded-[34px] border border-white/10 bg-white/[0.08] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.4)] backdrop-blur-2xl lg:p-8">
                        <div className="mb-6">
                            <h2 className="text-2xl font-semibold tracking-tight text-white">
                                Account Settings
                            </h2>
                            <p className="mt-1 text-sm text-white/52">
                                Update your profile information and security preferences.
                            </p>
                        </div>

                        {saveErr && (
                            <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                {saveErr}
                            </div>
                        )}

                        {saveOk && (
                            <div className="mb-4 flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                <CheckCircle className="h-4 w-4 shrink-0" />
                                Profile saved successfully!
                            </div>
                        )}

                        <form onSubmit={handleSave} className="space-y-5">
                            <div>
                                <label className={labelCls}>Full Name</label>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Your full name"
                                    className={inputCls}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Email</label>
                                <input
                                    value={authUser?.email || ""}
                                    disabled
                                    className={cx(inputCls, "cursor-not-allowed opacity-60")}
                                />
                            </div>

                            <div>
                                <label className={labelCls}>Mobile Number</label>
                                <input
                                    value={mobile}
                                    onChange={(e) => setMobile(e.target.value)}
                                    placeholder="+94 7X XXX XXXX"
                                    className={inputCls}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={saving}
                                className="group inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-400 to-lime-300 px-4 py-3.5 text-sm font-semibold text-[#062116] shadow-[0_14px_40px_rgba(52,211,153,0.28)] transition duration-200 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving…
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </form>

                        {!isGoogle && (
                            <>
                                <div className="my-6 h-px bg-white/10" />

                                <div className="rounded-[28px] border border-white/10 bg-black/12 p-5">
                                    <button
                                        type="button"
                                        onClick={() => setPwOpen((v) => !v)}
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2 text-sm font-semibold text-white">
                                                <KeyRound className="h-4 w-4 text-emerald-300" />
                                                Change Password
                                            </div>
                                            <p className="mt-1 text-xs text-white/45">
                                                Update your account password securely
                                            </p>
                                        </div>
                                        <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/55">
                                            {pwOpen ? "Hide" : "Open"}
                                        </div>
                                    </button>

                                    {pwOpen && (
                                        <div className="mt-5 space-y-4">
                                            {pwErr && (
                                                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                                    {pwErr}
                                                </div>
                                            )}

                                            {pwOk && (
                                                <div className="flex items-center gap-2 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                                                    <CheckCircle className="h-4 w-4 shrink-0" />
                                                    Password updated!
                                                </div>
                                            )}

                                            <form onSubmit={handlePw} className="space-y-4">
                                                <div>
                                                    <label className={labelCls}>Current Password</label>
                                                    <div className="relative">
                                                        <input
                                                            type={showCur ? "text" : "password"}
                                                            value={curPw}
                                                            onChange={(e) => setCurPw(e.target.value)}
                                                            placeholder="••••••••"
                                                            required
                                                            className={cx(inputCls, "pr-12")}
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => setShowCur((v) => !v)}
                                                            className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/8 hover:text-white/70"
                                                        >
                                                            {showCur ? (
                                                                <EyeOff className="h-4 w-4" />
                                                            ) : (
                                                                <Eye className="h-4 w-4" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="grid gap-4 sm:grid-cols-2">
                                                    <div>
                                                        <label className={labelCls}>New Password</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showNew ? "text" : "password"}
                                                                value={newPw}
                                                                onChange={(e) => setNewPw(e.target.value)}
                                                                placeholder="••••••••"
                                                                required
                                                                className={cx(inputCls, "pr-12")}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowNew((v) => !v)}
                                                                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/8 hover:text-white/70"
                                                            >
                                                                {showNew ? (
                                                                    <EyeOff className="h-4 w-4" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className={labelCls}>Confirm Password</label>
                                                        <div className="relative">
                                                            <input
                                                                type={showCon ? "text" : "password"}
                                                                value={conPw}
                                                                onChange={(e) => setConPw(e.target.value)}
                                                                placeholder="••••••••"
                                                                required
                                                                className={cx(inputCls, "pr-12")}
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => setShowCon((v) => !v)}
                                                                className="absolute right-3 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-white/40 transition hover:bg-white/8 hover:text-white/70"
                                                            >
                                                                {showCon ? (
                                                                    <EyeOff className="h-4 w-4" />
                                                                ) : (
                                                                    <Eye className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    type="submit"
                                                    disabled={pwSaving}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3.5 text-sm font-semibold text-white/88 backdrop-blur-xl transition duration-200 hover:bg-white/[0.1] disabled:opacity-60"
                                                >
                                                    {pwSaving ? (
                                                        <>
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                            Updating…
                                                        </>
                                                    ) : (
                                                        <>
                                                            <KeyRound className="h-4 w-4 text-emerald-300" />
                                                            Update Password
                                                        </>
                                                    )}
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        <div className="my-6 h-px bg-white/10" />

                        <button
                            onClick={async () => {
                                await signOut(auth);
                                router.push("/login");
                            }}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3.5 text-sm font-semibold text-red-200 transition hover:bg-red-500/15"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </section>
                </div>
            </div>
        </main>
    );
}