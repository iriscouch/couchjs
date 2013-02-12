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
var http = require('http')
var request = require('request')
var optimist = require('optimist')
var pushover = require('pushover')

var console = require('./console')
var VER = require('./package.json').version

var couch = { 'log': mk_couch_log('info')
            }


var opts = optimist.usage('$0')

var COUCH_PORT = null
var COUCH_DIR = null
var COUCH_PASSWORD = null
var GIT_PORT = null

function main() {
  if(opts.argv.help)
    return console.log(opts.help())

  console.log('Extra CouchDB daemon: %s', process.pid)
  couch.log('CouchDB daemon %s: %s', VER, process.pid)

  var env = {}
  for (var k in process.env) {
    var match = k.match(/^_couchdb_(.*)$/)
    if(match)
      env[match[1]] = process.env[k]
  }

  for (k in env)
    couch.log('  %s = %s', k, env[k])

  if(env.port && env.password && env.git_port && env.priv_dir)
    return git(env)

  setInterval(function() {
    console.log('Still here')
    couch.log('Still in couch')
  }, 60000)
}

function git(env) {
  GIT_PORT = +env.git_port
  COUCH_PORT = +env.port
  COUCH_DIR = env.priv_dir
  COUCH_PASSWORD = env.password

  GIT_PORT = 18872 // XXX

  var repo_dir = util.format('%s/couchjs-%s', COUCH_DIR, VER)
  //var couch_url = util.format('http://_nodejs:%s@127.0.0.1:%d', password, couch_port)
  //couch.log('couch url %j', couch_url)

  auth('_nodejs', COUCH_PASSWORD, function(er, userCtx) {
    if(er)
      throw er

    var roles = userCtx.roles || []
    if(userCtx.name != '_nodejs' || !~roles.indexOf('_admin'))
      throw new Error('Not admin: ' + JSON.stringify(res.body.userCtx))

    var repos = pushover(repo_dir)
    repos.on('push', function(push) {
      couch.log('push %j/%j + (%j)', push.repo, push.commit, push.branch)
      push.accept()
    })

    repos.on('fetch', function(fetch) {
      couch.log('fetch %j', fetch.commit)
      fetch.accept()
    })

    var server = http.createServer(function(req, res) {
      req.pause()
      auth_req(req, function(er, userCtx) {
        if(er) {
          couch.log('Bad req %s: %s', req.url, er.message)
          return res.end()
        }

        var roles = userCtx.roles || []
        if(!~ roles.indexOf('_admin')) {
          couch.log('Not admin: %s', req.url)
          return res.end()
        }

        couch.log('Handle Git: %s', req.url)
        repos.handle(req, res)
        req.resume()
      })
    })

    couch.log('Git listen: %s', GIT_PORT)
    server.listen(GIT_PORT)
  })
}

function auth(user, pass, callback) {
  if(!COUCH_PORT)
    return process.nextTick(function() { callback(new Error('No _couchdb_port')) })

  var url =
    (user || pass)
      ? util.format('http://%s:%s@127.0.0.1:%d/_session', user, pass, COUCH_PORT) // authenticated
      : util.format('http://127.0.0.1:%d/_session', COUCH_PORT)                   // anonymous

  couch.log('auth: %j', url)
  request({'url':url, 'json':true}, function(er, res) {
    couch.log('auth result: %j', res.body)
    if(er)
      return callback(er)

    if(res.statusCode != 200)
      return callback(new Error('Bad status '+res.statusCode+' for auth: ' + res.body))

    return callback(null, res.body.userCtx)
  })
}

function auth_req(req, callback) {
  var headers = req.headers || {}
  var auth_str = req.headers.authorization || ''

  var match = auth_str.match(/^Basic (.+)$/)
  if(!match)
    return auth(null, null, callback)

  try {
    auth_str = new Buffer(match[1], 'base64').toString()
    match = auth_str.match(/^([^:]+):(.+)$/)
  } catch (er) {
    return callback(er)
  }

  if(!match)
    return callback(new Error('Bad auth string: ' + auth_str))

  auth(match[1], match[2], callback)
}



//
// Utilities
//

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
