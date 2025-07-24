import * as migrations from "./_migrations.mjs";

const migrationList = {
  "0.0.1": migrations.migrateTo_0_0_1,
}

export function registerMigrationSettings() {
  game.settings.register("aff2e", "systemMigrationVersion", {
    config: false,
    scope: "world",
    type: String,
    default: ""
  });
}

export async function migrate() {
  if (!game.user.isGM)
    return;

  const currentVersion = game.settings.get("aff2e", "systemMigrationVersion");
  console.log("Aff2e Data CurrentVersion", currentVersion);

  let latestMigration = undefined;
  for (const key of Object.keys(migrationList)) {
    if (currentVersion && !foundry.utils.isNewerVersion(key, currentVersion))
      continue;

    ui.notifications.warn(`Migrating your data to version ${key}. Please, wait until it finishes.`);
    await migrationList[key]();
    ui.notifications.info(`Data migrated to version ${key}.`, { permanent: true });
    latestMigration = key;
  }
  if (latestMigration)
    game.settings.set("aff2e", "systemMigrationVersion", latestMigration);
}
