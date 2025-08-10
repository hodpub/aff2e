const fields = foundry.data.fields;

export const Settings = {
  sheetSize: {
    config: true,
    scope: "client",
    key: "sheetSize",
    type: Number,
    default: 100,
    range: {
      min: 50,
      max: 100,
      step: 5,
    },
    requiresReload: true,
    name: "AFF.Settings.sheetSize.label",
    hint: "AFF.Settings.sheetSize.hint"
  },
  minorMagicSkill: {
    config: true,
    scope: 'world',
    key: "minorMagicSkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.minorMagicSkill.label",
    hint: "AFF.Settings.minorMagicSkill.hint"
  },
  wizardrySkill: {
    config: true,
    scope: 'world',
    key: "wizardrySkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.wizardrySkill.label",
    hint: "AFF.Settings.wizardrySkill.hint"
  },
  sorcerySkill: {
    config: true,
    scope: 'world',
    key: "sorcerySkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.sorcerySkill.label",
    hint: "AFF.Settings.sorcerySkill.hint"
  },
  priestSkill: {
    config: true,
    scope: 'world',
    key: "priestSkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.priestSkill.label",
    hint: "AFF.Settings.priestSkill.hint"
  },
  strengthSkill: {
    config: true,
    scope: 'world',
    key: "strengthSkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.strengthSkill.label",
    hint: "AFF.Settings.strengthSkill.hint"
  },
  armourSkill: {
    config: true,
    scope: 'world',
    key: "armourSkill",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.armourSkill.label",
    hint: "AFF.Settings.armourSkill.hint"
  },
  armourDifference: {
    config: true,
    scope: 'world',
    key: "armourDifference",
    type: Number,
    default: 0,
    name: "AFF.Settings.armourDifference.label",
    hint: "AFF.Settings.armourDifference.hint"
  },
  fumbleTable: {
    config: true,
    scope: 'world',
    key: "fumbleTable",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.fumbleTable.label",
    hint: "AFF.Settings.fumbleTable.hint"
  },
  oopsTable: {
    config: true,
    scope: 'world',
    key: "oopsTable",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.oopsTable.label",
    hint: "AFF.Settings.oopsTable.hint"
  },
  criticalTable: {
    config: true,
    scope: 'world',
    key: "criticalTable",
    type: String, // fields.DocumentUUIDField,
    name: "AFF.Settings.criticalTable.label",
    hint: "AFF.Settings.criticalTable.hint"
  },
};
