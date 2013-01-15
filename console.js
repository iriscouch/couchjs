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


var console = module.exports = {}
module.exports.log = noop

var LOG_PATH = '/tmp/couchjs.log'
  , stat = null
  , LOG = null

try {
  stat = fs.statSync(LOG_PATH)
} catch(er) {}

if(stat) {
  LOG = fs.createWriteStream(LOG_PATH, {'flags':'a'})

  console.log = log

  process.on('exit', on_exit)
  process.on('uncaughtException', on_exit)
}

function log() {
  var str = util.format.apply(this, arguments)
  LOG.write(str + '\n')
}

function on_exit(er) {
  if(er)
    console.log('Error %d: %s', process.pid, er.stack)
  else
    console.log('Exit %d', process.pid)

  LOG.end()
}

function noop() {}
