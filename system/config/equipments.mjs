import { createListAndChoices } from "../helpers/config.mjs";

export const Equipments = {};

Equipments.armourTypeConstants = {
  armour: "armour",
  shield: "shield"
};
createListAndChoices(Equipments, "armourType", Equipments.armourTypeConstants, "AFF.Item.Armour.FIELDS.type")