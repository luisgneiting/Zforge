import { describe, it, expect, vi, afterEach } from "vitest";
import GLib from "gi://GLib";
import { replaceFileContents } from "../../lib/shared/settings.js";
import { File } from "../mocks/gnome/Gio.js";

/**
 * forge-ext/forge#587 (forge-ext/forge#415): Gio.File.replace_contents() renames
 * a partly written file over the original when a write fails (ENOSPC on a full
 * disk), so closing a window with the disk full emptied windows.json, and the
 * next login failed. Saves now go through GLib.file_set_contents(), which
 * drops its temporary file on failure and leaves the original in place.
 */
describe("forge-ext/forge#587: config files are saved atomically", () => {
  afterEach(() => vi.restoreAllMocks());

  it("writes a local file with GLib.file_set_contents, not replace_contents", () => {
    const file = new File("/home/u/.config/zforge/config/windows.json");
    const replace = vi.spyOn(file, "replace_contents");
    const set = vi.spyOn(GLib, "file_set_contents").mockReturnValue(true);
    const bytes = new TextEncoder().encode("{}");

    replaceFileContents(file, bytes);

    expect(set).toHaveBeenCalledWith("/home/u/.config/zforge/config/windows.json", bytes);
    expect(replace).not.toHaveBeenCalled();
  });

  it("lets a failed write throw, as before", () => {
    const file = new File("/full/windows.json");
    vi.spyOn(GLib, "file_set_contents").mockImplementation(() => {
      throw new Error("No space left on device");
    });
    expect(() => replaceFileContents(file, new Uint8Array())).toThrow("No space left");
  });

  it("falls back to replace_contents for a file without a local path", () => {
    const file = new File("/x");
    file.get_path = () => null;
    const replace = vi.spyOn(file, "replace_contents");
    const set = vi.spyOn(GLib, "file_set_contents");

    replaceFileContents(file, new Uint8Array());

    expect(replace).toHaveBeenCalledOnce();
    expect(set).not.toHaveBeenCalled();
  });
});
