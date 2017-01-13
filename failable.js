const { reduce, pluck, map } = require('ramda')
const co = require('co')

function allTrue (collection) {
  return reduce((acc, item) => { return item && acc }, true, collection)
}

function anyFailed (results) {
  return allTrue(pluck('success', results)) === false
}

function firstFailure (results) {
  return results.find(x => x.success === false)
}

function failure (err) {
  let error = err
  if (typeof error === 'string') error = { message: err }

  return {
    success: false,
    error
  }
}

function success (payload) {
  return {
    success: true,
    payload
  }
}

function empty () {
  return {
    success: true,
    payload: undefined
  }
}

function isFailure (r) {
  return r.success === false
}

function isSuccess (r) {
  return r.success
}

function isEmpty (r) {
  return (r.success === true && (r.payload === undefined || r.payload === null))
}

function hasPayload (r) {
  return (r.success === true && (r.payload !== undefined && r.payload !== null))
}

function isFailable (o) {
  return isSuccess(o) || isFailure(o)
}

function allFailable (items) {
  return allTrue(map(isFailable, items)) === true
}

const makeItAsync = (fn) => {
  return (args) => {
    return Promise.resolve(fn(args))
  }
}

const makeItFailable = (index, fn) => {
  return co.wrap(function * (args) {
    try {
      const result = yield fn(args)
      if (!isFailable(result)) return failure(`function at index ${index} did not return failable`)
      return result
    } catch (e) {
      // TODO: add exception to the failure
      return failure(`function at index ${index} threw an exception`)
    }
  })
}

const normaliseFunction = (index, fn) => {
  return makeItFailable(index, makeItAsync(fn))
}

const applySequentially = () => { throw new Error('I think you meant failableSequence') }

// Returns a function which applies the supplied functions
// to the original argument, returning the first failure
// if any or success if all succeed.
// Functions may be sync or async and must return a failable
const failableSequence = (fns) => {
  return co.wrap(function * (arg) {
    if (fns.length === 0) return failure('no functions were supplied')
    for (let i = 0; i < fns.length; i++) {
      const fn = normaliseFunction(i, fns[i])
      const result = yield fn(arg)
      if (isFailure(result)) return result
    }
    return success('all functions succeeded')
  })
}

const failablePipe = (fns) => {
  return co.wrap(function * (arg) {
    const normalisedFunctions = map(normaliseFunction, fns)
    let input = arg
    let result = success(arg)
    for (let i = 0; i < fns.length; i++) {
      const fn = normaliseFunction(i, fns[i])
      result = yield fn(input)
      if (isFailure(result)) return result
      input = result.payload
    }
    return result
  })
}

module.exports = {
  anyFailed,
  firstFailure,
  failure,
  success,
  empty,
  isFailure,
  isSuccess,
  isEmpty,
  hasPayload,
  isFailable,
  makeItFailable,
  makeItAsync,
  normaliseFunction,
  applySequentially,
  failableSequence,
  failablePipe
}
