/**
 * Single-elimination bracket generation.
 *
 * Strategy: pad participant count to the next power of two with bye placeholders,
 * use standard tournament seeding (1 vs n, 2 vs n-1, …) to build round 1, then
 * generate empty parent slots for each subsequent round. Top seeds receive byes
 * (their round-1 match auto-resolves and pre-populates the round-2 slot).
 *
 * Returns:
 *  - matches: array of match slots, each with round, position, side1/side2 ids,
 *    and parent pointer (winner_advances_to_position) into the next round.
 *  - byeWinners: round-1 matches whose only participant should auto-advance.
 */
export interface BracketSlot<T = string> {
  round: number;
  position: number;
  side1: T[]; // empty until winner advances; populated for round 1 (singles: 1 id, doubles: 2)
  side2: T[];
  /** Position in the next round that this match feeds into (if any). */
  winnerAdvancesToPosition: number | null;
  /** Which side (1 or 2) of the parent the winner fills. */
  winnerAdvancesToSide: 1 | 2 | null;
}

export function generateBracket<T>(
  seededParticipants: T[][], // each entry is the player ids for one "team" (singles: [id]; doubles: [id, id])
): { matches: BracketSlot<T>[]; byeIndices: number[] } {
  const n = seededParticipants.length;
  if (n < 2) {
    throw new Error("Need at least 2 participants");
  }
  const size = 1 << Math.ceil(Math.log2(n));
  const byes = size - n;

  // Standard seeding pairs: 1 vs n, 2 vs n-1, …, with byes given to top seeds.
  // Build the seed order (1-indexed). Pad with nulls representing byes (lowest-ranked virtual seeds).
  const padded: (T[] | null)[] = [...seededParticipants, ...Array(byes).fill(null)];

  // Tournament seeding: produce the "standard bracket order" so #1 plays the lowest seed,
  // #2 plays the second-lowest, and so on. Use the known recursive pairing.
  const order: number[] = standardBracketOrder(size);

  const round1Pairs: { a: T[] | null; b: T[] | null }[] = [];
  for (let i = 0; i < size; i += 2) {
    const aIdx = order[i] - 1;
    const bIdx = order[i + 1] - 1;
    round1Pairs.push({ a: padded[aIdx] ?? null, b: padded[bIdx] ?? null });
  }

  const matches: BracketSlot<T>[] = [];
  const byeIndices: number[] = [];

  // Round 1
  round1Pairs.forEach((pair, idx) => {
    const slot: BracketSlot<T> = {
      round: 1,
      position: idx,
      side1: pair.a ?? [],
      side2: pair.b ?? [],
      winnerAdvancesToPosition: Math.floor(idx / 2),
      winnerAdvancesToSide: (idx % 2 === 0 ? 1 : 2) as 1 | 2,
    };
    matches.push(slot);
    if ((pair.a && !pair.b) || (!pair.a && pair.b)) {
      byeIndices.push(idx);
    }
  });

  // Subsequent rounds
  let prevRoundSize = round1Pairs.length;
  let round = 2;
  while (prevRoundSize > 1) {
    const thisRoundSize = prevRoundSize / 2;
    for (let i = 0; i < thisRoundSize; i++) {
      const isFinal = thisRoundSize === 1;
      const slot: BracketSlot<T> = {
        round,
        position: i,
        side1: [],
        side2: [],
        winnerAdvancesToPosition: isFinal ? null : Math.floor(i / 2),
        winnerAdvancesToSide: isFinal ? null : ((i % 2 === 0 ? 1 : 2) as 1 | 2),
      };
      matches.push(slot);
    }
    prevRoundSize = thisRoundSize;
    round++;
  }

  return { matches, byeIndices };
}

/** Standard bracket seed order for a power-of-two size, e.g. size=8 → [1,8,4,5,2,7,3,6]. */
function standardBracketOrder(size: number): number[] {
  if (size === 1) return [1];
  const half = size / 2;
  const prev = standardBracketOrder(half);
  const out: number[] = [];
  for (const seed of prev) {
    out.push(seed, size + 1 - seed);
  }
  return out;
}
