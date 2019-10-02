import _ from 'lodash'
import ArgvParser from './argv_parser'
import { fromPaths as gherkinFromPaths } from 'gherkin'
import ProfileLoader from './profile_loader'
import Promise from 'bluebird'
import shuffle from 'knuth-shuffle-seeded'
import path from 'path'

export async function getExpandedArgv({ argv, cwd }) {
  const { options } = ArgvParser.parse(argv)
  let fullArgv = argv
  const profileArgv = await new ProfileLoader(cwd).getArgv(options.profile)
  if (profileArgv.length > 0) {
    fullArgv = _.concat(argv.slice(0, 2), profileArgv, argv.slice(2))
  }
  return fullArgv
}

export function getTestCasesFromFilesystem({
  cwd,
  eventBroadcaster,
  featureDefaultLanguage,
  featurePaths,
  order,
  pickleFilter,
}) {
  return new Promise((resolve, reject) => {
    const result = []
    const messageStream = gherkinFromPaths(featurePaths, {
      defaultDialect: featureDefaultLanguage,
    })
    messageStream.on('data', envelope => {
      if (envelope.source) {
        eventBroadcaster.emit('source', envelope.source)
      }
      if (envelope.gherkinDocument) {
        eventBroadcaster.emit('gherkin-document', envelope.gherkinDocument)
      }
      if (envelope.pickle) {
        const pickle = envelope.pickle
        eventBroadcaster.emit('pickle', pickle)
        if (pickleFilter.matches(pickle)) {
          eventBroadcaster.emit('pickle-accepted', pickle)
          result.push(pickle)
        } else {
          eventBroadcaster.emit('pickle-rejected', pickle)
        }
      }
      if (envelope.attachment) {
        eventBroadcaster.emit('attachment', envelope.attachment)
        reject(
          new Error(
            `Parse error in '${path.relative(
              cwd,
              envelope.attachment.source.uri
            )}': ${envelope.attachment.data}`
          )
        )
      }
    })
    messageStream.on('end', () => {
      orderTestCases(result, order)
      resolve(result)
    })
    messageStream.on('error', reject)
  })
}

// Orders the testCases in place - morphs input
export function orderTestCases(testCases, order) {
  let [type, seed] = order.split(':')
  switch (type) {
    case 'defined':
      break
    case 'random':
      if (!seed) {
        seed = Math.floor(Math.random() * 1000 * 1000).toString()
        console.warn(`Random order using seed: ${seed}`)
      }
      shuffle(testCases, seed)
      break
    default:
      throw new Error(
        'Unrecgonized order type. Should be `defined` or `random`'
      )
  }
}
