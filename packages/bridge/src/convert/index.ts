import * as Automerge from 'automerge'
import { Operation } from 'slate'

import opInsert from './insert'
import opRemove from './remove'
import opSet from './set'
import opCreate from './create'

import { SyncDoc, SyncValue } from '../model'
import { applyOperation, applySlateOps } from '../apply'

const byAction = {
  create: opCreate,
  remove: opRemove,
  set: opSet,
  insert: opInsert
}

const rootKey = '00000000-0000-0000-0000-000000000000'

const toSlateOp: (ops: Automerge.Diff[], doc: SyncDoc) => Operation[] = (
  ops,
  doc
) => {
  const iterate = (acc: [any, any[]], op: Automerge.Diff): any => {
    const action = byAction[op.action]

    const result = action ? action(op, acc, doc) : acc

    return result
  }

  const [tempTree, defer] = ops.reduce(iterate, [
    {
      [rootKey]: {}
    },
    []
  ])

  return defer.flatMap(op => {
    const operation = op(tempTree, doc)

    doc = Automerge.change(doc, (d: SyncValue) => {
      if (Array.isArray(operation)) {
        applySlateOps(d, operation)
      } else {
        applyOperation(d, operation)
      }
    })

    return operation
  })
}

export { toSlateOp }
