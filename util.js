const util = {
  isStream (stream) {
    return stream && typeof stream._read === 'function' && typeof stream._readableState === 'object'
  },

  async promisifyInput ({method, args, binding}) {
    if (typeof method === 'function') {
      if (method.length === 1) method = util.promisify.call(binding, method, args)
      else method = method.apply(binding, args)
    }

    if (method && method.then) method = await method
    if (util.isStream(method)) return util.promisifyStream(method)
    return method
  },

  promisifyStream (stream) {
    return new Promise((resolve, reject) => {
      const chunks = []
      function exit (err) {
        if (err) return reject(err)
        if (Buffer.isBuffer(chunks[0])) return resolve(Buffer.concat(chunks))
        resolve(chunks)
      }

      stream
        .on('error', exit)
        .on('finish', exit)
        .on('end', exit)
        .on('close', exit)
        .on('abort', exit)
        .on('data', function (chunk) { chunks.push(chunk) })
    })
  },

  promisify (action, args) {
    let deferrable, err, res

    function promisifiedCallback (_err, _res) {
      if (deferrable) {
        if (_err) deferrable.reject(_err)
        else deferrable.resolve(_res)
      } else {
        deferrable = false
        err = _err
        res = _res
      }
    }

    try {
      action.call(this, ...(args || []), promisifiedCallback)
      if (deferrable === undefined) {
        return new Promise((resolve, reject) => {
          deferrable = {resolve, reject}
        })
      }
    } catch (_err) {
      err = _err
    }

    if (err) throw err
    return res
  },

  async invokeAsync (next, res) {
    try {
      res = await res
      try { next(null, res) } catch (err) { process.nextTick(() => { throw err }) }
    } catch (err) {
      try { next(err) } catch (error) { process.nextTick(() => { throw error }) }
    }
  }
}


module.exports = util
