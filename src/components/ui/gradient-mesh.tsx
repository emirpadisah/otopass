"use client";

import { Color, Mesh, Program, Renderer, Triangle } from "ogl";
import { useEffect, useRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

function createFragmentShader(distortion: number) {
  return `
precision highp float;

uniform float uTime;
uniform float uSwirl;
uniform float uSpeed;
uniform float uScale;
uniform float uOffsetX;
uniform float uOffsetY;
uniform float uRotation;
uniform float uWaveAmp;
uniform float uWaveFreq;
uniform float uWaveSpeed;
uniform float uGrain;
uniform vec3 uColorA;
uniform vec3 uColorB;
uniform vec3 uColorC;
uniform vec3 uResolution;

varying vec2 vUv;

float wave(vec2 uv, float frequency, float speed, float time) {
  return sin(uv.x * frequency + time * speed) * cos(uv.y * frequency + time * speed);
}

float random(vec2 point) {
  return fract(sin(dot(point.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

vec3 colorDodge(vec3 base, vec3 blend) {
  return min(base / (1.0 - blend + 0.0001), 1.0);
}

void main() {
  float minimumResolution = min(uResolution.x, uResolution.y);
  vec2 uv = (vUv.xy * 2.0 - 1.0) * uResolution.xy / minimumResolution;
  uv = uv * uScale + vec2(uOffsetX, uOffsetY);

  float cosine = cos(uRotation);
  float sine = sin(uRotation);
  uv = vec2(uv.x * cosine - uv.y * sine, uv.x * sine + uv.y * cosine);

  uv.x += wave(uv, uWaveFreq, uWaveSpeed, uTime) * uWaveAmp;
  uv.y += wave(uv + 10.0, uWaveFreq * 1.5, uWaveSpeed * 0.8, uTime) * uWaveAmp * 0.5;

  float angle = atan(uv.y, uv.x);
  float radius = length(uv);
  angle += uSwirl * radius;
  uv = vec2(cos(angle), sin(angle)) * radius;

  float displacement = -uTime * 0.5 * uSpeed;
  float accumulation = 0.0;
  for (float index = 0.0; index < ${distortion.toFixed(1)}; ++index) {
    accumulation += cos(index - displacement - accumulation * uv.x);
    displacement += sin(uv.y * index + accumulation);
  }
  displacement += uTime * 0.5 * uSpeed;

  vec3 color = mix(uColorA, uColorB, (sin(displacement) + 1.0) * 0.5);
  color = mix(color, uColorC, (cos(accumulation) + 1.0) * 0.5);

  float grain = (random(gl_FragCoord.xy + uTime) - 0.5) * uGrain;
  color = colorDodge(color, vec3(0.5 + grain));
  gl_FragColor = vec4(color, 1.0);
}
`;
}

function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? value.split("").map((character) => `${character}${character}`).join("")
    : value.padEnd(6, "0").slice(0, 6);

  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255,
  ];
}

type GradientMeshProps = HTMLAttributes<HTMLDivElement> & {
  colors?: [string, string, string];
  distortion?: number;
  grain?: number;
  offsetX?: number;
  offsetY?: number;
  rotation?: number;
  scale?: number;
  speed?: number;
  swirl?: number;
  waveAmp?: number;
  waveFreq?: number;
  waveSpeed?: number;
};

export function GradientMesh({
  className,
  colors = ["#fecaca", "#ef4444", "#111827"],
  distortion = 8,
  grain = 0.055,
  offsetX = 0,
  offsetY = 0,
  rotation = 90,
  scale = 1,
  speed = 0.8,
  swirl = 0.2,
  waveAmp = 0.2,
  waveFreq = 20,
  waveSpeed = 0.2,
  ...props
}: GradientMeshProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    let renderer: Renderer;
    try {
      renderer = new Renderer({ dpr: Math.min(window.devicePixelRatio || 1, 2) });
    } catch {
      element.dataset.webgl = "unavailable";
      return;
    }

    const gl = renderer.gl;
    const colorValues = colors.map(hexToRgb);
    const uniforms = {
      uTime: { value: 0 },
      uSwirl: { value: swirl },
      uSpeed: { value: speed },
      uScale: { value: scale },
      uOffsetX: { value: offsetX },
      uOffsetY: { value: offsetY },
      uRotation: { value: rotation * (Math.PI / 180) },
      uWaveAmp: { value: waveAmp },
      uWaveFreq: { value: waveFreq },
      uWaveSpeed: { value: waveSpeed },
      uResolution: { value: new Color(1, 1, 1) },
      uGrain: { value: grain },
      uColorA: { value: new Color(...colorValues[0]) },
      uColorB: { value: new Color(...colorValues[1]) },
      uColorC: { value: new Color(...colorValues[2]) },
    };

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: createFragmentShader(Math.max(2, Math.min(12, Math.round(distortion)))),
      uniforms,
    });
    const mesh = new Mesh(gl, { geometry, program });
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;
    let visible = true;

    function resize() {
      const width = Math.max(1, element!.clientWidth);
      const height = Math.max(1, element!.clientHeight);
      renderer.setSize(width, height);
      uniforms.uResolution.value = new Color(gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height);
      renderer.render({ scene: mesh });
    }

    function render(time: number) {
      if (!visible || reducedMotion.matches) {
        frameId = 0;
        return;
      }
      uniforms.uTime.value = time * 0.001;
      renderer.render({ scene: mesh });
      frameId = window.requestAnimationFrame(render);
    }

    function start() {
      if (!frameId && visible && !reducedMotion.matches) frameId = window.requestAnimationFrame(render);
      if (reducedMotion.matches) renderer.render({ scene: mesh });
    }

    const resizeObserver = new ResizeObserver(resize);
    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      if (!visible && frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
      start();
    });
    const handleMotionChange = () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      start();
    };

    gl.canvas.setAttribute("aria-hidden", "true");
    element.appendChild(gl.canvas);
    element.dataset.webgl = "ready";
    resizeObserver.observe(element);
    intersectionObserver.observe(element);
    reducedMotion.addEventListener("change", handleMotionChange);
    resize();
    start();

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      intersectionObserver.disconnect();
      reducedMotion.removeEventListener("change", handleMotionChange);
      if (element.contains(gl.canvas)) element.removeChild(gl.canvas);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, [colors, distortion, grain, offsetX, offsetY, rotation, scale, speed, swirl, waveAmp, waveFreq, waveSpeed]);

  return <div ref={containerRef} className={cn("gradient-mesh", className)} {...props} />;
}
