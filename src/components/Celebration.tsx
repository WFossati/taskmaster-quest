import { Flame, Volume2, VolumeX, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatMultiplier, levelFromXp } from "@/lib/gamification";

/* ------------------------------------------------------------------ */
/* Preferências (som)                                                  */
/* ------------------------------------------------------------------ */

const SOUND_KEY = "vamo-dale:sound:v1";

export function readSoundOn() {
  try { return localStorage.getItem(SOUND_KEY) !== "off"; } catch { return true; }
}

export function writeSoundOn(on: boolean) {
  try { localStorage.setItem(SOUND_KEY, on ? "on" : "off"); } catch { /* sem storage: só nesta sessão */ }
}

function prefersReducedMotion() {
  try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; }
}

/* ------------------------------------------------------------------ */
/* Som (Web Audio, sem arquivos)                                       */
/* ------------------------------------------------------------------ */

let audioCtx: AudioContext | null = null;

function ctx() {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  audioCtx ??= new Ctor();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function tone(ac: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType = "triangle") {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

/** Arpejo de "missão concluída". Fica mais agudo e longo com o combo; fanfarra no level up. */
export function playCompletionSound(combo: number, levelUp: boolean) {
  try {
    const ac = ctx();
    if (!ac) return;
    const t = ac.currentTime + 0.01;
    const lift = Math.min(Math.max(combo - 1, 0), 3) * 2; // semitons a mais por combo
    const notes = [0, 4, 7, 12].map((n) => 523.25 * 2 ** ((n + lift) / 12));
    notes.forEach((f, i) => tone(ac, f, t + i * 0.07, 0.22, 0.12));
    if (combo >= 3) tone(ac, notes[3]! * 1.5, t + 0.32, 0.3, 0.08, "sine");
    if (levelUp) {
      [0, 4, 7, 12, 16, 19, 24].forEach((n, i) => tone(ac, 659.25 * 2 ** (n / 12), t + 0.45 + i * 0.06, 0.35, 0.1, "square"));
    }
  } catch { /* som é opcional */ }
}

/* ------------------------------------------------------------------ */
/* Confete (canvas, sem dependências)                                  */
/* ------------------------------------------------------------------ */

const CONFETTI_COLORS = ["#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899", "#facc15"];

export function burstConfetti(intensity = 1) {
  if (typeof document === "undefined" || prefersReducedMotion()) return;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  Object.assign(canvas.style, { position: "fixed", inset: "0", width: "100vw", height: "100vh", pointerEvents: "none", zIndex: "60" });
  document.body.appendChild(canvas);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const g = canvas.getContext("2d");
  if (!g) { canvas.remove(); return; }
  g.scale(dpr, dpr);

  const count = Math.round(90 * intensity);
  const parts = Array.from({ length: count }, (_, i) => {
    const fromLeft = i % 2 === 0;
    const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.9;
    const speed = 9 + Math.random() * 9 * Math.min(intensity, 1.6);
    return {
      x: fromLeft ? w * 0.08 : w * 0.92,
      y: h * 0.75,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 5 + Math.random() * 6,
      rot: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.3,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
      round: Math.random() < 0.3,
    };
  });

  const started = performance.now();
  const duration = 2200;
  function frame(now: number) {
    const elapsed = now - started;
    g!.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.32;
      p.vx *= 0.985;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      g!.save();
      g!.globalAlpha = Math.max(0, 1 - elapsed / duration);
      g!.translate(p.x, p.y);
      g!.rotate(p.rot);
      g!.fillStyle = p.color;
      if (p.round) { g!.beginPath(); g!.arc(0, 0, p.size / 2, 0, Math.PI * 2); g!.fill(); }
      else g!.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
      g!.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else canvas.remove();
  }
  requestAnimationFrame(frame);
}

/* ------------------------------------------------------------------ */
/* Contador animado                                                    */
/* ------------------------------------------------------------------ */

export function useCountUp(target: number, durationMs = 900) {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  useEffect(() => {
    const from = fromRef.current;
    if (from === target) return;
    if (prefersReducedMotion()) { fromRef.current = target; setValue(target); return; }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      const eased = 1 - (1 - t) ** 3;
      const current = Math.round(from + (target - from) * eased);
      setValue(current);
      fromRef.current = current;
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);
  return value;
}

/* ------------------------------------------------------------------ */
/* Barra de nível do cabeçalho                                         */
/* ------------------------------------------------------------------ */

export function LevelBar({ totalXp, combo, soundOn, onToggleSound }: { totalXp: number; combo: number; soundOn: boolean; onToggleSound: () => void }) {
  const shown = useCountUp(totalXp);
  const info = levelFromXp(shown);
  const nextMultiplier = combo >= 2 ? 1.5 : combo === 1 ? 1.2 : 1;
  return (
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      <div className="min-w-0 rounded-2xl border border-violet-200 bg-violet-50 px-3 py-1.5" title={`Faltam ${info.xpToNext} XP para o nível ${info.level + 1}`}>
        <div className="flex items-center justify-between gap-3 text-xs font-bold text-violet-700">
          <span>Nível {info.level}</span>
          <span className="tabular-nums"><Zap className="mr-0.5 inline size-3" />{shown.toLocaleString("pt-BR")} XP</span>
        </div>
        <div className="mt-1 h-2 w-36 overflow-hidden rounded-full bg-violet-200/70 sm:w-48" role="progressbar" aria-label="Progresso do nível" aria-valuemin={0} aria-valuemax={info.xpForLevel} aria-valuenow={info.xpIntoLevel}>
          <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-[width] duration-300" style={{ width: `${Math.max(4, info.progress * 100)}%` }} />
        </div>
      </div>
      <div className={`hidden items-center gap-1 rounded-full px-3 py-2 text-xs font-bold sm:flex ${combo > 0 ? "bg-orange-50 text-orange-700" : "bg-slate-100 text-slate-500"}`} title="Combo do dia: a 2ª missão vale 1,2× e a 3ª em diante 1,5×">
        <Flame className="size-3.5" /> {combo > 0 ? `Combo ${combo} · próxima ${formatMultiplier(nextMultiplier)}` : "Combo: comece agora"}
      </div>
      <button type="button" onClick={onToggleSound} title={soundOn ? "Desligar som" : "Ligar som"} aria-label={soundOn ? "Desligar som" : "Ligar som"} className="grid size-9 place-items-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900">
        {soundOn ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Cartão de recompensa ao concluir                                    */
/* ------------------------------------------------------------------ */

export type RewardBurst = { id: number; baseXp: number; bonusXp: number; multiplier: number; combo: number; levelUp: number | null };

export function RewardToast({ burst, onDone }: { burst: RewardBurst | null; onDone: () => void }) {
  useEffect(() => {
    if (!burst) return;
    const timer = window.setTimeout(onDone, burst.levelUp ? 3600 : 2600);
    return () => window.clearTimeout(timer);
  }, [burst, onDone]);
  if (!burst) return null;
  const total = burst.baseXp + burst.bonusXp;
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
      <div key={burst.id} className="vd-pop pointer-events-auto rounded-3xl bg-slate-950 px-6 py-4 text-center text-white shadow-2xl shadow-violet-300/40">
        {burst.levelUp && <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">🎉 Subiu para o nível {burst.levelUp}!</p>}
        <p className="text-3xl font-black tracking-tight">+{total} XP</p>
        {burst.bonusXp > 0 ? (
          <p className="mt-1 text-sm font-bold text-orange-300"><Flame className="mr-1 inline size-4" />Combo {burst.combo} · {formatMultiplier(burst.multiplier)} (+{burst.bonusXp} bônus)</p>
        ) : (
          <p className="mt-1 text-sm font-semibold text-slate-300">Missão concluída! Conclua mais uma hoje e ganhe 1,2×</p>
        )}
      </div>
    </div>
  );
}
