var util = require('./util')

module.exports = coltApi()

function coltApi (opts) {
  var methods = (opts && opts.__methods) || {}

  function colt (opts) {
    opts = opts || {}
    var invocations = opts.__invocations && Array.apply(null, opts.__invocations)
    var chainable = {}
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

function loadMethod (name, method, options, methods) {
  if (['end', 'exec', 'fire', 'clone'].indexOf(name) !== -1) {
    throw new Error("Couldn't register the method '" + name + "'. 'end', 'exec', 'fire' and 'clone' are protected keywords.")
  } else if (methods[name]) {
    throw new Error("There's already a method registered with the name '" + name + "'.")
  }

  methods[name] = {name: options.name, options: options, method: method}
}

function collectize (methods, invocations, chainable) {
  invocations = invocations || []

  Object.defineProperty(chainable, 'clone', {value: function () {
    var api = coltApi({__methods: methods})
    var instance = api({__invocations: invocations})
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
        // Force the callback to be async
        // I don't care about performance in node
        // I want to support the browser and I'm too lazy to wrap that method
        setTimeout(function () {
          setValues({
            chainable: chainable,
            methods: methods,
            queries: invocations
          }, callback)
        }, 0)
        return chainable
      }
    })
  })
  return chainable
}

function collect (chainable, methods, invocations, method) {
  return function () {
    var mapName = arguments[0]
    if (methods[mapName]) throw new Error("You can't name the map name the same as your methods.")
    invocations.push({method: method, args: arguments})
    return chainable
  }
}

// params = {chainable, methods, queries}
function setValues (params, callback) {
  var chainable = params.chainable
  var query = params.queries.shift()
  if (query === undefined) return callback(null, chainable)

  var method = params.methods[query.method]
  var args = Array.apply(null, query.args)
  var name = args.shift()
  if (method.options.evaluate !== false) {
    var arg1 = args.shift()
    if (typeof name !== 'string') throw new Error('colt().' + method.method + '(mapName, args...): The mapName must be  a string.')
    util.callbackify({method: arg1, args: args}, function (err, value) {
      if (err) return callback(errorify(err))
      util.callbackify({method: method.method, args: [{name: name, value: value}], binding: chainable}, function (err, data) {
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
  return new Error("You threw something that's not an error instance: " + err)
}

function each (arr, callback) {
  if (!arr || arr.length === 0) return
  if (Array.isArray(arr)) {
    for (var i = arr.length - 1; i >= 0; i--) {
      callback(arr[i])
    }
  } else if (typeof arr === 'object') {
    for (var key in arr) {
      callback(arr[key], key)
    }
  }
}
