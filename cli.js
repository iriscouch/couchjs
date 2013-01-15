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
var XML = require('./xml')
var util = require('util')
var Fiber = require('fibers')
var optimist = require('optimist')

var couchjs = require('./couchjs')
var console = require('./console')

var INPUT = { 'waiting': false
            , 'queue'  : []
            }


; [Error, Function].forEach(function(type) {
  type.prototype.toSource = type.prototype.toSource || toSource
  type.prototype.toString = type.prototype.toString || toSource
})

function toSource() {
  if(typeof this == 'function')
    return '' + this

  if(this instanceof Error)
    return this.stack

  return util.inspect(this)
}

function main() {
  var argv = optimist.boolean(['h', 'V', 'H'])
                     .describe({ 'h': 'display a short help message and exit'
                               , 'V': 'display version information and exit'
                               , 'H': 'enable couchjs cURL bindings (not implemented)'
                               })
                     .argv

  var main_js = argv._[0]
  console.log('couchjs %s: %s', process.pid, main_js)

  fs.readFile(main_js, 'utf8', function(er, body) {
    if(er)
      throw er

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', function(line) {
      console.log('STDIN: %s', line.trim())
      if(INPUT.waiting)
        INPUT.waiting.run(line)
      else
        INPUT.queue.push(line)
    })
    process.stdin.resume()

    var main_func = Function(['print', 'readline', 'evalcx', 'gc'], body)

    console.log('Call main')
    Fiber(function() { main_func(print, readline, evalcx, gc) }).run()
  })
}

function print(line) {
  console.log('STDOUT: %s', line)
  process.stdout.write(line + '\n')

  try {
    line = JSON.parse(line)
  } catch(er) { return }

  if(line[0] == 'log')
    console.log('LOG: %s', line[1])
}

function readline() {
  var line = INPUT.queue.shift()
  if(line)
    return line

  INPUT.waiting = Fiber.current
  line = Fiber.yield()
  INPUT.waiting = null

  return line
}

function evalcx(source, sandbox) {
  sandbox = sandbox || {}
  //console.log('evalcx in %j: %j', Object.keys(sandbox), source)

  if(source == '')
    return sandbox

  // source might be "function(doc) { emit(doc._id, 1) }"
  var func_arg_names = ['XML']
    , func_arg_vals  = [XML]
    , func_src = 'return (' + source + ')'

  Object.keys(sandbox).forEach(function(key) {
    if(typeof sandbox[key] != 'function')
      return

    func_arg_names.push(key)
    func_arg_vals.push(sandbox[key])
  })

  try {
    var func_maker = Function(func_arg_names, func_src)
  } catch (er) {
    console.log('Error making maker: %s', er.stack)
    return sandbox
  }

  try {
    var func = func_maker.apply(null, func_arg_vals)
  } catch (er) {
    console.log('Error running maker: %s', er.stack)
    return sandbox
  }

  return func
}

function gc() { }

if(require.main === module)
  main()
  //Fiber(main).run()
