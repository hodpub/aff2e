export default class AffItemBase extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = [
    'AFF.Item.base',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.HTMLField();

    return schema;
  }

  get item() { return this.parent; }
  get actor() { return this.parent.parent; }

  async handleRollUnder(roll, target) { }
  async handleRollHigher(roll, target) { }
}
