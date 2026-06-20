export async function migrateTo_1_9_0() {


  const updateSkills = new Set();

  for (let actor of game.actors.contents) {
    for (let item of actor.items.filter(x => x.type == "specialSkill")) {
      if (["knowledge", "magical"].indexOf(item.system.category) == -1 ||
        item.rollCharacteristic == "skill")
        continue;

      updateSkills.add(item);
    }
  }

  CONFIG.AFF.disableSkillMaxLevelValidation = true;
  for (const element of updateSkills) {
    await element.update({
      "system.physicalSkill": false
    });
  }
  delete CONFIG.AFF.disableSkillMaxLevelValidation;
}