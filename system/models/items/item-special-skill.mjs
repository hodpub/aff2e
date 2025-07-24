import { DataHelper } from "../../helpers/data.mjs";
import { AFF } from "../../config/_aff.mjs";
import AffItemBase from "./base-item.mjs";
import AffRollDialog from "../../applications/roll-dialog.mjs";
import AffRoll from "../../documents/roll.mjs";
import { BreakdownHelper } from "../../helpers/breakdown.mjs";

const { DialogV2 } = foundry.applications.api;
export default class AffSpecialSkill extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    "AFF.Item.SpecialSkill"
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.category = new fields.StringField({
      required: true,
      blank: false,
      choices: AFF.Skills.categoriesList,
      initial: AFF.Skills.categoryConstants.combat,
    });
    schema.rollCharacteristic = new fields.StringField({
      required: true,
      blank: false,
      choices: AFF.Skills.rollCharacteristicsList,
      initial: AFF.Skills.rollCharacteristicConstants.skill,
    });
    schema.value = new fields.NumberField({ ...DataHelper.requiredInteger, initial: 1, min: 0 });

    return schema;
  }

  async _preUpdate(changes, options, user) {
    super._preUpdate?.(changes, options, user);
    if (!this.parent.isEmbedded || this.actor.type != "character")
      return;

    const rollCharacteristic = changes.rollCharacteristic ?? this.rollCharacteristic;
    let maxValue = 0;
    switch (rollCharacteristic) {
      case AFF.Skills.rollCharacteristicConstants.skill:
        maxValue = this.parent.actor.system.characteristics.skill.max;
        break;
      case AFF.Skills.rollCharacteristicConstants.magic:
        maxValue = this.parent.actor.system.characteristics.magic.max;
        break;
      default:
        maxValue = Math.max(this.parent.actor.system.characteristics.magic.max, this.parent.actor.system.characteristics.skill.max);
        break;
    }
    maxValue = Math.ceil(maxValue / 2);
    if (changes.system.value <= maxValue)
      return;

    changes.system.value = await DialogV2.confirm({
      window: { title: game.i18n.localize("AFF.Item.SpecialSkill.WARN.valueTooHigh.title") },
      content: game.i18n.format("AFF.Item.SpecialSkill.WARN.valueTooHigh.content", { current: changes.system.value, maxValue }),
      defaultYes: true,
      modal: true,
      yes: { callback: () => changes.system.value },
      no: { callback: () => maxValue },
    });
  }

  async roll(event, { rollTypeSelected = AffRollDialog.rollType.under, rollName, additionalBonus }) {
    let characteristic = this.actor.system.characteristics.skill.value;
    let characteristicName = game.i18n.localize("AFF.Characteristics.skill.label");
    let chracteristicProperty = "skill";
    switch (this.rollCharacteristic) {
      case AFF.Skills.rollCharacteristicConstants.magic:
        characteristic = this.actor.system.characteristics.magic.value;
        chracteristicProperty = "magic";
        characteristicName = game.i18n.localize("AFF.Characteristics.magic.label");
        break;
      case AFF.Skills.rollCharacteristicConstants.higher:
        const skillValue = this.actor.system.characteristics.skill.value + this.actor.system.skillBonus;
        const magicValue = this.actor.system.characteristics.magic.value + (this.actor.system.magicBonus || 0);
        characteristic = Math.max(magicValue, skillValue);
        if (magicValue > skillValue) {
          chracteristicProperty = "magic";
          characteristicName = game.i18n.localize("AFF.Characteristics.magic.label");
        }
        break;
    }
    let [breakdown, target] = BreakdownHelper.init({
      [characteristicName]: characteristic,
      [this.parent.name]: this.value,
      ...this.actor.system.bonuses[`system.${chracteristicProperty}Bonus`],
      ...additionalBonus,
      ...this.actor.system.bonuses[`system.specialSkillBonus.${this.category}`],
      ...this.actor.system.bonuses[`system.specialSkillBonus.${this.parent.id}`],
    });
    const rollDialog = new AffRollDialog({ actor: this.actor, item: this.item, target, breakdown, rollTypeSelected, rollName });
    const result = await rollDialog.wait(event);
    return result;
  }

  async handleRollUnder(roll, _target) {
    let item = this.item;
    if (item.system.category != "combat" || roll.rollResult == AffRoll.ROLL_RESULT.FAIL || roll.rollResult == AffRoll.ROLL_RESULT.SUCCESS)
      return;

    if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
      return aff2e.utils.tableHelper.drawFumble(this);
    return aff2e.utils.tableHelper.drawCritical(this);
  }

  async handleRollHigher(roll, _target) {
    let item = this.item;
    if (item.system.category != "combat" || roll.rollResult == AffRoll.ROLL_RESULT.HIGHER)
      return;

    if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
      return aff2e.utils.tableHelper.drawFumble(this);
    return aff2e.utils.tableHelper.drawCritical(this);
  }
}
