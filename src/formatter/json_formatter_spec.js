import { beforeEach, describe, it } from 'mocha'
import { expect } from 'chai'
import JsonFormatter from './json_formatter'
import EventEmitter from 'events'
import { generateEvents } from '../../test/gherkin_helpers'
import { EventDataCollector } from './helpers'
import { messages } from 'cucumber-messages'

const { Status } = messages.TestResult

describe('JsonFormatter', () => {
  beforeEach(function() {
    this.eventBroadcaster = new EventEmitter()
    this.output = ''
    const logFn = data => {
      this.output += data
    }
    this.jsonFormatter = new JsonFormatter({
      eventBroadcaster: this.eventBroadcaster,
      eventDataCollector: new EventDataCollector(this.eventBroadcaster),
      log: logFn,
    })
  })

  describe('no features', () => {
    beforeEach(function() {
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs an empty array', function() {
      expect(JSON.parse(this.output)).to.eql([])
    })
  })

  describe('one scenario with one step', () => {
    beforeEach(async function() {
      await generateEvents({
        data:
          '@tag1 @tag2\n' +
          'Feature: my feature\n' +
          'my feature description\n' +
          'Scenario: my scenario\n' +
          'my scenario description\n' +
          'Given my step',
        eventBroadcaster: this.eventBroadcaster,
        uri: 'a.feature',
      })
      this.testCase = {
        sourceLocation: { uri: 'a.feature', line: 4 },
        attemptNumber: 1,
      }
    })

    describe('passed', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the feature', function() {
        expect(JSON.parse(this.output)).to.eql([
          {
            description: 'my feature description',
            elements: [
              {
                description: 'my scenario description',
                id: 'my-feature;my-scenario',
                keyword: 'Scenario',
                line: 4,
                name: 'my scenario',
                type: 'scenario',
                steps: [
                  {
                    arguments: [],
                    line: 6,
                    keyword: 'Given ',
                    name: 'my step',
                    result: {
                      status: 'passed',
                      duration: 1,
                    },
                  },
                ],
                tags: [{ name: '@tag1', line: 1 }, { name: '@tag2', line: 1 }],
              },
            ],
            id: 'my-feature',
            keyword: 'Feature',
            line: 2,
            name: 'my feature',
            tags: [{ name: '@tag1', line: 1 }, { name: '@tag2', line: 1 }],
            uri: 'a.feature',
          },
        ])
      })
    })

    describe('retried', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, exception: 'my error', status: Status.FAILED },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.FAILED, retried: true },
        })
        const testCaseAttempt2 = {
          sourceLocation: this.testCase.sourceLocation,
          attemptNumber: 2,
        }
        this.eventBroadcaster.emit('test-case-started', testCaseAttempt2)
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: testCaseAttempt2,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...testCaseAttempt2,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('does not output retried test cases', function() {
        const features = JSON.parse(this.output)
        expect(features[0].elements.length).to.eql(1)
        expect(features[0].elements[0].steps[0].result).to.eql({
          status: 'passed',
          duration: 1,
        })
      })
    })

    describe('failed', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: {
            duration: 1,
            exception: 'my error',
            status: Status.FAILED,
          },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.FAILED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('includes the error message', function() {
        const features = JSON.parse(this.output)
        expect(features[0].elements[0].steps[0].result).to.eql({
          status: 'failed',
          error_message: 'my error',
          duration: 1,
        })
      })
    })

    describe('with a step definition', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              actionLocation: { uri: 'steps.js', line: 10 },
              sourceLocation: { uri: 'a.feature', line: 6 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-step-finished', {
          index: 0,
          testCase: this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the step with a match attribute', function() {
        const features = JSON.parse(this.output)
        expect(features[0].elements[0].steps[0].match).to.eql({
          location: 'steps.js:10',
        })
      })
    })

    describe('with hooks', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              actionLocation: { uri: 'steps.js', line: 10 },
            },
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
              actionLocation: { uri: 'steps.js', line: 11 },
            },
            {
              actionLocation: { uri: 'steps.js', line: 12 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the before hook with special properties', function() {
        const features = JSON.parse(this.output)
        const beforeHook = features[0].elements[0].steps[0]
        expect(beforeHook).to.not.have.ownProperty('line')
        expect(beforeHook.keyword).to.eql('Before')
        expect(beforeHook.hidden).to.eql(true)
      })

      it('outputs the after hook with special properties', function() {
        const features = JSON.parse(this.output)
        const beforeHook = features[0].elements[0].steps[2]
        expect(beforeHook).to.not.have.ownProperty('line')
        expect(beforeHook.keyword).to.eql('After')
        expect(beforeHook.hidden).to.eql(true)
      })
    })

    describe('with attachments', () => {
      beforeEach(function() {
        this.eventBroadcaster.emit('test-case-prepared', {
          sourceLocation: this.testCase.sourceLocation,
          steps: [
            {
              sourceLocation: { uri: 'a.feature', line: 6 },
              actionLocation: { uri: 'steps.js', line: 11 },
            },
          ],
        })
        this.eventBroadcaster.emit('test-case-started', this.testCase)
        this.eventBroadcaster.emit('test-step-attachment', {
          testCase: this.testCase,
          index: 0,
          data: 'first data',
          media: { type: 'first media type' },
        })
        this.eventBroadcaster.emit('test-step-attachment', {
          testCase: this.testCase,
          index: 0,
          data: 'second data',
          media: { type: 'second media type' },
        })
        this.eventBroadcaster.emit('test-step-finished', {
          testCase: this.testCase,
          index: 0,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-case-finished', {
          ...this.testCase,
          result: { duration: 1, status: Status.PASSED },
        })
        this.eventBroadcaster.emit('test-run-finished')
      })

      it('outputs the step with embeddings', function() {
        const features = JSON.parse(this.output)
        expect(features[0].elements[0].steps[0].embeddings).to.eql([
          { data: 'first data', mime_type: 'first media type' },
          { data: 'second data', mime_type: 'second media type' },
        ])
      })
    })
  })

  describe('one scenario with one step with a doc string', () => {
    beforeEach(async function() {
      await generateEvents({
        data:
          'Feature: my feature\n' +
          '  Scenario: my scenario\n' +
          '    Given my step\n' +
          '      """\n' +
          '      This is a DocString\n' +
          '      """\n',
        eventBroadcaster: this.eventBroadcaster,
        uri: 'a.feature',
      })
      this.testCase = {
        sourceLocation: { uri: 'a.feature', line: 2 },
        attemptNumber: 1,
      }
      this.eventBroadcaster.emit('test-case-prepared', {
        sourceLocation: this.testCase.sourceLocation,
        steps: [
          {
            sourceLocation: { uri: 'a.feature', line: 3 },
            actionLocation: { uri: 'steps.js', line: 10 },
          },
        ],
      })
      this.eventBroadcaster.emit('test-case-started', this.testCase)
      this.eventBroadcaster.emit('test-step-finished', {
        index: 0,
        testCase: this.testCase,
        result: { duration: 1, status: Status.PASSED },
      })
      this.eventBroadcaster.emit('test-case-finished', {
        ...this.testCase,
        result: { duration: 1, status: Status.PASSED },
      })
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs the doc string as a step argument', function() {
      const features = JSON.parse(this.output)
      expect(features[0].elements[0].steps[0].arguments).to.eql([
        {
          line: 4,
          content: 'This is a DocString',
        },
      ])
    })
  })

  describe('one scenario with one step with a data table string', () => {
    beforeEach(async function() {
      await generateEvents({
        data:
          'Feature: my feature\n' +
          '  Scenario: my scenario\n' +
          '    Given my step\n' +
          '      |aaa|b|c|\n' +
          '      |d|e|ff|\n' +
          '      |gg|h|iii|\n',
        eventBroadcaster: this.eventBroadcaster,
        uri: 'a.feature',
      })
      this.testCase = {
        sourceLocation: { uri: 'a.feature', line: 2 },
        attemptNumber: 1,
      }
      this.eventBroadcaster.emit('test-case-prepared', {
        sourceLocation: this.testCase.sourceLocation,
        steps: [
          {
            sourceLocation: { uri: 'a.feature', line: 3 },
            actionLocation: { uri: 'steps.js', line: 10 },
          },
        ],
      })
      this.eventBroadcaster.emit('test-case-started', this.testCase)
      this.eventBroadcaster.emit('test-step-finished', {
        index: 0,
        testCase: this.testCase,
        result: { duration: 1, status: Status.PASSED },
      })
      this.eventBroadcaster.emit('test-case-finished', {
        ...this.testCase,
        result: { duration: 1, status: Status.PASSED },
      })
      this.eventBroadcaster.emit('test-run-finished')
    })

    it('outputs the data table as a step argument', function() {
      const features = JSON.parse(this.output)
      expect(features[0].elements[0].steps[0].arguments).to.eql([
        {
          rows: [
            { cells: ['aaa', 'b', 'c'] },
            { cells: ['d', 'e', 'ff'] },
            { cells: ['gg', 'h', 'iii'] },
          ],
        },
      ])
    })
  })
})
