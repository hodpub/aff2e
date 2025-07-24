import AffItemBase from "./base-item.mjs";

export default class AffTalent extends AffItemBase {
  static LOCALIZATION_PREFIXES = [
    ...super.LOCALIZATION_PREFIXES,
    'AFF.Item.Talent',
  ];

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = super.defineSchema();

    schema.macros = new fields.SetField(new fields.DocumentUUIDField({
      type: "Macro",
      required: false,
      blank: true,
    }));

    return schema;
  }

  async _checkAutoRun(pattern) {
    if (!this.parent)
      return;

    for (const macro of this.macros) {
      const macroDoc = await fromUuid(macro);
      if (macroDoc.name == `${pattern} ${this.parent.name}`) {
        macroDoc.execute({ item: this });
      }
    }
  }

  _onCreate(_data, _options, _user) {
    this._checkAutoRun("Configure");
  }

  _onDelete(_options, _user) {
    this._checkAutoRun("Deconfigure");
  }

  async roll(event) {
    let macros = await Promise.all(this.macros.map(async (uuid) => await fromUuid(uuid)));
    macros = macros.filter(m => !m.name.startsWith("Configure ") && !m.name.startsWith("Deconfigure "));
    if (macros.length === 0)
      return this.parent.sendToChat(event);

    if (macros.length === 1) {
      const macroDoc = macros[0];
      return macroDoc.execute({ item: this });
    }
    const title = this.parent.name;

    let btnIndex = 0;
    let icon = "fa-solid fa-play";
    const buttons =
      macros.map((macro) => {
        const btn = Object.assign({
          label: macro.name,
          icon: icon,
          action: macro.id,
          callback: () => macro.execute({ item: this }),
        });
        btnIndex++;
        return btn;
      })
        .filter(it => it !== undefined);

    return foundry.applications.api.DialogV2.wait({
      content: "",
      buttons,
      rejectClose: false,
      modal: true,
      classes: ['choice-dialog'],
      position: {
        width: 400
      },
      window: { title },
    });
  }
}