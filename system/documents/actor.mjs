/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class AffActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data that isn't
   * handled by the actor's DataModel. Data calculated in this step should be
   * available both inside and outside of character sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const flags = actorData.flags.aff2e || {};
  }

  /**
   *
   * @override
   * Augment the actor's default getRollData() method by appending the data object
   * generated by the its DataModel's getRollData(), or null. This polymorphic
   * approach is useful when you have actors & items that share a parent Document,
   * but have slightly different data preparation needs.
   */
  getRollData() {
    return { ...super.getRollData(), ...(this.system.getRollData?.() ?? null) };
  }

  _replaceTokenImgIfDefault(img) {
    return this.prototypeToken.texture.src == "icons/svg/mystery-man.svg" ? img : this.prototypeToken.texture.src;
  }

  _replaceImgIfDefault(img) {
    return this.img == "icons/svg/mystery-man.svg" ? img : this.img;
  }

  async _preCreate(data, options, user) {
    const allowed = await super._preCreate(data, options, user)
    if (allowed === false) return false;

    switch (data.type) {
      case "character":
        const characterImg = this._replaceImgIfDefault("systems/aff2e/assets/icons/hero.svg");
        const characterTokenImg = this._replaceTokenImgIfDefault("systems/aff2e/assets/icons/hero.svg");
        this.updateSource({
          img: characterImg,
          prototypeToken: {
            actorLink: true,
            disposition: 0,
            sight: {
              enabled: true
            },
            texture: {
              src: characterTokenImg,
            }
          }
        });
        break;
      case "npc":
        const npcImg = this._replaceImgIfDefault("systems/aff2e/assets/icons/npc.svg");
        const npcTokenImg = this._replaceTokenImgIfDefault("systems/aff2e/assets/icons/npc.svg");
        this.updateSource({
          img: npcImg,
          prototypeToken: {
            actorLink: false,
            disposition: -1,
            sight: {
              enabled: true
            },
            texture: {
              src: npcTokenImg,
            }
          }
        });
        break;
      case "antiHero":
        const antiHeroImg = this._replaceImgIfDefault("systems/aff2e/assets/icons/antiHero.svg");
        const antiHeroTokenImg = this._replaceTokenImgIfDefault("systems/aff2e/assets/icons/antiHero.svg");
        this.updateSource({
          img: antiHeroImg,
          prototypeToken: {
            actorLink: true,
            disposition: -1,
            sight: {
              enabled: true
            },
            texture: {
              src: antiHeroTokenImg,
            }
          }
        });
        break;
    }
  }
}
