import _ from 'lodash'
import { formatLocation } from '../formatter/helpers'
import StackTrace from 'stacktrace-js'
import { isFileNameInCucumber } from '../stack_trace_filter'
import StepDefinition from '../models/step_definition'
import TestCaseHookDefinition from '../models/test_case_hook_definition'
import TestRunHookDefinition from '../models/test_run_hook_definition'
import validateArguments from './validate_arguments'

export function buildTestCaseHookDefinition({ id, options, code, cwd }) {
  if (typeof options === 'string') {
    options = { tags: options }
  } else if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, options },
    fnName: 'defineTestCaseHook',
    location: formatLocation({ line, uri }, cwd),
  })
  return new TestCaseHookDefinition({
    code,
    id,
    line,
    options,
    uri,
  })
}

export function buildTestRunHookDefinition({ id, options, code, cwd }) {
  if (typeof options === 'string') {
    options = { tags: options }
  } else if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, options },
    fnName: 'defineTestRunHook',
    location: formatLocation({ line, uri }, cwd),
  })
  return new TestRunHookDefinition({
    code,
    id,
    line,
    options,
    uri,
  })
}

export function buildStepDefinition({ id, pattern, options, code, cwd }) {
  if (typeof options === 'function') {
    code = options
    options = {}
  }
  const { line, uri } = getDefinitionLineAndUri()
  validateArguments({
    args: { code, pattern, options },
    fnName: 'defineStep',
    location: formatLocation({ line, uri }, cwd),
  })
  return new StepDefinition({
    id,
    code,
    line,
    options,
    pattern: {
      source: typeof pattern === 'string' ? pattern : pattern.source,
      type:
        typeof pattern === 'string'
          ? 'cucumber_expression'
          : 'regular_expression',
    },
    uri,
  })
}

function getDefinitionLineAndUri() {
  let line = 0
  let uri = 'unknown'
  const stackframes = StackTrace.getSync()
  const stackframe = _.find(stackframes, frame => {
    return !isFileNameInCucumber(frame.getFileName())
  })
  if (stackframe) {
    line = stackframe.getLineNumber() || 0
    uri = stackframe.getFileName() || 'unknown'
  }
  return { line, uri }
}
