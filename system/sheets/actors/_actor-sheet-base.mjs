import { AFF } from "../../config/_aff.mjs";
import { prepareActiveEffectCategories } from '../../helpers/effects.mjs';
import { constructHTMLButton } from "../../helpers/utils.mjs";

const { api, sheets } = foundry.applications;
const TextEditor = foundry.applications.ux.TextEditor.implementation;

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheetV2}
 */
export class AffActorSheet extends api.HandlebarsApplicationMixin(sheets.ActorSheetV2) {
  /** @override */
  static DEFAULT_OPTIONS = {
    classes: ['aff2e', 'actor'],
    position: {
      width: 750,
      height: 750,
    },
    actions: {
      onEditImage: this._onEditImage,
      viewDoc: this._viewDoc,
      createDoc: this._createDoc,
      deleteDoc: this._deleteDoc,
      toggleEffect: this._toggleEffect,
      roll: this._onRoll,
      calculateMP: this._calculateMP,
    },
    // Custom property that's merged into `this.options`
    dragDrop: [{ dragSelector: '.draggable', dropSelector: null }],
    form: {
      submitOnChange: true,
    },
    window: {
      controls: [
        {
          icon: "fa-solid fa-hat-wizard",
          label: "AFF.Actor.base.actions.calculateMP",
          action: "calculateMP",
        }
      ]
    }
  };

  /** @override */
  static PARTS = {
    character: {
      template: 'systems/aff2e/templates/actor/character.hbs',
      templates: [
        'systems/aff2e/templates/actor/header.hbs',
        'systems/aff2e/templates/actor/characteristics.hbs',
      ]
    },
    npc: {
      template: 'systems/aff2e/templates/actor/npc.hbs',
      templates: [
        'systems/aff2e/templates/actor/header.hbs',
        'systems/aff2e/templates/actor/characteristics.hbs',
      ]
    },
    tabs: {
      // Foundry-provided generic template
      template: 'templates/generic/tab-navigation.hbs',
    },
    biography: {
      template: 'systems/aff2e/templates/actor/biography.hbs',
      scrollable: [""],
    },
    verticalRule: {
      template: 'systems/aff2e/templates/actor/vertical-rule.hbs',
    },
    horizontalRule: {
      template: 'systems/aff2e/templates/actor/horizontal-rule.hbs',
    },
    combatSkills: {
      template: 'systems/aff2e/templates/actor/combat-skill.hbs',
      templates: [
        'systems/aff2e/templates/actor/weapon-detail.hbs',
        'systems/aff2e/templates/actor/item-with-value.hbs',
        'systems/aff2e/templates/actor/item.hbs',
        'systems/aff2e/templates/actor/meter.hbs',
      ],
      scrollable: [""],
    },
    magic: {
      template: 'systems/aff2e/templates/actor/magic.hbs',
      scrollable: [""],
    },
    equipments: {
      template: 'systems/aff2e/templates/actor/equipments.hbs',
      scrollable: [""],
    },
    talents: {
      template: 'systems/aff2e/templates/actor/talents.hbs',
      scrollable: [""],
    },
    npcInfo: {
      template: 'systems/aff2e/templates/actor/npc-info.hbs',
      templates: [
        'systems/aff2e/templates/actor/weapon-detail.hbs',
        'systems/aff2e/templates/actor/item-with-value.hbs',
        'systems/aff2e/templates/actor/item.hbs',
      ],
      scrollable: [""],
    },
  };

  /** @override */
  _configureRenderOptions(options) {
    super._configureRenderOptions(options);

    // Not all parts always render
    options.parts = [this.document.type, "verticalRule", "tabs", "horizontalRule", 'biography'];
    // Don't show the other tabs if only limited view
    if (this.document.limited) return;
    // Control which parts show based on document subtype
    switch (this.document.type) {
      case 'antiHero':
        options.parts[0] = 'character';
      case 'antiHero':
      case 'character':
        options.parts.splice(4, 0, ...["combatSkills", "magic", "equipments", "talents"]);
        break;
      case 'npc':
        options.parts.splice(4, 0, ...["npcInfo", "combatSkills", "talents"]);
        break;
    }
  }

  /* -------------------------------------------- */

