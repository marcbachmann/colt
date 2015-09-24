var _ = require('lodash')
var util = require('./util')

module.exports = coltApi()
module.exports.new = function (options) { return coltApi(options) }

function coltApi (options) {
  if (!options) options = {}
  var methods = {}

  function colt () {
    var obj = {}
    return collectize(methods, obj)
  }

  colt.register = function (names, options, method) {
    if (!_.isFunction(method)) {
      method = options
      options = {}
    }

    if (_.isString(names)) names = [names]
    _.each(names, function (name) {
      if (_.contains(['end', 'exec', 'fire'], name)) {
        throw new Error("Couldn't register the method '" + name + "'. 'end', 'exec' and 'done' are protected keywords.")
      } else if (methods[name]) {
        throw new Error("There's already a method registered with the name '" + name + "'.")
      }

      methods[name] = {name: name, method: method, options: options}
    })
  }

  return colt
}

function collectize (methods, obj) {
  Object.defineProperty(obj, '__queries', {configurable: true, value: []})
  function collect (method) {
    return function () {
      var mapName = arguments[0]
      if (methods[mapName]) throw new Error("You can't name the map name the same as your methods.")
      obj.__queries.push({method: method, args: _.toArray(arguments)})
      return obj
    }
  }

  _.each(methods, function (method) { Object.defineProperty(obj, method.name, {value: collect(method.name)}) })
  _.each(['end', 'exec', 'fire'], function (name) {
    Object.defineProperty(obj, name, {
      value: function end (callback) {
        var queries = obj.__queries
        delete obj.__queries
        var queries = obj.__invocations
        // Force the callback to be async
        // I don't care about performance in node
        // I want to support the browser and I'm too lazy to wrap that method
        setTimeout(function () {
          setValues({
            obj: obj,
            methods: methods,
            queries: queries
          }, callback)
        }, 0)
        return obj
      }
    })
  })
  return obj
}

// params = {obj, methods, queries}
function setValues (params, callback) {
  var obj = params.obj
  var query = params.queries.shift()
  if (query === undefined) return callback(null, obj)

  var method = params.methods[query.method]
  var name = query.args.shift()
  if (method.options.evaluate !== false) {
    var arg1 = query.args.shift()
    util.callbackify({method: arg1, args: query.args}, function (err, value) {
      if (err) return callback(errorify(err))
      util.callbackify({method: method.method, args: [{name: name, value: value}], binding: obj}, function (err, data) {
        if (err) return callback(errorify(err))
        params.obj[name] = data
        setValues(params, callback)
      })
    })
  } else {
    util.callbackify({
      method: method.method,
      args: [{name: name, args: query.args}],
      binding: obj
    }, function (err, data) {
      if (err) return callback(errorify(err))
      params.obj[name] = data
      setValues(params, callback)
    })
  }
}

function errorify (err) {
  if (_.isError(err)) return err
  return new Error("You threw something that's not an error instance: " + err)
}
