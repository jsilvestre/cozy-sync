// Generated by CoffeeScript 1.10.0
var Event, Tag, VAlarm, VCalendar, VEvent, VTodo, async, cozydb, moment, ref, time;

cozydb = require('cozydb');

time = require('time');

moment = require('moment');

async = require('async');

ref = require('../lib/ical_helpers'), VCalendar = ref.VCalendar, VTodo = ref.VTodo, VAlarm = ref.VAlarm, VEvent = ref.VEvent;

Tag = require('../models/tag');

module.exports = Event = cozydb.getModel('Event', {
  id: {
    type: String,
    "default": null
  },
  caldavuri: String,
  start: String,
  end: String,
  place: {
    type: String,
    "default": ''
  },
  details: {
    type: String,
    "default": ''
  },
  description: {
    type: String,
    "default": ''
  },
  rrule: String,
  attendees: {
    type: [Object]
  },
  related: {
    type: String,
    "default": null
  },
  timezone: {
    type: String
  },
  alarms: {
    type: [Object]
  },
  tags: {
    type: function(x) {
      return x;
    }
  },
  created: {
    type: String
  },
  lastModification: {
    type: String
  },
  mozLastack: {
    type: String
  }
});

require('cozy-ical').decorateEvent(Event);

Event.dateFormat = 'YYYY-MM-DD';

Event.ambiguousDTFormat = 'YYYY-MM-DD[T]HH:mm:00.000';

Event.utcDTFormat = 'YYYY-MM-DD[T]HH:mm:00.000[Z]';

Event.alarmTriggRegex = /(\+?|-)PT?(\d+)(W|D|H|M|S)/;

Event.all = function(cb) {
  return Event.request('byURI', cb);
};

Event.byCalendar = function(calendarId, callback) {
  return Event.request('byCalendar', {
    key: calendarId
  }, callback);
};

Event.tags = function(callback) {
  return Event.rawRequest("tags", {
    group: true
  }, function(err, results) {
    var i, len, out, ref1, result, tag, type;
    if (err) {
      return callback(err);
    }
    out = {
      calendar: [],
      tag: []
    };
    for (i = 0, len = results.length; i < len; i++) {
      result = results[i];
      ref1 = result.key, type = ref1[0], tag = ref1[1];
      out[type].push(tag);
    }
    return callback(null, out);
  });
};

Event.calendars = function(callback) {
  return Event.tags(function(err, results) {
    if (err) {
      return callback(err, []);
    }
    return async.map(results.calendar, Tag.getOrCreateByName, callback);
  });
};

Event.byURI = function(uri, cb) {
  var req;
  req = Event.request('byURI', null, cb);
  req.body = JSON.stringify({
    key: uri
  });
  return req.setHeader('content-type', 'application/json');
};
