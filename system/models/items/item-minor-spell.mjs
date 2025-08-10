import AffRollDialog from "../../applications/roll-dialog.mjs";
import { AFF } from "../../config/_aff.mjs";
import AffRoll from "../../documents/roll.mjs";
import AffItemBase from './base-item.mjs';

export default class AffMinorSpell extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.MinorSpell',
  ];

  // static defineSchema() {
  //   const fields = foundry.data.fields;
  //   const schema = super.defineSchema();

  //   return schema;
  // }

  async roll(event) {
    if (this.actor.system.characteristics.magicPoints.value == 0) {
      ui.notifications.error("AFF.Actor.base.errors.notEnoughMP", { localize: true });
      return;
    }

    const currentSkill = this.actor.system.getSkill(AFF.Settings.minorMagicSkill.key);
    if (!currentSkill) {
      ui.notifications.error("AFF.Actor.base.errors.noMinorMagicSkill", { localize: true });
      return;
    }

    const power = this.actor.system.characteristics.magic.value + currentSkill.system.value + 6;

    const rollDialog = new AffRollDialog({
      actor: this.actor,
      item: this.item,
      target: power,
      rollType: AffRollDialog.rollType.under,
      breakdown: {
        [game.i18n.localize("AFF.Characteristics.magic.label")]: this.actor.system.characteristics.magic.value,
        [currentSkill.name]: currentSkill.system.value,
        "Minor Spell": 6,
      },
    });
    return rollDialog.wait(event);
  }

  async handleRollUnder(roll, target) {
    let mp = 0;

    if (roll.rollResult < AffRoll.ROLL_RESULT.SUCCESS)
      mp = roll.rollResult - 1;
    const newValue = Math.max(0, this.actor.system.characteristics.magicPoints.value + mp);
    await this.actor.update({ "system.characteristics.magicPoints.value": newValue });

    if (roll.rollResult == AffRoll.ROLL_RESULT.CRITICAL)
      return aff2e.utils.tableHelper.drawSpellCritical(this);
    if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
      return aff2e.utils.tableHelper.drawOops(this);
  }
}
