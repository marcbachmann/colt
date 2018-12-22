const assert = require('assert')
const colt = require('./index')

colt.register('set', function (content) {
  return content.value
})

colt.register({name: 'map', aliases: ['each'], evaluate: false}, function (content, callback) {
  const method = content.args[0]
  if (method.length < 2) return callback(null, method.call({}, this[content.name]))
  method.call({}, this[content.name], callback)
})

const returnValue = colt()
  .set('test', 'foobar')
  .set('test2', function () { return 'foobar2' })
  .set('test3', function (callback) { process.nextTick(() => callback(null, 'foobar3')) })
  .set('test4', 'FOO')
  .map('test4', (a) => `${a} BAR`)
  .fire(function (err, response) {
    assert.ifError(err)
    assert.equal(response, returnValue, 'Expect to return same object as in the result callback')
    assert.equal(returnValue.test, 'foobar')
    assert.equal(returnValue.test2, 'foobar2')
    assert.equal(returnValue.test3, 'foobar3')
    assert.equal(returnValue.test4, 'FOO BAR')
  })

// ReadStream test
const readStream = require('fs').createReadStream(require.resolve('./package.json'), {encoding: 'utf8'})

colt()
  .set('package', readStream)
  .map('package', (pack) => JSON.parse(pack))
  .end(function (err, res) {
    assert.ifError(err)
    assert.equal(res.package.name, 'colt', 'Reads a stream and maps over the result')
  })

// Test .clone()
const a = colt()
  .set('foo', 'bar')
  .set('hello', 'test')

const b = a.clone()
assert.notEqual(a, b)
b.map('foo', function (val) { assert.equal(val, 'bar'); return 'bar' })
b.map('hello', function (val) { assert.equal(val, 'test'); return 'qux' })
  .end(function (err, res) {
    assert.ifError(err)
    assert.equal(res.foo, 'bar')
    assert.equal(res.hello, 'qux')
  })

a.exec(function (err, res) {
  assert.ifError(err)
  assert.equal(res.foo, 'bar')
  assert.equal(res.hello, 'test')
})

// Test colt.mixin
const colt2 = colt.create().mixin(colt)
assert.equal(colt.__methods.set, colt2.__methods.set)
assert(colt2().set, 'Set method gets defined on new instance')

// Promise support with await
const c = colt()
  .set('foo', 'bar')
  .set('hello', 'test')

assert.equal(typeof c.then, 'function')
assert.equal(typeof c.catch, 'function')

const asyncFunc = async function () {
  const val = await c
  assert.equal(val.foo, 'bar')
  assert.equal(val.hello, 'test')
}

asyncFunc()

// Promise support with then
const d = colt()
  .set('foo', 'bar')
  .set('hello', 'test')

d.then(function (val) {
  assert.equal(val.foo, 'bar')
  assert.equal(val.hello, 'test')
})

// Promise support with catch
colt()
  .set('foo', function () { throw new Error('Foo') })
  .set('hello', 'test')
  .catch(function (err) {
    assert.equal(err.message, 'Foo')
  })

// Promise support with then and catch
colt()
  .set('foo', function () { throw new Error('Foo') })
  .set('hello', 'test')
  .then(function () {
    throw new Error('Never gets called')
  })
  .catch(function (err) {
    assert.equal(err.message, 'Foo')
  })

// Promise support with then, catch
colt()
  .set('foo', function () { throw new Error('Foo') })
  .set('hello', 'test')
  .then(function () {
    throw new Error('Never gets called')
  }, function (err) {
    assert.equal(err.message, 'Foo')
  })
