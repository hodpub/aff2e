import { AFF } from "../../config/_aff.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import AffActorBase from './_base-actor.mjs';

export default class AffCharacter extends AffActorBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Actor.character',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.description = new fields.StringField();
    schema.experience = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 0,
      min: 0
    });
    schema.gp = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 0,
      min: 0
    });
    schema.sp = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 0,
      min: 0
    });
    schema.provisions = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 0,
      min: 0
    });
    schema.provisionsAte = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 0,
      min: 0
    });
    schema.treasures = new fields.HTMLField();
    schema.race = new fields.StringField();
    schema.socialClass = new fields.StringField();
    schema.age = new fields.NumberField({
      ...DataHelper.requiredInteger,
      initial: 20,
      min: 0
    });
    schema.sex = new fields.StringField();

    return schema;
  }

  prepareDerivedData() {
    super.prepareDerivedData?.();
    const strengthSkill = this.getSkill(AFF.Settings.strengthSkill.key);

    let slotsUsed = 0;
    const items = this.parent.items;
    for (const item of items) {
      if ("quantityPerSlot" in item.system && item.system.quantityPerSlot > 0) {
        if ("equipped" in item.system && item.system.equipped)
          continue;
        slotsUsed += item.system.quantity / item.system.quantityPerSlot;
      }
    }

    slotsUsed += (this.gp + this.sp) / 100;

    this.slots = {
      max: 10 + (strengthSkill?.system.value ?? 0),
      current: Math.ceil(slotsUsed),
    };

    this.provisionDaily = 2;
    this.provisionRecovery ??= 0;
    this.provisionRecovery += 2;
    this.restRecovery ??= 0;
    this.restRecovery += 4;

    if (this.parent.type === "antiHero")
      return;

    const armourSkill = this.getSkill(AFF.Settings.armourSkill.key);
    const armourTotalValue = (armourSkill?.system.value ?? 0) + this.characteristics.skill.value + this.skillBonus;
    const armourDifference = game.settings.get(AFF.ID, AFF.Settings.armourDifference.key);
    const armourMinValue = this.parent.items.filter(i => i.type === "armour" && i.system.equipped)
      .reduce((min, item) => Math.max(min, item.system.minRequired), 0);
    if (armourTotalValue < armourMinValue + armourDifference) {
      const penalty = armourTotalValue - (armourMinValue + armourDifference);
      this.skillBonus += penalty;
      if (!("system.skillBonus" in this.bonuses))
        this.bonuses["system.skillBonus"] = {};
      this.bonuses["system.skillBonus"][game.i18n.localize("AFF.Item.Armour.ERRORS.armourUnproficient")] = penalty;
    }
  }

  getRollData() {
    const data = this;

    return data;
  }

  async consumeProvision() {
    if (this.provisions <= 0) {
      ui.notifications.warn(game.i18n.localize("AFF.Actor.character.WARN.NoProvisions"));
      return;
    }
    if (this.provisionsAte == this.provisionDaily) {
      ui.notifications.warn(game.i18n.localize("AFF.Actor.character.WARN.ProvisionsAte"));
      return;
    }
    return this.parent.update({
      "system.provisions": this.provisions - 1,
      "system.provisionsAte": this.provisionsAte + 1,
      "system.characteristics.stamina.value": this.characteristics.stamina.value + this.provisionRecovery,
    });
  }

  async rest() {
    return Promise.all([
      this.parent.update({
        "system.provisionsAte": 0,
        "system.characteristics.stamina.value": this.characteristics.stamina.value + this.restRecovery,
        "system.characteristics.magicPoints.value": this.characteristics.magicPoints.max,
      }),
      this.parent.items.filter(i => i.type === "priestAbility").forEach(async i => await i.update({
        "system.isAvailable": 1
      })),
    ]);
  }
}
