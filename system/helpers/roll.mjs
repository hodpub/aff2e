import AffRoll from "../documents/roll.mjs";

export function getWinner(attackRoll, defenseRoll) {
  if (attackRoll.rollResult == AffRoll.ROLL_RESULT.CRITICAL)
    return defenseRoll.rollResult != AffRoll.ROLL_RESULT.CRITICAL ? 1 : 2;

  if (defenseRoll.rollResult == AffRoll.ROLL_RESULT.CRITICAL)
    return -1;

  if (attackRoll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
    return defenseRoll.rollResult == AffRoll.ROLL_RESULT.FUMBLE ? 0 : -1;

  if (defenseRoll.rollResult == AffRoll.ROLL_RESULT.FUMBLE)
    return 1;

  if (attackRoll.total == defenseRoll.total)
    return 0;

  return attackRoll.total > defenseRoll.total ? 1 : -1;
}