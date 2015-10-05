# Colt

### A sequencing library with a chainable api

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


### API

var colt = require('colt')

#### colt
Is a colt api instance

#### colt.create(), colt.new()
Creates a new colt api instance

#### colt1.mixin(colt2)
Extends colt1 with all the methods from colt2

#### colt.clone()
Returns a new colt api instance with all the methods from colt

#### colt.register(yourMethodName, function (content[, callback]))
Is used to register a method, content contains a name and a value object.

#### colt()
Returns an object which contains all colt methods you registered

#### colt()[yourMethodName](mapName, value)
`yourMethodName` is the name of a method you registered using `colt.register`

#### colt().end, colt().fire, colt().exec
Are methods which accept a node type callback `callback(err, res)`
`res` contains all values which get populated during the execution


### How to register methods
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


### More examples
```javascript
// The main module returns a colt api instance
// If you register methods on this instance, they will be global
// and will be returned if you require colt.
var colt = require('colt')
colt.load('methodName', function (content[, callback]){
    // content = {name: 'valueKey', value: value}
})

// create a new instance
var chain = colt.new()

// Or clone an instance
chain = colt.clone()

// You can use .mixin to inherit from specific colt instances
chain.mixin(colt)


chain.load('set', function (content) { callback(null, content.value) })

// Execute a registered method
var res = chain().set('user', {id: 1}).exec(callback)
function callback (err) {
    if (err) throw err
    // res.user is the result of the method defined in chain.load('set', ...
}

// exit
chain.exec(callback)
chain.fire(callback)
chain.end(callback)
```


### How we use it (sorry for the coffee-script)
```coffee
describe 'User api:', ->

  // Colt version
  before (done) ->
    @res = colt()
    .createUser('normalUser')
    .createUser('adminUser', {admin: true})
    .createDocumentForUser('document', 'normalUser', {title: 'Foobar'})
    .end(done)


  // What this would look like with async.js
  // This structures get really complex if you want
  // to create relations and depend on previous results
  before (done) ->
    async.series
      normalUser: (done) =>
        userSupport.createUser (err, user) =>
          @_userId = user.id
          done(err, user)

      document: (done) ->
        userSupport.createDocument({
          title: 'Foobar',
          user_id: @_userId
        }, done)

      adminUser: (done) -> userSupport.createUser({admin: true}, done)
    , (err, res) =>
      @res = res
      done(err)


  it 'requires admin access to access users endpoint', (done) ->
    request.get('/users')
    .withUser(@res.normalUser)
    .expect(401)
    .end(done)

  it 'allows admins to access the page', (done) ->
    request.get('/users')
    .withUser(@res.adminUser)
    .expect(200)
    .end(done)
```
