/*
 * This file is part of the Forge extension for GNOME
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

// Gnome imports
import Gio from "gi://Gio";
import GLib from "gi://GLib";
import GObject from "gi://GObject";

// Application imports
import { stringify, parse } from "../css/index.js";
import { production, PERMISSIONS_MODE } from "./settings.js";
import { Logger } from "./logger.js";

export class ThemeManagerBase extends GObject.Object {
  static {
    GObject.registerClass(this);
  }

  constructor({ configMgr, settings }) {
    super();
    this.configMgr = configMgr;
    this.settings = settings;
    this._importCss();
    this.defaultPalette = this.getDefaultPalette();

    // CSS version tag - increment when default stylesheet changes require user config update.
    this.cssTag = 38;

    // patchCss() is intentionally not called in constructor - it's triggered
    // by settings changes or explicitly called when CSS updates are detected.
  }

  /**
   * @param {number | string} value
   */
  addPx(value) {
    return `${value}px`;
  }

  /**
   * @param {string} value
   */
  removePx(value) {
    // A user stylesheet missing a rule yields undefined here (getCssProperty
    // returns {}); guard so getDefaults() doesn't throw and abort enable().
    return typeof value === "string" ? value.replace("px", "") : value;
  }

  getDefaultPalette() {
    return {
      tiled: this.getDefaults("tiled"),
      split: this.getDefaults("split"),
      floated: this.getDefaults("floated"),
      stacked: this.getDefaults("stacked"),
      tabbed: this.getDefaults("tabbed"),
    };
  }

  /**
   * The scheme name is in between the CSS selector name
   * E.g. window-tiled-color should return `tiled`
   * @param {string} selector
   */
  getColorSchemeBySelector(selector) {
    const parts = selector.split("-");
    return parts.length >= 3 ? parts[1] : null;
  }

  /**
   * @param {string} color
   */
  getDefaults(color) {
    return {
      color: this.getCssProperty(`.${color}`, "color").value,
      "border-width": this.removePx(this.getCssProperty(`.${color}`, "border-width").value),
      opacity: this.getCssProperty(`.${color}`, "opacity").value,
    };
  }

  /**
   * @param {any} selector
   */
  getCssRule(selector) {
    if (this.cssAst) {
      const rules = this.cssAst.stylesheet.rules;
      // return only the first match, Forge CSS authors should make sure class names are unique :)
      const matchRules = rules.filter(
        (r) => r.selectors && r.selectors.filter((s) => s === selector).length > 0
      );
      return matchRules.length > 0 ? matchRules[0] : {};
    }
    return {};
  }

  /**
   * @param {string} selector
   * @param {string} propertyName
   */
  getCssProperty(selector, propertyName) {
    const cssRule = this.getCssRule(selector);

    // Check both cssRule and declarations exist (#448)
    if (cssRule && cssRule.declarations) {
      const matchDeclarations = cssRule.declarations.filter((d) => d.property === propertyName);
      return matchDeclarations.length > 0 ? matchDeclarations[0] : {};
    }

    return {};
  }

  /**
   * @param {string} selector
   * @param {string} propertyName
   * @param {string} propertyValue
   */
  setCssProperty(selector, propertyName, propertyValue) {
    const cssProperty = this.getCssProperty(selector, propertyName);
    // Bug #312 fix: Check for valid property (not empty object from getCssProperty)
    if (cssProperty && cssProperty.value !== undefined) {
      // Idempotent: if the stylesheet already holds this value, do not rewrite it
      // or bump css-updated. Lets the once-on-init reconciliation be a
      // no-op when consistent, so opening prefs does not spam stylesheet reloads.
      if (cssProperty.value === propertyValue) {
        return true;
      }
      // _updateCss() swallows a write failure, so
      // without a rollback the AST diverged from disk — and the short-circuit
      // above then made the user's retry of the SAME value a silent no-op.
      const previousValue = cssProperty.value;
      cssProperty.value = propertyValue;
      if (!this._updateCss()) {
        cssProperty.value = previousValue;
        return false;
      }
      return true;
    }
    return false;
  }

  _getStylesheetFile() {
    let cssFile = this.configMgr.stylesheetFile;
    if (!cssFile || !production) {
      cssFile = this.configMgr.defaultStylesheetFile;
    }
    return cssFile;
  }

  /**
   * Returns the AST for stylesheet.css
   */
  _importCss() {
    let cssFile = this._getStylesheetFile();

    let success, contents;
    try {
      [success, contents] = cssFile.load_contents(null);
    } catch (e) {
      // load_contents THROWS GError on EACCES/EIO (e.g. an unreadable
      // root-owned user stylesheet — query_exists() only needs dir perms), which
      // would abort enable(). Fall back to the default.
      Logger.error(`Failed to read stylesheet, falling back to default: ${e}`);
      this._importDefaultCss();
      return;
    }
    if (!success) return;

    const cssContents = new TextDecoder().decode(contents);
    // Parse in silent mode so a malformed USER stylesheet collects errors and
    // returns a partial AST instead of throwing out of enable().
    try {
      this.cssAst = parse(cssContents, { silent: true });
    } catch (e) {
      Logger.error(`Failed to parse stylesheet, falling back to default: ${e}`);
      this._importDefaultCss();
    }
    this._completeUserCss(cssFile);
  }

  /**
   * The user's stylesheet can be empty, from an older version or edited by hand.
   * Take the rules and properties it lacks from the default stylesheet, so that
   * every colour and width has a value (forge-ext/forge#448); one that can't be
   * parsed is replaced by the default. Either way it is saved completed, after
   * copying the user's file to stylesheet.css.bak (forge-ext/forge#583).
   * @param {Gio.File} cssFile
   */
  _completeUserCss(cssFile) {
    const defaultFile = this.configMgr.defaultStylesheetFile;
    if (!defaultFile || !cssFile || cssFile.get_path() === defaultFile.get_path()) return;
    let defaultAst;
    try {
      const [ok, contents] = defaultFile.load_contents(null);
      if (!ok) return;
      defaultAst = parse(new TextDecoder().decode(contents), { silent: true });
    } catch (e) {
      Logger.error(`Failed to load default stylesheet: ${e}`);
      return;
    }

    let completed = false;
    if (!this.cssAst || (this.cssAst.stylesheet?.parsingErrors?.length ?? 0) > 0) {
      this.cssAst = defaultAst;
      completed = true;
    } else {
      const rules = this.cssAst.stylesheet.rules;
      for (const defaultRule of defaultAst.stylesheet.rules) {
        if (!defaultRule.selectors) continue;
        const rule = rules.find((r) => r.selectors?.includes(defaultRule.selectors[0]));
        if (!rule) {
          rules.push(defaultRule);
          completed = true;
          continue;
        }
        rule.declarations ??= [];
        for (const declaration of defaultRule.declarations ?? []) {
          if (declaration.type !== "declaration") continue;
          if (!rule.declarations.some((d) => d.property === declaration.property)) {
            rule.declarations.push(declaration);
            completed = true;
          }
        }
      }
    }
    if (!completed) return;
    try {
      this._copyFile(cssFile, Gio.File.new_for_path(`${cssFile.get_path()}.bak`));
      this._ensureWritable(cssFile);
      cssFile.replace_contents(
        new TextEncoder().encode(stringify(this.cssAst)),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );
      Logger.warn(
        `theme: completed the stylesheet ${cssFile.get_path()} (the previous one is .bak)`
      );
    } catch (e) {
      Logger.error(`theme: could not save the completed stylesheet ${cssFile.get_path()}: ${e}`);
    }
  }

  /**
   * Copies `source` over `target`. The copy gets the usual permissions of a new
   * file, not those of `source`: the extension's own files can be read-only (e.g.
   * on NixOS), and a read-only copy couldn't be overwritten at the next update
   * (#266, #312). A read-only copy left by an earlier version is replaced.
   * Throws like Gio.File.copy().
   * @param {Gio.File} source
   * @param {Gio.File} target
   */
  _copyFile(source, target) {
    const flags = Gio.FileCopyFlags.OVERWRITE | Gio.FileCopyFlags.TARGET_DEFAULT_PERMS;
    try {
      return source.copy(target, flags, null, null);
    } catch (e) {
      // Only a target that exists and is read-only, not a source that can't be read
      const readOnlyTarget =
        e.matches?.(Gio.IOErrorEnum, Gio.IOErrorEnum.PERMISSION_DENIED) &&
        target.query_exists(null) &&
        !target
          .query_info("access::can-write", Gio.FileQueryInfoFlags.NONE, null)
          .get_attribute_boolean("access::can-write");
      if (!readOnlyTarget) throw e;
      target.delete(null);
      return source.copy(target, flags, null, null);
    }
  }

  /** load+parse the bundled default stylesheet, guarding
   * the read (load_contents can throw a GError) so the fallback can't itself
   * escape the constructor. */
  _importDefaultCss() {
    const def = this.configMgr.defaultStylesheetFile; // getter can return null
    if (!def) return;
    try {
      const [ok, defContents] = def.load_contents(null);
      if (ok) this.cssAst = parse(new TextDecoder().decode(defContents), { silent: true });
    } catch (e) {
      Logger.error(`Failed to load default stylesheet: ${e}`);
    }
  }

  /**
   * Ensures a stylesheet file is user-writable. Gio.copy() preserves the source's
   * permission mode, so a config stylesheet copied from the read-only install dir
   * (~0444) would otherwise reject replace_contents() silently and colors would never
   * persist. Bug #312. Only succeeds for files the user owns (always true
   * under ~/.config), so it is safe to call defensively before every write.
   * @param {Gio.File} file
   */
  _ensureWritable(file) {
    try {
      file.set_attribute_uint32("unix::mode", 0o644, Gio.FileQueryInfoFlags.NONE, null);
    } catch (e) {
      Logger.error(`theme: could not make ${file.get_path?.()} writable: ${e}`);
    }
  }

  /**
   * Writes the AST back to stylesheet.css and reloads the theme.
   *
   * @returns {boolean} true when the stylesheet was written to disk.
   */
  _updateCss() {
    if (!this.cssAst) {
      return false;
    }

    // A partial parse (a stray '}' truncates the rule list) round-trips
    // to a stylesheet missing everything after the error, and this write would
    // destroy the user's file — patchCss()'s .bak only exists on a cssTag bump, so
    // there is nothing to recover from. Refuse rather than overwrite.
    const parsingErrors = this.cssAst.stylesheet?.parsingErrors ?? [];
    if (parsingErrors.length > 0) {
      Logger.error(
        `theme: refusing to write an unparseable stylesheet (${parsingErrors.length} error(s)): ${parsingErrors[0]}`
      );
      return false;
    }

    let cssFile = this._getStylesheetFile();

    const cssContents = stringify(this.cssAst);

    // Mkdir failure was a silent no-op (the color change vanished
    // with no trace) — log and bail instead.
    if (GLib.mkdir_with_parents(cssFile.get_parent().get_path(), PERMISSIONS_MODE) !== 0) {
      Logger.error(`theme: could not create stylesheet dir ${cssFile.get_parent().get_path?.()}`);
      return false;
    }
    this._ensureWritable(cssFile);
    // GJS replace_contents THROWS a GError on failure (it does not return
    // success=false), e.g. on a root-owned stylesheet; without the guard the
    // change would be lost inside the prefs GTK handler.
    try {
      cssFile.replace_contents(
        new TextEncoder().encode(cssContents),
        null,
        false,
        Gio.FileCreateFlags.REPLACE_DESTINATION,
        null
      );
      this.reloadStylesheet();
      return true;
    } catch (e) {
      Logger.error(`theme: failed to write stylesheet ${cssFile.get_path?.()}: ${e}`);
      return false;
    }
  }

  /**
   * Patches the CSS by overriding the $HOME/.config stylesheet.
   * Creates a backup of the existing config before overwriting.
   *
   * Note: Currently overwrites user customizations when defaults update.
   * Future improvements could merge changes to preserve user modifications.
   * A backup (.bak) is created to allow manual recovery of custom styles.
   */
  patchCss() {
    if (this._needUpdate()) {
      let originalCss = this.configMgr.defaultStylesheetFile;
      let configCss = this.configMgr.stylesheetFile;
      // stylesheetFile is null when the profile stylesheet doesn't
      // exist and seeding fails (e.g. ~/.config/zforge is read-only). Bail out as
      // a no-op so enable() proceeds and tiling starts; css-last-update stays
      // unwritten so this retries on a future launch once the dir is writable.
      if (!configCss) return false;
      // Fix undefined.bak bug (#266) - get path from File object
      let copyConfigCss = Gio.File.new_for_path(configCss.get_path() + ".bak");
      try {
        // Gio.File.copy THROWS a GError (it does not return false) when
        // the stylesheet dir is unwritable — e.g. a root-owned
        // ~/.config/zforge/stylesheet/forge after a sudo mishap, with stylesheet.css
        // already present so the null guard above does not fire. Unguarded it
        // would propagate out of patchCss() in enable(), leaving the extension
        // half-initialized (no tiling, no keybindings) on
        // every launch — css-last-update is only written on success, so it never
        // converged. Mirror the _updateCss hardening: swallow the failure and bail
        // as a no-op so tiling still comes up; retry once the dir is writable.
        // Both copies get writable permissions, and a read-only stylesheet or
        // backup left by an earlier version is replaced (_copyFile)
        this._copyFile(configCss, copyConfigCss);
        this._copyFile(originalCss, configCss);
      } catch (e) {
        Logger.error(`theme: patchCss failed to copy stylesheet: ${e}`);
        return false;
      }
      this.settings.set_uint("css-last-update", this.cssTag);
      return true;
    }
    return false;
  }

  /**
   * Credits: ExtensionSystem.js:_callExtensionEnable()
   */
  reloadStylesheet() {
    throw new Error("Must implement reloadStylesheet");
  }

  _needUpdate() {
    let cssTag = this.cssTag;
    // `<`, not `!==`. patchCss() overwrites stylesheet.css.bak with the
    // CURRENT default before installing it, and .bak is the only copy of the user's
    // customizations. With `!==` a DOWNGRADE (stored 38, cssTag 37) also fired, so
    // installing an older Forge after an upgrade replaced the user's saved CSS with
    // the newer default — destroying it permanently. Only a forward tag bump should
    // re-patch; an older build leaves the newer stylesheet alone.
    return this.settings.get_uint("css-last-update") < cssTag;
  }
}
