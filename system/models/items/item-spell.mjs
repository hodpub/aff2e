import AffItemBase from './base-item.mjs';

export default class AffSpell extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.Spell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.spellType = new fields.StringField({
      required: true,
      blank: false,
      
    })

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
