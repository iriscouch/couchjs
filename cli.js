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

var INPUT = { 'waiting': false
            , 'queue'  : []
            }

var LOG_PATH = '/tmp/couchjs.' + process.pid + '.log'
LOG_PATH = '/tmp/couchjs.log' // XXX
var LOG = fs.createWriteStream(LOG_PATH, {'flags':'a'})
process.on('exit', function() {
  console.log('Exit: %s', process.pid)
  LOG.end()
})

process.on('uncaughtException', function(er) {
  console.log('Exit %s: %s', process.pid, er.stack)
  LOG.end()
})

var console = {}
console.log = function() {
  var str = util.format.apply(this, arguments)
  LOG.write(str + '\n')
}

var toSource_types = [Error]
//toSource_types = []
toSource_types.forEach(function(type) {
  type.prototype.toString = type.prototype.toString || toSource
  type.prototype.toSource = type.prototype.toSource || toSource
})

function toSource() {
  if(typeof this == 'function')
    return '' + this

  if(this instanceof Error)
    return this.stack

  return util.inspect(this)
}

function main() {
  var args = argv()
    , main_js = args._[0]

  console.log('couchjs %s: %s', process.pid, main_js)
  console.log('My fiber: %j', Fiber.current)
  fs.readFile(main_js, 'utf8', function(er, body) {
    if(er)
      throw er

    process.stdin.setEncoding('utf8')
    process.stdin.on('data', input)
    process.stdin.resume()

    console.log('Call main')
    var main_func = Function(['print', 'readline', 'evalcx', 'gc'], body)

    Fiber(function() { main_func(print, readline, evalcx, gc) }).run()
    console.log('Called main')
  })
}

function print(line) {
  console.log('STDOUT: %s', line)
  process.stdout.write(line + '\n')

  try {
    line = JSON.parse(line)
  } catch(er) { return }

  var cmd = line[0]
  if(cmd == 'log')
    console.log('LOG: %s', line[1])
}

function input(line) {
  console.log('STDIN in %j: %s', Fiber.current, line.trim())
  if(INPUT.waiting)
    INPUT.waiting.run(line)
  else
    INPUT.queue.push(line)
}

function readline() {
  var fiber = Fiber.current
  //console.log('** readline in %j', fiber)

  var line = INPUT.queue.shift()
  if(line)
    return line

  //console.log('  -> wait for input')
  INPUT.waiting = fiber
  line = Fiber.yield()
  INPUT.waiting = null

  //console.log('readline %j return: %j', Fiber.current, line)
  return line
}

function evalcx(source, sandbox) {
  sandbox = sandbox || {}
  //console.log('evalcx in %j: %j', Object.keys(sandbox), source)

  if(source == '')
    return sandbox

  // source might be "function(doc) { emit(doc._id, 1) }"
  var func_arg_names = []
    , func_arg_vals  = []
    , func_src = 'return (' + source + ')'

  Object.keys(sandbox).forEach(function(key) {
    if(typeof sandbox[key] != 'function')
      return

    func_arg_names.push(key)
    func_arg_vals.push(sandbox[key])
  })

  var func_maker = Function(func_arg_names, func_src)
  var func = func_maker.apply(null, func_arg_vals)

  return func
}

function gc() { }

function argv() {
  return optimist.boolean(['h', 'V', 'H'])
                 .describe({ 'h': 'display a short help message and exit'
                           , 'V': 'display version information and exit'
                           , 'H': 'enable couchjs cURL bindings (not implemented)'
                           })
                 .argv
}

if(require.main === module)
  main()
  //Fiber(main).run()
