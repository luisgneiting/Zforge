import GObject from "gi://GObject";

import St from "gi://St";

import { ThemeManagerBase } from "../shared/theme.js";
import { Logger } from "../shared/logger.js";
import { production } from "../shared/settings.js";

export class ExtensionThemeManager extends ThemeManagerBase {
  static {
    GObject.registerClass(this);
  }

  /**
   * @param {import("../../extension.js").default} extension
   */
  constructor(extension) {
    super(extension);
    this.metadata = extension.metadata;
  }

  reloadStylesheet() {
    const uuid = this.metadata.uuid;
    const defaultStylesheetFile = this.configMgr.defaultStylesheetFile;
    // The profile stylesheet is null when the file is absent and
    // seeding fails (read-only $HOME, root-owned ~/.config/zforge, disk full).
    // unload_stylesheet/load_stylesheet take a non-nullable GFile, and a throw
    // after the default was unloaded would leave no stylesheet at all. Fall back
    // to the bundled default, mirroring ThemeManagerBase._getStylesheetFile().
    const stylesheetFile = this.configMgr.stylesheetFile ?? defaultStylesheetFile;
    let theme = St.ThemeContext.get_for_stage(
      /** @type {import('gi://Clutter').default.Stage} */ (global.stage)
    ).get_theme();

    try {
      if (defaultStylesheetFile) theme.unload_stylesheet(defaultStylesheetFile);
      if (stylesheetFile && stylesheetFile !== defaultStylesheetFile) {
        theme.unload_stylesheet(stylesheetFile);
      }
      if (production && stylesheetFile) {
        theme.load_stylesheet(stylesheetFile);
        this.stylesheet = stylesheetFile;
      } else if (defaultStylesheetFile) {
        theme.load_stylesheet(defaultStylesheetFile);
        this.stylesheet = defaultStylesheetFile;
      }
    } catch (e) {
      Logger.error(`${uuid} - ${e}`);
      return;
    }
  }

  /**
   * Unload the stylesheet that reloadStylesheet() loaded, so disable() doesn't
   * leak theme state.
   */
  unloadStylesheet() {
    if (!this.stylesheet) return;
    const uuid = this.metadata.uuid;
    try {
      let theme = St.ThemeContext.get_for_stage(
        /** @type {import('gi://Clutter').default.Stage} */ (global.stage)
      ).get_theme();
      theme.unload_stylesheet(this.stylesheet);
      this.stylesheet = null;
    } catch (e) {
      Logger.error(`${uuid} - ${e}`);
    }
  }
}
