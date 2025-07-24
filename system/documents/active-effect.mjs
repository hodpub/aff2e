export default class AffActiveEffect extends foundry.documents.ActiveEffect {
  get isSuppressed() {
    const parent = this.parent;
    if (!("equipped" in parent.system))
      return super.isSuppressed;
    const baseSuppressed = super.isSuppressed;
    return baseSuppressed || !parent.system.equipped;
  }
}