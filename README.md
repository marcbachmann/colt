# Colt

### A sequencing library with a chainable api


```javascript
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

var resAsReturn = colt()
.createUser('marc', {email: 'marc@livingdocs.io', name: 'Marc Bachmann'})
.createDocumentForUser('document', 'marc', {title: 'Foobar'})
.fire(done)

function done (err, resInCallback) {
    // resInCallback equals resAsReturn
    // resAsReturn.user equals {id: 1, name: 'Marc Bachmann', ema...}
}
```
