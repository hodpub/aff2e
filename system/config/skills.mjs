import { createListAndChoices } from "../helpers/config.mjs";

export const Skills = {};

Skills.rollCharacteristicConstants = {
  skill: "skill",
  magic: "magic",
  higher: "higher"
}
createListAndChoices(Skills, "rollCharacteristic", Skills.rollCharacteristicConstants, "AFF.Item.SpecialSkill.FIELDS.rollCharacteristic");

Skills.categoryConstants = {
  combat: "Combat",
  movement: "Movement",
  stealth: "Stealth",
  magical: "Magical",
  knowledge: "Knowledge"
};
createListAndChoices(Skills, "category", Skills.categoryConstants, "AFF.Item.SpecialSkill.FIELDS.category", { plural: "categories" });