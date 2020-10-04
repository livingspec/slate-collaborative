import { Operation } from 'slate'

import node from './node'
import text from './text'

import { SyncValue } from '../model'
import { toJS } from '../utils'

const setSelection = (doc: any) => doc

const opType = {
  ...text,
  ...node,
  set_selection: setSelection
}

const applyOperation = (doc: SyncValue, op: Operation): SyncValue => {
  const applyOp = opType[op.type]

  if (!applyOp) {
    throw new TypeError(`Unsupported operation type: ${op.type}!`)
  }

  return applyOp(doc, op as any)
}

const applySlateOps = (doc: SyncValue, operations: Operation[]): SyncValue => {
  return operations.reduce(applyOperation, doc)
}

export { applyOperation, applySlateOps }
