var util

module.exports = util = {
  isPromise: function (promise) { return promise && typeof promise.then === 'function' && typeof promise.catch === 'function' },

  isStream: function (stream) { return stream && typeof stream._read === 'function' && typeof stream._readableState === 'object' },

  callbackify: function (opts, callback) {
    var method = opts.method
    var args = opts.args || []
    var binding = opts.binding || {}

    if (typeof method === 'function') {
      if ((method.length - 1) === args.length) return method.apply(binding, args.concat(callback))
      else if (method.length !== args.length) return callback(new Error("You don't have as many arguments as you have params."))

      try {
        method = method.apply(binding, args)
      } catch (err) {
        return callback(err)
      }

      if (!util.isPromise(method) && !util.isStream(method)) {
        return callback(null, method)
      }
    }

    if (util.isStream(method)) {
      util.callbackifyStream(method, callback)
    } else if (util.isPromise(method)) {
      util.callbackifyPromise(method, callback)
    } else {
      callback(null, method)
    }
  },

  callbackifyPromise: function (promise, callback) {
    promise
    .catch(callback)
    .then(function (data) { callback(null, data) })
  },

  callbackifyStream: function (stream, callback) {
    var chunks = []
    var exited = 0
    function exit (err) { if (!exited++) callback(err, err ? null : Buffer.concat(chunks)) }
    stream
    .on('error', exit)
    .on('finish', exit)
    .on('end', exit)
    .on('close', exit)
    .on('abort', exit)
    .on('data', function (chunk) { chunks.push(chunk) })
  }
}

