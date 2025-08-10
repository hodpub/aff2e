import AffRollDialog from "../../applications/roll-dialog.mjs";
import { AFF } from "../../config/_aff.mjs";
import AffRoll from "../../documents/roll.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffItemBase from './base-item.mjs';

export default class AffWizardrySpell extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.WizardrySpell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.value = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 1,
      min: 1
    });

    return schema;
  }

  get skillKey() {
    return AFF.Settings.wizardrySkill.key;
  }
  get noSkillError() {
    return "AFF.Actor.base.errors.noWizardrySkill";
  }
  get bonus() {
    return this.actor.system.wizardrySpellRollBonus ?? 0;
  }
  get moduleId() {
    return AFF.ID;
  }

  async roll(event) {
    const cost = Math.abs(this.calculateCost({ rollResult: AffRoll.ROLL_RESULT.SUCCESS }));
    if (this.actor.system.characteristics.magicPoints.value < cost) {
      ui.notifications.error("AFF.Actor.base.errors.notEnoughMP", { localize: true });
      return;
    }

    const currentSkill = this.actor.system.getSkill(this.skillKey, this.moduleId);
    if (!currentSkill) {
      ui.notifications.error(this.noSkillError, { localize: true });
      return;
    }
    const power = this.actor.system.characteristics.magic.value + (currentSkill?.system.value ?? 0);

    const bonus = this.bonus;

    const rollDialog = new AffRollDialog({
      actor: this.actor,
      item: this.item,
      target: power,
      rollType: AffRollDialog.rollType.under,
      bonus,
      breakdown: {
        [game.i18n.localize("AFF.Characteristics.magic.label")]: this.actor.system.characteristics.magic.value,
        [currentSkill.name]: currentSkill.system.value,
      },
    });
    return rollDialog.wait(event);
  }

  async handleRollUnder(roll, target) {
    await this.consumeCost(roll);

    if (roll.rollResult == AffRoll.ROLL_RESULT.CRITICAL)
      return aff2e.utils.tableHelper.drawSpellCritical(this);
    if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
      return aff2e.utils.tableHelper.drawOops(this);

    return;
  }

  async consumeCost(roll) {
    const mp = this.calculateCost(roll);
    if (mp === 0) return;

    const newValue = Math.max(0, this.actor.system.characteristics.magicPoints.value + mp);
    await this.actor.update({ "system.characteristics.magicPoints.value": newValue });
  }

  calculateCost(roll) {
    let mp = roll.rollResult >= AffRoll.ROLL_RESULT.SUCCESS ? -this.value : roll.rollResult - 1;
    return mp;
  }
}
