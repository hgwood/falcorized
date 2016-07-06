const _ = require("lodash")

/**
 * Expands a compressed path set into the corresponding set of full paths.
 *
 * ["a", ["b", "c"], "d"] -> [["a", "b", "d"], ["a", "c", "d"]]
 */
function expand(pathSet) {
  if (_.isEmpty(pathSet)) return [[]]
  const [head, ...tail] = pathSet
  const headPathSegments = _.isArray(head) ? head : [head]
  return _.flatMap(headPathSegments, headPathSegment => {
    return _.map(expand(tail), pathSetTail => {
      return [headPathSegment, ...pathSetTail]
    })
  })
}

/**
 * Same as `expand` but preserves shortcut properties.
 *
 * {0: "a", 1: ["b", "c"], 2: "d", ids: ["b", "c"]} -> [
 *   {0: "a", 1: "b", 2: "d", ids: "b"},
 *   {0: "a", 1: "c", 2: "d", ids: "c"}
 * ]
 */
function expandPreservingShortcuts(pathSet) {
  const pathSetWithoutShortcuts = _.toArray(pathSet)
  const indicesOfShortcuts = _(pathSet)
    .omit("length")
    .pickBy((value, key) => isNaN(key))
    .mapValues(pathSegments => _.indexOf(pathSetWithoutShortcuts, pathSegments))
    .value()
  return _.map(expand(pathSet), path => {
    const shortcuts = _.mapValues(indicesOfShortcuts, _.propertyOf(path))
    return _.assign(shortcuts, path, {length: path.length})
  })
}

expand.preservingShortcuts = expandPreservingShortcuts

module.exports = expand
