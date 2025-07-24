// Import document classes.
import { AffActor } from './documents/actor.mjs';
import { AffItem } from './documents/item.mjs';
import AffActiveEffect from "./documents/active-effect.mjs";
import AffRoll from "./documents/roll.mjs";
// Import sheet classes.
import * as sheets from "./sheets/_imports.mjs";
// Import helper/utility classes and constants.
import { AFF } from './config/_aff.mjs';
import AffTableHelper from "./helpers/tables.mjs";
// Import DataModel classes
import * as models from './models/_module.mjs';
import { registerSettings } from "./helpers/settings.mjs";
import registerHandlerbarsHelpers from "./helpers/handlebars.mjs";
import * as migrations from "./migrations/_base-migration.mjs";

const collections = foundry.documents.collections;
const foundrySheets = foundry.appv1.sheets;

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

// Add key classes to the global scope so they can be more easily used
// by downstream developers
globalThis.aff2e = {
  documents: {
    AffActor,
    AffItem,
  },
  sheets: {
    AffActorSheet: sheets.AffActorSheet,
    AffItemSheet: sheets.AffItemSheet,
  },
  utils: {
    tableHelper: new AffTableHelper(),
  },
  models,
};

Hooks.once('init', function () {
  // Add custom constants for configuration.
  CONFIG.AFF = AFF;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d20 + @abilities.dex.mod',
    decimals: 2,
  };

  CONFIG.Dice.rolls.push(AffRoll);

  // Define custom Document and DataModel classes
  CONFIG.Actor.documentClass = AffActor;
  CONFIG.ActiveEffect.documentClass = AffActiveEffect;

  // Note that you don't need to declare a DataModel
  // for the base actor/item classes - they are included
  // with the Character/NPC as part of super.defineSchema()
  CONFIG.Actor.dataModels = {
    character: models.AffCharacter,
    npc: models.AffNPC,
    antiHero: models.AffAntiHero,
  };
  CONFIG.Item.documentClass = AffItem;
  CONFIG.Item.dataModels = {
    equipment: models.AffEquipment,
    weapon: models.AffWeapon,
    armour: models.AffArmour,
    specialSkill: models.AffSpecialSkill,
    minorSpell: models.AffMinorSpell,
    wizardrySpell: models.AffWizardrySpell,
    sorcerySpell: models.AffSorcerySpell,
    priestAbility: models.AffPriestAbility,
    talent: models.AffTalent,
  };

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  CONFIG.ChatMessage.template = "systems/aff2e/templates/sidebar/chat-message.hbs";

  // Register sheet application classes
  collections.Actors.unregisterSheet('core', foundrySheets.ActorSheet);
  collections.Actors.registerSheet('aff2e', sheets.AffActorSheet, {
    makeDefault: true,
    label: 'AFF.SheetLabels.Actor',
  });
  collections.Items.unregisterSheet('core', foundrySheets.ItemSheet);
  collections.Items.registerSheet('aff2e', sheets.AffItemSheet, {
    makeDefault: true,
    label: 'AFF.SheetLabels.Item',
  });

  registerSettings();
  registerHandlerbarsHelpers();
  migrations.registerMigrationSettings();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (str) {
  return str.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  await migrations.migrate();
  const content = await foundry.applications.handlebars.renderTemplate("systems/aff2e/templates/dialog/copyright.hbs");
  foundry.applications.api.DialogV2.prompt({
    classes: ['copyright-dialog'],
    position: { width: 900, },
    modal: true,
    window: { title: "Advanced Fighting Fantasy - 2nd Edition" },
    content,
    ok: { label: "Play!", icon: "fa-solid fa-play" },
  });
  Hooks.on('hotbarDrop', (bar, data, slot) => {
    if (data.type == "special") {
      createSpecialMacros(data, slot); return false;
    }
    else if (["Item", "Attribute"].indexOf(data.type) > -1) {
      createDocMacro(data, slot); return false;
    }
  });
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createDocMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `(await fromUuid("${data.uuid}")).roll(event);`;
  const macroName = `${item.actor.name}: ${item.name}`;
  let macro = game.macros.find(
    (m) => m.name === macroName && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'aff2e.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

async function createSpecialMacros(data, slot) {
  let command = `(await fromUuid("${data.actor}")).system`;
  if (data.rollType === "consume")
    command += `.consumeProvision?.(event);`;
  else if (data.rollType === "rest")
    command += `.rest?.(event);`;
  else
    command += `.roll${data.rollType.charAt(0).toUpperCase() + data.rollType.slice(1)}(event);`;

  const macroName = `${data.actorName}: ${data.macroName}`;
  let macro = game.macros.find(
    (m) => m.name === macroName && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: macroName,
      type: 'script',
      command: command,
      flags: { 'aff2e.specialMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}