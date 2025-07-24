import { AFF } from "../../config/_aff.mjs";
import { sendToChat } from "../../helpers/chat.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffItemBase from './base-item.mjs';

export default class AffPriestAbility extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.PriestAbility',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.isAvailable = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 1,
      min: -1,
      max: 1,
      choices: AFF.Priest.usageList,
    });

    return schema;
  }

  prepareDerivedData() {
    if (this.isAvailable == 1)
      this.value = "✔️";
    else if (this.isAvailable == 0)
      this.value = "❌";
    else
      this.value = "❗";
  }

  async roll(event) {
    if (this.isAvailable == -1) {
      ui.notifications.error("AFF.Item.PriestAbility.notAvailable", { localize: true });
      return;
    }
    let continueCasting = true;
    if (this.isAvailable == 0) {
      continueCasting = await foundry.applications.api.DialogV2.confirm({
        window: { title: this.parent.name },
        content: game.i18n.localize("AFF.Item.PriestAbility.used")
      });
    }

    if (!continueCasting)
      return;

    const currentSkill = this.actor.system.getSkill(AFF.Settings.priestSkill.key);
    if (!currentSkill) {
      ui.notifications.error("AFF.Actor.base.errors.noPriestSkill", { localize: true });
      return;
    }
    const power = this.actor.system.characteristics.magic.value + (currentSkill?.system.value ?? 0);
    const newIsAvailable = this.isAvailable - 1;

    if (this.isAvailable == 0) {
      const newLuck = this.actor.system.characteristics.luck.value - 1;
      await this.actor.update({ "system.characteristics.luck.value": newLuck });
    }

    await this.parent.update({ "system.isAvailable": newIsAvailable });

    await sendToChat({ item: this.item });
  }
}
