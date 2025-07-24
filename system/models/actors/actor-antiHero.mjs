import { AFF } from "../../config/_aff.mjs";
import AffCharacter from "./actor-character.mjs";

export default class AffAntiHero extends AffCharacter {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Actor.antiHero',
  ];

  static defineSchema() {
    const schema = super.defineSchema();

    Object.entries(AFF.Actors.characteristicsConfig).forEach(([characteristicId]) => {
      schema.characteristics.fields[characteristicId].fields.max.max = 100;
      schema.characteristics.fields[characteristicId].fields.value.max = 100;
    });

    return schema;
  }
}