  /** @override */
  async _prepareContext(options) {
    // Output initialization
    const context = {
      // Validates both permissions and compendium status
      editable: this.isEditable,
      owner: this.document.isOwner,
      limited: this.document.limited,
      // Add the actor document.
      actor: this.actor,
      // Add the actor's data to context.data for easier access, as well as flags.
      system: this.actor.system,
      flags: this.actor.flags,
      // Adding a pointer to CONFIG.AFF
      config: CONFIG.AFF,
      tabs: this._getTabs(options.parts),
      // Necessary for formInput and formFields helpers
      fields: this.document.schema.fields,
      systemFields: this.document.system.schema.fields,
    };

    // Offloading context prep to a helper function
    await this._prepareItems(context);

    return context;
  }

  /** @inheritdoc */
  async _renderFrame(options) {
    const frame = await super._renderFrame(options);
    const buttons = [constructHTMLButton({
      label: "",
      classes: ["header-control", "icon", "fa-solid", "fa-dice-six"],
      dataset: { action: "roll", tooltip: "1d6", roll: "1d6" }
    }),
    constructHTMLButton({
      label: "",
      classes: ["header-control", "icon", "fa-solid", "fa-dice"],
      dataset: { action: "roll", tooltip: "2d6", roll: "2d6" },
    })];
    this.window.controls.before(...buttons);

    return frame;
  }

  /** @override */
  async _preparePartContext(partId, context) {
    switch (partId) {
      case "character":
      case "npc":
      case "horizontalRule":
      case "verticalRule":
        break;
      case 'spells':
      case 'skills':
      case 'combatSkills':
      case 'magic':
        context.tab = context.tabs[partId];
        break;
      case "equipments":
        context.tab = context.tabs[partId];
        context.enrichedTreasures = await this._createEnrichedText(this.actor.system.treasures);
        break;
      case 'biography':
        context.tab = context.tabs[partId];
        context.enrichedBiography = await this._createEnrichedText(this.actor.system.biography);
        break;
      case 'npcInfo':
        context.tab = context.tabs[partId];
        context.enrichedSpecial = await this._createEnrichedText(this.actor.system.special);
        break;
      case 'talents':
      case 'effects':
        context.tab = context.tabs[partId];
        // Prepare active effects
        context.effects = prepareActiveEffectCategories(
          // A generator that returns all effects stored on the actor
          // as well as any items
          this.actor.allApplicableEffects()
        );
        break;
    }
    return context;
  }

  /**
   * Generates the data for the generic tab navigation template
   * @param {string[]} parts An array of named template parts to render
   * @returns {Record<string, Partial<ApplicationTab>>}
   * @protected
   */
  _getTabs(parts) {
    // If you have sub-tabs this is necessary to change
    const tabGroup = 'primary';
    // Default tab for first time it's rendered this session
    if (!this.tabGroups[tabGroup]) this.tabGroups[tabGroup] = parts[4];
    return parts.reduce((tabs, partId) => {
      const tab = {
        cssClass: '',
        group: tabGroup,
        // Matches tab property to
        id: '',
        // FontAwesome Icon, if you so choose
        icon: '',
        // Run through localization
        label: 'AFF.Actor.Tabs.',
      };
      switch (partId) {
        case 'character':
        case 'npc':
        case 'tabs':
        case "horizontalRule":
        case "verticalRule":
          return tabs;
        default:
          tab.id = partId;
          tab.label += partId.charAt(0).toUpperCase() + partId.slice(1);
          break;
      }
      if (this.tabGroups[tabGroup] === tab.id) tab.cssClass = 'active';
      tabs[partId] = tab;
      return tabs;
    }, {});
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  async _prepareItems(context) {
    // Initialize containers.
    // You can just use `this.document.itemTypes` instead
    // if you don't need to subdivide a given type like
    // this sheet does with spells
    const gear = [];
    const features = [];
    const skills = [];
    const weapons = [];
    const armours = [];
    const cantrips = [];
    const talents = [];
    const equipments = [];
    const spells = Object.assign(...Object.keys(AFF.Magic.spellTypes).map(type => ({ [type]: [] })));

    // Iterate through items, allocating to containers
    for (let i of this.document.items) {
      const extraDescription = await i.system.extraDescription?.() || "";
      i.tooltip = `<p>${i.name}</p>${extraDescription}${await this._createEnrichedText(i.system.description)}`;
      if (i.type == "specialSkill") {
        skills.push(i);
        continue;
      }
      if (i.type == "weapon") {
        if (i.system.equipped)
          weapons.push(i);
        equipments.push(i);
        continue;
      }
      if (i.type == "armour") {
        if (i.system.equipped)
          armours.push(i);
        equipments.push(i);
        continue;
      }
      if (i.type == "talent") {
        talents.push(i);
        continue;
      }
      if (i.type == "equipment") {
        equipments.push(i);
        continue;
      }
      if (Object.keys(AFF.Magic.spellTypes).indexOf(i.type) > -1) {
        i.template = AFF.Magic.spellTypes[i.type];
        spells[i.type].push(i);
        continue;
      }

      equipments.push(i);
    }

    for (const s in spells) {
      if (spells[s].length === 0) {
        delete spells[s];
      }
    }

    for (const s of Object.values(spells)) {
      s.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    }

    // Sort then assign
    context.skills = skills.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.weapons = weapons.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.armours = armours.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.gear = gear.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.features = features.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.spells = spells;
    context.cantrips = cantrips.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.talents = talents.sort((a, b) => (a.sort || 0) - (b.sort || 0));
    context.equipments = equipments.sort((a, b) => (a.sort || 0) - (b.sort || 0));
  }

  /**
   * Actions performed after any render of the Application.
   * Post-render steps are not awaited by the render process.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   * @override
   */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.#disableOverrides();
    // You may want to add other special handling here
    // Foundry comes with a large number of utility classes, e.g. SearchFilter
    // That you may want to implement yourself.
  }

