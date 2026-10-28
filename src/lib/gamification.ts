/** Regras de jogo puras (sem rede nem DOM), fáceis de testar. */

/** XP necessário para uma moeda. Mantenha igual ao SQL convert_xp_to_coins. */
export const XP_PER_COIN = 100;

/** Tamanho do nível n (n >= 1): níveis curtos para a barra estar sempre perto de encher. */
export function levelSize(level: number) {
  return 100 + 25 * (Math.max(1, level) - 1);
}

export type LevelInfo = { level: number; xpIntoLevel: number; xpForLevel: number; progress: number; xpToNext: number };

export function levelFromXp(totalXp: number): LevelInfo {
  let remaining = Math.max(0, Math.floor(totalXp));
  let level = 1;
  while (remaining >= levelSize(level)) {
    remaining -= levelSize(level);
    level += 1;
  }
  const xpForLevel = levelSize(level);
  return { level, xpIntoLevel: remaining, xpForLevel, progress: remaining / xpForLevel, xpToNext: xpForLevel - remaining };
}

/** Multiplicador do combo para a próxima missão, dado quantas já foram concluídas hoje. */
export function comboMultiplier(completedToday: number) {
  if (completedToday >= 2) return 1.5;
  if (completedToday === 1) return 1.2;
  return 1;
}

export function formatMultiplier(multiplier: number) {
  return `${multiplier.toLocaleString("pt-BR", { minimumFractionDigits: multiplier % 1 === 0 ? 0 : 1, maximumFractionDigits: 1 })}×`;
}

export function isSameLocalDay(iso: string, now = new Date()) {
  const date = new Date(iso);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() && date.getDate() === now.getDate();
}

/** Missões concluídas hoje (pela data local de conclusão). */
export function countCompletedToday(tasks: { status: string; completedAt?: string }[], now = new Date()) {
  return tasks.filter((task) => task.status === "Concluída" && task.completedAt && isSameLocalDay(task.completedAt, now)).length;
}

/** XP total de uma missão concluída (base + bônus de combo). */
export function earnedXp(task: { xp: number; xpBonus: number }) {
  return task.xp + task.xpBonus;
}
