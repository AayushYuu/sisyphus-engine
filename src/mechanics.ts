/**
 * Pure game formulas for Sisyphus Engine.
 * No Obsidian or runtime deps — safe to unit test.
 */

export const BOSS_DATA: Record<number, { name: string; desc: string; hp_pen: number }> = {
  10: { name: "The Gatekeeper", desc: "The first major filter.", hp_pen: 20 },
  20: { name: "The Shadow Self", desc: "Your own bad habits manifest.", hp_pen: 30 },
  30: { name: "The Mountain", desc: "The peak is visible.", hp_pen: 40 },
  50: { name: "Sisyphus Prime", desc: "One must imagine Sisyphus happy.", hp_pen: 99 },
};

export function getDifficultyNumber(diffLabel: string): number {
  const map: Record<string, number> = {
    Trivial: 1,
    Easy: 2,
    Medium: 3,
    Hard: 4,
    SUICIDE: 5,
  };
  return map[diffLabel] ?? 3;
}

export function questRewardsByDifficulty(
  diff: number,
  xpReq: number,
  isBoss: boolean,
  highStakes: boolean
): { xpReward: number; goldReward: number; diffLabel: string } {
  if (isBoss) {
    return { xpReward: 1000, goldReward: 1000, diffLabel: "☠️ BOSS" };
  }
  let xpReward: number;
  let goldReward: number;
  let diffLabel: string;
  switch (diff) {
    case 1:
      xpReward = Math.floor(xpReq * 0.05);
      goldReward = 10;
      diffLabel = "Trivial";
      break;
    case 2:
      xpReward = Math.floor(xpReq * 0.1);
      goldReward = 20;
      diffLabel = "Easy";
      break;
    case 3:
      xpReward = Math.floor(xpReq * 0.2);
      goldReward = 40;
      diffLabel = "Medium";
      break;
    case 4:
      xpReward = Math.floor(xpReq * 0.4);
      goldReward = 80;
      diffLabel = "Hard";
      break;
    case 5:
      xpReward = Math.floor(xpReq * 0.6);
      goldReward = 150;
      diffLabel = "SUICIDE";
      break;
    default:
      xpReward = Math.floor(xpReq * 0.2);
      goldReward = 40;
      diffLabel = "Medium";
  }
  if (highStakes) goldReward = Math.floor(goldReward * 1.5);
  return { xpReward, goldReward, diffLabel };
}

/**
 * Compute fail damage: base + rival, then buff mult, then boss penalty, then debt double.
 */
export function computeFailDamage(
  rivalDmg: number,
  gold: number,
  damageMult: number,
  bossHpPenalty: number
): number {
  let d = 10 + Math.floor(rivalDmg / 2);
  d = Math.floor(d * damageMult);
  d += bossHpPenalty;
  if (gold < 0) d *= 2;
  return d;
}

export function getBossHpPenalty(level: number): number {
  return BOSS_DATA[level]?.hp_pen ?? 0;
}
