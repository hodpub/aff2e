import { createListAndChoices } from "../helpers/config.mjs";

export const Priest = {};

Priest.usageConstants = {
  [1]: 1,
  [0]: 0,
  [-1]: -1,
};
createListAndChoices(Priest, "usage", Priest.usageConstants, "AFF.Item.PriestAbility.FIELDS.isAvailable")