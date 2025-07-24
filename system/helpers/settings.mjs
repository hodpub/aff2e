import { AFF } from "../config/_aff.mjs";

export function registerSettings() {
  for (let k of Object.keys(AFF.Settings)) {
    game.settings.register(AFF.ID, k, AFF.Settings[k]);
  }
}