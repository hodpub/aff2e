import AffRollDialog from "../../applications/roll-dialog.mjs";
import { AFF } from "../../config/_aff.mjs";
import { BreakdownHelper } from "../../helpers/breakdown.mjs";
import { DataHelper } from "../../helpers/data.mjs";

export default class AffActorBase extends foundry.abstract.TypeDataModel {
  static LOCALIZATION_PREFIXES = ["AFF.Actor.base"];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    // Iterate over ability names and create a new SchemaField for each.
    schema.characteristics = new fields.SchemaField(
      Object.entries(AFF.Actors.characteristicsConfig).reduce((obj, characteristic) => {
        const [characteristicId, characteristicConfig] = characteristic;
        obj[characteristicId] = new fields.SchemaField({
          value: new fields.NumberField({
            ...DataHelper.requiredInteger,
            ...characteristicConfig,
          }),
          max: new fields.NumberField({
            ...DataHelper.requiredInteger,
            ...characteristicConfig,
          }),
        });
        return obj;
      }, {})
    );
    schema.biography = new fields.HTMLField();

    return schema;
  }

  async _preUpdate(changed, options, user) {
    Object.keys(this.characteristics).forEach(key => {
      if (changed.system?.characteristics?.[key]?.value !== undefined) {
        changed.system.characteristics[key].value = Math.min(
          changed.system.characteristics[key].value,
          (changed.system.characteristics[key].max ?? this.characteristics[key].max)
        );
      }
    });
    const expectedImg = this.parent.type === "character" ? "hero" : this.parent.type;
    if (changed.img && this.parent.img === `systems/aff2e/assets/icons/${expectedImg}.svg`) {
      changed.prototypeToken = changed.prototypeToken || {};
      changed.prototypeToken.texture = changed.prototypeToken.texture || {};
      changed.prototypeToken.texture.src = changed.img;
    }
  }

  async rollArmour(event) {
    const protections = this.parent.items.filter(item => item.type === "armour" && item.system.equipped);
    if (protections.length === 0) {
      ui.notifications.warn(game.i18n.localize("AFF.Actor.character.WARN.NoArmourEquipped"));
      return;
    }
    let bd = {
      ...this.bonuses["system.armourRollBonus"],
      [protections[0].name]: protections[0].system.protectionRollBonus,
    };
    const armourItem = {
      name: protections[0].name,
      system: {
        values: protections[0].system.protection,
        icon: protections[0].system.icon
      }
    };
    for (let i = 1; i < protections.length; i++) {
      armourItem.name += ` + ${protections[i].name}`;
      armourItem.system.values = armourItem.system.values.map((value, index) =>
        value + protections[i].system.protection[index]
      );
      bd[protections[i].name] = protections[i].system.protectionRollBonus;
    }
    const [breakdown, target] = BreakdownHelper.init(bd);
    const rollDialog = new AffRollDialog({
      actor: this.parent,
      item: armourItem,
      target,
      rollType: AffRollDialog.rollType.values,
      breakdown,
    });
    return rollDialog.wait(event);
  }

  prepareDerivedData() {
    super.prepareDerivedData?.();
    const actorData = this;
    actorData.skillBonus ??= 0;

    const bonuses = actorData.parent.appliedEffects.reduce((acc, effect) => {
      if (effect.changes) {
        effect.changes.forEach(change => {
          if (!(change.key in acc))
            acc[change.key] = {};
          acc[change.key][effect.parent.name] = change.value;
        });
      }
      return acc;
    }, {});
    this.bonuses = bonuses;
  }

  async rollSkill(event, { rollTypeSelected } = { rollTypeSelected: AffRollDialog.rollType.under }) {
    const [breakdown, target] = BreakdownHelper.init({
      [game.i18n.localize("AFF.Characteristics.skill.label")]: this.characteristics.skill.value,
      ...this.bonuses["system.skillBonus"]
    });
    const rollDialog = new AffRollDialog({
      actor: this.parent,
      item: { name: game.i18n.localize("AFF.Characteristics.skill.label") },
      target,
      breakdown,
      rollTypeSelected
    });
    return rollDialog.wait(event);
  }

  async rollLuck(event) {
    const [breakdown, target] = BreakdownHelper.init({
      [game.i18n.localize("AFF.Characteristics.luck.label")]: this.characteristics.luck.value,
      ...this.bonuses["system.luckBonus"]
    });
    const rollDialog = new AffRollDialog({
      actor: this.parent,
      item: { name: game.i18n.localize("AFF.Characteristics.luck.label") },
      target,
      rollType: AffRollDialog.rollType.under,
      breakdown,
    });
    let response = await rollDialog.wait(event);
    if (response) {
      await this.parent.update({
        "system.characteristics.luck.value": this.characteristics.luck.value - 1
      });
    }
    return response;
  }

  async rollMagic(event) {
    const [breakdown, target] = BreakdownHelper.init({
      [game.i18n.localize("AFF.Characteristics.magic.label")]: this.characteristics.magic.value,
      ...this.bonuses["system.magicBonus"]
    });
    const rollDialog = new AffRollDialog({
      actor: this.parent,
      item: { name: game.i18n.localize("AFF.Characteristics.magic.label") },
      target,
      rollType: AffRollDialog.rollType.under,
      breakdown,
    });
    return rollDialog.wait(event);;
  }

  getSkill(key, moduleId = AFF.ID) {
    const skillId = foundry.utils.parseUuid(game.settings.get(moduleId, key))?.id;
    const skill = this.parent.items.get(skillId);
    return skill;
  }
}
