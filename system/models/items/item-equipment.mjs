import { DataHelper } from "../../helpers/data.mjs";
import { toPriceInfo } from "../../helpers/trade.mjs";
import AffItemBase from "./base-item.mjs";

export default class AffEquipment extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.Equipment',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.price = new fields.SchemaField({
      city: new fields.NumberField({ ...DataHelper.cost }),
      town: new fields.NumberField({ ...DataHelper.cost }),
      village: new fields.NumberField({ ...DataHelper.cost })
    });
    schema.quantity = new fields.NumberField({ ...DataHelper.requiredInteger, min: 0, initial: 1 });
    schema.quantityPerSlot = new fields.NumberField({ ...DataHelper.requiredInteger, min: 0, initial: 1 });

    schema.specialProperties = new fields.ArrayField(
      new fields.SchemaField({
        item: new fields.StringField({}),
        active: new fields.BooleanField({ initial: true })
      })
    );

    return schema;
  }

  prepareDerivedData() {
    this.priceInfo = {
      city: toPriceInfo(this.price.city),
      town: toPriceInfo(this.price.town),
      village: toPriceInfo(this.price.village),
    };
  }
}