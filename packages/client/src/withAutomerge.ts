import Automerge from 'automerge'

import { Editor } from 'slate'

import { AutomergeEditor } from './automerge-editor'

import {
  CursorData,
  CollabAction
} from '@livingspec/slate-collaborative-bridge'

export interface AutomergeOptions {
  docId: string
  cursorData?: CursorData
  preserveExternalHistory?: boolean
}

/**
 * The `withAutomerge` plugin contains core collaboration logic.
 */

const withAutomerge = <T extends Editor>(
  editor: T,
  options: AutomergeOptions
) => {
  const e = editor as T & AutomergeEditor

  const { onChange } = e

  const { docId, cursorData, preserveExternalHistory } = options || {}

  e.docSet = new Automerge.DocSet()

  const createConnection = () => {
    if (e.connection) e.connection.close()

    e.connection = AutomergeEditor.createConnection(e, (data: CollabAction) =>
      //@ts-ignore
      e.send(data)
    )

    e.connection.open()
  }

  createConnection()

  /**
   * Open Automerge Connection
   */

  e.openConnection = () => {
    e.connection.open()
  }

  /**
   * Close Automerge Connection
   */

  e.closeConnection = () => {
    e.connection.close()
  }

  /**
   * Clear cursor data
   */

  e.garbageCursor = () => {
    withDefaultDoc(() => AutomergeEditor.garbageCursor(e, docId))
  }

  /**
   * Editor onChange
   */

  e.onChange = () => {
    const operations: any = e.operations

    if (!e.isRemote) {
      withDefaultDoc(() => {
        AutomergeEditor.applySlateOps(e, docId, operations, cursorData)
      })

      onChange()
    }
  }

  /**
   * Receive document value
   */

  e.receiveDocument = data => {
    AutomergeEditor.receiveDocument(e, docId, data)

    createConnection()
  }

  /**
   * Receive Automerge sync operations
   */

  e.receiveOperation = data => {
    if (docId !== data.docId) return

    AutomergeEditor.applyOperation(e, docId, data, preserveExternalHistory)
  }

  return e

  // FIXME: crutch implementation, AutomergeEditor should be provided the doc
  //  to work on, which would void the need for initializing like this.
  function withDefaultDoc(next: () => void) {
    const documentNotInitialized = !Array.from(e.docSet.docIds).includes(docId)
    if (documentNotInitialized) {
      // the user should not know anything about waiting for the document sync
      e.docSet.setDoc(
        docId,
        Automerge.from({ cursors: {}, children: e.children })
      )
    }

    next()
  }
}

export default withAutomerge
