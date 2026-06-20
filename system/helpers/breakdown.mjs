export class BreakdownHelper {
  static init(breakdown, physical = true) {
    const clean = this.clean(breakdown);
    if (!physical)
      delete clean[game.i18n.localize("AFF.Item.Armour.ERRORS.armourUnproficient")];
    const bonus = this.getBonus(clean);
    return [clean, bonus];
  }

  static clean(breakdown) {
    return Object
      .keys(breakdown)
      .filter(key => breakdown[key] !== 0 && !isNaN(breakdown[key]))
      .reduce((newObj, key) => {
        newObj[key] = breakdown[key];
        return newObj;
      }, {})
  }

  static getBonus(breakdown) {
    return Object.values(breakdown).reduce((sum, value) => sum + parseInt(value), 0);
  }
}
