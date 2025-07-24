import { AFF } from "../../config/_aff.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffActorBase from './_base-actor.mjs';

export default class AffNPC extends AffActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Actor.npc',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.attacks = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 1,
      min: 0,
    });
    schema.habitat = new fields.StringField();
    schema.number = new fields.StringField({
      initial: "1",
      required: true,
    });
    schema.type = new fields.StringField({
      initial: "Humanoid",
      required: true,
    });
    schema.reaction = new fields.StringField({
      initial: "Neutral",
      required: true,
    });
    schema.intelligence = new fields.StringField({
      initial: "Average",
      required: true,
    });
    schema.special = new fields.HTMLField();

    Object.entries(AFF.Actors.characteristicsConfig).forEach(([characteristicId]) => {
      schema.characteristics.fields[characteristicId].fields.max.max = 100;
      schema.characteristics.fields[characteristicId].fields.value.max = 100;
    });

    return schema;
  }

  async rollNumber() {
    const roll = await new Roll(this.number).roll();
    return roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.parent }),
      flavor: game.i18n.localize("AFF.Actor.npc.FIELDS.number.labelExpanded"),
      rollMode: game.settings.get('core', 'rollMode'),
    });
  }
}
