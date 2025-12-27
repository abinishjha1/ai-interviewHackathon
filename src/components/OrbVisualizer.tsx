'use client';

import { useEffect, useRef } from 'react';

interface OrbVisualizerProps {
    isActive: boolean;
    isAISpeaking: boolean;
    isGeneratingResponse: boolean; // Thinking state
    audioLevel: number; // 0 to 1
}

export default function OrbVisualizer({
    isActive,
    isAISpeaking,
    isGeneratingResponse,
    audioLevel
}: OrbVisualizerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number | null>(null);
    const timeRef = useRef<number>(0);

    // Animation logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const resize = () => {
            const parent = canvas.parentElement;
            if (parent) {
                canvas.width = parent.offsetWidth * window.devicePixelRatio;
                canvas.height = parent.offsetHeight * window.devicePixelRatio;
                ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
            }
        };

        window.addEventListener('resize', resize);
        resize();

        const animate = (time: number) => {
            if (!isActive) return;

            const width = canvas.width / window.devicePixelRatio;
            const height = canvas.height / window.devicePixelRatio;
            timeRef.current = time / 1000;
            const t = timeRef.current;

            ctx.clearRect(0, 0, width, height);

            // Center of the orb
            const centerX = width / 2;
            const centerY = height / 2;

            // Base radius - responsive to container
            let baseRadius = Math.min(width, height) * 0.35;

            // Reactivity
            // AI Speaking: High reactivity
            // Generating: Low pulse
            // Listening: Low reactivity to user audio
            const intensity = isAISpeaking ? 0.3 + audioLevel * 0.7 :
                isGeneratingResponse ? 0.15 :
                    0.1 + audioLevel * 0.3;

            // Pulse effect
            const pulse = isGeneratingResponse ? Math.sin(t * 3) * 5 : Math.sin(t * 2) * 2;
            const radius = baseRadius + (isAISpeaking || audioLevel > 0.05 ? audioLevel * 20 : pulse);

            // Draw layers
            drawOrb(ctx, centerX, centerY, radius, t, intensity, isAISpeaking, isGeneratingResponse);

            requestRef.current = requestAnimationFrame(animate);
        };

        const drawOrb = (
            ctx: CanvasRenderingContext2D,
            x: number,
            y: number,
            radius: number,
            t: number,
            intensity: number,
            isAI: boolean,
            isThinking: boolean
        ) => {
            const numPoints = 80;

            // Color palettes
            const aiColors = ['#3B82F6', '#8B5CF6', '#D946EF']; // Blue, Purple, Fuchsia
            const userColors = ['#10B981', '#3B82F6', '#06B6D4']; // Emerald, Blue, Cyan
            const thinkingColors = ['#F59E0B', '#D97706', '#FBBF24']; // Amber/Orange

            const colors = isThinking ? thinkingColors : (isAI ? aiColors : userColors);

            // Background Glow
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius * 2.5);
            grad.addColorStop(0, `${colors[1]}20`);
            grad.addColorStop(1, 'transparent');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(x, y, radius * 2.5, 0, Math.PI * 2);
            ctx.fill();

            // Main Liquid Layers
            for (let layer = 0; layer < 3; layer++) {
                ctx.beginPath();
                const layerOffset = layer * (Math.PI / 1.5);
                const layerRadius = radius * (1 - layer * 0.05);

                for (let i = 0; i <= numPoints; i++) {
                    const angle = (i / numPoints) * Math.PI * 2;

                    // Complex noise-like movement
                    const noise = Math.sin(angle * 3 + t * 2 + layerOffset) * 5 * intensity +
                        Math.cos(angle * 5 - t * 1.5) * 3 * intensity +
                        Math.sin(angle * 2 + t * 4) * 2 * intensity;

                    const r = layerRadius + noise;
                    const px = x + Math.cos(angle) * r;
                    const py = y + Math.sin(angle) * r;

                    if (i === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);

                    // Store the last point's radius for the gradient calculation below
                    if (i === numPoints) {
                        const fillGrad = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
                        fillGrad.addColorStop(0, `${colors[layer % colors.length]}90`); // Slightly more opaque
                        fillGrad.addColorStop(1, `${colors[(layer + 1) % colors.length]}50`);
                        ctx.fillStyle = fillGrad;
                    }
                }

                ctx.closePath();
                ctx.fill();

                // Subtle stroke
                ctx.strokeStyle = `${colors[layer % colors.length]}CC`;
                ctx.lineWidth = 2;
                ctx.stroke();
            }
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            window.removeEventListener('resize', resize);
        };
    }, [isActive, isAISpeaking, isGeneratingResponse, audioLevel]);

    return (
        <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
        />
    );
}
