import AffRollDialog from "../../applications/roll-dialog.mjs";
import AffRoll from "../../documents/roll.mjs";
import { BreakdownHelper } from "../../helpers/breakdown.mjs";
import { DataHelper } from "../../helpers/data.mjs";
import { getWinner } from "../../helpers/roll.mjs";
import { toPriceInfo } from "../../helpers/trade.mjs";
import AffEquipment from "./item-equipment.mjs";

export default class AffWeapon extends AffEquipment {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.Weapon',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.damage = new fields.ArrayField(new fields.NumberField({ ...DataHelper.requiredInteger, min: 0 }), { initial: [0, 0, 0, 0, 0, 0, 0] });
    schema.ammunition = new fields.DocumentUUIDField({ required: false });
    schema.specialSkill = new fields.DocumentUUIDField({ required: true });
    schema.equipped = new fields.BooleanField({ initial: true });

    schema.magical = new fields.BooleanField({ initial: false });
    schema.attackRollBonus = new fields.NumberField({ ...DataHelper.requiredInteger, initial: 0 });
    schema.damageRollBonus = new fields.NumberField({ ...DataHelper.requiredInteger, initial: 0 });

    return schema;
  }

  prepareDerivedData() {
    this.priceInfo = {
      city: toPriceInfo(this.price.city),
      town: toPriceInfo(this.price.town),
      village: toPriceInfo(this.price.village),
    };
    this.values = this.damage;
    this.icon = "sword";
  }

  async roll(event) {
    if (event?.shiftKey) {
      return this.attackAndDamage(event);
    }

    const title = this.parent.name;
    const icon = this.ammunition ? "fa-solid fa-bow-arrow" : "fa-solid fa-sword";

    const exec = await foundry.applications.api.DialogV2.wait({
      content: "",
      buttons: [
        {
          label: game.i18n.localize("AFF.Item.Weapon.AttackAndDamage.label"),
          icon: "fa-solid fa-bullseye",
          action: "attackAndDamage",
        },
        {
          label: game.i18n.localize("AFF.Item.Weapon.Attack.label"),
          icon: `fa-solid ${icon}`,
          action: "attack",
        },
        {
          label: game.i18n.localize("AFF.Item.Weapon.Damage.label"),
          icon: "fa-solid fa-burst",
          action: "damage",
        },
      ],
      rejectClose: false,
      modal: true,
      classes: ['choice-dialog'],
      position: {
        width: 400
      },
      window: { title },
    });

    switch (exec) {
      case "attackAndDamage":
        return this.attackAndDamage(event);
      case "attack":
        return this.rollAttack(event);
      case "damage":
        return this.rollDamage(event);
    }
  }

  async attackAndDamage(event) {
    const attack = await this.rollAttack(event);
    const damage = await this.rollDamage(event);
    return [attack, damage];
  }

  async rollAttack(event) {
    const canAttack = await this.reduceAmmunition();
    if (!canAttack) return;

    if (!this.specialSkill)
      return this.rollWithSkill(event, undefined, { rollTypeSelected: AffRollDialog.rollType.higher });

    const specialSkillId = foundry.utils.parseUuid(this.specialSkill).id;
    const specialSkill = this.actor.items.get(specialSkillId);
    if (!specialSkill)
      return this.rollWithSkill(event, specialSkillId, { rollTypeSelected: AffRollDialog.rollType.higher });

    let additionalBonus;
    if (this.attackRollBonus)
      additionalBonus = { [this.parent.name]: this.attackRollBonus };

    const rollName = game.i18n.format("AFF.Item.Weapon.Attack.attackWithSpecialSkill.label", { weapon: this.parent.name, skill: specialSkill.name });
    const result = await specialSkill.roll(event, {
      rollTypeSelected: AffRollDialog.rollType.higher,
      rollName,
      additionalBonus
    });
    if (result)
      this.notifyTarget(event, result);
    return result;
  }

  async rollWithSkill(event, id, params = { rollTypeSelected: AffRollDialog.rollType.under }) {
    const [breakdown, target] = BreakdownHelper.init({
      [game.i18n.localize("AFF.Characteristics.skill.label")]: this.actor.system.characteristics.skill.value,
      [this.parent.name]: this.attackRollBonus,
      ...this.actor.system.bonuses["system.skillBonus"],
      ...this.actor.system.bonuses["system.weaponAttackBonus"],
    });
    const fakeItem = { parent: { id } }
    const item = {
      name: game.i18n.format("AFF.Item.Weapon.Attack.attackWithoutSkill.label", { weapon: this.parent.name }),
      system: {
        handleRollUnder: async (roll, _target) => {
          if (roll.rollResult == AffRoll.ROLL_RESULT.FAIL || roll.rollResult == AffRoll.ROLL_RESULT.SUCCESS)
            return;

          if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
            return aff2e.utils.tableHelper.drawFumble(fakeItem);
          return aff2e.utils.tableHelper.drawCritical(fakeItem);
        },
        handleRollHigher: async (roll, _target) => {
          if (roll.rollResult == AffRoll.ROLL_RESULT.HIGHER)
            return;

          if (roll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
            return aff2e.utils.tableHelper.drawFumble(fakeItem);
          return aff2e.utils.tableHelper.drawCritical(fakeItem);
        },
      }
    }
    const rollDialog = new AffRollDialog({ actor: this.actor, item, target, breakdown, rollTypeSelected: params.rollTypeSelected });
    const result = await rollDialog.wait(event);
    if (result)
      this.notifyTarget(event, result);
    return result;
  }

  async notifyTarget(event, attackResult) {
    if (event?.source === "targeted")
      return;
    for (const target of game.user.targets) {
      const actor = target.actor;
      let targetUser = game.users.activeGM;
      if (actor.hasPlayerOwner)
        targetUser = game.users.find(u => !u.isGM && actor.testUserPermission(u, "OWNER"));

      let buttons = [];
      const weapons = actor.items.filter(i => i.type === "weapon" && (actor.type != "character" || i.system.equipped));
      for (const weapon of weapons) {
        buttons.push({
          label: weapon.name,
          icon: weapon.img,
          action: weapon.uuid
        });
      };
      const dialogOptions = {
        window: { title: "You're being attacked!" },
        content: "<p>Select your weapon to attack back!</p>",
        buttons,
      }
      const result = await targetUser.query("dialog", { type: "wait", config: dialogOptions });

      if (!result)
        return;
      const weapon = await fromUuid(result);
      const defenseResult = await weapon.system.rollAttack({ shiftKey: true, source: "targeted" });

      const attackRoll = attackResult.rolls[0];
      const defenseRoll = defenseResult.rolls[0];
      const winner = getWinner(attackRoll, defenseRoll);
      let attackRollClass = "";
      let defenseRollClass = "";
      if (winner === 1) {
        attackRollClass = "success";
        defenseRollClass = "failure";
      }
      else if (winner === -1) {
        attackRollClass = "failure";
        defenseRollClass = "success";
      }
      else if (winner === 2) {
        attackRollClass = "success";
        defenseRollClass = "success";
      }
      const message = await foundry.applications.handlebars.renderTemplate("systems/aff2e/templates/sidebar/attack-result.hbs", {
        attacker: this.actor.name,
        attackResult: attackRoll.rollResult,
        attackRoll: attackRoll.total,
        defender: actor.name,
        defenseResult: defenseRoll.rollResult,
        defenseRoll: defenseRoll.total,
        attackRollClass,
        defenseRollClass,
        defenderImg: actor.img,
      });
      const speaker = ChatMessage.getSpeaker({ actor: this.actor });
      speaker.alias = game.i18n.localize("AFF.Item.Weapon.Attack.attackResult.alias");
      await ChatMessage.create({
        content: message,
        speaker: speaker,
      });
    }
  }

  async rollDamage(event) {
    let type;
    if (this.ammunition)
      type = this.actor?.system.bonuses["system.missileDamageBonus"];
    else
      type = this.actor?.system.bonuses["system.meleeDamageBonus"];

    const damageBonus = this.damageRollBonus != 0 ? { [this.parent.name]: this.damageRollBonus } : {};

    const [breakdown, target] = BreakdownHelper.init({
      ...damageBonus,
      ...this.actor?.system.bonuses["system.weaponDamageBonus"],
      ...type,
    });

    const bonus = event?.bonus || 0;

    const rollDialog = new AffRollDialog({
      actor: this.actor,
      item: this.item,
      target: target,
      rollType: AffRollDialog.rollType.values,
      breakdown,
      bonus,
    });
    return rollDialog.wait(event);
  }

  async reduceAmmunition() {
    if (!this.ammunition)
      return true;

    const ammunitionId = foundry.utils.parseUuid(this.ammunition).id;
    const ammunition = this.actor.items.get(ammunitionId);
    if (!ammunition || ammunition.system.quantity <= 0) {
      ui.notifications.warn(game.i18n.localize("AFF.Item.Weapon.WARN.NoAmmunition"));
      return false;
    }

    await ammunition.update({ "system.quantity": ammunition.system.quantity - 1 });
    return true;
  }
}