  /**
   * Actions performed after a first render of the Application.
   * @param {ApplicationRenderContext} context      Prepared context data
   * @param {RenderOptions} options                 Provided render options
   * @protected
   */
  async _onFirstRender(context, options) {
    if (this.document.type === 'npc')
      options.position.height = 525;
    if (this.document.type === 'antiHero')
      options.position.height = 675;

    const size = game.settings.get(AFF.ID, AFF.Settings.sheetSize.key, 100) / 100;
    options.position.scale = size;

    this.classList.add(this.document.type);

    await super._onFirstRender(context, options);

    this._createContextMenu(this._getItemButtonContextOptions, "[data-document-class]");
    //, { hookName: "getItemButtonContextOptions", parentClassHooks: false, fixed: true }
  }

  get title() {
    const name = super.title;
    if (!this.document.isToken)
      return name;

    return `${name} (${game.i18n.localize("Token")})`;
  }

  /**************
   *
   *   ACTIONS
   *
   **************/

  /**
   * Handle changing a Document's image.
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @returns {Promise}
   * @protected
   */
  static async _onEditImage(event, target) {
    const attr = target.dataset.edit;
    const current = foundry.utils.getProperty(this.document, attr);
    const { img } =
      this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ??
      {};
    const fp = new FilePicker({
      current,
      type: 'image',
      redirectToRoot: img ? [img] : [],
      callback: (path) => {
        this.document.update({ [attr]: path });
      },
      top: this.position.top + 40,
      left: this.position.left + 10,
    });
    return fp.browse();
  }

  /**
   * Renders an embedded document's sheet
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _viewDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    doc.sheet.render(true);
  }

  /**
   * Handles item deletion
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _deleteDoc(event, target) {
    const doc = this._getEmbeddedDocument(target);
    await doc.delete();
  }

  /**
   * Handle creating a new Owned Item or ActiveEffect for the actor using initial data defined in the HTML dataset
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _createDoc(event, target) {
    // Retrieve the configured document class for Item or ActiveEffect
    const docCls = getDocumentClass(target.dataset.documentClass);
    // Prepare the document creation data by initializing it a default name.
    const docData = {
      name: docCls.defaultName({
        // defaultName handles an undefined type gracefully
        type: target.dataset.type,
        parent: this.actor,
      }),
    };
    // Loop through the dataset and add it to our docData
    for (const [dataKey, value] of Object.entries(target.dataset)) {
      // These data attributes are reserved for the action handling
      if (['action', 'documentClass'].includes(dataKey)) continue;
      // Nested properties require dot notation in the HTML, e.g. anything with `system`
      // An example exists in spells.hbs, with `data-system.spell-level`
      // which turns into the dataKey 'system.spellLevel'
      foundry.utils.setProperty(docData, dataKey, value);
    }

    // Finally, create the embedded document!
    await docCls.create(docData, { parent: this.actor });
  }

  /**
   * Determines effect parent to pass to helper
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @private
   */
  static async _toggleEffect(event, target) {
    const effect = this._getEmbeddedDocument(target);
    await effect.update({ disabled: !effect.disabled });
  }

