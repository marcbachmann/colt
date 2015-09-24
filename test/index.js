var assert = require('assert')
var colt = require('../')

colt.register('set', function (content) {
  return content.value
})

colt.register({name: 'map', aliases: ['each'], evaluate: false}, function (content, callback) {
  var method = content.args[0]
  if (method.length < 2) return callback(null, method.call({}, this[content.name]))
  method.call({}, this[content.name], callback)
})

var res = colt()
.set('test', 'foobar')
.set('test2', function () { return 'foobar2' })
.set('test3', function (callback) { process.nextTick(function () { return callback(null, 'foobar3') }) })
.set('test4', 'FOO')
.map('test4', function (a) { return a + ' BAR' })
.fire(function (err, response) {
  assert(!(err instanceof Error), 'Expect to complete successfully. Threw ' + err)
  assert(response === res, 'Expect to return same object as in the result callback')
  assert(res.test === 'foobar')
  assert(res.test2 === 'foobar2')
  assert(res.test3 === 'foobar3')
  assert(res.test4 === 'FOO BAR')
})

// ReadStream test
var readStream = require('fs').createReadStream(require.resolve('../package.json'), {encoding: 'utf8'})

colt()
.set('package', readStream)
.map('package', function (pack) { return JSON.parse(pack) })
.end(function (err, res) {
  assert(!err)
  assert(res.package.name === 'colt', 'Reads a stream and maps over the result')
})
