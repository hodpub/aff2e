import { toPriceInfo } from "./trade.mjs";

export default function registerHandlerbarsHelpers() {
  Handlebars.registerHelper({
    priceInfo,
    percentage,
    isInList
  });
}

export function priceInfo(field, options) {
  foundry.helpers.Localization.localizeSchema(field);
  const allValues = options.hash.value;
  const result = [];

  for (const [fieldName, fieldConfig] of Object.entries(field.fields)) {
    const value = allValues[fieldName] ?? 0;
    const priceValues = toPriceInfo(value);
    const fieldPath = fieldConfig.fieldPath.replace("price", "priceInfo");
    result.push(`<div class="form-group">
    <label>${fieldConfig.label}</label>
    <div class="form-fields priceInfo">
      <input class="small" type="number" name="${fieldPath}.gp" value="${priceValues.gp}" min="0" step="1">
      <span class="units">${game.i18n.localize("AFF.Item.base.FIELDS.price.gp")}</span>
      <input class="small" type="number" name="${fieldPath}.sp" value="${priceValues.sp}" min="0" step="1">
      <span class="units">${game.i18n.localize("AFF.Item.base.FIELDS.price.sp")}</span>
    </div></div>`);
  }

  return new Handlebars.SafeString(result.join(""));
}

export function percentage(current, max) {
  if (current == 0)
    return 0;
  if (max == 0)
    return 100;

  return Math.min(100, Math.round(current / max * 100));
}

export function isInList(value, list) {
  if (!Array.isArray(list)) {
    throw new Error("isInList helper requires a list as the second argument");
  }
  return list.includes(value);
}