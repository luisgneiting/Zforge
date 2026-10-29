import { describe, it, expect, vi } from "vitest";
import {
  IMPORTED_KEY,
  LEGACY_KBD_SCHEMA,
  LEGACY_SCHEMA,
  copyUserValues,
  importLegacyForge,
} from "../../../lib/shared/legacy-forge.js";

// A GVariant as far as the import looks at it
const variant = (type, value) => ({ get_type_string: () => type, value });

// A schema holding `types` (key -> GVariant type string)
const schema = (types) => ({
  list_keys: () => Object.keys(types),
  has_key: (key) => key in types,
  get_key: (key) => ({ get_value_type: () => ({ dup_string: () => types[key] }) }),
});

// Settings with a schema, the values the user changed, and a record of writes
function settings(types, userValues = {}) {
  const written = {};
  return {
    written,
    settings_schema: schema(types),
    get_user_value: (key) => userValues[key] ?? null,
    set_value: (key, value) => (written[key] = value),
    get_boolean: (key) => written[key]?.value ?? false,
    set_boolean: (key, value) => (written[key] = variant("b", value)),
  };
}

describe("copyUserValues()", () => {
  it("copies only what the user changed, into keys of the same type", () => {
    const old = settings(
      { "window-gap-size": "u", "auto-split-enabled": "b", "old-only": "s", retyped: "s" },
      {
        "window-gap-size": variant("u", 8),
        "old-only": variant("s", "x"),
        retyped: variant("s", "y"),
      }
    );
    const target = settings({ "window-gap-size": "u", "auto-split-enabled": "b", retyped: "b" });

    expect(copyUserValues(old, target)).toBe(1);
    expect(Object.keys(target.written)).toEqual(["window-gap-size"]);
    expect(target.written["window-gap-size"].value).toBe(8);
  });
});

describe("importLegacyForge()", () => {
  const confDir = "/home/test/.config/zforge";

  it("copies Forge's settings and shortcuts once", () => {
    const zforge = settings({ [IMPORTED_KEY]: "b", "window-gap-size": "u" });
    const kbd = settings({ "window-toggle-float": "as" });
    const legacy = {
      [LEGACY_SCHEMA]: settings(
        { "window-gap-size": "u" },
        { "window-gap-size": variant("u", 12) }
      ),
      [LEGACY_KBD_SCHEMA]: settings(
        { "window-toggle-float": "as" },
        { "window-toggle-float": variant("as", ["<Super>c"]) }
      ),
    };
    const args = {
      settings: zforge,
      kbdSettings: kbd,
      confDir,
      lookupSchema: (id) => id,
      makeSettings: (id) => legacy[id],
      copyDir: vi.fn(),
    };

    importLegacyForge(args);

    expect(zforge.written["window-gap-size"].value).toBe(12);
    expect(kbd.written["window-toggle-float"].value).toEqual(["<Super>c"]);
    expect(zforge.get_boolean(IMPORTED_KEY)).toBe(true);

    // A second run, after the user changed it in Zforge, leaves it alone
    zforge.written["window-gap-size"] = variant("u", 3);
    importLegacyForge(args);
    expect(zforge.written["window-gap-size"].value).toBe(3);
  });

  it("marks the import done when Forge was never installed", () => {
    const zforge = settings({ [IMPORTED_KEY]: "b" });

    importLegacyForge({
      settings: zforge,
      kbdSettings: settings({}),
      confDir,
      lookupSchema: () => null,
      copyDir: vi.fn(),
    });

    expect(zforge.get_boolean(IMPORTED_KEY)).toBe(true);
  });
});
