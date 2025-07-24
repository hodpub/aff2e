import { AFF } from "../config/_aff.mjs";

export default class AffTableHelper {
  constructor() {
    this.fumbleExecutors = [];
    this.criticalExecutors = [];
  }
  addFumbleExecutor(executor) {
    this.fumbleExecutors.push(executor);
  }
  addCriticalExecutor(executor) {
    this.criticalExecutors.push(executor);
  }

  async drawFumble(source) {
    return this._drawFromTable(this.fumbleExecutors, AFF.Settings.fumbleTable.key, source);
  }

  async drawCritical(source) {
    return this._drawFromTable(this.criticalExecutors, AFF.Settings.criticalTable.key, source);
  }

  async _drawFromTable(executors, tablekey, source) {
    let tableId = game.settings.get(AFF.ID, tablekey);

    const sortedExecutors = executors.sort((a, b) => a.priority - b.priority);
    for (const executor of sortedExecutors) {
      const result = await executor.executor(source);
      if (result != undefined) {
        tableId = result; // If executor returns a tableId, use it instead of the one from settings.
        break; // Stop at the first executor that returns a tableId.
      }
    }

    if (!tableId)
      return;

    const table = await fromUuid(tableId);
    if (!table)
      return;

    await table.draw(source);
  }
}