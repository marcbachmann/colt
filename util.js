const util = {
  isPromise (promise) {
    return promise && typeof promise.then === 'function' && typeof promise.catch === 'function'
  },

  isStream (stream) {
    return stream && typeof stream._read === 'function' && typeof stream._readableState === 'object'
  },

  callbackify (opts, callback) {
    let method = opts.method
    const args = opts.args || []
    const binding = opts.binding || {}

    if (typeof method === 'function') {
      if ((method.length - 1) === args.length) return method.apply(binding, args.concat(callback))
      else if (method.length !== args.length) {
        const received = Array.from(args)
          .map(function (arg) { return JSON.stringify(arg) })
          .join(', ')

        return callback(new Error(
          `Expected ${method.length} arguments, received ${args.length} args: ${method.name}(${received})` // eslint-disable-line max-len
        ))
      }

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
      return util.callbackifyStream(method, callback)
    } else if (util.isPromise(method)) {
      return util.callbackifyPromise(method, callback)
    } else {
      return callback(null, method)
    }
  },

  callbackifyPromise (promise, callback) {
    promise
      .catch(callback)
      .then(function (data) { callback(null, data) })
  },

  callbackifyStream (stream, callback) {
    const chunks = []
    let exited = 0
    function exit (err) {
      if (!exited++) {
        if (err) return callback(err)
        else if (!chunks.length) return callback()
        else if (Buffer.isBuffer(chunks[0])) return callback(null, Buffer.concat(chunks))
        else return callback(err, chunks.join())
      }
    }

    stream
      .on('error', exit)
      .on('finish', exit)
      .on('end', exit)
      .on('close', exit)
      .on('abort', exit)
      .on('data', function (chunk) { chunks.push(chunk) })
  }
}

module.exports = util
