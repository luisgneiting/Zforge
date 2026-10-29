/*
 * This file is part of the Zforge extension for GNOME
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

// Zforge has its own UUID, settings and config directory, so it can sit next to
// Forge on extensions.gnome.org. The first time it runs it takes over what the
// user had set in Forge: every changed setting and shortcut, and the files in
// ~/.config/forge (window rules, stylesheet). Forge's schema is read from the
// system or from Forge's own extension folder; if Forge was never installed
// there is nothing to take.

import Gio from "gi://Gio";
import GLib from "gi://GLib";

import { Logger } from "./logger.js";

export const LEGACY_UUID = "forge@jmmaranan.com";
export const LEGACY_SCHEMA = "org.gnome.shell.extensions.forge";
export const LEGACY_KBD_SCHEMA = "org.gnome.shell.extensions.forge.keybindings";

/** Set once the import has run, found anything or not */
export const IMPORTED_KEY = "legacy-forge-imported";

/**
 * Copies every value the user changed in the old settings into the new ones,
 * when the new schema has that key with the same type. Defaults are left alone.
 * @returns {number} how many values were copied
 */
export function copyUserValues(oldSettings, newSettings) {
  const newSchema = newSettings.settings_schema;
  let copied = 0;
  for (const key of oldSettings.settings_schema.list_keys()) {
    const value = oldSettings.get_user_value(key);
    if (!value || !newSchema.has_key(key)) continue;
    if (newSchema.get_key(key).get_value_type().dup_string() !== value.get_type_string()) continue;
    newSettings.set_value(key, value);
    copied++;
  }
  return copied;
}

/** Forge's schema, installed system-wide or inside Forge's extension folder */
function lookupLegacySchema(id) {
  const defaultSource = Gio.SettingsSchemaSource.get_default();
  const found = defaultSource?.lookup(id, true);
  if (found) return found;
  for (const base of [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()]) {
    const dir = GLib.build_filenamev([base, "gnome-shell", "extensions", LEGACY_UUID, "schemas"]);
    if (!GLib.file_test(GLib.build_filenamev([dir, "gschemas.compiled"]), GLib.FileTest.EXISTS))
      continue;
    const schema = Gio.SettingsSchemaSource.new_from_directory(dir, defaultSource, false).lookup(
      id,
      false
    );
    if (schema) return schema;
  }
  return null;
}

/** Copies a directory tree; files already at the destination are kept */
function copyTree(from, to) {
  if (!to.query_exists(null)) to.make_directory_with_parents(null);
  const children = from.enumerate_children("standard::name,standard::type", 0, null);
  let info;
  while ((info = children.next_file(null))) {
    const source = from.get_child(info.get_name());
    const target = to.get_child(info.get_name());
    if (info.get_file_type() === Gio.FileType.DIRECTORY) copyTree(source, target);
    else if (!target.query_exists(null)) source.copy(target, Gio.FileCopyFlags.NONE, null, null);
  }
  children.close(null);
}

/**
 * Takes over the user's Forge settings and files, once.
 * @param {object} args
 * @param {Gio.Settings} args.settings Zforge's settings
 * @param {Gio.Settings} args.kbdSettings Zforge's shortcuts
 * @param {string} args.confDir Zforge's config directory
 * @param {(id: string) => any} [args.lookupSchema] finds Forge's schema (tests replace it)
 * @param {(schema: any) => any} [args.makeSettings] opens settings on that schema
 * @param {(from: Gio.File, to: Gio.File) => void} [args.copyDir] copies the config directory
 */
export function importLegacyForge({
  settings,
  kbdSettings,
  confDir,
  lookupSchema = lookupLegacySchema,
  makeSettings = (schema) => new Gio.Settings({ settingsSchema: schema }),
  copyDir = copyTree,
}) {
  if (settings.get_boolean(IMPORTED_KEY)) return;
  // Before anything can fail, so a broken Forge install is not retried at every login
  settings.set_boolean(IMPORTED_KEY, true);

  /** @type {[string, Gio.Settings][]} */
  const pairs = [
    [LEGACY_SCHEMA, settings],
    [LEGACY_KBD_SCHEMA, kbdSettings],
  ];
  for (const [id, target] of pairs) {
    try {
      const schema = lookupSchema(id);
      if (!schema) continue;
      const copied = copyUserValues(makeSettings(schema), target);
      Logger.info(`Imported ${copied} values from ${id}`);
    } catch (e) {
      Logger.warn(`Could not import ${id}: ${e}`);
    }
  }

  try {
    const legacyDir = Gio.File.new_for_path(
      GLib.build_filenamev([GLib.get_user_config_dir(), "forge"])
    );
    const newDir = Gio.File.new_for_path(confDir);
    if (legacyDir.query_exists(null) && !newDir.query_exists(null)) {
      copyDir(legacyDir, newDir);
      Logger.info(`Copied ${legacyDir.get_path()} to ${confDir}`);
    }
  } catch (e) {
    Logger.warn(`Could not copy the Forge config directory: ${e}`);
  }
}
