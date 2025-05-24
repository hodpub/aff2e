import AffItemBase from './base-item.mjs';

export default class AffSpell extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    'AFF.Item.base',
    'AFF.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellLevel = new fields.NumberField({
      required: true,
      nullable: false,
      integer: true,
      initial: 1,
      min: 0,
      max: 9,
    });

    return schema;
  }
}
