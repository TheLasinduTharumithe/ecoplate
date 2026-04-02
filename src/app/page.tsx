"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import * as THREE from "three";

import { auth, db } from "@/lib/firebase";
import RestaurantNavbar from "@/components/RestaurantNavbar";
import CharityNavbar from "@/components/CharityNavbar";

import {
  UtensilsCrossed,
  Heart,
  MapPin,
  Zap,
  Clock,
  Lock,
  ClipboardList,
  Smartphone,
  ArrowRight,
  Sparkles,
} from "lucide-react";

type Role = "restaurant" | "charity" | null;

gsap.registerPlugin(ScrollTrigger);

export default function Home() {
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  const heroRef = useRef<HTMLDivElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement | null>(null);
  const subtitleRef = useRef<HTMLParagraphElement | null>(null);
  const ctaRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);
  const featuresRef = useRef<HTMLDivElement | null>(null);
  const howRef = useRef<HTMLDivElement | null>(null);
  const threeCanvasRef = useRef<HTMLDivElement | null>(null);
  const dashboardCardRef = useRef<HTMLDivElement | null>(null);
  const howTitleRef = useRef<HTMLDivElement | null>(null);
  const featureTitleRef = useRef<HTMLDivElement | null>(null);
  const ctaSectionRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setLoading(true);
      try {
        if (!u) {
          setRole(null);
          return;
        }

        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data() as { role?: string };
          const r = data?.role;
          setRole(r === "restaurant" || r === "charity" ? (r as Role) : null);
        } else {
          setRole(null);
        }
      } catch {
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!titleRef.current || !subtitleRef.current || !ctaRef.current || !statsRef.current) return;

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
        titleRef.current,
        { y: 40, opacity: 0, filter: "blur(12px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1 }
    )
        .fromTo(
            subtitleRef.current,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.8 },
            "-=0.55"
        )
        .fromTo(
            ctaRef.current.children,
            { y: 18, opacity: 0, scale: 0.96 },
            { y: 0, opacity: 1, scale: 1, duration: 0.6, stagger: 0.12 },
            "-=0.45"
        )
        .fromTo(
            statsRef.current.children,
            { y: 18, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, stagger: 0.1 },
            "-=0.35"
        );

    if (dashboardCardRef.current) {
      gsap.fromTo(
          dashboardCardRef.current,
          { y: 26, opacity: 0, scale: 0.97, rotateX: 6 },
          { y: 0, opacity: 1, scale: 1, rotateX: 0, duration: 1, ease: "power3.out", delay: 0.15 }
      );
    }
  }, [loading, role]);

  useEffect(() => {
    if (loading) return;

    const ctx = gsap.context(() => {
      if (dashboardCardRef.current) {
        gsap.to(dashboardCardRef.current, {
          y: -28,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      }

      if (statsRef.current) {
        gsap.fromTo(
            statsRef.current.children,
            { opacity: 0, y: 22 },
            {
              opacity: 1,
              y: 0,
              stagger: 0.08,
              duration: 0.7,
              ease: "power3.out",
              scrollTrigger: {
                trigger: statsRef.current,
                start: "top 85%",
              },
            }
        );
      }

      if (howTitleRef.current) {
        gsap.fromTo(
            howTitleRef.current.children,
            { opacity: 0, y: 32, filter: "blur(8px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              stagger: 0.12,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: howTitleRef.current,
                start: "top 82%",
              },
            }
        );
      }

      if (howRef.current) {
        gsap.fromTo(
            howRef.current.querySelectorAll(".reveal-card"),
            { y: 48, opacity: 0, scale: 0.97 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.85,
              stagger: 0.14,
              ease: "power3.out",
              scrollTrigger: {
                trigger: howRef.current,
                start: "top 72%",
              },
            }
        );
      }

      if (featureTitleRef.current) {
        gsap.fromTo(
            featureTitleRef.current.children,
            { opacity: 0, y: 28, filter: "blur(8px)" },
            {
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              stagger: 0.12,
              duration: 0.8,
              ease: "power3.out",
              scrollTrigger: {
                trigger: featureTitleRef.current,
                start: "top 82%",
              },
            }
        );
      }

      if (featuresRef.current) {
        gsap.fromTo(
            featuresRef.current.querySelectorAll(".feature-card"),
            { y: 44, opacity: 0, scale: 0.98 },
            {
              y: 0,
              opacity: 1,
              scale: 1,
              duration: 0.75,
              stagger: 0.09,
              ease: "power3.out",
              scrollTrigger: {
                trigger: featuresRef.current,
                start: "top 74%",
              },
            }
        );
      }

      if (ctaSectionRef.current) {
        gsap.fromTo(
            ctaSectionRef.current,
            { opacity: 0, y: 40, scale: 0.985 },
            {
              opacity: 1,
              y: 0,
              scale: 1,
              duration: 0.9,
              ease: "power3.out",
              scrollTrigger: {
                trigger: ctaSectionRef.current,
                start: "top 82%",
              },
            }
        );
      }
    });

    return () => ctx.revert();
  }, [loading]);

  useEffect(() => {
    if (!threeCanvasRef.current) return;

    const container = threeCanvasRef.current;
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
        55,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 34;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const particleCount = 140;
    const positions = new Float32Array(particleCount * 3);
    const velocities: { x: number; y: number }[] = [];
    const pointsData: { x: number; y: number; z: number }[] = [];

    for (let i = 0; i < particleCount; i++) {
      const x = (Math.random() - 0.5) * 78;
      const y = (Math.random() - 0.5) * 42;
      const z = (Math.random() - 0.5) * 8;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      pointsData.push({ x, y, z });
      velocities.push({
        x: (Math.random() - 0.5) * 0.02,
        y: (Math.random() - 0.5) * 0.02,
      });
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.16,
      color: new THREE.Color("#6ee7b7"),
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    const linePositions = new Float32Array(particleCount * particleCount * 3);
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setDrawRange(0, 0);

    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#34d399"),
      transparent: true,
      opacity: 0.12,
      blending: THREE.AdditiveBlending,
    });

    const lineSegments = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lineSegments);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const glowSphereA = new THREE.Mesh(
        new THREE.SphereGeometry(5.8, 32, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#10b981"),
          transparent: true,
          opacity: 0.06,
        })
    );
    glowSphereA.position.set(-12, 8, -12);
    scene.add(glowSphereA);

    const glowSphereB = new THREE.Mesh(
        new THREE.SphereGeometry(4.6, 32, 32),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color("#bef264"),
          transparent: true,
          opacity: 0.045,
        })
    );
    glowSphereB.position.set(14, -7, -10);
    scene.add(glowSphereB);

    let animationId = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      mouseX = (x - 0.5) * 2.2;
      mouseY = (y - 0.5) * 1.4;
    };

    const maxDistance = 8.5;

    const animate = () => {
      let lineIndex = 0;

      for (let i = 0; i < particleCount; i++) {
        const p = pointsData[i];
        p.x += velocities[i].x;
        p.y += velocities[i].y;

        if (p.x > 39 || p.x < -39) velocities[i].x *= -1;
        if (p.y > 21 || p.y < -21) velocities[i].y *= -1;

        positions[i * 3] = p.x;
        positions[i * 3 + 1] = p.y;
        positions[i * 3 + 2] = p.z;
      }

      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const dx = pointsData[i].x - pointsData[j].x;
          const dy = pointsData[i].y - pointsData[j].y;
          const dz = pointsData[i].z - pointsData[j].z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < maxDistance) {
            linePositions[lineIndex++] = pointsData[i].x;
            linePositions[lineIndex++] = pointsData[i].y;
            linePositions[lineIndex++] = pointsData[i].z;

            linePositions[lineIndex++] = pointsData[j].x;
            linePositions[lineIndex++] = pointsData[j].y;
            linePositions[lineIndex++] = pointsData[j].z;
          }
        }
      }

      lineGeometry.setDrawRange(0, lineIndex / 3);
      lineGeometry.attributes.position.needsUpdate = true;
      particleGeometry.attributes.position.needsUpdate = true;

      particleSystem.rotation.y += 0.0006;
      particleSystem.rotation.x += 0.00012;
      particleSystem.position.x += (mouseX - particleSystem.position.x) * 0.02;
      particleSystem.position.y += (-mouseY - particleSystem.position.y) * 0.02;

      lineSegments.rotation.y = particleSystem.rotation.y;
      lineSegments.rotation.x = particleSystem.rotation.x;
      lineSegments.position.x = particleSystem.position.x;
      lineSegments.position.y = particleSystem.position.y;

      glowSphereA.position.x = -12 + mouseX * 0.8;
      glowSphereA.position.y = 8 - mouseY * 0.6;

      glowSphereB.position.x = 14 - mouseX * 0.6;
      glowSphereB.position.y = -7 + mouseY * 0.45;

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    container.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      container.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      particleGeometry.dispose();
      particleMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      (glowSphereA.geometry as THREE.BufferGeometry).dispose();
      (glowSphereA.material as THREE.Material).dispose();
      (glowSphereB.geometry as THREE.BufferGeometry).dispose();
      (glowSphereB.material as THREE.Material).dispose();
      renderer.dispose();

      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  const featureItems = [
    {
      icon: <MapPin className="h-5 w-5 text-green-400" />,
      title: "Live Map & Navigation",
      desc: "Pickup locations appear on interactive maps so charities can quickly reach each donation point.",
    },
    {
      icon: <Zap className="h-5 w-5 text-green-400" />,
      title: "Real-time Updates",
      desc: "Availability, claims, and completion status update instantly for both restaurants and charities.",
    },
    {
      icon: <Clock className="h-5 w-5 text-green-400" />,
      title: "Pickup Deadlines",
      desc: "Time-sensitive surplus food is collected on time with clear freshness and pickup visibility.",
    },
    {
      icon: <Lock className="h-5 w-5 text-green-400" />,
      title: "Secure Role Access",
      desc: "Restaurants and charities see tailored experiences using protected authentication and role-based flows.",
    },
    {
      icon: <ClipboardList className="h-5 w-5 text-green-400" />,
      title: "Donation Tracking",
      desc: "Track posted donations, incoming claims, collection history, and operational activity from one place.",
    },
    {
      icon: <Smartphone className="h-5 w-5 text-green-400" />,
      title: "Mobile-first Experience",
      desc: "A responsive interface for quick donation management on phones, tablets, and desktops.",
    },
  ];

  return (
      <div className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
        {/* Three.js Background */}
        <div
            ref={threeCanvasRef}
            className="pointer-events-none absolute inset-0 z-0 opacity-70"
        />

        {/* Gradient overlays */}
        <div className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.20),transparent_22%),radial-gradient(circle_at_top_right,rgba(190,242,100,0.10),transparent_18%),radial-gradient(circle_at_bottom,rgba(255,255,255,0.04),transparent_30%)]" />
        <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-black/20 via-[#020617]/10 to-black/60" />

        {/* Navbar */}
        <div className="relative z-20">
          {loading ? (
              <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
                <div className="h-6 w-28 animate-pulse rounded bg-white/10" />
                <div className="flex gap-3">
                  <div className="h-10 w-20 animate-pulse rounded-xl bg-white/10" />
                  <div className="h-10 w-24 animate-pulse rounded-xl bg-white/10" />
                </div>
              </header>
          ) : role === "restaurant" ? (
              <RestaurantNavbar />
          ) : role === "charity" ? (
              <CharityNavbar />
          ) : (
              <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-6 lg:px-8">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 backdrop-blur-xl">
                    <UtensilsCrossed className="h-5 w-5 text-green-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold tracking-wide text-white">EcoPlate</h1>
                    <p className="text-xs text-white/55">Smart Food Donation Platform</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                      href="/login"
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-xl transition hover:border-green-400/40 hover:bg-white/10"
                  >
                    Login
                  </Link>
                  <Link
                      href="/register"
                      className="rounded-xl bg-gradient-to-r from-green-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-black shadow-[0_0_30px_rgba(34,197,94,0.25)] transition hover:scale-[1.03]"
                  >
                    Register
                  </Link>
                </div>
              </header>
          )}
        </div>

        {/* Hero */}
        <section
            ref={heroRef}
            className="relative z-10 mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center px-6 pb-20 pt-10 lg:px-8"
        >
          <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-400/20 bg-green-400/10 px-4 py-2 text-sm text-green-300 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                Premium AI-powered food rescue experience
              </div>

              <h2
                  ref={titleRef}
                  className="max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
              >
                Reduce food waste with a
                <span className="bg-gradient-to-r from-green-400 via-emerald-300 to-lime-200 bg-clip-text text-transparent">
                {" "}premium real-time{" "}
              </span>
                donation platform.
              </h2>

              <p
                  ref={subtitleRef}
                  className="mt-6 max-w-2xl text-base leading-8 text-white/70 sm:text-lg"
              >
                EcoPlate connects restaurants with surplus food to charities in need
                through live updates, guided donation workflows, smart tracking, and
                a modern AI-assisted experience.
              </p>

              <div ref={ctaRef} className="mt-10 flex flex-wrap gap-4">
                {!role && (
                    <Link
                        href="/register"
                        className="group inline-flex items-center gap-2 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-7 py-4 font-semibold text-black shadow-[0_10px_40px_rgba(34,197,94,0.28)] transition hover:scale-[1.03]"
                    >
                      Get Started
                      <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </Link>
                )}

                <a
                    href="#how-it-works"
                    className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-medium text-white/90 backdrop-blur-xl transition hover:bg-white/10"
                >
                  Explore Platform
                </a>
              </div>

              <div
                  ref={statsRef}
                  className="mt-12 grid max-w-2xl gap-4 sm:grid-cols-3"
              >
                {[
                  { value: "24/7", label: "AI guidance" },
                  { value: "Live", label: "donation sync" },
                  { value: "Fast", label: "claim workflow" },
                ].map((item) => (
                    <div
                        key={item.label}
                        className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl"
                    >
                      <div className="text-2xl font-bold text-green-300">{item.value}</div>
                      <div className="mt-1 text-sm text-white/60">{item.label}</div>
                    </div>
                ))}
              </div>
            </div>

            {/* Premium right-side glass panel */}
            <div className="relative">
              <div className="absolute -left-8 top-10 h-32 w-32 rounded-full bg-green-400/20 blur-3xl" />
              <div className="absolute -right-10 bottom-10 h-32 w-32 rounded-full bg-emerald-300/10 blur-3xl" />

              <div
                  ref={dashboardCardRef}
                  className="relative overflow-hidden rounded-[32px] border border-white/10 bg-white/8 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl will-change-transform"
              >
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/50">Smart Donation Dashboard</p>
                    <h3 className="text-xl font-semibold text-white">EcoPlate Live</h3>
                  </div>
                  <div className="rounded-full border border-green-400/20 bg-green-400/10 px-3 py-1 text-xs text-green-300">
                    Active
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-white/50">Available Donation</p>
                        <h4 className="mt-1 text-lg font-semibold">Fresh Meals x 24</h4>
                      </div>
                      <MapPin className="h-5 w-5 text-green-400" />
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full w-[78%] rounded-full bg-gradient-to-r from-green-400 to-emerald-300" />
                    </div>
                    <p className="mt-3 text-sm text-white/55">Pickup readiness: 78%</p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <Heart className="mb-3 h-5 w-5 text-pink-300" />
                      <p className="text-sm text-white/50">Charity claims</p>
                      <h4 className="mt-1 text-2xl font-bold">12</h4>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
                      <Clock className="mb-3 h-5 w-5 text-amber-300" />
                      <p className="text-sm text-white/50">Fastest claim time</p>
                      <h4 className="mt-1 text-2xl font-bold">3 min</h4>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-green-500/15 to-emerald-300/10 p-4">
                    <p className="text-sm text-white/60">
                      AI Assistant can help users with donation flow, timing, and pickup coordination.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
            id="how-it-works"
            className="relative z-10 border-t border-white/10 bg-white/[0.03] py-24"
        >
          <div ref={howRef} className="mx-auto max-w-7xl px-6 lg:px-8">
            <div ref={howTitleRef} className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-green-300/80">
                How it works
              </p>
              <h3 className="mt-4 text-3xl font-bold sm:text-4xl">
                Three smooth steps. One meaningful impact.
              </h3>
              <p className="mt-4 text-white/65">
                Designed with a modern premium flow so restaurants and charities can
                complete donations faster and with less friction.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {[
                {
                  icon: <UtensilsCrossed className="h-6 w-6 text-green-300" />,
                  title: "Post Donations",
                  desc: "Restaurants list extra food with quantity, photo, pickup details, and time limits.",
                },
                {
                  icon: <Heart className="h-6 w-6 text-green-300" />,
                  title: "Claim Instantly",
                  desc: "Charities browse real-time listings, review pickup details, and claim with minimal steps.",
                },
                {
                  icon: <MapPin className="h-6 w-6 text-green-300" />,
                  title: "Collect Efficiently",
                  desc: "Live maps and guided logistics help charities reach the location and complete pickup fast.",
                },
              ].map((item, index) => (
                  <div
                      key={item.title}
                      className="reveal-card group rounded-[28px] border border-white/10 bg-white/[0.05] p-7 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-green-400/20 hover:bg-white/[0.07]"
                  >
                    <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-300/10">
                      {item.icon}
                    </div>
                    <div className="mb-3 text-sm text-green-300/80">Step {index + 1}</div>
                    <h4 className="text-xl font-semibold">{item.title}</h4>
                    <p className="mt-3 leading-7 text-white/65">{item.desc}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="relative z-10 py-24">
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div ref={featureTitleRef} className="mb-12 max-w-2xl">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-green-300/80">
                Platform features
              </p>
              <h3 className="mt-4 text-3xl font-bold sm:text-4xl">
                Built for a premium donation experience
              </h3>
              <p className="mt-4 text-white/65">
                Modern interaction, clear role-based flow, real-time updates, and a polished UI layer.
              </p>
            </div>

            <div ref={featuresRef} className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {featureItems.map(({ icon, title, desc }) => (
                  <div
                      key={title}
                      className="feature-card rounded-[28px] border border-white/10 bg-white/[0.05] p-6 backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-green-400/20"
                  >
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-white/10 to-green-500/10">
                      {icon}
                    </div>
                    <h4 className="text-lg font-semibold">{title}</h4>
                    <p className="mt-3 text-sm leading-7 text-white/65">{desc}</p>
                  </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        {!role && (
            <section className="relative z-10 pb-24">
              <div className="mx-auto max-w-6xl px-6 lg:px-8">
                <div
                    ref={ctaSectionRef}
                    className="overflow-hidden rounded-[32px] border border-green-400/20 bg-gradient-to-r from-green-500/15 via-emerald-400/10 to-white/5 p-8 shadow-[0_20px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl md:p-12"
                >
                  <div className="flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
                    <div className="max-w-2xl">
                      <h3 className="text-3xl font-bold text-white">
                        Ready to reduce waste and create real impact?
                      </h3>
                      <p className="mt-4 text-white/70">
                        Create your EcoPlate account and start connecting surplus food
                        with communities that need it most.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <Link
                          href="/register"
                          className="rounded-2xl bg-gradient-to-r from-green-500 to-emerald-400 px-7 py-4 font-semibold text-black transition hover:scale-[1.03]"
                      >
                        Create Account
                      </Link>
                      <Link
                          href="/login"
                          className="rounded-2xl border border-white/15 bg-white/5 px-7 py-4 font-medium text-white backdrop-blur-xl transition hover:bg-white/10"
                      >
                        Sign In
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </section>
        )}

        {/* Footer */}
        <footer className="relative z-10 border-t border-white/10 py-6 text-center text-sm text-white/45">
          © {new Date().getFullYear()} EcoPlate. Premium donation platform for reducing food waste.
        </footer>
      </div>
  );
}