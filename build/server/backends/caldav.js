// Generated by CoffeeScript 1.8.0
"use strict";
var CalDAV_CQValidator, CalendarQueryParser, CozyCalDAVBackend, Exc, ICalParser, SCCS, VCalendar, VEvent, VObject_Reader, VTimezone, VTodo, WebdavAccount, async, axon, time, _ref,
  __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

Exc = require("jsDAV/lib/shared/exceptions");

SCCS = require("jsDAV/lib/CalDAV/properties/supportedCalendarComponentSet");

CalendarQueryParser = require('jsDAV/lib/CalDAV/calendarQueryParser');

VObject_Reader = require('jsDAV/lib/VObject/reader');

CalDAV_CQValidator = require('jsDAV/lib/CalDAV/calendarQueryValidator');

WebdavAccount = require('../models/webdavaccount');

async = require("async");

axon = require('axon');

time = require("time");

_ref = require("cozy-ical"), ICalParser = _ref.ICalParser, VCalendar = _ref.VCalendar, VTimezone = _ref.VTimezone, VEvent = _ref.VEvent, VTodo = _ref.VTodo;

module.exports = CozyCalDAVBackend = (function() {
  function CozyCalDAVBackend(Event, Alarm, User) {
    this.Event = Event;
    this.Alarm = Alarm;
    this.User = User;
    this.createCalendarObject = __bind(this.createCalendarObject, this);
    this._extractCalObject = __bind(this._extractCalObject, this);
    this.saveLastCtag = __bind(this.saveLastCtag, this);
    this.getLastCtag((function(_this) {
      return function(err, ctag) {
        var onChange, socket;
        _this.ctag = ctag + 1;
        _this.saveLastCtag(_this.ctag);
        onChange = function() {
          _this.ctag = _this.ctag + 1;
          return _this.saveLastCtag(_this.ctag);
        };
        socket = axon.socket('sub-emitter');
        socket.connect(9105);
        socket.on('alarm.*', onChange);
        return socket.on('event.*', onChange);
      };
    })(this));
  }

  CozyCalDAVBackend.prototype.getLastCtag = function(callback) {
    return WebdavAccount.first(function(err, account) {
      return callback(err, (account != null ? account.ctag : void 0) || 0);
    });
  };

  CozyCalDAVBackend.prototype.saveLastCtag = function(ctag, callback) {
    if (callback == null) {
      callback = function() {};
    }
    return WebdavAccount.first((function(_this) {
      return function(err, account) {
        if (err || !account) {
          return callback(err);
        }
        return account.updateAttributes({
          ctag: ctag
        }, function() {});
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.getCalendarsForUser = function(principalUri, callback) {
    return this.getCalendarsName((function(_this) {
      return function(err, calendars) {
        var icalCalendars;
        icalCalendars = calendars.map(function(calendar) {
          return calendar = {
            id: calendar,
            uri: encodeURIComponent(calendar),
            principaluri: principalUri,
            "{http://calendarserver.org/ns/}getctag": _this.ctag,
            "{urn:ietf:params:xml:ns:caldav}supported-calendar-component-set": SCCS["new"](['VEVENT', 'VTODO']),
            "{DAV:}displayname": calendar
          };
        });
        return callback(null, icalCalendars);
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.createCalendar = function(principalUri, url, properties, callback) {
    return callback(null, null);
  };

  CozyCalDAVBackend.prototype.updateCalendar = function(calendarId, mutations, callback) {
    return callback(null, false);
  };

  CozyCalDAVBackend.prototype.deleteCalendar = function(calendarId, callback) {
    return callback(null, null);
  };

  CozyCalDAVBackend.prototype._toICal = function(obj, timezone) {
    var cal;
    cal = new VCalendar({
      organization: 'Cozy',
      title: 'Cozy Calendar'
    });
    cal.add(obj.toIcal(timezone));
    return cal.toString();
  };

  CozyCalDAVBackend.prototype.getCalendarObjects = function(calendarId, callback) {
    var objects;
    objects = [];
    return async.parallel([
      (function(_this) {
        return function(cb) {
          return _this.Alarm.byCalendar(calendarId, cb);
        };
      })(this), (function(_this) {
        return function(cb) {
          return _this.Event.byCalendar(calendarId, cb);
        };
      })(this), (function(_this) {
        return function(cb) {
          return _this.User.getTimezone(cb);
        };
      })(this)
    ], (function(_this) {
      return function(err, results) {
        if (err) {
          return callback(err);
        }
        objects = results[0].concat(results[1]).map(function(obj) {
          return {
            id: obj.id,
            uri: obj.caldavuri || (obj.id + '.ics'),
            calendardata: _this._toICal(obj, results[2]),
            lastmodified: new Date().getTime()
          };
        });
        return callback(null, objects);
      };
    })(this));
  };

  CozyCalDAVBackend.prototype._findCalendarObject = function(calendarId, objectUri, callback) {
    return async.series([
      (function(_this) {
        return function(cb) {
          return _this.Alarm.byURI(objectUri, cb);
        };
      })(this), (function(_this) {
        return function(cb) {
          return _this.Event.byURI(objectUri, cb);
        };
      })(this)
    ], (function(_this) {
      return function(err, results) {
        var object, _ref1, _ref2;
        object = ((_ref1 = results[0]) != null ? _ref1[0] : void 0) || ((_ref2 = results[1]) != null ? _ref2[0] : void 0);
        return callback(err, object);
      };
    })(this));
  };

  CozyCalDAVBackend.prototype._extractCalObject = function(calendarobj) {
    var found, obj, _i, _len, _ref1;
    if (calendarobj instanceof VEvent || calendarobj instanceof VTodo) {
      return calendarobj;
    } else {
      _ref1 = calendarobj.subComponents;
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        obj = _ref1[_i];
        found = this._extractCalObject(obj);
        if (found) {
          return found;
        }
      }
      return false;
    }
  };

  CozyCalDAVBackend.prototype._parseSingleObjICal = function(calendarData, callback) {
    return new ICalParser().parseString(calendarData, (function(_this) {
      return function(err, calendar) {
        if (err) {
          return callback(err);
        }
        return callback(null, _this._extractCalObject(calendar));
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.getCalendarObject = function(calendarId, objectUri, callback) {
    return this._findCalendarObject(calendarId, objectUri, (function(_this) {
      return function(err, obj) {
        if (err) {
          return callback(err);
        }
        if (!obj) {
          return callback(null, null);
        }
        return _this.User.getTimezone(function(err, timezone) {
          if (err) {
            return callback(err);
          }
          return callback(null, {
            id: obj.id,
            uri: obj.caldavuri || (obj.id + '.ics'),
            calendardata: _this._toICal(obj, timezone),
            lastmodified: new Date().getTime()
          });
        });
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.createCalendarObject = function(calendarId, objectUri, calendarData, callback) {
    return this._parseSingleObjICal(calendarData, (function(_this) {
      return function(err, obj) {
        var alarm, event;
        if (err) {
          return callback(err);
        }
        if (obj.name === 'VEVENT') {
          event = _this.Event.fromIcal(obj, calendarId);
          event.caldavuri = objectUri;
          return _this.Event.create(event, function(err, event) {
            return callback(err, null);
          });
        } else if (obj.name === 'VTODO') {
          alarm = _this.Alarm.fromIcal(obj, calendarId);
          alarm.caldavuri = objectUri;
          return _this.Alarm.create(alarm, function(err, alarm) {
            return callback(err, null);
          });
        } else {
          return callback(Exc.notImplementedYet());
        }
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.updateCalendarObject = function(calendarId, objectUri, calendarData, callback) {
    return this._findCalendarObject(calendarId, objectUri, (function(_this) {
      return function(err, oldObj) {
        if (err) {
          return callback(err);
        }
        return _this._parseSingleObjICal(calendarData, function(err, newObj) {
          var alarm, event;
          if (err) {
            return callback(err);
          }
          if (newObj.name === 'VEVENT' && oldObj instanceof _this.Event) {
            event = _this.Event.fromIcal(newObj, calendarId).toObject();
            delete event.id;
            return oldObj.updateAttributes(event, function(err, event) {
              return callback(err, null);
            });
          } else if (newObj.name === 'VTODO' && oldObj instanceof _this.Alarm) {
            alarm = _this.Alarm.fromIcal(newObj, calendarId);
            return oldObj.updateAttributes(alarm, function(err, alarm) {
              return callback(err, null);
            });
          } else {
            return callback(Exc.notImplementedYet());
          }
        });
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.deleteCalendarObject = function(calendarId, objectUri, callback) {
    return this._findCalendarObject(calendarId, objectUri, function(err, obj) {
      if (err) {
        return callback(err);
      }
      return obj.destroy(callback);
    });
  };

  CozyCalDAVBackend.prototype.calendarQuery = function(calendarId, filters, callback) {
    var objects, reader, validator;
    objects = [];
    reader = VObject_Reader["new"]();
    validator = CalDAV_CQValidator["new"]();
    return async.parallel([
      (function(_this) {
        return function(cb) {
          return _this.Alarm.byCalendar(calendarId, cb);
        };
      })(this), (function(_this) {
        return function(cb) {
          return _this.Event.byCalendar(calendarId, cb);
        };
      })(this), (function(_this) {
        return function(cb) {
          return _this.User.getTimezone(cb);
        };
      })(this)
    ], (function(_this) {
      return function(err, results) {
        var alarms, events, ex, ical, jugglingObj, timezone, uri, vobj, _i, _len, _ref1;
        if (err) {
          return callback(err);
        }
        alarms = results[0], events = results[1], timezone = results[2];
        try {
          _ref1 = alarms.concat(events);
          for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
            jugglingObj = _ref1[_i];
            ical = _this._toICal(jugglingObj, timezone);
            vobj = reader.read(ical);
            if (validator.validate(vobj, filters)) {
              uri = jugglingObj.caldavuri || (jugglingObj.id + '.ics');
              objects.push({
                id: jugglingObj.id,
                uri: uri,
                calendardata: ical,
                lastmodified: new Date().getTime()
              });
            }
          }
        } catch (_error) {
          ex = _error;
          console.log(ex.stack);
          return callback(ex, []);
        }
        return callback(null, objects);
      };
    })(this));
  };

  CozyCalDAVBackend.prototype.getCalendarsName = function(callback) {
    return async.series([this.Event.tags, this.Alarm.tags], function(err, results) {
      var calendars, rawCalendar, rawCalendars, _i, _len;
      if (err != null) {
        return callback(err);
      } else {
        rawCalendars = results[0].calendar.concat(results[1].calendar);
        calendars = [];
        for (_i = 0, _len = rawCalendars.length; _i < _len; _i++) {
          rawCalendar = rawCalendars[_i];
          if (__indexOf.call(calendars, rawCalendar) < 0) {
            calendars.push(rawCalendar);
          }
        }
        return callback(null, calendars);
      }
    });
  };

  return CozyCalDAVBackend;

})();
