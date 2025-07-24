import AffRollDialog from "../../applications/roll-dialog.mjs";
import { AFF } from "../../config/_aff.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffEquipment from "./item-equipment.mjs";

export default class AffArmour extends AffEquipment {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.Armour',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.protection = new fields.ArrayField(new fields.NumberField({
      ...DataHelper.requiredInteger,
      min: 0
    }),
      { initial: [0, 0, 0, 0, 0, 0, 0] }
    );
    schema.minRequired = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 7,
      min: 0
    });

    schema.type = new fields.StringField({
      required: true,
      initial: AFF.Equipments.armourTypeConstants.armour,
      choices: AFF.Equipments.armourTypesList
    });
    schema.equipped = new fields.BooleanField({ initial: true });

    schema.magical = new fields.BooleanField({ initial: false });
    schema.protectionRollBonus = new fields.NumberField({ ...DataHelper.requiredInteger, initial: 0 });

    return schema;
  }

  prepareDerivedData() {
    this.values = this.protection;
    this.icon = "shield";
  }

  async roll(event) {
    const rollDialog = new AffRollDialog({
      actor: this.actor,
      item: this.item,
      target: 0,
      rollType: AffRollDialog.rollType.values,
      bonus: this.protectionRollBonus,
    });
    return rollDialog.wait(event);
  }
}