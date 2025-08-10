const TextEditor = foundry.applications.ux.TextEditor.implementation;
export default class AffRoll extends foundry.dice.Roll {
  /**
   * @param {string} formula    The string formula to parse
   * @param {object} data       The data object against which to parse attributes within the formula
   * @param {RollOptions} [options]  Options modifying or describing the Roll
   */
  constructor(formula, target, data = {}, options = {}) {
    super(formula, data, options);
    this.target = target;
  }

  /**
   * The HTML template path used to render a complete Roll object to the chat log
   * @type {string}
   */
  static CHAT_TEMPLATE = "systems/aff2e/templates/dice/roll.hbs";

  /**
   * The HTML template used to render an expanded Roll tooltip to the chat log
   * @type {string}
   */
  static TOOLTIP_TEMPLATE = "systems/aff2e/templates/dice/tooltip.hbs";

  /**
   * Clone the Roll instance, returning a new Roll instance that has not yet been evaluated.
   * @returns {AffRoll}
   */
  clone() {
    return new this.constructor(this._formula, this.target, this.data, this.options);
  }

  /* -------------------------------------------- */
  /*  Static Class Methods                        */
  /* -------------------------------------------- */

  /**
   * A factory method which constructs a Roll instance using the default configured Roll class.
   * @param {string} formula        The formula used to create the Roll instance
   * @param {object} [data={}]      The data object which provides component data for the formula
   * @param {object} [options={}]   Additional options which modify or describe this Roll
   * @returns {Roll}                The constructed Roll instance
   */
  static create(formula, target, data = {}, options = {}) {
    const cls = CONFIG.Dice.rolls[1];
    return new cls(formula, target, data, options);
  }

  /* -------------------------------------------- */

  /**
   * Get the default configured Roll class.
   * @returns {typeof Roll}
   */
  static get defaultImplementation() {
    return CONFIG.Dice.rolls[1];
  }

  /**
   * Represent the data of the Roll as an object suitable for JSON serialization.
   * @returns {object}     Structured data which can be serialized into JSON
   */
  toJSON() {
    return foundry.utils.mergeObject(
      super.toJSON(),
      {
        target: this.target
      }
    );
  }

  /**
     * Recreate a Roll instance using a provided data object
     * @param {object} data   Unpacked data representing the Roll
     * @returns {Roll}         A reconstructed Roll instance
     */
  static fromData(data) {
    const { DiceTerm, RollTerm } = foundry.dice.terms;

    // Redirect to the proper Roll class definition
    if (data.class && (data.class !== this.name)) {
      const cls = CONFIG.Dice.rolls.find(cls => cls.name === data.class);
      if (!cls) throw new Error(`Unable to recreate ${data.class} instance from provided data`);
      return cls.fromData(data);
    }

    // Create the Roll instance
    const roll = new this(data.formula, data.target, data.data, data.options);

    // Expand terms
    roll.terms = data.terms.map(t => {
      if (t.class) {
        if (t.class === "DicePool") t.class = "PoolTerm"; // Backwards compatibility
        if (t.class === "MathTerm") t.class = "FunctionTerm";
        return RollTerm.fromData(t);
      }
      return t;
    });

    // Repopulate evaluated state
    if (data.evaluated ?? true) {
      roll._total = data.total;
      roll._dice = (data.dice || []).map(t => DiceTerm.fromData(t));
      roll._evaluated = true;
    }
    return roll;
  }

  async _prepareChatRenderContext({ flavor, isPrivate = false, ...options } = {}) {
    const rollType = this.target ? "roll-under" : "roll-higher";
    let rollValue = null;
    let valuesHtml = "";
    if (this.options.values) {
      const rollIndex = Math.min(Math.max(this.total - 1, 0), 6);
      rollValue = this.options.values[rollIndex];

      valuesHtml = `<div class="values">`;
      let firstLine = `<span class="selected"><i class="fa-solid fa-dice" aria-hidden="true"></i></span>`;
      let secondLine = `<span class="selected"><i class="fa-solid fa-${this.options.icon}" aria-hidden="true"></i></span>`;
      for (let i = 0; i < this.options.values.length; i++) {
        const value = this.options.values[i];
        firstLine += `<span class="${i === rollIndex ? "selected" : ""}">${i + 1}</span>`;
        secondLine += `<span class="${i === rollIndex ? "selected" : ""}">${value}</span>`;
      }
      valuesHtml += firstLine + secondLine;
      valuesHtml += `</div>`;
    }

    const baseContext = await super._prepareChatRenderContext({ flavor, isPrivate, options });
    const result = foundry.utils.mergeObject(
      baseContext,
      {
        rollResult: this.rollResult,
        target: this.target,
        item: this.options.item,
        options: this.options,
        cssClass: this.options.values ? "" : rollType,
        rollValue: rollValue,
        valuesHtml: valuesHtml,
        isPrivate
      }
    );
    return result;
  }


  /**
     * Render the tooltip HTML for a Roll instance
     * @returns {Promise<string>}     The rendered HTML tooltip as a string
     */
  async getTooltip() {
    const parts = this.dice.map(d => d.getTooltipData());
    const description = this.options.item?.system?.description || "";
    return foundry.applications.handlebars.renderTemplate(this.constructor.TOOLTIP_TEMPLATE, {
      parts,
      description: await TextEditor.enrichHTML(description),
      item: this.options.item,
      breakdown: this.options.breakdown
    });
  }

  /**
   *  Gets the result if it is a roll under
   */
  static ROLL_RESULT = {
    FUMBLE: -1,
    FAIL: 0,
    SUCCESS: 1,
    CRITICAL: 2,
    HIGHER: 99
  };
  get rollResult() {
    if (this.options.values)
      return AffRoll.ROLL_RESULT.HIGHER;
    if (!this.target)
      return this._higherResult();
    if (this._isFumble())
      return AffRoll.ROLL_RESULT.FUMBLE;
    if (this._isCritical())
      return AffRoll.ROLL_RESULT.CRITICAL;
    if (this.dice[0].total == 2)
      return AffRoll.ROLL_RESULT.SUCCESS;
    if (this.dice[0].total == 12)
      return AffRoll.ROLL_RESULT.FAIL;

    return this.total <= this.target ? AffRoll.ROLL_RESULT.SUCCESS : AffRoll.ROLL_RESULT.FAIL;
  }
  _isFumble() {
    if (this.dice[0].total < 12)
      return false;

    return this.target < 12;
  }
  _isCritical() {
    if (this.dice[0].total > 2)
      return false;

    return this.target > 1;
  }
  _higherResult() {
    if (this.dice[0].total == 2)
      return AffRoll.ROLL_RESULT.FUMBLE;
    if (this.dice[0].total == 12)
      return AffRoll.ROLL_RESULT.CRITICAL;
    return AffRoll.ROLL_RESULT.HIGHER;
  }
}