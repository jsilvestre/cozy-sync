// Generated by CoffeeScript 1.9.0
var account;

account = require('./account');

module.exports = {
  '': {
    get: account.index
  },
  'token': {
    post: account.createCredentials
  }
};
