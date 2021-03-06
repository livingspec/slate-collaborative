import Automerge from 'automerge'

import { Editor, Operation } from 'slate'
import { HistoryEditor } from 'slate-history'

import {
  toJS,
  SyncDoc,
  CollabAction,
  toCollabAction,
  applyOperation,
  setCursor,
  toSlateOp,
  CursorData
} from '@livingspec/slate-collaborative-bridge'

export interface AutomergeEditor extends Editor {
  clientId: string

  isRemote: boolean

  docSet: Automerge.DocSet<SyncDoc>
  connection: Automerge.Connection<SyncDoc>

  onCollabAction?: (action: CollabAction) => void

  openConnection: () => void
  closeConnection: () => void

  receiveDocument: (data: string) => void
  receiveOperation: (data: Automerge.Message) => void

  garbageCursor: () => void

  onCursor: (data: any) => void
}

/**
 * `AutomergeEditor` contains methods for collaboration-enabled editors.
 */

export const AutomergeEditor = {
  /**
   * Create Automerge connection
   */

  createConnection: (e: AutomergeEditor, emit: (data: CollabAction) => void) =>
    new Automerge.Connection(e.docSet, message =>
      toCollabAction('operation', action => {
        emit(action)
        e.onCollabAction?.({
          ...action,
          slateOps: e.operations
        } as any)
      })(message)
    ),

  /**
   * Apply Slate operations to Automerge
   */

  applySlateOps: (
    e: AutomergeEditor,
    docId: string,
    operations: Operation[],
    cursorData?: CursorData
  ) => {
    const doc = e.docSet.getDoc(docId)

    if (!doc) {
      throw new TypeError(`Unknown docId: ${docId}!`)
    }

    let changed

    for (let op of operations) {
      changed = Automerge.change<SyncDoc>(changed || doc, d =>
        applyOperation(d.children, op)
      )
    }

    changed = Automerge.change(changed || doc, d => {
      setCursor(e.clientId, e.selection, d, operations, cursorData || {})
    })

    e.docSet.setDoc(docId, changed as any)
  },

  /**
   * Receive and apply document to Automerge docSet
   */

  receiveDocument: (e: AutomergeEditor, docId: string, data: string) => {
    const currentDoc = e.docSet.getDoc(docId)

    const externalDoc = Automerge.load<SyncDoc>(data)

    const mergedDoc = Automerge.merge<SyncDoc>(
      externalDoc,
      currentDoc || Automerge.init()
    )

    e.docSet.setDoc(docId, mergedDoc)

    Editor.withoutNormalizing(e, () => {
      e.children = toJS(mergedDoc).children

      e.onCursor && e.onCursor(mergedDoc.cursors)

      e.onChange()
    })
  },

  /**
   * Generate automerge diff, convert and apply operations to Editor
   */

  applyOperation: (
    e: AutomergeEditor,
    docId: string,
    data: Automerge.Message,
    preserveExternalHistory?: boolean
  ) => {
    const current: any = e.docSet.getDoc(docId)

    const updated = e.connection.receiveMsg(data)

    const operations = Automerge.diff(current, updated)

    if (operations.length) {
      const slateOps = toSlateOp(operations, current)

      e.isRemote = true

      Editor.withoutNormalizing(e, () => {
        if (HistoryEditor.isHistoryEditor(e) && !preserveExternalHistory) {
          HistoryEditor.withoutSaving(e, () => {
            slateOps.forEach((o: Operation) => e.apply(o))
          })
        } else {
          slateOps.forEach((o: Operation) => e.apply(o))
        }

        e.onCursor && e.onCursor(updated.cursors)
      })

      Promise.resolve().then(_ => (e.isRemote = false))
    }
  },

  garbageCursor: (e: AutomergeEditor, docId: string) => {
    const doc = e.docSet.getDoc(docId)

    const changed = Automerge.change<SyncDoc>(doc, d => {
      delete d.cursors[e.clientId]
    })

    e.onCursor && e.onCursor(null)

    e.docSet.setDoc(docId, changed)

    e.onChange()
  }
}
