import AffRoll from "../documents/roll.mjs";

const { HandlebarsApplicationMixin, ApplicationV2, DialogV2 } = foundry.applications.api;
export default class AffRollDialog extends HandlebarsApplicationMixin(ApplicationV2) {
  constructor({ actor, item, target, rollType = AffRollDialog.rollTypeOptions.both, breakdown = {}, bonus = 0, rollTypeSelected = AffRollDialog.rollType.under, rollName }, options) {
    options ??= {};
    options.window ??= {};
    options.window.title = `AFF: ${actor?.name}`;
    super(options);
    this.actor = actor;
    this.item = item;
    this.baseTarget = target;
    this.rollType = rollType;
    this.bonus = bonus;
    this.breakdown = breakdown;
    this.underSelected = rollTypeSelected != AffRollDialog.rollTypeOptions.higher;
    this.rollName = rollName || this.item.name;
  }

  static rollType = {
    under: 0,
    higher: 1,
    values: 3
  }
  static rollTypeOptions = {
    under: 0,
    higher: 1,
    both: 2,
    values: 3
  }

  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    classes: ['roll-dialog', 'aff2e', 'sheet'],
    position: {
      width: 600,
    },
    window: {
      title: "AFF",
      icon: "fa-solid fa-dice",
      resizable: false
    },
    actions: {
      setRollType: this._setRollType,
    },
    tag: "form",
    form: {
      handler: AffRollDialog.formHandler,
      submitOnChange: true,
    },
  };

  /** @inheritdoc */
  static PARTS = {
    form: {
      template: `systems/aff2e/templates/dialog/roll-dialog.hbs`,
    },
    footer: {
      template: "templates/generic/form-footer.hbs",
    }
  };


  async _prepareContext() {
    const underClass = [];
    const higherClass = [];
    switch (this.rollType) {
      case AffRollDialog.rollTypeOptions.higher:
        underClass.push("hidden");
        break;
      case AffRollDialog.rollTypeOptions.under:
        higherClass.push("hidden");
        break;
      case AffRollDialog.rollTypeOptions.values:
        underClass.push("hidden");
        higherClass.push("hidden");
        this.underSelected = false
        break;
    }

    if (this.underSelected) {
      higherClass.push("fa-regular");
      underClass.push("fa-solid");
    }
    else {
      higherClass.push("fa-solid");
      underClass.push("fa-regular");
    }

    this.target = this.baseTarget + this.bonus;
    const context = {
      buttons: [
        {
          type: "submit", icon: "fa-solid fa-globe", label: "CHAT.RollPublic",
          disabled: !this.hideAttribute && this.requireAttribute && !this.attribute,
          action: CONST.DICE_ROLL_MODES.PUBLIC
        },
        {
          type: "submit", icon: "fa-solid fa-user-secret", label: "CHAT.RollPrivate",
          disabled: !this.hideAttribute && this.requireAttribute && !this.attribute,
          action: CONST.DICE_ROLL_MODES.PRIVATE
        },
        {
          type: "submit", icon: "fa-solid fa-eye-slash", label: "CHAT.RollBlind",
          disabled: !this.hideAttribute && this.requireAttribute && !this.attribute,
          action: CONST.DICE_ROLL_MODES.BLIND
        },
        {
          type: "submit", icon: "fa-solid fa-user", label: "CHAT.RollSelf",
          disabled: !this.hideAttribute && this.requireAttribute && !this.attribute,
          action: CONST.DICE_ROLL_MODES.SELF
        },
      ],
      actor: this.actor,
      item: this.item,
      target: this.target,
      underClass: underClass.join(" "),
      higherClass: higherClass.join(" "),
      breakdown: this.breakdown,
      bonus: this.bonus,
      rollName: this.rollName,
    };

    this.context = context;

    return context;
  }

  /**
   * Process form submission for the sheet
   * @this {AffRollDialog}                        The handler is called with the application as its bound scope
   * @param {SubmitEvent} event                   The originating form submission event
   * @param {HTMLFormElement} form                The form element that was submitted
   * @param {FormDataExtended} formData           Processed data for the submitted form
   * @returns {Promise<void>}
   */
  static async formHandler(event, form, formData) {
    return this._formHandler(event, form, formData);
  }

  async _formHandler(event, form, formData) {
    if (event.type == "change")
      return this._updateDialog(formData);

    if (event.type == "submit")
      return this._roll(event, form, formData);

    console.error("Unhandled event type in AffRollDialog:", event.type);
    return;
  }

  async _updateDialog(formData) {
    const formValues = formData.object;
    this.bonus = formValues.bonus || 0;
    this.render(true);
  }

  getBreakdownForTooltip() {
    const breakdown = Object.keys(this.breakdown).map(key => {
      return { name: key, value: this.breakdown[key] };
    });
    if (this.bonus)
      breakdown.push({ name: game.i18n.localize("AFF.Roll.bonus"), value: this.bonus });
    return breakdown;
  }

  async _roll(event, form, formData) {
    if (this.rollType == AffRollDialog.rollTypeOptions.values)
      return this._rollValues(event, form, formData);

    let formula = "2d6";
    let target = this.target;
    if (!this.underSelected) {
      formula += ` + ${this.target}`;
      target = null;
    }
    const breakdown = this.getBreakdownForTooltip();

    const roll = await new AffRoll(formula, target, {}, { item: this.item, breakdown }).roll();
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const newMessage = await roll.toMessage({
      speaker,
      flavor: this.rollName
    }, { rollMode: event.submitter?.dataset.action ?? game.settings.get('core', 'rollMode') });
    this.result = newMessage;

    this.close();

    await game.dice3d?.waitFor3DAnimationByMessageID(newMessage.id);

    if (this.underSelected)
      await this.item.system?.handleRollUnder?.(roll, this.target);
    else
      await this.item.system?.handleRollHigher?.(roll, this.target);

    return this.result;
  }


  async _rollValues(event, form, formData) {
    let formula = "1d6";
    const bonus = this.target;
    if (bonus > 0)
      formula += ` + ${bonus}`;
    else if (bonus < 0)
      formula += ` - ${Math.abs(bonus)}`;
    const breakdown = this.getBreakdownForTooltip();
    const roll = await new AffRoll(formula, null, {}, { item: this.item, breakdown }).roll();
    roll.options.values = this.item.system.values;
    roll.options.icon = this.item.system.icon;
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const newMessage = await roll.toMessage({
      speaker,
      flavor: this.item.name
    }, { rollMode: event.submitter?.dataset.action ?? game.settings.get('core', 'rollMode') });
    this.result = newMessage;

    this.close();

    await game.dice3d?.waitFor3DAnimationByMessageID(newMessage.id);

    return newMessage;
  }

  async wait(event) {
    if (event?.shiftKey) {
      event.submitter = {
        dataset: { action: game.settings.get('core', 'rollMode') }
      };
      await this._prepareContext();
      return this._roll({}, undefined, undefined);
    }

    return new Promise((resolve, _reject) => {
      this.addEventListener("close", async _event => {
        resolve(await this.result);
      }, { once: true });
      this.render(true);
    });
  }

  static async _setRollType() {
    if (this.rollType == AffRollDialog.rollTypeOptions.both)
      this.underSelected = !this.underSelected;
    this.render(true);
  }
}