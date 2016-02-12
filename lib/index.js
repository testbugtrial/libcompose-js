var yaml = require('js-yaml');
var async = require('async');
var _ = require('lodash');
var DepGraph = require('dependency-graph').DepGraph;

var Service = require('./service')

exports.parse = parse;
exports.create = create;
exports.start = start;
exports.up = up;

function Compose(){
  this.config = {};
}

Compose.prototype.parse = function(str){
  var self = this;
  var obj = yaml.safeLoad(str);
  self.services = {}
  _(obj['services']).forEach(function(hash, key){
    self.services[key] = new Service(hash)
  })
  return this;
}

Compose.prototype.dependencies = function(services){
  var self = this;
  services = services || _(this.services).keys();

  var graph = new DepGraph();
  _(services).forEach(function(serviceName){
    graph.addNode(serviceName);
    var links = self.services[serviceName].hash['links'] || [];
    var dependsOn = self.services[serviceName].hash['depends_on'] || [];
    
    _.concat(links, dependsOn).forEach(function(link){
      var service = link.split(':')[0];
      graph.addNode(service);
      graph.addDependency(serviceName, service);
    })
  })
  return graph.overallOrder()
}

Compose.prototype.create = function(options, services, cb){
  var self = this;
  options = options || {};
  services = this.dependencies(services)
  async.series(services, function(service_name, cb){
    self.services[service_name].create(options, cb);
  }, cb)
  return this;
}

Compose.prototype.start = function(options, services, cb){
  options = options || {};
  services = this.dependencies(services)
  async.series(services, function(service_name, cb){
    self.services[service_name].start(options, cb);
  }, cb)
  return this;
}

Compose.prototype.up = function(options, services, cb){
  async.series([function(cb){
    this.create(options, services);
  }, function(cb){
    this.start(options, services);
  }], cb)
  return this;
}