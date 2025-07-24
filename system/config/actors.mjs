import { createListAndChoices } from "../helpers/config.mjs";

export const Actors = {};

Actors.characteristicsConfig = {
  skill: {
    initial: 4,
    min: 0,
    max: 12
  },
  stamina: {
    initial: 8,
    min: -4,
    max: 24
  },
  luck: {
    initial: 8,
    min: 0,
    max: 12
  },
  magic: {
    initial: 0,
    min: 0,
    max: 12
  },
  magicPoints: {
    initial: 0,
    min: 0,
    max: 24
  }
}

Actors.characteristicsConstants = {
  skill: "skill",
  stamina: "stamina",
  luck: "luck",
  magic: "magic",
  magicPoints: "magicPoints"
}
createListAndChoices(Actors, "characteristics", Actors.characteristicsConstants, "AFF.Characteristics", { plural: "characteristics" });

Actors.rollableCharacteristics = [
  Actors.characteristicsConstants.skill,
  Actors.characteristicsConstants.luck,
  Actors.characteristicsConstants.magic,
];