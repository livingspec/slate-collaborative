import { Message, uuid } from 'automerge'

import toSync from './toSync'
import hexGen from './hexGen'

import { CollabAction, CollabActionType } from '../model'

export * from './testUtils'

const toJS = <T>(node: T) => JSON.parse(JSON.stringify(node)) as T

const cloneNode = (node: any) => toSync(toJS(node))

const toSlatePath = (path: any) =>
  path ? path.filter((d: any) => Number.isInteger(d)) : []

const toCollabAction = (
  type: CollabActionType,
  fn: (action: CollabAction) => void
) => (payload: Message) => fn({ type, payload, correlationId: uuid() })

export { toSync, toJS, toSlatePath, hexGen, cloneNode, toCollabAction }
