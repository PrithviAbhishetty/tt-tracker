/**
 * Round-robin pairing generation via the circle method.
 * Returns rounds; each round is an array of pairs. For odd participant
 * counts a sentinel "BYE" appears once per round (the player paired with it sits out).
 *
 * For singles, pass player ids. For doubles, pass team ids (where each team
 * has been pre-formed). The caller maps team ids back to their two player ids.
 */
export function generateRoundRobin<T>(
  participants: T[],
): { rounds: { side1: T; side2: T }[][]; allPairs: { side1: T; side2: T }[] } {
  const ids = [...participants];
  const hasBye = ids.length % 2 === 1;
  if (hasBye) ids.push("__BYE__" as unknown as T);

  const n = ids.length;
  const roundsCount = n - 1;
  const half = n / 2;
  const rounds: { side1: T; side2: T }[][] = [];
  const allPairs: { side1: T; side2: T }[] = [];

  // Fix the first element; rotate the rest.
  const fixed = ids[0];
  let rotating = ids.slice(1);

  for (let r = 0; r < roundsCount; r++) {
    const ring = [fixed, ...rotating];
    const round: { side1: T; side2: T }[] = [];
    for (let i = 0; i < half; i++) {
      const a = ring[i];
      const b = ring[n - 1 - i];
      if ((a as unknown) === "__BYE__" || (b as unknown) === "__BYE__") continue;
      round.push({ side1: a, side2: b });
      allPairs.push({ side1: a, side2: b });
    }
    rounds.push(round);
    // Rotate (last moves to front of the rotating part)
    rotating = [rotating[rotating.length - 1], ...rotating.slice(0, -1)];
  }

  return { rounds, allPairs };
}
