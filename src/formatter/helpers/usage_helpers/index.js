import _ from 'lodash'
import { formatLocation } from '../location_helpers'
import { getStepIdToPickledStepMap } from '../pickle_parser'
import path from 'path'

function getCodeAsString(stepDefinition) {
  if (typeof stepDefinition.unwrappedCode === 'function') {
    return stepDefinition.unwrappedCode.toString()
  }
  return stepDefinition.code.toString()
}

function buildEmptyMapping(stepDefinitions) {
  const mapping = {}
  stepDefinitions.forEach(stepDefinition => {
    const location = formatLocation(stepDefinition)
    mapping[location] = {
      code: getCodeAsString(stepDefinition),
      line: stepDefinition.line,
      pattern: stepDefinition.expression.source,
      patternType: stepDefinition.expression.constructor.name,
      matches: [],
      uri: stepDefinition.uri,
    }
  })
  return mapping
}

function buildMapping({ cwd, stepDefinitions, eventDataCollector }) {
  const mapping = buildEmptyMapping(stepDefinitions)
  _.each(eventDataCollector.getTestCaseAttempts(), testCaseAttempt => {
    const stepLineToPickledStepMap = getStepIdToPickledStepMap(
      testCaseAttempt.pickle
    )
    testCaseAttempt.stepResults.forEach((testStepResult, index) => {
      const { actionLocation, sourceLocation } = testCaseAttempt.testCase.steps[
        index
      ]
      const { duration } = testStepResult
      if (actionLocation && sourceLocation) {
        const location = formatLocation(actionLocation)
        const match = {
          line: sourceLocation.line,
          text: stepLineToPickledStepMap[sourceLocation.line].text,
          uri: path.relative(cwd, sourceLocation.uri),
        }
        if (isFinite(duration)) {
          match.duration = duration
        }
        if (mapping[location]) {
          mapping[location].matches.push(match)
        }
      }
    })
  })
  return mapping
}

function invertNumber(key) {
  return obj => {
    const value = obj[key]
    if (isFinite(value)) {
      return -1 * value
    }
    return 1
  }
}

function buildResult(mapping) {
  return _.chain(mapping)
    .map(({ matches, ...rest }) => {
      const sortedMatches = _.sortBy(matches, [
        invertNumber('duration'),
        'text',
      ])
      const result = { matches: sortedMatches, ...rest }
      const meanDuration = _.meanBy(matches, 'duration')
      if (isFinite(meanDuration)) {
        result.meanDuration = meanDuration
      }
      return result
    })
    .sortBy(invertNumber('meanDuration'))
    .value()
}

export function getUsage({ cwd, stepDefinitions, eventDataCollector }) {
  const mapping = buildMapping({ cwd, stepDefinitions, eventDataCollector })
  return buildResult(mapping)
}
