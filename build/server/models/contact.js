// Generated by CoffeeScript 1.10.0
var Contact, VCardParser, cozydb, fs;

fs = require('fs');

cozydb = require('cozydb');

VCardParser = require('cozy-vcard');

module.exports = Contact = cozydb.getModel('Contact', {
  id: String,
  carddavuri: String,
  fn: String,
  n: String,
  datapoints: Object,
  note: String,
  tags: function(x) {
    return x;
  },
  _attachments: Object,
  org: String,
  title: String,
  department: String,
  bday: String,
  nickname: String,
  url: String,
  revision: Date
});

Contact.afterInitialize = function() {
  if ((this.n == null) || this.n === '') {
    if (this.fn == null) {
      this.fn = '';
    }
    this.n = VCardParser.fnToN(this.fn).join(';');
  } else if ((this.fn == null) || this.fn === '') {
    this.fn = VCardParser.nToFN(this.n.split(';'));
  }
  return this;
};

Contact.prototype.getURI = function() {
  return this.carddavuri || this.id + '.vcf';
};

Contact.all = function(cb) {
  return Contact.request('byURI', cb);
};

Contact.byURI = function(uri, cb) {
  return Contact.request('byURI', {
    key: uri
  }, cb);
};

Contact.prototype.addTag = function(tag) {
  if (this.tags == null) {
    this.tags = [];
  }
  if (this.tags.indexOf(tag === -1)) {
    return this.tags.push(tag);
  }
};

Contact.byTag = function(tag, callback) {
  return Contact.request('byTag', {
    key: tag
  }, callback);
};

Contact.tags = function(callback) {
  return Contact.rawRequest("tags", {
    group: true
  }, function(err, results) {
    if (err) {
      return callback(err, []);
    }
    return callback(null, results.map(function(keyValue) {
      return keyValue.key;
    }));
  });
};

Contact.prototype.toVCF = function(callback) {
  var buffers, ref, stream;
  if (((ref = this._attachments) != null ? ref.picture : void 0) != null) {
    stream = this.getFile('picture', function() {});
    buffers = [];
    stream.on('data', buffers.push.bind(buffers));
    return stream.on('end', (function(_this) {
      return function() {
        var picture;
        picture = Buffer.concat(buffers).toString('base64');
        return callback(null, VCardParser.toVCF(_this, picture));
      };
    })(this));
  } else {
    return callback(null, VCardParser.toVCF(this));
  }
};

Contact.prototype.handlePhoto = function(photo, callback) {
  var filePath;
  if ((photo != null) && photo.length > 0) {
    filePath = "/tmp/" + this.id + ".jpg";
    return fs.writeFile(filePath, photo, {
      encoding: 'base64'
    }, (function(_this) {
      return function(err) {
        return _this.attachFile(filePath, {
          name: 'picture'
        }, function(err) {
          return fs.unlink(filePath, callback);
        });
      };
    })(this));
  } else {
    return callback(null);
  }
};

Contact.parse = function(vcf) {
  var contact, parser;
  parser = new VCardParser();
  parser.read(vcf);
  contact = parser.contacts[0];
  return new Contact(parser.contacts[0]);
};
