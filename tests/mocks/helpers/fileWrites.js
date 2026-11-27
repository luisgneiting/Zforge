import { vi } from "vitest";
import GLib from "gi://GLib";

// Files routed so far, the latest first (several mock files can be alive at once)
let routed = [];

/**
 * Config files are saved with GLib.file_set_contents(path, contents)
 * (replaceFileContents in lib/shared/settings.js, forge-ext/forge#587). Route
 * those writes to the mock Gio.File with that path, so a test can still stub
 * or inspect `file.replace_contents` (its first argument is the contents). A
 * write the file reports as failed ([false, ...]) throws, like the real call.
 * Each call adds to the files already routed.
 * @param {...any} files mock Gio.File objects
 * @returns the spy on GLib.file_set_contents
 */
export function routeFileWrites(...files) {
  routed = [...files, ...routed].slice(0, 64);
  return vi.spyOn(GLib, "file_set_contents").mockImplementation((path, contents) => {
    const file = routed.find((f) => f.get_path() === path);
    if (!file) return true;
    const result = file.replace_contents(contents, null, false, 0, null);
    if (Array.isArray(result) && result[0] === false) throw new Error(`could not write ${path}`);
    return true;
  });
}
