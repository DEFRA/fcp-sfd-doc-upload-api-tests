const splitPath = (path) => {
  const keys = path.split('.')
  const lastKey = keys.pop()
  return { keys, lastKey }
}

const resolveParent = (target, keys) =>
  keys.reduce((current, key) => {
    if (current[key] === undefined) {
      current[key] = {}
    }
    return current[key]
  }, target)

export const setPath = (target, path, value) => {
  const { keys, lastKey } = splitPath(path)
  resolveParent(target, keys)[lastKey] = value
  return target
}

export const deletePath = (target, path) => {
  const { keys, lastKey } = splitPath(path)
  delete resolveParent(target, keys)[lastKey]
  return target
}
