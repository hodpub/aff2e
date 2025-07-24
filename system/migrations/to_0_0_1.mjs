export async function migrateTo_0_0_1() {
  const invalidArmours = new Set();
  for (let item of game.items.invalidDocumentIds) {
    invalidArmours.add(game.items.getInvalid(item));
  }

  for (let actor of game.actors.contents) {
    for (let item of actor.items.invalidDocumentIds)
      invalidArmours.add(actor.items.getInvalid(item));
  }

  invalidArmours.forEach(async element => {
    if (element.type !== "armor")
      return;
    await element.update({ "type": "armour", "system": element.system, "img": "modules/aff2e-core/assets/icons/armour.svg" }, { recursive: false });
  });


}