const co = require('co')
const { anyFailed,
  firstFailure,
  failure,
  success,
  isFailure,
  isSuccess,
  isEmpty,
  hasPayload,
  isFailable,
  failableSequence,
  failablePipe,
  makeItFailable,
  makeItAsync,
  normaliseFunction
} = require('./failable')
const equal = require('assert').deepEqual

describe('failable.js', () => {
  describe('assertSuccess', () => {
    it('should fail if expected payload is present and does not match', () => {
      const actual = success('bar')
      try {
        assertSuccess(actual, 'foo')
      } catch (e) {
        return
      }
      fail('wanted failure but got success')
    })
  })

  describe('assertFailure', () => {
    it('should fail if expected error is present and does not match', () => {
      const actual = failure('bar')
      try {
        assertFailure(actual, 'foo')
      } catch (e) {
        return
      }
      fail('wanted success but got failure')
    })
  })

  describe('anyFailed', () => {
    it('should return true if there are any failures', () => {
      let l1 = [failure(), success()]
      equal(anyFailed(l1), true)

      let l2 = [failure(), failure()]
      equal(anyFailed(l2), true)

      let l3 = [success(), success()]
      equal(anyFailed(l3), false)
    })
  })

  describe('firstFailure', () => {
    it('should return first failure object', () => {
      let f1 = failure({message: 'error 1'})
      let f2 = failure({message: 'error 2'})

      let l1 = [f1, success()]
      equal(firstFailure(l1), f1)

      let l2 = [f1, f2]
      equal(firstFailure(l2), f1)
    })
  })

  describe('success', () => {
    it('should return an failable success object', () => {
      let payload = {
        foo: 'bar'
      }
      let res = success(payload)

      equal(res, {
        success: true,
        payload
      })
    })
  })

  describe('failure', () => {
    it('should return an failable failure object', () => {
      let e = failure({
        message: 'oops!'
      })

      equal(e, {
        success: false,
        error: {
          message: 'oops!'
        }
      })
    })

    it('should set a string error on the message field', () => {
      let e = failure('oops!')

      equal(e, {
        success: false,
        error: {
          message: 'oops!'
        }
      })
    })
  })

  describe('isSuccess', () => {
    it('should return true if failable success object, false if failable failure object', () => {
      let success = {
        success: true,
        payload: {foo: 'bar'}
      }

      let failure = {
        success: false,
        error: 'some error'
      }

      equal(isSuccess(success), true)
      equal(isSuccess(failure), false)
    })
  })

  describe('isFailure', () => {
    it('should return true if failable failure object, false if failable success object', () => {
      let success = {
        success: true,
        payload: {foo: 'bar'}
      }

      let failure = {
        success: false,
        error: 'some error'
      }

      equal(isFailure(failure), true)
      equal(isFailure(success), false)
    })
  })

  describe('isEmpty()', () => {
    it('should return true for "empty" failable objects', () => {
      let failableObj1 = {
        success: true,
        payload: undefined
      }
      let failableObj2 = {
        success: true,
        payload: {}
      }

      equal(isEmpty(failableObj1), true)
      equal(isEmpty(failableObj2), false)
    })
  })

  describe('hasPayload()', () => {
    it('should return true for non "empty" failable objects', () => {
      let failable1 = {
        success: true,
        payload: {foo: 1}
      }
      let failable2 = {
        success: true,
        payload: {}
      }
      let failable3 = {
        success: true,
        payload: undefined
      }

      equal(hasPayload(failable1), true)
      equal(hasPayload(failable2), true)
      equal(hasPayload(failable3), false)
    })
  })

  describe('isFailable()', () => {
    it('should return true for a success object', () => {
      equal(isFailable(success(3)), true)
    })

    it('should return true for a failure object', () => {
      equal(isFailable(failure('oops')), true)
    })

    it('should return true for something else', () => {
      equal(isFailable('not failable'), false)
    })
  })

  describe('failableSequence()', () => {
    it('should return the final result if all functions pass', co.wrap(function * () {
      const a = n => success(n + 1)
      const b = n => success(n * 2)
      const actual = yield failableSequence([a, b])(3)
      equal(actual, success('all functions succeeded'))
    }))

    it('should work with promises', co.wrap(function * () {
      const a = n => Promise.resolve(success(n + 1))
      const b = n => success(n * 2)
      const actual = yield failableSequence([a, b])(3)
      equal(actual, success('all functions succeeded'))
    }))

    it('should return the first failure', co.wrap(function * () {
      const a = n => failure('it blew up')
      const b = n => success(n * 2)
      const actual = yield failableSequence([a, b])(3)
      equal(actual, failure('it blew up'))
    }))

    it('should fail if one of the functions does not return a failable', co.wrap(function * () {
      const a = n => 'not a failable'
      const b = n => success(n * 2)
      const actual = yield failableSequence([a, b])(3)
      equal(actual, failure('function at index 0 did not return failable'))
    }))

    it('should return failure if no functions are supplied', co.wrap(function * () {
      const actual = yield failableSequence([])(3)
      const expected = failure('no functions were supplied')
      equal(actual, expected)
    }))
  })

  describe('makeItAsync()', () => {
    it('should return an async function if given an async function', co.wrap(function * () {
      const f = () => Promise.resolve(7)
      const asynced = makeItAsync(f)
      const result = yield asynced()
      equal(result, 7)
    }))

    it('should return an async function if given a synchronous function', co.wrap(function * () {
      const f = () => 12
      const asynced = makeItAsync(f)
      const result = yield asynced()
      equal(result, 12)
    }))
  })

  describe('makeItFailable()', () => {
    it('should return a failable if the function does', co.wrap(function * () {
      const failable = () => Promise.resolve(success('yeah'))
      const isNowFailable = makeItFailable(0, failable)
      const result = yield isNowFailable()
      equal(result, success('yeah'))
    }))

    it('should return a failable if the function does not', co.wrap(function * () {
      const nonFailable = () => Promise.resolve('not a failable')
      const isNowFailable = makeItFailable(3, nonFailable)
      const result = yield isNowFailable()
      equal(result, failure('function at index 3 did not return failable'))
    }))

    it('should return a failable if the function throws an error', co.wrap(function * () {
      const thrower = () => Promise.reject('bad')
      const isNowFailable = makeItFailable(0, thrower)
      const result = yield isNowFailable()
      equal(result, failure('function at index 0 threw an exception'))
    }))
  })

  describe('normaliseFunction()', () => {
    it('should create a Failable Async function', co.wrap(function * () {
      const f = () => success(7)
      const normed = normaliseFunction(0, f)
      const result = yield normed()
      equal(result, success(7))
    }))

    it('should return a failable if the original function does not', co.wrap(function * () {
      const f = () => 7
      const normed = normaliseFunction(0, f)
      const result = yield normed()
      equal(result, failure('function at index 0 did not return failable'))
    }))
  })

  describe('failablePipe()', () => {
    it('should return the final result if all functions pass', co.wrap(function * () {
      const a = n => success(n + 1)
      const b = n => success(n * 2)
      const actual = yield failablePipe([a, b])(3)
      equal(actual, success(8))
    }))

    it('should work with promises', co.wrap(function * () {
      const a = n => Promise.resolve(success(n + 1))
      const b = n => success(n * 2)
      const actual = yield failablePipe([a, b])(3)
      equal(actual, success(8))
    }))

    it('should return the first failure', co.wrap(function * () {
      const a = n => failure('it blew up')
      const b = n => success(n * 2)
      const actual = yield failablePipe([a, b])(3)
      equal(actual, failure('it blew up'))
    }))

    it('should fail if one of the functions does not return a failable', co.wrap(function * () {
      const a = n => 'not a failable'
      const b = n => success(n * 2)
      const actual = yield failablePipe([a, b])(3)
      equal(actual, failure('function at index 0 did not return failable'))
    }))

    it('should return input if no functions are supplied', co.wrap(function * () {
      const actual = yield failablePipe([])(3)
      const expected = success(3)
      equal(actual, expected)
    }))
  })
})
