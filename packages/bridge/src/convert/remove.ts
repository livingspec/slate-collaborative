import * as Automerge from 'automerge'
import { Element, RemoveTextOperation } from 'slate'

import { toJS, toSlatePath } from '../utils'
import { getTarget } from '../path'
import { SyncValue } from '../model'

const removeTextOp: (
  op: Automerge.Diff
) => (map: any, doc: SyncValue) => RemoveTextOperation = op => (map, doc) => {
  const { index, path, obj } = op

  const slatePath = toSlatePath(path).slice(0, path?.length)

  const node =
    getTarget<SyncValue, { text: Automerge.Text }>(doc, slatePath) || map[obj]

  if (typeof index !== 'number') {
    throw new Error(`Index ${index} is not a number`)
  }

  return {
    type: 'remove_text',
    path: slatePath,
    offset: index,
    text: node.text.get(index)
  }
}

const removeNodeOp = ({ index, obj, path }: Automerge.Diff) => (
  map: any,
  doc: Element
) => {
  const slatePath = toSlatePath(path)

  const parent = getTarget(doc, slatePath)
  const target = parent?.children[index as number] || { children: [] }

  if (!map.hasOwnProperty(obj)) {
    map[obj] = target
  }

  return {
    type: 'remove_node',
    path: slatePath.length ? slatePath.concat(index) : [index],
    node: toJS(target)
  }
}

const opRemove = (op: Automerge.Diff, [map, ops]: any) => {
  const { index, path, obj, type } = op

  if (
    map.hasOwnProperty(obj) &&
    typeof map[obj] !== 'string' &&
    type !== 'text'
  ) {
    map[obj].splice(index, 1)

    return [map, ops]
  }

  if (!path) return [map, ops]

  const key = path[path.length - 1]

  if (key === 'cursors') return [map, ops]

  const fn = key === 'text' ? removeTextOp : removeNodeOp

  return [map, [...ops, fn(op)]]
}

export default opRemove
