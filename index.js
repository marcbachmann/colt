/* globals Promise, setImmediate, setTimeout */
const util = require('./util')
const immediately = typeof setImmediate === 'function' ? setImmediate : (func) => setTimeout(func, 0) // eslint-disable-line max-len

module.exports = coltApi()

function coltApi (coltInstance) {
  const methods = (coltInstance && coltInstance.__methods) || {}

  function colt (opts) {
    opts = opts || {}
    const invocations = Array.from(opts.__invocations || [])
    const chainable = {}
    return collectize(methods, invocations, chainable)
  }

  colt.new =
  colt.forge =
  colt.create = function (options) { return coltApi(options) }

  colt.load =
  colt.register = function (options, method) {
    if (typeof options === 'string') options = {name: options}
    else if (Array.isArray(options)) options = {name: options.shift(), aliases: options}

    loadMethod(options.name, method, options, methods)
    each(options.aliases, function (name) { loadMethod(name, method, options, methods) })
  }

  // Mixin support
  // E.g. colt.mixin(colt)
  colt.__methods = methods
  colt.mixin = function (otherColtApi) {
    each(otherColtApi.__methods, function (method, name) { methods[name] = method })
    return colt
  }

  return colt
}

const protectedMethods = ['end', 'exec', 'fire', 'clone', 'then', 'catch', 'finally']
function loadMethod (name, method, options, methods) {
  if (protectedMethods.includes(name)) {
    throw new Error(`Couldn't register the method '${name}'. ${protectedMethods.join(', ')} are protected keywords.`) // eslint-disable-line max-len
  } else if (methods[name]) {
    throw new Error(`There's already a method registered with the name '${name}'.`)
  }

  methods[name] = {name: options.name, options: options, method: method}
}

function collectize (methods, invocations, chainable) {
  invocations = invocations || []

  Object.defineProperty(chainable, 'clone', {value: function () {
    const api = coltApi({__methods: methods})
    const instance = api({__invocations: invocations})
    return instance
  }})

  each(methods, function (method, name) {
    Object.defineProperty(chainable, name, {
      value: collect(chainable, methods, invocations, method.options.name)
    })
  })

  each(['end', 'exec', 'fire'], function (name) {
    Object.defineProperty(chainable, name, {
      value: function end (callback) {
        unpromisify(chainable)

        // Force the callback to be async
        // I don't care about performance in node
        // I want to support the browser and I'm too lazy to wrap that method
        immediately(function () {
          setValues({
            chainable: chainable,
            methods: methods,
            queries: invocations
          }, callback)
        })
        return chainable
      }
    })
  })

  function unpromisify () {
    Object.defineProperty(chainable, 'catch', {value: undefined})
    Object.defineProperty(chainable, 'then', {value: undefined})
  }

  function toPromise () {
    unpromisify(chainable)
    return new Promise(function (resolve, reject) {
      setValues({
        chainable: chainable,
        methods: methods,
        queries: invocations
      }, function (err, res) {
        if (err) return reject(err)
        return resolve(res)
      })
    })
  }

  Object.defineProperty(chainable, 'then', {
    configurable: true,
    value: function promiseThen (onSuccess, onCatch) {
      return toPromise().then(onSuccess, onCatch)
    }
  })

  Object.defineProperty(chainable, 'catch', {
    configurable: true,
    value: function promiseCatch (onCatch) {
      return toPromise().catch(onCatch)
    }
  })

  return chainable
}

function collect (chainable, methods, invocations, method) {
  return function () {
    const mapName = arguments[0]
    if (methods[mapName]) throw new Error("You can't name the map name the same as your methods.")
    invocations.push({method: method, args: arguments})
    return chainable
  }
}

// params = {chainable, methods, queries}
function setValues (params, callback) {
  const chainable = params.chainable
  const query = params.queries.shift()
  if (query === undefined) return callback(null, chainable)

  const method = params.methods[query.method]
  const args = Array.from(query.args || [])
  const name = args.shift()
  if (method.options.evaluate !== false) {
    const arg1 = args.shift()
    if (typeof name !== 'string') {
      throw new Error(`colt().${method.method}(mapName, args...): The mapName must be  a string.`)
    }

    util.callbackify({method: arg1, args: args}, function (err, value) {
      if (err) return callback(errorify(err))
      util.callbackify({
        method: method.method,
        args: [{name: name, value: value}],
        binding: chainable
      }, function (err, data) {
        if (err) return callback(errorify(err))
        params.chainable[name] = data
        setValues(params, callback)
      })
    })
  } else {
    util.callbackify({
      method: method.method,
      args: [{name: name, args: args}],
      binding: chainable
    }, function (err, data) {
      if (err) return callback(errorify(err))
      params.chainable[name] = data
      setValues(params, callback)
    })
  }
}

function errorify (err) {
  if (err instanceof Error) return err
  return new Error(`You threw something that's not an error instance: ${err}`)
}

function each (arr, invoke) {
  if (!arr || arr.length === 0) return
  if (Array.isArray(arr)) {
    for (let i = arr.length - 1; i >= 0; i--) {
      invoke(arr[i])
    }
  } else if (typeof arr === 'object') {
    for (const key in arr) {
      invoke(arr[key], key)
    }
  }
}
