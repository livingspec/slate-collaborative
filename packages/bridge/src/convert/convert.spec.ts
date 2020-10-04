import * as Automerge from 'automerge'
import { toSlateOp } from './index'
import { createDoc, cloneDoc, createNode } from '../utils'

describe('convert operations to slatejs model', () => {
  it('convert insert operations', () => {
    const doc1 = createDoc()
    const doc2 = cloneDoc(doc1)

    const change = Automerge.change(doc1, d => {
      d.children.push(createNode('paragraph', 'hello!'))
      d.children[1].children[0].text = 'hello!'
    })

    const operations = Automerge.diff(doc2, change)

    const slateOps = toSlateOp(operations, change)

    const expectedOps = [
      {
        type: 'insert_node',
        path: [1],
        node: { type: 'paragraph', children: [] }
      },
      {
        type: 'insert_node',
        path: [1, 0],
        node: { text: 'hello!' }
      }
    ]

    expect(slateOps).toStrictEqual(expectedOps)
  })

  it('convert remove operations', () => {
    const doc1 = createDoc([
      {
        type: 'paragraph',
        children: [
          {
            text: ''
          },
          {
            type: 'link',
            children: [{ text: 'collaborator' }]
          },
          {
            text: '!'
          }
        ]
      }
    ])

    const change = Automerge.change(doc1, d => {
      delete d.children[0].children[1]
      d.children[0].children[1].text.deleteAt(0)
      delete d.children[0].children[0]
    })

    const operations = Automerge.diff(doc1, change)

    const slateOps = toSlateOp(operations, doc1)

    const expectedOps = [
      {
        type: 'remove_node',
        path: [0, 1],
        node: {
          type: 'link',
          children: [
            {
              text: 'collaborator'
            }
          ]
        }
      },
      {
        type: 'remove_text',
        path: [0, 1],
        offset: 0,
        text: '!'
      },
      {
        type: 'remove_node',
        path: [0, 0],
        node: {
          text: ''
        }
      }
    ]

    expect(slateOps).toStrictEqual(expectedOps)
  })
})
