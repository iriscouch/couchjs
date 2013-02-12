#!/usr/bin/env node
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

module.exports = main

var util = require('util')
var optimist = require('optimist')

var console = require('./console')

var couch = { 'log': mk_couch_log('info')
            }


var opts = optimist.usage('$0')


function main() {
  if(opts.argv.help)
    return console.log(opts.help())

  console.log('Extra CouchDB daemon: %s', process.pid)
  couch.log('CouchDB daemon: %s', process.pid)

  for (var k in process.env)
    if(k.match(/^_couchdb_/))
      couch.log('  %s -> %s', k, process.env[k])

  setInterval(function() {
    console.log('Still here')
    couch.log('Still in couch')
  }, 60000)
}


function mk_couch_log(level) {
  return logger

  function logger() {
    var str = util.format.apply(util, arguments)
    var msg = ['log', str, {'level':level}]
    msg = JSON.stringify(msg)
    process.stdout.write(msg + '\n')
  }
}


if(require.main === module)
  main()
