var assert = require('assert')
var _ = require('lodash')
var colt = require('../')

colt.register('set', function (content) {
  return content.value
})

colt.register('map', {evaluate: false}, function (content, callback) {
  var method = content.args[0]
  if (method.length < 2) return callback(null, method.call({}, this[content.name]))
  method.call({}, this[content.name], callback)
})

var res = colt()
.set('test', 'foobar')
.set('test2', function () { return 'foobar2' })
.set('test3', function (callback) { process.nextTick(function () { return callback(null, 'foobar3') }) })
.map('marc', function () { return '1' })
.fire(function (err, response) {
  console.log(res)
  assert(!_.isError(err), 'Expect to complete successfully. Threw ' + err)
  assert(response === res, 'Expect to return same object as in the result callback')
  assertEntries(response)
})

function assertEntries () {
  assert(res.test === 'foobar')
  assert(res.test2 === 'foobar2')
  assert(res.test3 === 'foobar3')
  assert(res.marc === '1')
}
