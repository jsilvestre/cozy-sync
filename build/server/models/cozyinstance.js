// Generated by CoffeeScript 1.10.0
var CozyInstance, cozydb;

cozydb = require('cozydb');

module.exports = CozyInstance = cozydb.getModel('CozyInstance', {
  id: String,
  domain: String,
  locale: String
});

CozyInstance.first = function(callback) {
  return CozyInstance.request('all', function(err, instances) {
    if (err) {
      return callback(err);
    } else if (!instances || instances.length === 0) {
      return callback(null, null);
    } else {
      return callback(null, instances[0]);
    }
  });
};