  /**
   * Handle clickable rolls.
   *
   * @this AffActorSheet
   * @param {PointerEvent} event   The originating click event
   * @param {HTMLElement} target   The capturing HTML element which defined a [data-action]
   * @protected
   */
  static async _onRoll(event, target) {
    event.preventDefault();
    const dataset = target.dataset;

    // Handle item rolls.
    switch (dataset.rollType) {
      case "skill":
        return this.document.system.rollSkill(event);
      case "luck":
        return this.document.system.rollLuck(event);
      case "magic":
        return this.document.system.rollMagic(event);
      case "armour":
        return this.document.system.rollArmour(event);
      case "consume":
        return this.document.system.consumeProvision?.(event);
      case "rest":
        return this.document.system.rest?.(event);
      case 'item':
        const item = this._getEmbeddedDocument(target);
        if (item) return item.roll(event);
      case "number":
        return this.document.system.rollNumber?.();
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      await roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  static async _calculateMP(event) {
    event.preventDefault();
    const wizardrySkill = this.document.system.getSkill(AFF.Settings.wizardrySkill.key);
    const mp = (this.document.system.characteristics.magic.max + (wizardrySkill?.system.value ?? 0)) * 2;
    console.log("AffActorSheet._calculateMP", mp, wizardrySkill, this.document);
    await this.document.update({
      "system.characteristics.magicPoints.max": mp,
      "system.characteristics.magicPoints.value": mp,
    });
  }

  /** Helper Functions */

  /**
   * Fetches the embedded document representing the containing HTML element
   *
   * @param {HTMLElement} target    The element subject to search
   * @returns {Item | ActiveEffect} The embedded Item or ActiveEffect
   */
  _getEmbeddedDocument(target) {
    const docRow = target.closest('div[data-document-class]') ?? target.closest('li[data-document-class]') ?? target.closest("a[data-document-class]");
    if (docRow.dataset.documentClass === 'Item') {
      return this.actor.items.get(docRow.dataset.itemId);
    } else if (docRow.dataset.documentClass === 'ActiveEffect') {
      const parent =
        docRow.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(docRow?.dataset.parentId);
      return parent.effects.get(docRow?.dataset.effectId);
    } else return console.warn('Could not find document class');
  }

  /***************
   *
   * Drag and Drop
   *
   ***************/

  /**
   * Handle the dropping of ActiveEffect data onto an Actor Sheet
   * @param {DragEvent} event                  The concluding DragEvent which contains drop data
   * @param {object} data                      The data transfer extracted from the event
   * @returns {Promise<ActiveEffect|boolean>}  The created ActiveEffect object or false if it couldn't be created.
   * @protected
   */
  async _onDropActiveEffect(event, data) {
    const aeCls = getDocumentClass('ActiveEffect');
    const effect = await aeCls.fromDropData(data);
    if (!this.actor.isOwner || !effect) return false;
    if (effect.target === this.actor)
      return this._onSortActiveEffect(event, effect);
    return aeCls.create(effect, { parent: this.actor });
  }

  /**
   * Handle a drop event for an existing embedded Active Effect to sort that Active Effect relative to its siblings
   *
   * @param {DragEvent} event
   * @param {ActiveEffect} effect
   */
  async _onSortActiveEffect(event, effect) {
    /** @type {HTMLElement} */
    const dropTarget = event.target.closest('[data-effect-id]');
    if (!dropTarget) return;
    const target = this._getEmbeddedDocument(dropTarget);

    // Don't sort on yourself
    if (effect.uuid === target.uuid) return;

    // Identify sibling items based on adjacent HTML elements
    const siblings = [];
    for (const el of dropTarget.parentElement.children) {
      const siblingId = el.dataset.effectId;
      const parentId = el.dataset.parentId;
      if (
        siblingId &&
        parentId &&
        (siblingId !== effect.id || parentId !== effect.parent.id)
      )
        siblings.push(this._getEmbeddedDocument(el));
    }

    // Perform the sort
    const sortUpdates = SortingHelpers.performIntegerSort(effect, {
      target,
      siblings,
    });

    // Split the updates up by parent document
    const directUpdates = [];

    const grandchildUpdateData = sortUpdates.reduce((items, u) => {
      const parentId = u.target.parent.id;
      const update = { _id: u.target.id, ...u.update };
      if (parentId === this.actor.id) {
        directUpdates.push(update);
        return items;
      }
      if (items[parentId]) items[parentId].push(update);
      else items[parentId] = [update];
      return items;
    }, {});

    // Effects-on-items updates
    for (const [itemId, updates] of Object.entries(grandchildUpdateData)) {
      await this.actor.items
        .get(itemId)
        .updateEmbeddedDocuments('ActiveEffect', updates);
    }

    // Update on the main actor
    return this.actor.updateEmbeddedDocuments('ActiveEffect', directUpdates);
  }

  /**
   * Handle dropping of an Actor data onto another Actor sheet
   * @param {DragEvent} event            The concluding DragEvent which contains drop data
   * @param {object} data                The data transfer extracted from the event
   * @returns {Promise<object|boolean>}  A data object which describes the result of the drop, or false if the drop was
   *                                     not permitted.
   * @protected
   */
  async _onDropActor(event, data) {
    if (!this.actor.isOwner) return false;
  }

  /* -------------------------------------------- */

  /**
   * Handle dropping of a Folder on an Actor Sheet.
   * The core sheet currently supports dropping a Folder of Items to create all items as owned items.
   * @param {DragEvent} event     The concluding DragEvent which contains drop data
   * @param {object} data         The data transfer extracted from the event
   * @returns {Promise<Item[]>}
   * @protected
   */
  async _onDropFolder(event, data) {
    if (!this.actor.isOwner) return [];
    const folder = await Folder.implementation.fromDropData(data);
    if (folder.type !== 'Item') return [];
    const droppedItemData = await Promise.all(
      folder.contents.map(async (item) => {
        if (!(document instanceof Item)) item = await fromUuid(item.uuid);
        return item;
      })
    );
    return this._onDropItemCreate(droppedItemData, event);
  }

  /**
   * Handle the final creation of dropped Item data on the Actor.
   * This method is factored out to allow downstream classes the opportunity to override item creation behavior.
   * @param {object[]|object} itemData      The item data requested for creation
   * @param {DragEvent} event               The concluding DragEvent which provided the drop data
   * @returns {Promise<Item[]>}
   * @private
   */
  async _onDropItemCreate(itemData, event) {
    itemData = itemData instanceof Array ? itemData : [itemData];
    for (const item of itemData) {
      await this._onDropItem(event, item);
    }
  }

  async _onDropItem(event, item) {
    if (!this.actor.isOwner) return;
    if (this.actor.uuid === item.parent?.uuid) return this._onSortItem(event, item);

    if (this.document.type === "npc" && !["weapon", "armour", "talent"].includes(item.type)) {
      ui.notifications.warn(game.i18n.localize("AFF.Actor.npc.WARN.itemTYpeNotAllowed"));
      return;
    }

    let data = { quantity: item.system.quantity ?? 1 };
    if (item.system.quantity > 1 && item.parent) {
      const label = game.i18n.format("AFF.Actor.base.TransferTo", { actor: this.actor.name });
      data = await api.DialogV2.prompt({
        classes: ["cgd"],
        content: `<div class="form-group stacked"><label>${game.i18n.localize("AFF.Actor.base.QuantityToTransfer")}</label><div class="form-fields"><range-picker name="quantity" value="1" min="1" max="${item.system.quantity}" step="1"><input type="range" min="1" max="${item.system.quantity}" step="1"><input type="number" min="1" max="${item.system.quantity}" step="1"></range-picker></div></div>`,
        ok: {
          label: label,
          icon: "fa-solid fa-right-left",
          callback: (_event, button, _dialog) => new foundry.applications.ux.FormDataExtended(button.form).object
        },
        window: {
          title: label
        }
      });
    }

    const quantityToTransfer = data.quantity;
    const quantityToKeep = (item.system.quantity ?? 1) - quantityToTransfer;

    let done = false;
    let currentItem = this.actor.items.get(item.id);
    if ("quantity" in item.system && currentItem) {
      await currentItem.update({ "system.quantity": currentItem.system.quantity + quantityToTransfer });
      done = true;
    }
    else {
      const itemToCreate = foundry.utils.deepClone(item).toObject();
      itemToCreate.system.quantity = quantityToTransfer;
      itemToCreate.sort = this.actor.items.reduce((max, i) => Math.max(max, i.sort || 0), 0) + 1;
      const newItem = await Item.create(itemToCreate, { parent: this.actor, keepId: true });
      done = newItem;
    }

    if (!done || !item.parent)
      return;

    if (quantityToKeep == 0)
      await item.delete();
    else
      await item.update({ "system.quantity": quantityToKeep });
  }

  async _onDragStart(event) {
    const target = event.currentTarget;
    if (target.dataset?.drag != "special")
      return super._onDragStart(event);
    const dragData = {
      type: "special",
      rollType: target.dataset.rollType,
      actor: this.actor.uuid,
      actorName: this.actor.name,
      macroName: target.dataset.macroName,
    }
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /********************
   *
   * Actor Override Handling
   *
   ********************/

  /**
   * Submit a document update based on the processed form data.
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {object} submitData                   Processed and validated form data to be used for a document update
   * @returns {Promise<void>}
   * @protected
   * @override
   */
  async _processSubmitData(event, form, submitData) {
    const overrides = foundry.utils.flattenObject(this.actor.overrides);
    for (let k of Object.keys(overrides)) delete submitData[k];
    await this.document.update(submitData);
  }

  /**
   * Disables inputs subject to active effects
   */
  #disableOverrides() {
    const flatOverrides = foundry.utils.flattenObject(this.actor.overrides);
    for (const override of Object.keys(flatOverrides)) {
      const input = this.element.querySelector(`[name="${override}"]`);
      if (input) {
        input.disabled = true;
      }
    }
  }

  _getItemButtonContextOptions() {
    // name is auto-localized
    return [
      {
        name: "AFF.Item.base.SendToChat",
        icon: "<i class=\"fa-solid fa-comment\"></i>",
        callback: async (target) => {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            console.error("Could not find item");
            return;
          }
          await item.sendToChat();
        },
      },
      {
        name: "AFF.Actor.base.actions.equip",
        icon: "<i class=\"fa-solid fa-hand-fist\"></i>",
        condition: (target) => {
          const item = this._getEmbeddedDocument(target);
          return item && "equipped" in item.system && !item.system.equipped;
        },
        callback: async (target) => {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            console.error("Could not find item");
            return;
          }
          await item.update({ "system.equipped": true });
        },
      },
      {
        name: "AFF.Actor.base.actions.unequip",
        icon: "<i class=\"fa-solid fa-hand\"></i>",
        condition: (target) => {
          const item = this._getEmbeddedDocument(target);
          return item && "equipped" in item.system && item.system.equipped;
        },
        callback: async (target) => {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            console.error("Could not find item");
            return;
          }
          await item.update({ "system.equipped": false });
        },
      },
      {
        name: "Edit",
        icon: "<i class=\"fa-solid fa-fw fa-edit\"></i>",
        // condition: () => this.isEditMode,
        callback: async (target) => {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            console.error("Could not find item");
            return;
          }
          await item.sheet.render({ force: true });
        },
      },
      {
        name: "Delete",
        icon: "<i class=\"fa-solid fa-fw fa-trash\"></i>",
        condition: (target) => {
          let item = this._getEmbeddedDocument(target);
          return this.actor.isOwner;
        },
        callback: async (target) => {
          const item = this._getEmbeddedDocument(target);
          if (!item) {
            console.error("Could not find item");
            return;
          }
          await item.deleteDialog();
        },
      },
    ];
  }

  async _createEnrichedText(text) {
    let textCheck = text.replace("<p>", "").replace("</p>", "");
    if (!textCheck)
      return "";

    return await TextEditor.enrichHTML(
      text,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Data to fill in for inline rolls
        rollData: this.actor.getRollData(),
        // Relative UUID resolution
        relativeTo: this.actor,
      }
    );
  }
}
