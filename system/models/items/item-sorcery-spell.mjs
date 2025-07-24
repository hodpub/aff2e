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

  async roll(event) {
    const currentSkill = this.actor.system.getSkill(AFF.Settings.sorcerySkill.key);
    if (!currentSkill) {
      ui.notifications.error("AFF.Actor.base.errors.noSorcerySkill", { localize: true });
      return;
    }

    if (this.component) {
      const componentId = foundry.utils.parseUuid(this.component).id;
      const component = this.actor.items.get(componentId);
      if (!component) {
        ui.notifications.error("AFF.Item.SorcerySpell.ERRORS.componentNotFound", { localize: true });
        return;
      }
      if (this.consumesComponent && (!component || component?.system.quantity <= 0)) {
        ui.notifications.error("AFF.Item.SorcerySpell.ERRORS.componentNotEnough", { localize: true });
        return;
      }

      if (this.consumesComponent) {
        const newQuantity = Math.max(0, component.system.quantity - 1);
        await component.update({ "system.quantity": newQuantity });
      }
    }

    const power = this.actor.system.characteristics.magic.value + (currentSkill?.system.value ?? 0);

    const bonus = this.actor.system.sorcerySpellRollBonus ?? 0;

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
    let mp = roll.rollResult >= AffRoll.ROLL_RESULT.SUCCESS ? -this.value : roll.rollResult - 1;

    const newValue = Math.max(0, this.actor.system.characteristics.stamina.value + mp);
    await this.actor.update({ "system.characteristics.stamina.value": newValue });

    if (roll.rollResult != AffRoll.ROLL_RESULT.FUMBLE)
      return;

    const oopsTableId = game.settings.get(AFF.ID, AFF.Settings.oopsTable.key);
    if (!oopsTableId)
      return;
    const oopsTable = await fromUuid(oopsTableId);
    await oopsTable.draw();
  }
}
