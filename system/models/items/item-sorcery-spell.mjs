import AffRollDialog from "../../applications/roll-dialog.mjs";
import { AFF } from "../../config/_aff.mjs";
import AffRoll from "../../documents/roll.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffItemBase from './base-item.mjs';

export default class AffSorcerySpell extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.SorcerySpell',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.value = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 1,
      min: 1
    });

    schema.component = new fields.DocumentUUIDField({});
    schema.consumesComponent = new fields.BooleanField({ initial: true, });

    return schema;
  }

  prepareDerivedData() {
    this.componentInfo = "";
    if (!this.component)
      return;
    const component = fromUuidSync(this.component);
    const consumesComponent = this.consumesComponent ? game.i18n.localize("AFF.Item.SorcerySpell.FIELDS.consumesComponent.info") : "";
    this.componentInfo = `<p>${game.i18n.localize("AFF.Item.SorcerySpell.FIELDS.component.label")}: ${component.name} <em>${consumesComponent}</em></p>`;
  }

  async extraDescription() {
    return this.componentInfo;
  }

  get skillKey() {
    return AFF.Settings.sorcerySkill.key;
  }
  get noSkillError() {
    return "AFF.Actor.base.errors.noSorcerySkill";
  }
  get bonus() {
    return this.actor.system.sorcerySpellRollBonus ?? 0;
  }
  get moduleId() {
    return AFF.ID;
  }

  async roll(event) {
    const currentSkill = this.actor.system.getSkill(this.skillKey, this.moduleId);
    if (!currentSkill) {
      ui.notifications.error(this.noSkillError, { localize: true });
      return;
    }

    let component = null;
    if (this.component && this.actor.type == "character") {
      const componentId = foundry.utils.parseUuid(this.component).id;
      component = this.actor.items.get(componentId);
      if (!component) {
        ui.notifications.error("AFF.Item.SorcerySpell.ERRORS.componentNotFound", { localize: true });
        return;
      }
      if (this.consumesComponent && (!component || component?.system.quantity <= 0)) {
        ui.notifications.error("AFF.Item.SorcerySpell.ERRORS.componentNotEnough", { localize: true });
        return;
      }
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
    const result = await rollDialog.wait(event);
    if (result && component && this.consumesComponent) {
      const newQuantity = Math.max(0, component.system.quantity - 1);
      await component.update({ "system.quantity": newQuantity });
    }
    return result;
  }

  async handleRollUnder(roll, target) {
    let mp = roll.rollResult >= AffRoll.ROLL_RESULT.SUCCESS ? -this.value : roll.rollResult - 1;

    const newValue = Math.max(0, this.actor.system.characteristics.stamina.value + mp);
    await this.actor.update({ "system.characteristics.stamina.value": newValue });

    if (roll.rollResult == AffRoll.ROLL_RESULT.CRITICAL)
      return aff2e.utils.tableHelper.drawSpellCritical(this);
    if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
      return aff2e.utils.tableHelper.drawOops(this);

    return;
  }
}
