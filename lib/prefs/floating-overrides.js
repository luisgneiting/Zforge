// Pure, GTK-free helpers for manipulating window override lists.
// Kept separate from floating.js so the logic is unit-testable without GTK/Adw.

/**
 * Structural identity of a window override. We match on the full identifying
 * tuple rather than object reference because ConfigManager.windowProps re-parses
 * windows.json on every read — the override captured when a row was built is a
 * different instance than the one read back at removal time, so reference
 * equality would match nothing. Matching wmClass alone (the old bug)
 * over-matched and deleted same-class siblings and invisible tile rules.
 *
 * @param {object} a
 * @param {object} b
 * @returns {boolean} true when a and b are the same override rule
 */
export function sameOverride(a, b) {
  return (
    (a.wmClass ?? null) === (b.wmClass ?? null) &&
    (a.wmTitle ?? null) === (b.wmTitle ?? null) &&
    (a.mode ?? null) === (b.mode ?? null) &&
    (a.wmId ?? null) === (b.wmId ?? null)
  );
}

/**
 * Remove a single override from the list by structural identity.
 *
 * Siblings that share the same wmClass — e.g. two float rules with different
 * wmTitle, or a tile rule of the same class — are preserved.
 *
 * @param {Array<object>} overrides - the current overrides
 * @param {object} target - the override to remove (matched structurally)
 * @returns {Array<object>} a new array without the matching override(s)
 */
export function removeOverride(overrides, target) {
  return overrides.filter((o) => !sameOverride(o, target));
}

/**
 * True when an structurally identical override is already in the list.
 *
 * removeOverride removes every matching rule by design (that keeps same-class
 * siblings safe), so a duplicate would make trashing either row delete both
 * while the other stayed on screen. The list must never hold duplicates.
 *
 * @param {Array<object>} overrides - the current overrides
 * @param {object} candidate - the override about to be added
 * @returns {boolean}
 */
export function hasOverride(overrides, candidate) {
  return overrides.some((o) => sameOverride(o, candidate));
}

/**
 * Filter to float-mode overrides and sort them for display.
 *
 * Sorted by wmClass (the row subtitle), falling back to wmTitle and then to an
 * empty string, since a title-only rule has no wmClass.
 *
 * @param {Array<object>} overrides - all overrides (mixed modes)
 * @returns {Array<object>} float overrides sorted by display key
 */
export function sortFloatOverrides(overrides) {
  return overrides
    .filter((o) => o.mode === "float")
    .sort((a, b) => {
      const aKey = a.wmClass ?? a.wmTitle ?? "";
      const bKey = b.wmClass ?? b.wmTitle ?? "";
      return aKey.localeCompare(bKey);
    });
}

/**
 * Subtitle text for a float-override row. The subtitle shows the matched
 * wmClass; a classless title-only rule has none, which rendered as
 * a blank subtitle. Fall back to a caller-supplied (translated) label so the
 * row reads as intentional. The label is passed in to keep this module free of
 * GTK/gettext imports and unit-testable.
 *
 * @param {object} override
 * @param {string} titleOnlyLabel - shown when the override has no wmClass
 * @returns {string}
 */
export function floatRowSubtitle(override, titleOnlyLabel) {
  return override.wmClass ?? titleOnlyLabel;
}
