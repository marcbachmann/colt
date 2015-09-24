# Colt

### A sequencing library with a chainable api

### API
```javascript
// The main module returns a colt api instance
// If you register methods on this instance, they will be global
// and will be returned if you require colt.
var colt = require('colt')
colt.register('methodName', function (content[, callback]){
    // content = {name: 'valueKey', value: value}
})

// create a new instance
var chain = colt.new()
chain.register('set', function () {})

// Execute a registered method
res = colt().methodName('user').exec(callback)
res2 = chain().set('user', value).exec(callback)
function callback (err) {
    if (err) throw err
    // res.user is the result of methodName(args...)
    // res2.user equals to value
}

// exit
chain.exec(callback)
chain.fire(callback)
chain.end(callback)
```


#### Example usage
```javascript
colt()
.createUser('marc', {email: 'marc@livingdocs.io', name: 'Marc Bachmann'})
.createDocumentForUser('document', 'marc', {title: 'Foobar'})
.fire(function done (err, resInCallback) {
    // resInCallback equals resAsReturn
    // resAsReturn.user equals {id: 1, name: 'Marc Bachmann', ema...}
})
```


#### Registering methods
```javascript
// Register methods
var colt = require('colt')

colt.register('set', function (content) {
  return content.value
})

colt.register('createUser', function (content, callback) {
  request.post('/users', function (err, user) { callback(err, user) })
})

var nope = {evaluate: false}
colt.register('createDocumentForUser', nope, function (content, callback) {
  var data = _.extend(content.args[1], {user_id: this[content.args[0]].id })
  request.post('/documents', data, function (err, document) {
    callback(err, document)
  })
})
```
