#!/usr/bin/env node
//
// couchjs replacement
//
// Copyright 2011 Iris Couch
//
//    Licensed under the Apache License, Version 2.0 (the "License");
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at
//
//        http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.

var fs = require('fs')
var util = require('util')
var Fiber = require('fibers')
var optimist = require('optimist')

var couchjs = require('./couchjs')
var LineStream = require('./stream')

var c0nsole = console
console = require('./console')

var INPUT = { 'waiting': false
            , 'queue'  : []
            }


var opts = optimist.boolean(['h', 'V', 'H'])
                   .describe({ 'h': 'display a short help message and exit'
                             , 'V': 'display version information and exit'
                             , 'H': 'enable couchjs cURL bindings (not implemented)'
                             })
                   .usage('$0 <path to main.js>')


function toSource() {
  if(typeof this == 'function')
    return '' + this

  if(this instanceof Error)
    return this.stack

  return util.inspect(this)
}

function main() {
  var main_js = opts.argv._[0]
  if(!main_js)
    return c0nsole.error(opts.help())

  console.log('couchjs %s: %s', process.pid, main_js)

  fs.readFile(main_js, 'utf8', function(er, body) {
    if(er)
      throw er

    var stdin = new LineStream
    stdin.on('data', couchjs.stdin)

    process.stdin.setEncoding('utf8')
    process.stdin.pipe(stdin)
    process.stdin.resume()

    ; [Error, Function].forEach(function(type) {
      type.prototype.toSource = type.prototype.toSource || toSource
      type.prototype.toString = type.prototype.toString || toSource
    })

    var main_func = Function(['print', 'readline', 'evalcx', 'gc'], body)

    console.log('Call main')
    Fiber(function() { main_func(couchjs.print, couchjs.readline, couchjs.evalcx, couchjs.gc) }).run()
  })
}

if(require.main === module)
  main()
