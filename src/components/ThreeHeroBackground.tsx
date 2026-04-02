"use client";

import * as React from "react";
import * as THREE from "three";

type ThreeHeroBackgroundProps = {
    className?: string;
};

export default function ThreeHeroBackground({
                                                className = "",
                                            }: ThreeHeroBackgroundProps) {
    const mountRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const prefersReducedMotion =
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        const scene = new THREE.Scene();

        const camera = new THREE.PerspectiveCamera(
            55,
            mount.clientWidth / mount.clientHeight,
            0.1,
            1000
        );
        camera.position.z = 24;

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
        });

        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.8));
        renderer.setSize(mount.clientWidth, mount.clientHeight);
        renderer.setClearColor(0x000000, 0);
        mount.appendChild(renderer.domElement);

        const particleCount = 900;
        const positions = new Float32Array(particleCount * 3);
        const scales = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            positions[i3] = (Math.random() - 0.5) * 52;
            positions[i3 + 1] = (Math.random() - 0.5) * 32;
            positions[i3 + 2] = (Math.random() - 0.5) * 28;
            scales[i] = Math.random();
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

        const material = new THREE.PointsMaterial({
            color: new THREE.Color("#34d399"),
            size: 0.12,
            transparent: true,
            opacity: 0.75,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        const glowGeometry = new THREE.SphereGeometry(6, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: new THREE.Color("#10b981"),
            transparent: true,
            opacity: 0.07,
        });
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        glowMesh.position.set(7, 2, -10);
        scene.add(glowMesh);

        const glowGeometry2 = new THREE.SphereGeometry(4.5, 32, 32);
        const glowMaterial2 = new THREE.MeshBasicMaterial({
            color: new THREE.Color("#a3e635"),
            transparent: true,
            opacity: 0.045,
        });
        const glowMesh2 = new THREE.Mesh(glowGeometry2, glowMaterial2);
        glowMesh2.position.set(-8, -3, -8);
        scene.add(glowMesh2);

        let frameId = 0;
        let mouseX = 0;
        let mouseY = 0;

        const onPointerMove = (e: PointerEvent) => {
            const rect = mount.getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            mouseX = (x - 0.5) * 0.8;
            mouseY = (y - 0.5) * 0.5;
        };

        const animate = () => {
            if (!prefersReducedMotion) {
                points.rotation.y += 0.0008;
                points.rotation.x += 0.00018;

                points.position.x += (mouseX - points.position.x) * 0.02;
                points.position.y += (-mouseY - points.position.y) * 0.02;
            }

            renderer.render(scene, camera);
            frameId = window.requestAnimationFrame(animate);
        };

        animate();

        const onResize = () => {
            if (!mount) return;
            camera.aspect = mount.clientWidth / mount.clientHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(mount.clientWidth, mount.clientHeight);
        };

        mount.addEventListener("pointermove", onPointerMove);
        window.addEventListener("resize", onResize);

        return () => {
            window.cancelAnimationFrame(frameId);
            window.removeEventListener("resize", onResize);
            mount.removeEventListener("pointermove", onPointerMove);

            geometry.dispose();
            material.dispose();
            glowGeometry.dispose();
            glowMaterial.dispose();
            glowGeometry2.dispose();
            glowMaterial2.dispose();
            renderer.dispose();

            if (renderer.domElement.parentNode === mount) {
                mount.removeChild(renderer.domElement);
            }
        };
    }, []);

    return <div ref={mountRef} className={className} aria-hidden="true" />;
}