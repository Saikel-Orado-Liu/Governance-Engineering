export enum AbilityType {
  None = -1,
  ShieldBash = 0,
  Volley = 1,
  Charge = 2,
  Fireball = 3,
}

export interface AbilityConfig {
  id: AbilityType;
  name: string;
  damage: number;
  cooldown: number;
  range: number;
  aoeRadius?: number;
  description: string;
}

/** Reserved for future status effect system — not instantiated in this phase */
export interface StatusEffect {
  type: string;
  duration: number;
}

export const ABILITY_CONFIGS: Record<AbilityType, AbilityConfig> = {
  [AbilityType.None]: {
    id: AbilityType.None,
    name: 'None',
    damage: 0,
    cooldown: 0,
    range: 0,
    description: 'No ability',
  },
  [AbilityType.ShieldBash]: {
    id: AbilityType.ShieldBash,
    name: 'Shield Bash',
    damage: 5,
    cooldown: 2,
    range: 1,
    description: 'Bash the target with a shield',
  },
  [AbilityType.Volley]: {
    id: AbilityType.Volley,
    name: 'Volley',
    damage: 3,
    cooldown: 3,
    range: 3,
    aoeRadius: 1,
    description: 'Fire a volley of arrows at a target area',
  },
  [AbilityType.Charge]: {
    id: AbilityType.Charge,
    name: 'Charge',
    damage: 4,
    cooldown: 3,
    range: 4,
    description: 'Charge in a straight line, hitting the first enemy',
  },
  [AbilityType.Fireball]: {
    id: AbilityType.Fireball,
    name: 'Fireball',
    damage: 6,
    cooldown: 2,
    range: 3,
    description: 'Launch a fireball at the target',
  },
};
