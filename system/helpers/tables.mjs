import { AFF } from "../config/_aff.mjs";

export default class AffTableHelper {
  constructor() {
    this.oopsInterceptors = [];
    this.fumbleInterceptors = [];
    this.criticalInterceptors = [];
    this.spellCriticalInterceptors = [];
  }
  addOopsInterceptor(interceptor) {
    this.oopsInterceptors.push(interceptor);
  }
  addFumbleInterceptor(interceptor) {
    this.fumbleInterceptors.push(interceptor);
  }
  addCriticalInterceptor(interceptor) {
    this.criticalInterceptors.push(interceptor);
  }
  addSpellCriticalInterceptor(interceptor) {
    this.spellCriticalInterceptors.push(interceptor);
  }

  async drawFumble(source) {
    return this._drawFromTable(this.fumbleInterceptors, AFF.Settings.fumbleTable.key, source);
  }

  async drawCritical(source) {
    return this._drawFromTable(this.criticalInterceptors, AFF.Settings.criticalTable.key, source);
  }

  async drawOops(source) {
    return this._drawFromTable(this.oopsInterceptors, AFF.Settings.oopsTable.key, source);
  }

  async drawSpellCritical(source){
    return this._drawFromTable(this.spellCriticalInterceptors, undefined, source);
  }

  async _drawFromTable(interceptors, tablekey, source) {
    let tableId;

    const sortedInterceptors = interceptors.sort((a, b) => a.priority - b.priority);
    for (const interceptor of sortedInterceptors) {
      const result = await interceptor.interceptor(source);
      if (result != undefined) {
        tableId = result; // If interceptor returns a tableId, use it instead of the one from settings.
        break; // Stop at the first interceptor that returns a tableId.
      }
    }

    if (!tableId && tablekey)
      tableId = game.settings.get(AFF.ID, tablekey);

    if (!tableId)
      return;

    const table = await fromUuid(tableId);
    if (!table)
      return;

    await table.draw(source);
  }
}