import { EncounterType } from '@dig/shared';
import { BALANCE } from '@dig/shared';

export function pickEncounterType(roundNumber: number = 1): EncounterType {
  const weights = { ...BALANCE.ENCOUNTER_WEIGHTS } as Record<string, number>;

  if (roundNumber < 3) {
    weights.PORTAL = 0;
  }

  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;

  for (const [key, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return key as EncounterType;
  }
  return EncounterType.TREASURE_VAULT;
}

export function getEncounterDescription(type: EncounterType): string {
  switch (type) {
    case EncounterType.TREASURE_VAULT:
      return 'A massive treasure chest gleams in the darkness. Break it open!';
    case EncounterType.GUARDIAN:
      return 'A terrifying guardian awakens. You cannot face it alone.';
    case EncounterType.COLLAPSE:
      return 'The ground begins to crack. Run for the surface!';
    case EncounterType.MIRROR:
      return 'A mirror dimension pulls you in. Face your rival!';
    case EncounterType.PORTAL:
      return 'A swirling portal opens to a treasure-filled dungeon.';
  }
}
