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

var console = require('./console')


function main() {
  console.log('Extra CouchDB daemon: %s', process.pid)
  setInterval(function() {
    console.log('Still here')
    couch_info('Still in couch')
  }, 5000)
}

function couch_debug() {
  send_couch_log('debug', arguments)
}

function couch_info() {
  send_couch_log('info', arguments)
}

function send_couch_log(level, args) {
  var str = util.format.apply(util, args)
  var msg = ['log', str, {'level':level}]
  msg = JSON.stringify(msg) + "\n"
  process.stdout.write(msg)
}
