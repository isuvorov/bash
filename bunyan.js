#!/usr/bin/env node

/**
 * Copyright 2016 Trent Mick. All rights reserved.
 * Copyright 2016 Joyent Inc. All rights reserved.
 *
 * bunyan -- filter and pretty-print Bunyan log files (line-delimited JSON)
 *
 * See <https://github.com/trentm/node-bunyan>.
 *
 * -*- mode: js -*-
 * vim: expandtab:ts=4:sw=4
 */
"use strict";

function _typeof2(obj) { if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") { _typeof2 = function _typeof2(obj) { return typeof obj; }; } else { _typeof2 = function _typeof2(obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return _typeof2(obj); }

function _typeof(obj) {
  if (typeof Symbol === "function" && _typeof2(Symbol.iterator) === "symbol") {
    module.exports = _typeof = function _typeof(obj) {
      return _typeof2(obj);
    };
  } else {
    module.exports = _typeof = function _typeof(obj) {
      return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : _typeof2(obj);
    };
  }

  return _typeof(obj);
}


var VERSION = '1.8.1';
var p = console.log;

var util = require('util');

var pathlib = require('path');

var vm = require('vm');

var http = require('http');

var fs = require('fs');

var warn = console.warn;

var child_process = require('child_process'),
    spawn = child_process.spawn,
    exec = child_process.exec,
    execFile = child_process.execFile;

var assert = require('assert');

var moment = null; // try {
//     var moment = require('moment');
// } catch (e) {
//     moment = null;
// }
//---- globals and constants

var nodeVer = process.versions.node.split('.').map(Number);
var nodeSpawnSupportsStdio = nodeVer[0] > 0 || nodeVer[1] >= 8; // Internal debug logging via `console.warn`.

var _DEBUG = false; // Output modes.

var OM_LONG = 1;
var OM_JSON = 2;
var OM_INSPECT = 3;
var OM_SIMPLE = 4;
var OM_SHORT = 5;
var OM_BUNYAN = 6;
var OM_FROM_NAME = {
  'long': OM_LONG,
  'paul': OM_LONG,

  /* backward compat */
  'json': OM_JSON,
  'inspect': OM_INSPECT,
  'simple': OM_SIMPLE,
  'short': OM_SHORT,
  'bunyan': OM_BUNYAN
}; // Levels

var TRACE = 10;
var DEBUG = 20;
var INFO = 30;
var WARN = 40;
var ERROR = 50;
var FATAL = 60;
var levelFromName = {
  'trace': TRACE,
  'debug': DEBUG,
  'info': INFO,
  'warn': WARN,
  'error': ERROR,
  'fatal': FATAL
};
var nameFromLevel = {};
var upperNameFromLevel = {};
var upperPaddedNameFromLevel = {};
Object.keys(levelFromName).forEach(function (name) {
  var lvl = levelFromName[name];
  nameFromLevel[lvl] = name;
  upperNameFromLevel[lvl] = name.toUpperCase();
  upperPaddedNameFromLevel[lvl] = '[' + name[0] + ']'; // upperPaddedNameFromLevel[lvl] = (
  //     name.length === 4 ? ' ' : '') + name.toUpperCase();
}); // Display time formats.

var TIME_UTC = 1; // the default, bunyan's native format

var TIME_LOCAL = 2; // Timezone formats: output format -> momentjs format string

var TIMEZONE_UTC_FORMATS = {
  "long": '[[]YYYY-MM-DD[T]HH:mm:ss.SSS[Z][]]',
  "short": 'HH:mm:ss.SSS[Z]'
};
var TIMEZONE_LOCAL_FORMATS = {
  "long": '[[]YYYY-MM-DD[T]HH:mm:ss.SSSZ[]]',
  "short": 'HH:mm:ss.SSS'
}; // The current raw input line being processed. Used for `uncaughtException`.

var currLine = null; // Child dtrace process, if any. Used for signal-handling.

var child = null; // Whether ANSI codes are being used. Used for signal-handling.

var usingAnsiCodes = false; // Used to tell the 'uncaughtException' handler that '-c CODE' is being used.

var gUsingConditionOpts = false; // Pager child process, and output stream to which to write.

var pager = null;
var stdout = process.stdout; // Whether we are reading from stdin.

var readingStdin = false; //---- support functions

function getVersion() {
  return VERSION;
}

var format = util.format;

if (!format) {
  /* BEGIN JSSTYLED */
  // If not node 0.6, then use its `util.format`:
  // <https://github.com/joyent/node/blob/master/lib/util.js#L22>:
  var inspect = util.inspect;
  var formatRegExp = /%[sdj%]/g;

  format = function format(f) {
    if (typeof f !== 'string') {
      var objects = [];

      for (var i = 0; i < arguments.length; i++) {
        objects.push(inspect(arguments[i]));
      }

      return objects.join(' ');
    }

    var i = 1;
    var args = arguments;
    var len = args.length;
    var str = String(f).replace(formatRegExp, function (x) {
      if (i >= len) return x;

      switch (x) {
        case '%s':
          return String(args[i++]);

        case '%d':
          return Number(args[i++]);

        case '%j':
          return JSON.stringify(args[i++]);

        case '%%':
          return '%';

        default:
          return x;
      }
    });

    for (var x = args[i]; i < len; x = args[++i]) {
      if (x === null || (0, _typeof)(x) !== 'object') {
        str += ' ' + x;
      } else {
        str += ' ' + inspect(x);
      }
    }

    return str;
  };
  /* END JSSTYLED */

}

function indent(s) {
  return '    ' + s.split(/\r?\n/).join('\n    ');
}

function objCopy(obj) {
  if (obj === null) {
    return null;
  } else if (Array.isArray(obj)) {
    return obj.slice();
  } else {
    var copy = {};
    Object.keys(obj).forEach(function (k) {
      copy[k] = obj[k];
    });
    return copy;
  }
}

function printHelp() {
  /* BEGIN JSSTYLED */
  p('Usage:');
  p('  bunyan [OPTIONS] [FILE ...]');
  p('  ... | bunyan [OPTIONS]');
  p('  bunyan [OPTIONS] -p PID');
  p('');
  p('Filter and pretty-print Bunyan log file content.');
  p('');
  p('General options:');
  p('  -h, --help    print this help info and exit');
  p('  --version     print version of this command and exit');
  p('');
  p('Runtime log snooping (via DTrace, only on supported platforms):');
  p('  -p PID        Process bunyan:log-* probes from the process');
  p('                with the given PID. Can be used multiple times,');
  p('                or specify all processes with "*", or a set of');
  p('                processes whose command & args match a pattern');
  p('                with "-p NAME".');
  p('');
  p('Filtering options:');
  p('  -l, --level LEVEL');
  p('                Only show messages at or above the specified level.');
  p('                You can specify level *names* or the internal numeric');
  p('                values.');
  p('  -c, --condition CONDITION');
  p('                Run each log message through the condition and');
  p('                only show those that return truish. E.g.:');
  p('                    -c \'this.pid == 123\'');
  p('                    -c \'this.level == DEBUG\'');
  p('                    -c \'this.msg.indexOf("boom") != -1\'');
  p('                "CONDITION" must be legal JS code. `this` holds');
  p('                the log record. The TRACE, DEBUG, ... FATAL values');
  p('                are defined to help with comparing `this.level`.');
  p('  --strict      Suppress all but legal Bunyan JSON log lines. By default');
  p('                non-JSON, and non-Bunyan lines are passed through.');
  p('');
  p('Output options:');
  p('  --pager       Pipe output into `less` (or $PAGER if set), if');
  p('                stdout is a TTY. This overrides $BUNYAN_NO_PAGER.');
  p('                Note: Paging is only supported on node >=0.8.');
  p('  --no-pager    Do not pipe output into a pager.');
  p('  --color       Colorize output. Defaults to try if output');
  p('                stream is a TTY.');
  p('  --no-color    Force no coloring (e.g. terminal doesn\'t support it)');
  p('  -o, --output MODE');
  p('                Specify an output mode/format. One of');
  p('                  long: (the default) pretty');
  p('                  json: JSON output, 2-space indent');
  p('                  json-N: JSON output, N-space indent, e.g. "json-4"');
  p('                  bunyan: 0 indented JSON, bunyan\'s native format');
  p('                  inspect: node.js `util.inspect` output');
  p('                  short: like "long", but more concise');
  p('  -j            shortcut for `-o json`');
  p('  -0            shortcut for `-o bunyan`');
  p('  -L, --time local');
  p('                Display time field in local time, rather than UTC.');
  p('');
  p('Environment Variables:');
  p('  BUNYAN_NO_COLOR    Set to a non-empty value to force no output ');
  p('                     coloring. See "--no-color".');
  p('  BUNYAN_NO_PAGER    Disable piping output to a pager. ');
  p('                     See "--no-pager".');
  p('');
  p('See <https://github.com/trentm/node-bunyan> for more complete docs.');
  p('Please report bugs to <https://github.com/trentm/node-bunyan/issues>.');
  /* END JSSTYLED */
}
/*
 * If the user specifies multiple input sources, we want to print out records
 * from all sources in a single, chronologically ordered stream.  To do this
 * efficiently, we first assume that all records within each source are ordered
 * already, so we need only keep track of the next record in each source and
 * the time of the last record emitted.  To avoid excess memory usage, we
 * pause() streams that are ahead of others.
 *
 * 'streams' is an object indexed by source name (file name) which specifies:
 *
 *    stream        Actual stream object, so that we can pause and resume it.
 *
 *    records       Array of log records we've read, but not yet emitted.  Each
 *                  record includes 'line' (the raw line), 'rec' (the JSON
 *                  record), and 'time' (the parsed time value).
 *
 *    done          Whether the stream has any more records to emit.
 */


var streams = {};

function gotRecord(file, line, rec, opts, stylize) {
  var time = new Date(rec.time);
  streams[file]['records'].push({
    line: line,
    rec: rec,
    time: time
  });
  emitNextRecord(opts, stylize);
}

function filterRecord(rec, opts) {
  if (opts.level && rec.level < opts.level) {
    return false;
  }

  if (opts.condFuncs) {
    var recCopy = objCopy(rec);

    for (var i = 0; i < opts.condFuncs.length; i++) {
      var pass = opts.condFuncs[i].call(recCopy);
      if (!pass) return false;
    }
  } else if (opts.condVm) {
    for (var i = 0; i < opts.condVm.length; i++) {
      var pass = opts.condVm[i].runInNewContext(rec);
      if (!pass) return false;
    }
  }

  return true;
}

function emitNextRecord(opts, stylize) {
  var ofile, ready, minfile, rec;

  for (;;) {
    /*
     * Take a first pass through the input streams to see if we have a
     * record from all of them.  If not, we'll pause any streams for
     * which we do already have a record (to avoid consuming excess
     * memory) and then wait until we have records from the others
     * before emitting the next record.
     *
     * As part of the same pass, we look for the earliest record
     * we have not yet emitted.
     */
    minfile = undefined;
    ready = true;

    for (ofile in streams) {
      if (streams[ofile].stream === null || !streams[ofile].done && streams[ofile].records.length === 0) {
        ready = false;
        break;
      }

      if (streams[ofile].records.length > 0 && (minfile === undefined || streams[minfile].records[0].time > streams[ofile].records[0].time)) {
        minfile = ofile;
      }
    }

    if (!ready || minfile === undefined) {
      for (ofile in streams) {
        if (!streams[ofile].stream || streams[ofile].done) continue;

        if (streams[ofile].records.length > 0) {
          if (!streams[ofile].paused) {
            streams[ofile].paused = true;
            streams[ofile].stream.pause();
          }
        } else if (streams[ofile].paused) {
          streams[ofile].paused = false;
          streams[ofile].stream.resume();
        }
      }

      return;
    }
    /*
     * Emit the next record for 'minfile', and invoke ourselves again to
     * make sure we emit as many records as we can right now.
     */


    rec = streams[minfile].records.shift();
    emitRecord(rec.rec, rec.line, opts, stylize);
  }
}
/**
 * Return a function for the given JS code that returns.
 *
 * If no 'return' in the given javascript snippet, then assume we are a single
 * statement and wrap in 'return (...)'. This is for convenience for short
 * '-c ...' snippets.
 */


function funcWithReturnFromSnippet(js) {
  // auto-"return"
  if (js.indexOf('return') === -1) {
    if (js.substring(js.length - 1) === ';') {
      js = js.substring(0, js.length - 1);
    }

    js = 'return (' + js + ')';
  } // Expose level definitions to condition func context


  var varDefs = [];
  Object.keys(upperNameFromLevel).forEach(function (lvl) {
    varDefs.push(format('var %s = %d;', upperNameFromLevel[lvl], lvl));
  });
  varDefs = varDefs.join('\n') + '\n';
  return new Function(varDefs + js);
}
/**
 * Parse the command-line options and arguments into an object.
 *
 *    {
 *      'args': [...]       // arguments
 *      'help': true,       // true if '-h' option given
 *       // etc.
 *    }
 *
 * @return {Object} The parsed options. `.args` is the argument list.
 * @throws {Error} If there is an error parsing argv.
 */


function parseArgv(argv) {
  var parsed = {
    args: [],
    help: false,
    color: null,
    paginate: null,
    outputMode: OM_LONG,
    jsonIndent: 2,
    level: null,
    strict: false,
    pids: null,
    pidsType: null,
    timeFormat: TIME_UTC // one of the TIME_ constants

  }; // Turn '-iH' into '-i -H', except for argument-accepting options.

  var args = argv.slice(2); // drop ['node', 'scriptname']

  var newArgs = [];
  var optTakesArg = {
    'd': true,
    'o': true,
    'c': true,
    'l': true,
    'p': true
  };

  for (var i = 0; i < args.length; i++) {
    if (args[i].charAt(0) === '-' && args[i].charAt(1) !== '-' && args[i].length > 2) {
      var splitOpts = args[i].slice(1).split('');

      for (var j = 0; j < splitOpts.length; j++) {
        newArgs.push('-' + splitOpts[j]);

        if (optTakesArg[splitOpts[j]]) {
          var optArg = splitOpts.slice(j + 1).join('');

          if (optArg.length) {
            newArgs.push(optArg);
          }

          break;
        }
      }
    } else {
      newArgs.push(args[i]);
    }
  }

  args = newArgs; // Expose level definitions to condition vm context

  var condDefines = [];
  Object.keys(upperNameFromLevel).forEach(function (lvl) {
    condDefines.push(format('Object.prototype.%s = %s;', upperNameFromLevel[lvl], lvl));
  });
  condDefines = condDefines.join('\n') + '\n';
  var endOfOptions = false;

  while (args.length > 0) {
    var arg = args.shift();

    switch (arg) {
      case '--':
        endOfOptions = true;
        break;

      case '-h': // display help and exit

      case '--help':
        parsed.help = true;
        break;

      case '--version':
        parsed.version = true;
        break;

      case '--strict':
        parsed.strict = true;
        break;

      case '--color':
        parsed.color = true;
        break;

      case '--no-color':
        parsed.color = false;
        break;

      case '--pager':
        parsed.paginate = true;
        break;

      case '--no-pager':
        parsed.paginate = false;
        break;

      case '-o':
      case '--output':
        var name = args.shift();
        var idx = name.lastIndexOf('-');

        if (idx !== -1) {
          var indentation = Number(name.slice(idx + 1));

          if (!isNaN(indentation)) {
            parsed.jsonIndent = indentation;
            name = name.slice(0, idx);
          }
        }

        parsed.outputMode = OM_FROM_NAME[name];

        if (parsed.outputMode === undefined) {
          throw new Error('unknown output mode: "' + name + '"');
        }

        break;

      case '-j':
        // output with JSON.stringify
        parsed.outputMode = OM_JSON;
        break;

      case '-0':
        parsed.outputMode = OM_BUNYAN;
        break;

      case '-L':
        parsed.timeFormat = TIME_LOCAL;

        if (!moment) {
          throw new Error('could not find moment package required for "-L"');
        }

        break;

      case '--time':
        var timeArg = args.shift();

        switch (timeArg) {
          case 'utc':
            parsed.timeFormat = TIME_UTC;
            break;

          case 'local':
            parsed.timeFormat = TIME_LOCAL;

            if (!moment) {
              throw new Error('could not find moment package ' + 'required for "--time=local"');
            }

            break;

          case undefined:
            throw new Error('missing argument to "--time"');

          default:
            throw new Error(format('invalid time format: "%s"', timeArg));
        }

        break;

      case '-p':
        if (!parsed.pids) {
          parsed.pids = [];
        }

        var pidArg = args.shift();
        var pid = +pidArg;

        if (!isNaN(pid) || pidArg === '*') {
          if (parsed.pidsType && parsed.pidsType !== 'num') {
            throw new Error(format('cannot mix PID name and ' + 'number arguments: "%s"', pidArg));
          }

          parsed.pidsType = 'num';

          if (!parsed.pids) {
            parsed.pids = [];
          }

          parsed.pids.push(isNaN(pid) ? pidArg : pid);
        } else {
          if (parsed.pidsType && parsed.pidsType !== 'name') {
            throw new Error(format('cannot mix PID name and ' + 'number arguments: "%s"', pidArg));
          }

          parsed.pidsType = 'name';
          parsed.pids = pidArg;
        }

        break;

      case '-l':
      case '--level':
        var levelArg = args.shift();
        var level = +levelArg;

        if (isNaN(level)) {
          level = +levelFromName[levelArg.toLowerCase()];
        }

        if (isNaN(level)) {
          throw new Error('unknown level value: "' + levelArg + '"');
        }

        parsed.level = level;
        break;

      case '-c':
      case '--condition':
        gUsingConditionOpts = true;
        var condition = args.shift();

        if (Boolean(process.env.BUNYAN_EXEC && process.env.BUNYAN_EXEC === 'vm')) {
          parsed.condVm = parsed.condVm || [];
          var scriptName = 'bunyan-condition-' + parsed.condVm.length;
          var code = condDefines + condition;
          var script;

          try {
            script = vm.createScript(code, scriptName);
          } catch (complErr) {
            throw new Error(format('illegal CONDITION code: %s\n' + '  CONDITION script:\n' + '%s\n' + '  Error:\n' + '%s', complErr, indent(code), indent(complErr.stack)));
          } // Ensure this is a reasonably safe CONDITION.


          try {
            script.runInNewContext(minValidRecord);
          } catch (condErr) {
            throw new Error(format(
            /* JSSTYLED */
            'CONDITION code cannot safely filter a minimal Bunyan log record\n' + '  CONDITION script:\n' + '%s\n' + '  Minimal Bunyan log record:\n' + '%s\n' + '  Filter error:\n' + '%s', indent(code), indent(JSON.stringify(minValidRecord, null, 2)), indent(condErr.stack)));
          }

          parsed.condVm.push(script);
        } else {
          parsed.condFuncs = parsed.condFuncs || [];
          parsed.condFuncs.push(funcWithReturnFromSnippet(condition));
        }

        break;

      default:
        // arguments
        if (!endOfOptions && arg.length > 0 && arg[0] === '-') {
          throw new Error('unknown option "' + arg + '"');
        }

        parsed.args.push(arg);
        break;
    }
  } //TODO: '--' handling and error on a first arg that looks like an option.


  return parsed;
}

function isInteger(s) {
  return s.search(/^-?[0-9]+$/) == 0;
} // http://en.wikipedia.org/wiki/ANSI_escape_code#graphics
// Suggested colors (some are unreadable in common cases):
// - Good: cyan, yellow (limited use), bold, green, magenta, red
// - Bad: blue (not visible on cmd.exe), grey (same color as background on
//   Solarized Dark theme from <https://github.com/altercation/solarized>, see
//   issue #160)


var colors = {
  'bold': [1, 22],
  'italic': [3, 23],
  'underline': [4, 24],
  'inverse': [7, 27],
  'white': [37, 39],
  'grey': [90, 39],
  'black': [30, 39],
  'blue': [34, 39],
  'cyan': [36, 39],
  'green': [32, 39],
  'magenta': [35, 39],
  'red': [31, 39],
  'yellow': [33, 39]
};

function stylizeWithColor(str, color) {
  if (!str) return '';
  var codes = colors[color];

  if (codes) {
    return '\x1B[' + codes[0] + 'm' + str + '\x1B[' + codes[1] + 'm';
  } else {
    return str;
  }
}

function stylizeWithoutColor(str, color) {
  return str;
}
/**
 * Is this a valid Bunyan log record.
 */


function isValidRecord(rec) {
  if (rec.v == null || rec.level == null || rec.name == null || rec.hostname == null || rec.pid == null || rec.time == null || rec.msg == null) {
    // Not valid Bunyan log.
    return false;
  } else {
    return true;
  }
}

var minValidRecord = {
  v: 0,
  //TODO: get this from bunyan.LOG_VERSION
  level: INFO,
  name: 'name',
  hostname: 'hostname',
  pid: 123,
  time: Date.now(),
  msg: 'msg'
};
/**
 * Parses the given log line and either emits it right away (for invalid
 * records) or enqueues it for emitting later when it's the next line to show.
 */

function handleLogLine(file, line, opts, stylize) {
  currLine = line; // intentionally global
  // Emit non-JSON lines immediately.

  var rec;

  if (!line) {
    if (!opts.strict) emit(line + '\n');
    return;
  } else if (line[0] !== '{') {
    if (!opts.strict) emit(line + '\n'); // not JSON

    return;
  } else {
    try {
      rec = JSON.parse(line);
    } catch (e) {
      if (!opts.strict) emit(line + '\n');
      return;
    }
  }

  if (!isValidRecord(rec)) {
    if (!opts.strict) emit(line + '\n');
    return;
  }

  if (!filterRecord(rec, opts)) return;
  if (file === null) return emitRecord(rec, line, opts, stylize);
  return gotRecord(file, line, rec, opts, stylize);
}
/**
 * Print out a single result, considering input options.
 */


function emitRecord(rec, line, opts, stylize) {
  var _short = false;

  switch (opts.outputMode) {
    case OM_SHORT:
      _short = true;

    /* jsl:fall-thru */

    case OM_LONG:
      //    [time] LEVEL: name[/comp]/pid on hostname (src): msg* (extras...)
      //        msg*
      //        --
      //        long and multi-line extras
      //        ...
      // If 'msg' is single-line, then it goes in the top line.
      // If 'req', show the request.
      // If 'res', show the response.
      // If 'err' and 'err.stack' then show that.
      if (!isValidRecord(rec)) {
        return emit(line + '\n');
      }

      delete rec.v; // Time.

      var time;

      if (!_short && opts.timeFormat === TIME_UTC) {
        // Fast default path: We assume the raw `rec.time` is a UTC time
        // in ISO 8601 format (per spec).
        time = '[' + rec.time + ']';
      } else if (!moment && opts.timeFormat === TIME_UTC) {
        // Don't require momentjs install, as long as not using TIME_LOCAL.
        time = rec.time.substr(11);
      } else {
        var tzFormat;
        var moTime = moment(rec.time);

        switch (opts.timeFormat) {
          case TIME_UTC:
            tzFormat = TIMEZONE_UTC_FORMATS[_short ? 'short' : 'long'];
            moTime.utc();
            break;

          case TIME_LOCAL:
            tzFormat = TIMEZONE_LOCAL_FORMATS[_short ? 'short' : 'long'];
            break;

          default:
            throw new Error('unexpected timeFormat: ' + opts.timeFormat);
        }

        ;
        time = moTime.format(tzFormat);
      }

      time = stylize(time, 'XXX');
      delete rec.time;
      var nameStr = rec.name;
      delete rec.name;

      if (rec.component) {
        nameStr += '/' + rec.component;
      }

      delete rec.component;
      if (!_short) nameStr += '/' + rec.pid;
      delete rec.pid;
      var level = upperPaddedNameFromLevel[rec.level] || 'LVL' + rec.level;

      if (opts.color) {
        var colorFromLevel = {
          10: 'white',
          // TRACE
          20: 'yellow',
          // DEBUG
          30: 'cyan',
          // INFO
          40: 'magenta',
          // WARN
          50: 'red',
          // ERROR
          60: 'inverse' // FATAL

        };
        level = stylize(level, colorFromLevel[rec.level]);
      }

      delete rec.level;
      var src = '';

      if (rec.src && rec.src.file) {
        var s = rec.src;

        if (s.func) {
          src = format(' (%s:%d in %s)', s.file, s.line, s.func);
        } else {
          src = format(' (%s:%d)', s.file, s.line);
        }

        src = stylize(src, 'green');
      }

      delete rec.src;
      var hostname = rec.hostname;
      delete rec.hostname;
      var extras = [];
      var details = [];

      if (rec.req_id) {
        extras.push('req_id=' + rec.req_id);
      }

      delete rec.req_id;

      if (rec.reqId) {
        extras.push('reqId=' + rec.reqId);
      }

      delete rec.reqId;
      var onelineMsg;

      if (rec.msg.indexOf('\n') !== -1) {
        onelineMsg = '';
        details.push(indent(stylize(rec.msg)));
      } else {
        onelineMsg = ' ' + stylize(rec.msg);
      }

      delete rec.msg;

      if (rec.req && (0, _typeof)(rec.req) === 'object') {
        var req = rec.req;
        delete rec.req;
        var headers = req.headers;

        if (!headers) {
          headers = '';
        } else if (typeof headers === 'string') {
          headers = '\n' + headers;
        } else if ((0, _typeof)(headers) === 'object') {
          headers = '\n' + Object.keys(headers).map(function (h) {
            return h + ': ' + headers[h];
          }).join('\n');
        }

        var s = format('%s %s HTTP/%s%s', req.method, req.url, req.httpVersion || '1.1', headers);
        delete req.url;
        delete req.method;
        delete req.httpVersion;
        delete req.headers;

        if (req.body) {
          s += '\n\n' + ((0, _typeof)(req.body) === 'object' ? JSON.stringify(req.body, null, 2) : req.body);
          delete req.body;
        }

        if (req.trailers && Object.keys(req.trailers) > 0) {
          s += '\n' + Object.keys(req.trailers).map(function (t) {
            return t + ': ' + req.trailers[t];
          }).join('\n');
        }

        delete req.trailers;
        details.push(indent(s)); // E.g. for extra 'foo' field on 'req', add 'req.foo' at
        // top-level. This *does* have the potential to stomp on a
        // literal 'req.foo' key.

        Object.keys(req).forEach(function (k) {
          rec['req.' + k] = req[k];
        });
      }

      if (rec.client_req && (0, _typeof)(rec.client_req) === 'object') {
        var client_req = rec.client_req;
        delete rec.client_req;
        var headers = client_req.headers;
        var hostHeaderLine = '';
        var s = '';

        if (client_req.address) {
          hostHeaderLine = '\nHost: ' + client_req.address;
          if (client_req.port) hostHeaderLine += ':' + client_req.port;
        }

        delete client_req.headers;
        delete client_req.address;
        delete client_req.port;
        s += format('%s %s HTTP/%s%s%s', client_req.method, client_req.url, client_req.httpVersion || '1.1', hostHeaderLine, headers ? '\n' + Object.keys(headers).map(function (h) {
          return h + ': ' + headers[h];
        }).join('\n') : '');
        delete client_req.method;
        delete client_req.url;
        delete client_req.httpVersion;

        if (client_req.body) {
          s += '\n\n' + ((0, _typeof)(client_req.body) === 'object' ? JSON.stringify(client_req.body, null, 2) : client_req.body);
          delete client_req.body;
        } // E.g. for extra 'foo' field on 'client_req', add
        // 'client_req.foo' at top-level. This *does* have the potential
        // to stomp on a literal 'client_req.foo' key.


        Object.keys(client_req).forEach(function (k) {
          rec['client_req.' + k] = client_req[k];
        });
        details.push(indent(s));
      }

      var _res = function _res(res) {
        var s = '';

        if (res.statusCode !== undefined) {
          s += format('HTTP/1.1 %s %s\n', res.statusCode, http.STATUS_CODES[res.statusCode]);
          delete res.statusCode;
        } // Handle `res.header` or `res.headers` as either a string or
        // and object of header key/value pairs. Prefer `res.header` if set
        // (TODO: Why? I don't recall. Typical of restify serializer?
        // Typical JSON.stringify of a core node HttpResponse?)


        var headerTypes = {
          string: true,
          object: true
        };
        var headers;

        if (res.header && headerTypes[(0, _typeof)(res.header)]) {
          headers = res.header;
          delete res.header;
        } else if (res.headers && headerTypes[(0, _typeof)(res.headers)]) {
          headers = res.headers;
          delete res.headers;
        }

        if (headers === undefined) {
          /* pass through */
        } else if (typeof headers === 'string') {
          s += headers.trimRight();
        } else {
          s += Object.keys(headers).map(function (h) {
            return h + ': ' + headers[h];
          }).join('\n');
        }

        if (res.body !== undefined) {
          var body = (0, _typeof)(res.body) === 'object' ? JSON.stringify(res.body, null, 2) : res.body;

          if (body.length > 0) {
            s += '\n\n' + body;
          }

          ;
          delete res.body;
        } else {
          s = s.trimRight();
        }

        if (res.trailer) {
          s += '\n' + res.trailer;
        }

        delete res.trailer;

        if (s) {
          details.push(indent(s));
        } // E.g. for extra 'foo' field on 'res', add 'res.foo' at
        // top-level. This *does* have the potential to stomp on a
        // literal 'res.foo' key.


        Object.keys(res).forEach(function (k) {
          rec['res.' + k] = res[k];
        });
      };

      if (rec.res && (0, _typeof)(rec.res) === 'object') {
        _res(rec.res);

        delete rec.res;
      }

      if (rec.client_res && (0, _typeof)(rec.client_res) === 'object') {
        _res(rec.client_res);

        delete rec.client_res;
      }

      if (rec.err && rec.err.stack) {
        var err = rec.err;

        if (typeof err.stack !== 'string') {
          details.push(indent(err.stack.toString()));
        } else {
          details.push(indent(err.stack));
        }

        delete err.message;
        delete err.name;
        delete err.stack; // E.g. for extra 'foo' field on 'err', add 'err.foo' at
        // top-level. This *does* have the potential to stomp on a
        // literal 'err.foo' key.

        Object.keys(err).forEach(function (k) {
          rec['err.' + k] = err[k];
        });
        delete rec.err;
      }

      var leftover = Object.keys(rec);

      for (var i = 0; i < leftover.length; i++) {
        var key = leftover[i];
        var value = rec[key];
        var stringified = false;

        if (typeof value !== 'string') {
          value = JSON.stringify(value, null, 2);
          stringified = true;
        }

        if (value.indexOf('\n') !== -1 || value.length > 50) {
          details.push(indent(key + ': ' + value));
        } else if (!stringified && (value.indexOf(' ') != -1 || value.length === 0)) {
          extras.push(key + '=' + JSON.stringify(value));
        } else {
          extras.push(key + '=' + value);
        }
      }

      extras = stylize(extras.length ? ' (' + extras.join(', ') + ')' : '', 'XXX');
      details = stylize(details.length ? details.join('\n    --\n') + '\n' : '', 'XXX');
      if (!_short) emit(format('%s %s: %s on %s%s:%s%s\n%s', time, level, nameStr, hostname || '<no-hostname>', src, onelineMsg, extras, details));else if (['app/req', 'uapp/req'].filter(function (name) {
        return nameStr.substr(0, name.length).toLowerCase() === name.toLowerCase();
      }).length) {
        // if(nameStr.substr(0, 'app/req'.length) === 'app/req') {
        emit(format('%s%s\n', level, onelineMsg));
      } else if (['app', 'uapp'].filter(function (name) {
        return nameStr.substr(0, name.length).toLowerCase() === name.toLowerCase();
      }).length) {
        // if(nameStr.length == 3) {
        emit(format('%s %s:%s%s\n%s', level, nameStr, onelineMsg, extras, details)); // } else {}
      } else {
        emit(format('%s %s %s:%s%s\n%s', time, level, nameStr, onelineMsg, extras, details));
      }
      break;

    case OM_INSPECT:
      emit(util.inspect(rec, false, Infinity, true) + '\n');
      break;

    case OM_BUNYAN:
      emit(JSON.stringify(rec, null, 0) + '\n');
      break;

    case OM_JSON:
      emit(JSON.stringify(rec, null, opts.jsonIndent) + '\n');
      break;

    case OM_SIMPLE:
      /* JSSTYLED */
      // <http://logging.apache.org/log4j/1.2/apidocs/org/apache/log4j/SimpleLayout.html>
      if (!isValidRecord(rec)) {
        return emit(line + '\n');
      }

      emit(format('%s - %s\n', upperNameFromLevel[rec.level] || 'LVL' + rec.level, rec.msg));
      break;

    default:
      throw new Error('unknown output mode: ' + opts.outputMode);
  }
}

var stdoutFlushed = true;

function emit(s) {
  try {
    stdoutFlushed = stdout.write(s);
  } catch (e) {// Handle any exceptions in stdout writing in `stdout.on('error', ...)`.
  }
}
/**
 * A hacked up version of 'process.exit' that will first drain stdout
 * before exiting. *WARNING: This doesn't stop event processing.* IOW,
 * callers have to be careful that code following this call isn't
 * accidentally executed.
 *
 * In node v0.6 "process.stdout and process.stderr are blocking when they
 * refer to regular files or TTY file descriptors." However, this hack might
 * still be necessary in a shell pipeline.
 */


function drainStdoutAndExit(code) {
  if (_DEBUG) warn('(drainStdoutAndExit(%d))', code);
  stdout.on('drain', function () {
    cleanupAndExit(code);
  });

  if (stdoutFlushed) {
    cleanupAndExit(code);
  }
}
/**
 * Process all input from stdin.
 *
 * @params opts {Object} Bunyan options object.
 * @param stylize {Function} Output stylize function to use.
 * @param callback {Function} `function ()`
 */


function processStdin(opts, stylize, callback) {
  readingStdin = true;
  var leftover = ''; // Left-over partial line from last chunk.

  var stdin = process.stdin;
  stdin.resume();
  stdin.setEncoding('utf8');
  stdin.on('data', function (chunk) {
    var lines = chunk.split(/\r\n|\n/);
    var length = lines.length;

    if (length === 1) {
      leftover += lines[0];
      return;
    }

    if (length > 1) {
      handleLogLine(null, leftover + lines[0], opts, stylize);
    }

    leftover = lines.pop();
    length -= 1;

    for (var i = 1; i < length; i++) {
      handleLogLine(null, lines[i], opts, stylize);
    }
  });
  stdin.on('end', function () {
    if (leftover) {
      handleLogLine(null, leftover, opts, stylize);
      leftover = '';
    }

    callback();
  });
}
/**
 * Process bunyan:log-* probes from the given pid.
 *
 * @params opts {Object} Bunyan options object.
 * @param stylize {Function} Output stylize function to use.
 * @param callback {Function} `function (code)`
 */


function processPids(opts, stylize, callback) {
  var leftover = ''; // Left-over partial line from last chunk.

  /**
   * Get the PIDs to dtrace.
   *
   * @param cb {Function} `function (errCode, pids)`
   */

  function getPids(cb) {
    if (opts.pidsType === 'num') {
      return cb(null, opts.pids);
    }

    if (process.platform === 'sunos') {
      execFile('/bin/pgrep', ['-lf', opts.pids], function (pidsErr, stdout, stderr) {
        if (pidsErr) {
          warn('bunyan: error getting PIDs for "%s": %s\n%s\n%s', opts.pids, pidsErr.message, stdout, stderr);
          return cb(1);
        }

        var pids = stdout.trim().split('\n').map(function (line) {
          return line.trim().split(/\s+/)[0];
        }).filter(function (pid) {
          return Number(pid) !== process.pid;
        });

        if (pids.length === 0) {
          warn('bunyan: error: no matching PIDs found for "%s"', opts.pids);
          return cb(2);
        }

        cb(null, pids);
      });
    } else {
      var regex = opts.pids;

      if (regex && /[a-zA-Z0-9_]/.test(regex[0])) {
        // 'foo' -> '[f]oo' trick to exclude the 'grep' PID from its
        // own search.
        regex = '[' + regex[0] + ']' + regex.slice(1);
      }

      exec(format('ps -A -o pid,command | grep \'%s\'', regex), function (pidsErr, stdout, stderr) {
        if (pidsErr) {
          warn('bunyan: error getting PIDs for "%s": %s\n%s\n%s', opts.pids, pidsErr.message, stdout, stderr);
          return cb(1);
        }

        var pids = stdout.trim().split('\n').map(function (line) {
          return line.trim().split(/\s+/)[0];
        }).filter(function (pid) {
          return Number(pid) !== process.pid;
        });

        if (pids.length === 0) {
          warn('bunyan: error: no matching PIDs found for "%s"', opts.pids);
          return cb(2);
        }

        cb(null, pids);
      });
    }
  }

  getPids(function (errCode, pids) {
    if (errCode) {
      return callback(errCode);
    }

    var probes = pids.map(function (pid) {
      if (!opts.level) return format('bunyan%s:::log-*', pid);
      var rval = [],
          l;

      for (l in levelFromName) {
        if (levelFromName[l] >= opts.level) rval.push(format('bunyan%s:::log-%s', pid, l));
      }

      if (rval.length != 0) return rval.join(',');
      warn('bunyan: error: level (%d) exceeds maximum logging level', opts.level);
      return drainStdoutAndExit(1);
    }).join(',');
    var argv = ['dtrace', '-Z', '-x', 'strsize=4k', '-x', 'switchrate=10hz', '-qn', format('%s{printf("%s", copyinstr(arg0))}', probes)]; //console.log('dtrace argv: %s', argv);

    var dtrace = spawn(argv[0], argv.slice(1), // Share the stderr handle to have error output come
    // straight through. Only supported in v0.8+.
    {
      stdio: ['pipe', 'pipe', process.stderr]
    });
    dtrace.on('error', function (e) {
      if (e.syscall === 'spawn' && e.errno === 'ENOENT') {
        console.error('bunyan: error: could not spawn "dtrace" ' + '("bunyan -p" is only supported on platforms with dtrace)');
      } else {
        console.error('bunyan: error: unexpected dtrace error: %s', e);
      }

      callback(1);
    });
    child = dtrace; // intentionally global

    function finish(code) {
      if (leftover) {
        handleLogLine(null, leftover, opts, stylize);
        leftover = '';
      }

      callback(code);
    }

    dtrace.stdout.setEncoding('utf8');
    dtrace.stdout.on('data', function (chunk) {
      var lines = chunk.split(/\r\n|\n/);
      var length = lines.length;

      if (length === 1) {
        leftover += lines[0];
        return;
      }

      if (length > 1) {
        handleLogLine(null, leftover + lines[0], opts, stylize);
      }

      leftover = lines.pop();
      length -= 1;

      for (var i = 1; i < length; i++) {
        handleLogLine(null, lines[i], opts, stylize);
      }
    });

    if (nodeSpawnSupportsStdio) {
      dtrace.on('exit', finish);
    } else {
      var countdownToFinish = function countdownToFinish(code) {
        returnCode = code;
        eventsRemaining--;

        if (eventsRemaining == 0) {
          finish(returnCode);
        }
      };

      // Fallback (for < v0.8) to pipe the dtrace process' stderr to
      // this stderr. Wait for all of (1) process 'exit', (2) stderr
      // 'end', and (2) stdout 'end' before returning to ensure all
      // stderr is flushed (issue #54).
      var returnCode = null;
      var eventsRemaining = 3;
      dtrace.stderr.pipe(process.stderr);
      dtrace.stderr.on('end', countdownToFinish);
      dtrace.stderr.on('end', countdownToFinish);
      dtrace.on('exit', countdownToFinish);
    }
  });
}
/**
 * Process all input from the given log file.
 *
 * @param file {String} Log file path to process.
 * @params opts {Object} Bunyan options object.
 * @param stylize {Function} Output stylize function to use.
 * @param callback {Function} `function ()`
 */


function processFile(file, opts, stylize, callback) {
  var stream = fs.createReadStream(file);

  if (/\.gz$/.test(file)) {
    stream = stream.pipe(require('zlib').createGunzip());
  } // Manually decode streams - lazy load here as per node/lib/fs.js


  var decoder = new (require('string_decoder').StringDecoder)('utf8');
  streams[file].stream = stream;
  stream.on('error', function (err) {
    streams[file].done = true;
    callback(err);
  });
  var leftover = ''; // Left-over partial line from last chunk.

  stream.on('data', function (data) {
    var chunk = decoder.write(data);

    if (!chunk.length) {
      return;
    }

    var lines = chunk.split(/\r\n|\n/);
    var length = lines.length;

    if (length === 1) {
      leftover += lines[0];
      return;
    }

    if (length > 1) {
      handleLogLine(file, leftover + lines[0], opts, stylize);
    }

    leftover = lines.pop();
    length -= 1;

    for (var i = 1; i < length; i++) {
      handleLogLine(file, lines[i], opts, stylize);
    }
  });
  stream.on('end', function () {
    streams[file].done = true;

    if (leftover) {
      handleLogLine(file, leftover, opts, stylize);
      leftover = '';
    } else {
      emitNextRecord(opts, stylize);
    }

    callback();
  });
}
/**
 * From node async module.
 */

/* BEGIN JSSTYLED */


function asyncForEach(arr, iterator, callback) {
  callback = callback || function () {};

  if (!arr.length) {
    return callback();
  }

  var completed = 0;
  arr.forEach(function (x) {
    iterator(x, function (err) {
      if (err) {
        callback(err);

        callback = function callback() {};
      } else {
        completed += 1;

        if (completed === arr.length) {
          callback();
        }
      }
    });
  });
}

;
/* END JSSTYLED */

/**
 * Cleanup and exit properly.
 *
 * Warning: this doesn't stop processing, i.e. process exit might be delayed.
 * It is up to the caller to ensure that no subsequent bunyan processing
 * is done after calling this.
 *
 * @param code {Number} exit code.
 * @param signal {String} Optional signal name, if this was exitting because
 *    of a signal.
 */

var cleanedUp = false;

function cleanupAndExit(code, signal) {
  // Guard one call.
  if (cleanedUp) {
    return;
  }

  cleanedUp = true;
  if (_DEBUG) warn('(bunyan: cleanupAndExit)'); // Clear possibly interrupted ANSI code (issue #59).

  if (usingAnsiCodes) {
    stdout.write('\x1B[0m');
  } // Kill possible dtrace child.


  if (child) {
    child.kill(signal);
  }

  if (pager) {
    // Let pager know that output is done, then wait for pager to exit.
    stdout.end();
    pager.on('exit', function (pagerCode) {
      if (_DEBUG) warn('(bunyan: pager exit -> process.exit(%s))', pagerCode || code);
      process.exit(pagerCode || code);
    });
  } else {
    if (_DEBUG) warn('(bunyan: process.exit(%s))', code);
    process.exit(code);
  }
} //---- mainline


process.on('SIGINT', function () {
  /**
   * Ignore SIGINT (Ctrl+C) if processing stdin -- we should process
   * remaining output from preceding process in the pipeline and
   * except *it* to close.
   */
  if (!readingStdin) {
    cleanupAndExit(1, 'SIGINT');
  }
});
process.on('SIGQUIT', function () {
  cleanupAndExit(1, 'SIGQUIT');
});
process.on('SIGTERM', function () {
  cleanupAndExit(1, 'SIGTERM');
});
process.on('SIGHUP', function () {
  cleanupAndExit(1, 'SIGHUP');
});
process.on('uncaughtException', function (err) {
  function _indent(s) {
    var lines = s.split(/\r?\n/);

    for (var i = 0; i < lines.length; i++) {
      lines[i] = '*     ' + lines[i];
    }

    return lines.join('\n');
  }

  var title = encodeURIComponent(format('Bunyan %s crashed: %s', getVersion(), String(err)));
  var e = console.error;
  e('```');
  e('* The Bunyan CLI crashed!');
  e('*');

  if (err.name === 'ReferenceError' && gUsingConditionOpts) {
    /* BEGIN JSSTYLED */
    e('* This crash was due to a "ReferenceError", which is often the result of given');
    e('* `-c CONDITION` code that doesn\'t guard against undefined values. If that is');
    /* END JSSTYLED */

    e('* not the problem:');
    e('*');
  }

  e('* Please report this issue and include the details below:');
  e('*');
  e('*    https://github.com/trentm/node-bunyan/issues/new?title=%s', title);
  e('*');
  e('* * *');
  e('* platform:', process.platform);
  e('* node version:', process.version);
  e('* bunyan version:', getVersion());
  e('* argv: %j', process.argv);
  e('* log line: %j', currLine);
  e('* stack:');
  e(_indent(err.stack));
  e('```');
  process.exit(1);
});

function main(argv) {
  try {
    var opts = parseArgv(argv);
  } catch (e) {
    warn('bunyan: error: %s', e.message);
    return drainStdoutAndExit(1);
  }

  if (opts.help) {
    printHelp();
    return;
  }

  if (opts.version) {
    console.log('bunyan ' + getVersion());
    return;
  }

  if (opts.pid && opts.args.length > 0) {
    warn('bunyan: error: can\'t use both "-p PID" (%s) and file (%s) args', opts.pid, opts.args.join(' '));
    return drainStdoutAndExit(1);
  }

  if (opts.color === null) {
    if (process.env.BUNYAN_NO_COLOR && process.env.BUNYAN_NO_COLOR.length > 0) {
      opts.color = false;
    } else {
      opts.color = process.stdout.isTTY;
    }
  }

  usingAnsiCodes = opts.color; // intentionally global

  var stylize = opts.color ? stylizeWithColor : stylizeWithoutColor; // Pager.

  var paginate = process.stdout.isTTY && process.stdin.isTTY && !opts.pids && // Don't page if following process output.
  opts.args.length > 0 && // Don't page if no file args to process.
  process.platform !== 'win32' && (nodeVer[0] > 0 || nodeVer[1] >= 8) && (opts.paginate === true || opts.paginate !== false && (!process.env.BUNYAN_NO_PAGER || process.env.BUNYAN_NO_PAGER.length === 0));

  if (paginate) {
    var pagerCmd = process.env.PAGER || 'less';
    /* JSSTYLED */

    assert.ok(pagerCmd.indexOf('"') === -1 && pagerCmd.indexOf("'") === -1, 'cannot parse PAGER quotes yet');
    var argv = pagerCmd.split(/\s+/g);
    var env = objCopy(process.env);

    if (env.LESS === undefined) {
      // git's default is LESS=FRSX. I don't like the 'S' here because
      // lines are *typically* wide with bunyan output and scrolling
      // horizontally is a royal pain. Note a bug in Mac's `less -F`,
      // such that SIGWINCH can kill it. If that rears too much then
      // I'll remove 'F' from here.
      env.LESS = 'FRX';
    }

    if (_DEBUG) warn('(pager: argv=%j, env.LESS=%j)', argv, env.LESS); // `pager` and `stdout` intentionally global.

    pager = spawn(argv[0], argv.slice(1), // Share the stderr handle to have error output come
    // straight through. Only supported in v0.8+.
    {
      env: env,
      stdio: ['pipe', 1, 2]
    });
    stdout = pager.stdin; // Early termination of the pager: just stop.

    pager.on('exit', function (pagerCode) {
      if (_DEBUG) warn('(bunyan: pager exit)');
      pager = null;
      stdout.end();
      stdout = process.stdout;
      cleanupAndExit(pagerCode);
    });
  } // Stdout error handling. (Couldn't setup until `stdout` was determined.)


  stdout.on('error', function (err) {
    if (_DEBUG) warn('(stdout error event: %s)', err);

    if (err.code === 'EPIPE') {
      drainStdoutAndExit(0);
    } else if (err.toString() === 'Error: This socket is closed.') {
      // Could get this if the pager closes its stdin, but hasn't
      // exited yet.
      drainStdoutAndExit(1);
    } else {
      warn(err);
      drainStdoutAndExit(1);
    }
  });
  var retval = 0;

  if (opts.pids) {
    processPids(opts, stylize, function (code) {
      cleanupAndExit(code);
    });
  } else if (opts.args.length > 0) {
    var files = opts.args;
    files.forEach(function (file) {
      streams[file] = {
        stream: null,
        records: [],
        done: false
      };
    });
    asyncForEach(files, function (file, next) {
      processFile(file, opts, stylize, function (err) {
        if (err) {
          warn('bunyan: %s', err.message);
          retval += 1;
        }

        next();
      });
    }, function (err) {
      if (err) {
        warn('bunyan: unexpected error: %s', err.stack || err);
        return drainStdoutAndExit(1);
      }

      cleanupAndExit(retval);
    });
  } else {
    processStdin(opts, stylize, function () {
      cleanupAndExit(retval);
    });
  }
}

if (require.main === module) {
  // HACK guard for <https://github.com/trentm/json/issues/24>.
  // We override the `process.stdout.end` guard that core node.js puts in
  // place. The real fix is that `.end()` shouldn't be called on stdout
  // in node core. Node v0.6.9 fixes that. Only guard for v0.6.0..v0.6.8.
  if ([0, 6, 0] <= nodeVer && nodeVer <= [0, 6, 8]) {
    var stdout = process.stdout;

    stdout.end = stdout.destroy = stdout.destroySoon = function () {
      /* pass */
    };
  }

  main(process.argv);
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL3NyYy9jbGkuanMiXSwibmFtZXMiOlsiVkVSU0lPTiIsInAiLCJjb25zb2xlIiwibG9nIiwidXRpbCIsInJlcXVpcmUiLCJwYXRobGliIiwidm0iLCJodHRwIiwiZnMiLCJ3YXJuIiwiY2hpbGRfcHJvY2VzcyIsInNwYXduIiwiZXhlYyIsImV4ZWNGaWxlIiwiYXNzZXJ0IiwibW9tZW50Iiwibm9kZVZlciIsInByb2Nlc3MiLCJ2ZXJzaW9ucyIsIm5vZGUiLCJzcGxpdCIsIm1hcCIsIk51bWJlciIsIm5vZGVTcGF3blN1cHBvcnRzU3RkaW8iLCJfREVCVUciLCJPTV9MT05HIiwiT01fSlNPTiIsIk9NX0lOU1BFQ1QiLCJPTV9TSU1QTEUiLCJPTV9TSE9SVCIsIk9NX0JVTllBTiIsIk9NX0ZST01fTkFNRSIsIlRSQUNFIiwiREVCVUciLCJJTkZPIiwiV0FSTiIsIkVSUk9SIiwiRkFUQUwiLCJsZXZlbEZyb21OYW1lIiwibmFtZUZyb21MZXZlbCIsInVwcGVyTmFtZUZyb21MZXZlbCIsInVwcGVyUGFkZGVkTmFtZUZyb21MZXZlbCIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwibmFtZSIsImx2bCIsInRvVXBwZXJDYXNlIiwiVElNRV9VVEMiLCJUSU1FX0xPQ0FMIiwiVElNRVpPTkVfVVRDX0ZPUk1BVFMiLCJUSU1FWk9ORV9MT0NBTF9GT1JNQVRTIiwiY3VyckxpbmUiLCJjaGlsZCIsInVzaW5nQW5zaUNvZGVzIiwiZ1VzaW5nQ29uZGl0aW9uT3B0cyIsInBhZ2VyIiwic3Rkb3V0IiwicmVhZGluZ1N0ZGluIiwiZ2V0VmVyc2lvbiIsImZvcm1hdCIsImluc3BlY3QiLCJmb3JtYXRSZWdFeHAiLCJmIiwib2JqZWN0cyIsImkiLCJhcmd1bWVudHMiLCJsZW5ndGgiLCJwdXNoIiwiam9pbiIsImFyZ3MiLCJsZW4iLCJzdHIiLCJTdHJpbmciLCJyZXBsYWNlIiwieCIsIkpTT04iLCJzdHJpbmdpZnkiLCJpbmRlbnQiLCJzIiwib2JqQ29weSIsIm9iaiIsIkFycmF5IiwiaXNBcnJheSIsInNsaWNlIiwiY29weSIsImsiLCJwcmludEhlbHAiLCJzdHJlYW1zIiwiZ290UmVjb3JkIiwiZmlsZSIsImxpbmUiLCJyZWMiLCJvcHRzIiwic3R5bGl6ZSIsInRpbWUiLCJEYXRlIiwiZW1pdE5leHRSZWNvcmQiLCJmaWx0ZXJSZWNvcmQiLCJsZXZlbCIsImNvbmRGdW5jcyIsInJlY0NvcHkiLCJwYXNzIiwiY2FsbCIsImNvbmRWbSIsInJ1bkluTmV3Q29udGV4dCIsIm9maWxlIiwicmVhZHkiLCJtaW5maWxlIiwidW5kZWZpbmVkIiwic3RyZWFtIiwiZG9uZSIsInJlY29yZHMiLCJwYXVzZWQiLCJwYXVzZSIsInJlc3VtZSIsInNoaWZ0IiwiZW1pdFJlY29yZCIsImZ1bmNXaXRoUmV0dXJuRnJvbVNuaXBwZXQiLCJqcyIsImluZGV4T2YiLCJzdWJzdHJpbmciLCJ2YXJEZWZzIiwiRnVuY3Rpb24iLCJwYXJzZUFyZ3YiLCJhcmd2IiwicGFyc2VkIiwiaGVscCIsImNvbG9yIiwicGFnaW5hdGUiLCJvdXRwdXRNb2RlIiwianNvbkluZGVudCIsInN0cmljdCIsInBpZHMiLCJwaWRzVHlwZSIsInRpbWVGb3JtYXQiLCJuZXdBcmdzIiwib3B0VGFrZXNBcmciLCJjaGFyQXQiLCJzcGxpdE9wdHMiLCJqIiwib3B0QXJnIiwiY29uZERlZmluZXMiLCJlbmRPZk9wdGlvbnMiLCJhcmciLCJ2ZXJzaW9uIiwiaWR4IiwibGFzdEluZGV4T2YiLCJpbmRlbnRhdGlvbiIsImlzTmFOIiwiRXJyb3IiLCJ0aW1lQXJnIiwicGlkQXJnIiwicGlkIiwibGV2ZWxBcmciLCJ0b0xvd2VyQ2FzZSIsImNvbmRpdGlvbiIsIkJvb2xlYW4iLCJlbnYiLCJCVU5ZQU5fRVhFQyIsInNjcmlwdE5hbWUiLCJjb2RlIiwic2NyaXB0IiwiY3JlYXRlU2NyaXB0IiwiY29tcGxFcnIiLCJzdGFjayIsIm1pblZhbGlkUmVjb3JkIiwiY29uZEVyciIsImlzSW50ZWdlciIsInNlYXJjaCIsImNvbG9ycyIsInN0eWxpemVXaXRoQ29sb3IiLCJjb2RlcyIsInN0eWxpemVXaXRob3V0Q29sb3IiLCJpc1ZhbGlkUmVjb3JkIiwidiIsImhvc3RuYW1lIiwibXNnIiwibm93IiwiaGFuZGxlTG9nTGluZSIsImVtaXQiLCJwYXJzZSIsImUiLCJzaG9ydCIsInN1YnN0ciIsInR6Rm9ybWF0IiwibW9UaW1lIiwidXRjIiwibmFtZVN0ciIsImNvbXBvbmVudCIsImNvbG9yRnJvbUxldmVsIiwic3JjIiwiZnVuYyIsImV4dHJhcyIsImRldGFpbHMiLCJyZXFfaWQiLCJyZXFJZCIsIm9uZWxpbmVNc2ciLCJyZXEiLCJoZWFkZXJzIiwiaCIsIm1ldGhvZCIsInVybCIsImh0dHBWZXJzaW9uIiwiYm9keSIsInRyYWlsZXJzIiwidCIsImNsaWVudF9yZXEiLCJob3N0SGVhZGVyTGluZSIsImFkZHJlc3MiLCJwb3J0IiwiX3JlcyIsInJlcyIsInN0YXR1c0NvZGUiLCJTVEFUVVNfQ09ERVMiLCJoZWFkZXJUeXBlcyIsInN0cmluZyIsIm9iamVjdCIsImhlYWRlciIsInRyaW1SaWdodCIsInRyYWlsZXIiLCJjbGllbnRfcmVzIiwiZXJyIiwidG9TdHJpbmciLCJtZXNzYWdlIiwibGVmdG92ZXIiLCJrZXkiLCJ2YWx1ZSIsInN0cmluZ2lmaWVkIiwiZmlsdGVyIiwiSW5maW5pdHkiLCJzdGRvdXRGbHVzaGVkIiwid3JpdGUiLCJkcmFpblN0ZG91dEFuZEV4aXQiLCJvbiIsImNsZWFudXBBbmRFeGl0IiwicHJvY2Vzc1N0ZGluIiwiY2FsbGJhY2siLCJzdGRpbiIsInNldEVuY29kaW5nIiwiY2h1bmsiLCJsaW5lcyIsInBvcCIsInByb2Nlc3NQaWRzIiwiZ2V0UGlkcyIsImNiIiwicGxhdGZvcm0iLCJwaWRzRXJyIiwic3RkZXJyIiwidHJpbSIsInJlZ2V4IiwidGVzdCIsImVyckNvZGUiLCJwcm9iZXMiLCJydmFsIiwibCIsImR0cmFjZSIsInN0ZGlvIiwic3lzY2FsbCIsImVycm5vIiwiZXJyb3IiLCJmaW5pc2giLCJjb3VudGRvd25Ub0ZpbmlzaCIsInJldHVybkNvZGUiLCJldmVudHNSZW1haW5pbmciLCJwaXBlIiwicHJvY2Vzc0ZpbGUiLCJjcmVhdGVSZWFkU3RyZWFtIiwiY3JlYXRlR3VuemlwIiwiZGVjb2RlciIsIlN0cmluZ0RlY29kZXIiLCJkYXRhIiwiYXN5bmNGb3JFYWNoIiwiYXJyIiwiaXRlcmF0b3IiLCJjb21wbGV0ZWQiLCJjbGVhbmVkVXAiLCJzaWduYWwiLCJraWxsIiwiZW5kIiwicGFnZXJDb2RlIiwiZXhpdCIsIl9pbmRlbnQiLCJ0aXRsZSIsImVuY29kZVVSSUNvbXBvbmVudCIsIm1haW4iLCJCVU5ZQU5fTk9fQ09MT1IiLCJpc1RUWSIsIkJVTllBTl9OT19QQUdFUiIsInBhZ2VyQ21kIiwiUEFHRVIiLCJvayIsIkxFU1MiLCJyZXR2YWwiLCJmaWxlcyIsIm5leHQiLCJtb2R1bGUiLCJkZXN0cm95IiwiZGVzdHJveVNvb24iXSwibWFwcGluZ3MiOiJBQUFBOztBQUNBOzs7Ozs7Ozs7Ozs7Ozs7OztBQVlBLElBQUlBLE9BQU8sR0FBRyxPQUFkO0FBRUEsSUFBSUMsQ0FBQyxHQUFHQyxPQUFPLENBQUNDLEdBQWhCOztBQUNBLElBQUlDLElBQUksR0FBR0MsT0FBTyxDQUFDLE1BQUQsQ0FBbEI7O0FBQ0EsSUFBSUMsT0FBTyxHQUFHRCxPQUFPLENBQUMsTUFBRCxDQUFyQjs7QUFDQSxJQUFJRSxFQUFFLEdBQUdGLE9BQU8sQ0FBQyxJQUFELENBQWhCOztBQUNBLElBQUlHLElBQUksR0FBR0gsT0FBTyxDQUFDLE1BQUQsQ0FBbEI7O0FBQ0EsSUFBSUksRUFBRSxHQUFHSixPQUFPLENBQUMsSUFBRCxDQUFoQjs7QUFDQSxJQUFJSyxJQUFJLEdBQUdSLE9BQU8sQ0FBQ1EsSUFBbkI7O0FBQ0EsSUFBSUMsYUFBYSxHQUFHTixPQUFPLENBQUMsZUFBRCxDQUEzQjtBQUFBLElBQ0lPLEtBQUssR0FBR0QsYUFBYSxDQUFDQyxLQUQxQjtBQUFBLElBRUlDLElBQUksR0FBR0YsYUFBYSxDQUFDRSxJQUZ6QjtBQUFBLElBR0lD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LENBQUMsQ0FBQyx1RUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyx5QkFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyw2QkFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxnRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQywyREFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyw0Q0FBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxnREFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQywyREFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxpRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxvRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxrRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQywwRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxvRUFBRCxDQUFEO0FBQ0FBLEVBQUFBLENBQUMsQ0FBQyxFQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLGlCQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLGdFQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLG1FQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLCtEQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLGtEQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLDREQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLGtDQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLHVFQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLHFCQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLHVEQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLDhDQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLHFEQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFDLHNFQUFELENBQUQ7QUFDQUEsRUFBQUEsQ0FBQyxDQUFD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QUQsRUFBaUNxTixHQUFHLENBQUN6RCxLQUFKLElBQWF5RCxHQUE5QyxDQUFKO0FBQ0EsZUFBT1csa0JBQWtCLENBQUMsQ0FBRCxDQUF6QjtBQUNIOztBQUNERSxNQUFBQSxjQUFjLENBQUMwRCxNQUFELENBQWQ7QUFDSCxLQWhCTyxDQUFaO0FBa0JILEdBdkJNLE1BdUJBO0FBQ0h6RCxJQUFBQSxZQUFZLENBQUMvSSxJQUFELEVBQU9DLE9BQVAsRUFBZ0IsWUFBWTtBQUNwQzZJLE1BQUFBLGNBQWMsQ0FBQzBELE1BQUQsQ0FBZDtBQUNILEtBRlcsQ0FBWjtBQUdIO0FBQ0o7O0FBRUQsSUFBSWpTLE9BQU8sQ0FBQ3lSLElBQVIsS0FBaUJXLE1BQXJCLEVBQTZCO0FBQ3pCO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsTUFBSSxDQUFDLENBQUQsRUFBSSxDQUFKLEVBQU8sQ0FBUCxLQUFheFIsT0FBYixJQUF3QkEsT0FBTyxJQUFJLENBQUMsQ0FBRCxFQUFJLENBQUosRUFBTyxDQUFQLENBQXZDLEVBQWtEO0FBQzlDLFFBQUl5QyxNQUFNLEdBQUd4QyxPQUFPLENBQUN3QyxNQUFyQjs7QUFDQUEsSUFBQUEsTUFBTSxDQUFDOE4sR0FBUCxHQUFhOU4sTUFBTSxDQUFDZ1AsT0FBUCxHQUFpQmhQLE1BQU0sQ0FBQ2lQLFdBQVAsR0FBcUIsWUFBWTtBQUMzRDtBQUNILEtBRkQ7QUFHSDs7QUFFRGIsRUFBQUEsSUFBSSxDQUFDNVEsT0FBTyxDQUFDNEcsSUFBVCxDQUFKO0FBQ0giLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG4vKipcbiAqIENvcHlyaWdodCAyMDE2IFRyZW50IE1pY2suIEFsbCByaWdodHMgcmVzZXJ2ZWQuXG4gKiBDb3B5cmlnaHQgMjAxNiBKb3llbnQgSW5jLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxuICpcbiAqIGJ1bnlhbiAtLSBmaWx0ZXIgYW5kIHByZXR0eS1wcmludCBCdW55YW4gbG9nIGZpbGVzIChsaW5lLWRlbGltaXRlZCBKU09OKVxuICpcbiAqIFNlZSA8aHR0cHM6Ly9naXRodWIuY29tL3RyZW50bS9ub2RlLWJ1bnlhbj4uXG4gKlxuICogLSotIG1vZGU6IGpzIC0qLVxuICogdmltOiBleHBhbmR0YWI6dHM9NDpzdz00XG4gKi9cblxudmFyIFZFUlNJT04gPSAnMS44LjEnO1xuXG52YXIgcCA9IGNvbnNvbGUubG9nO1xudmFyIHV0aWwgPSByZXF1aXJlKCd1dGlsJyk7XG52YXIgcGF0aGxpYiA9IHJlcXVpcmUoJ3BhdGgnKTtcbnZhciB2bSA9IHJlcXVpcmUoJ3ZtJyk7XG52YXIgaHR0cCA9IHJlcXVpcmUoJ2h0dHAnKTtcbnZhciBmcyA9IHJlcXVpcmUoJ2ZzJyk7XG52YXIgd2FybiA9IGNvbnNvbGUud2FybjtcbnZhciBjaGlsZF9wcm9jZXNzID0gcmVxdWlyZSgnY2hpbGRfcHJvY2VzcycpLFxuICAgIHNwYXduID0gY2hpbGRfcHJvY2Vzcy5zcGF3bixcbiAgICBleGVjID0gY2hpbGRfcHJvY2Vzcy5leGVjLFxuICAgIGV4ZWNGaWxlID0gY2hpbGRfcHJvY2Vzcy5leGVjRmlsZTtcbnZhciBhc3NlcnQgPSByZXF1aXJlKCdhc3NlcnQnKTtcblxudmFyIG1vbWVudCA9IG51bGw7XG4vLyB0cnkge1xuLy8gICAgIHZhciBtb21lbnQgPSByZXF1aXJlKCdtb21lbnQnKTtcbi8vIH0gY2F0Y2ggKGUpIHtcbi8vICAgICBtb21lbnQgPSBudWxsO1xuLy8gfVxuXG5cbi8vLS0tLSBnbG9iYWxzIGFuZCBjb25zdGFudHNcblxudmFyIG5vZGVWZXIgPSBwcm9jZXNzLnZlcnNpb25zLm5vZGUuc3BsaXQoJy4nKS5tYXAoTnVtYmVyKTtcbnZhciBub2RlU3Bhd25TdXBwb3J0c1N0ZGlvID0gKG5vZGVWZXJbMF0gPiAwIHx8IG5vZGVWZXJbMV0gPj0gOCk7XG5cbi8vIEludGVybmFsIGRlYnVnIGxvZ2dpbmcgdmlhIGBjb25zb2xlLndhcm5gLlxudmFyIF9ERUJVRyA9IGZhbHNlO1xuXG4vLyBPdXRwdXQgbW9kZXMuXG52YXIgT01fTE9ORyA9IDE7XG52YXIgT01fSlNPTiA9IDI7XG52YXIgT01fSU5TUEVDVCA9IDM7XG52YXIgT01fU0lNUExFID0gNDtcbnZhciBPTV9TSE9SVCA9IDU7XG52YXIgT01fQlVOWUFOID0gNjtcbnZhciBPTV9GUk9NX05BTUUgPSB7XG4gICAgJ2xvbmcnOiBPTV9MT05HLFxuICAgICdwYXVsJzogT01fTE9ORywgIC8qIGJhY2t3YXJkIGNvbXBhdCAqL1xuICAgICdqc29uJzogT01fSlNPTixcbiAgICAnaW5zcGVjdCc6IE9NX0lOU1BFQ1QsXG4gICAgJ3NpbXBsZSc6IE9NX1NJTVBMRSxcbiAgICAnc2hvcnQnOiBPTV9TSE9SVCxcbiAgICAnYnVueWFuJzogT01fQlVOWUFOXG59O1xuXG5cbi8vIExldmVsc1xudmFyIFRSQUNFID0gMTA7XG52YXIgREVCVUcgPSAyMDtcbnZhciBJTkZPID0gMzA7XG52YXIgV0FSTiA9IDQwO1xudmFyIEVSUk9SID0gNTA7XG52YXIgRkFUQUwgPSA2MDtcblxudmFyIGxldmVsRnJvbU5hbWUgPSB7XG4gICAgJ3RyYWNlJzogVFJBQ0UsXG4gICAgJ2RlYnVnJzogREVCVUcsXG4gICAgJ2luZm8nOiBJTkZPLFxuICAgICd3YXJuJzogV0FSTixcbiAgICAnZXJyb3InOiBFUlJPUixcbiAgICAnZmF0YWwnOiBGQVRBTFxufTtcbnZhciBuYW1lRnJvbUxldmVsID0ge307XG52YXIgdXBwZXJOYW1lRnJvbUxldmVsID0ge307XG52YXIgdXBwZXJQYWRkZWROYW1lRnJvbUxldmVsID0ge307XG5PYmplY3Qua2V5cyhsZXZlbEZyb21OYW1lKS5mb3JFYWNoKGZ1bmN0aW9uIChuYW1lKSB7XG4gICAgdmFyIGx2bCA9IGxldmVsRnJvbU5hbWVbbmFtZV07XG4gICAgbmFtZUZyb21MZXZlbFtsdmxdID0gbmFtZTtcbiAgICB1cHBlck5hbWVGcm9tTGV2ZWxbbHZsXSA9IG5hbWUudG9VcHBlckNhc2UoKTtcbiAgICB1cHBlclBhZGRlZE5hbWVGcm9tTGV2ZWxbbHZsXSA9ICdbJyArIG5hbWVbMF0gKyAnXSdcbiAgICAvLyB1cHBlclBhZGRlZE5hbWVGcm9tTGV2ZWxbbHZsXSA9IChcbiAgICAvLyAgICAgbmFtZS5sZW5ndGggPT09IDQgPyAnICcgOiAnJykgKyBuYW1lLnRvVXBwZXJDYXNlKCk7XG59KTtcblxuXG4vLyBEaXNwbGF5IHRpbWUgZm9ybWF0cy5cbnZhciBUSU1FX1VUQyA9IDE7ICAvLyB0aGUgZGVmYXVsdCwgYnVueWFuJ3MgbmF0aXZlIGZvcm1hdFxudmFyIFRJTUVfTE9DQUwgPSAyO1xuXG4vLyBUaW1lem9uZSBmb3JtYXRzOiBvdXRwdXQgZm9ybWF0IC0+IG1vbWVudGpzIGZvcm1hdCBzdHJpbmdcbnZhciBUSU1FWk9ORV9VVENfRk9STUFUUyA9IHtcbiAgICBsb25nOiAgJ1tbXVlZWVktTU0tRERbVF1ISDptbTpzcy5TU1NbWl1bXV0nLFxuICAgIHNob3J0OiAnSEg6bW06c3MuU1NTW1pdJ1xufTtcbnZhciBUSU1FWk9ORV9MT0NBTF9GT1JNQVRTID0ge1xuICAgIGxvbmc6ICAnW1tdWVlZWS1NTS1ERFtUXUhIOm1tOnNzLlNTU1pbXV0nLFxuICAgIHNob3J0OiAnSEg6bW06c3MuU1NTJ1xufTtcblxuXG4vLyBUaGUgY3VycmVudCByYXcgaW5wdXQgbGluZSBiZWluZyBwcm9jZXNzZWQuIFVzZWQgZm9yIGB1bmNhdWdodEV4Y2VwdGlvbmAuXG52YXIgY3VyckxpbmUgPSBudWxsO1xuXG4vLyBDaGlsZCBkdHJhY2UgcHJvY2VzcywgaWYgYW55LiBVc2VkIGZvciBzaWduYWwtaGFuZGxpbmcuXG52YXIgY2hpbGQgPSBudWxsO1xuXG4vLyBXaGV0aGVyIEFOU0kgY29kZXMgYXJlIGJlaW5nIHVzZWQuIFVzZWQgZm9yIHNpZ25hbC1oYW5kbGluZy5cbnZhciB1c2luZ0Fuc2lDb2RlcyA9IGZhbHNlO1xuXG4vLyBVc2VkIHRvIHRlbGwgdGhlICd1bmNhdWdodEV4Y2VwdGlvbicgaGFuZGxlciB0aGF0ICctYyBDT0RFJyBpcyBiZWluZyB1c2VkLlxudmFyIGdVc2luZ0NvbmRpdGlvbk9wdHMgPSBmYWxzZTtcblxuLy8gUGFnZXIgY2hpbGQgcHJvY2VzcywgYW5kIG91dHB1dCBzdHJlYW0gdG8gd2hpY2ggdG8gd3JpdGUuXG52YXIgcGFnZXIgPSBudWxsO1xudmFyIHN0ZG91dCA9IHByb2Nlc3Muc3Rkb3V0O1xuXG4vLyBXaGV0aGVyIHdlIGFyZSByZWFkaW5nIGZyb20gc3RkaW4uXG52YXIgcmVhZGluZ1N0ZGluID0gZmFsc2U7XG5cblxuXG4vLy0tLS0gc3VwcG9ydCBmdW5jdGlvbnNcblxuZnVuY3Rpb24gZ2V0VmVyc2lvbigpIHtcbiAgICByZXR1cm4gVkVSU0lPTjtcbn1cblxuXG52YXIgZm9ybWF0ID0gdXRpbC5mb3JtYXQ7XG5pZiAoIWZvcm1hdCkge1xuICAgIC8qIEJFR0lOIEpTU1RZTEVEICovXG4gICAgLy8gSWYgbm90IG5vZGUgMC42LCB0aGVuIHVzZSBpdHMgYHV0aWwuZm9ybWF0YDpcbiAgICAvLyA8aHR0cHM6Ly9naXRodWIuY29tL2pveWVudC9ub2RlL2Jsb2IvbWFzdGVyL2xpYi91dGlsLmpzI0wyMj46XG4gICAgdmFyIGluc3BlY3QgPSB1dGlsLmluc3BlY3Q7XG4gICAgdmFyIGZvcm1hdFJlZ0V4cCA9IC8lW3NkaiVdL2c7XG4gICAgZm9ybWF0ID0gZnVuY3Rpb24gZm9ybWF0KGYpIHtcbiAgICAgICAgaWYgKHR5cGVvZiBmICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgdmFyIG9iamVjdHMgPSBbXTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgb2JqZWN0cy5wdXNoKGluc3BlY3QoYXJndW1lbnRzW2ldKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gb2JqZWN0cy5qb2luKCcgJyk7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaSA9IDE7XG4gICAgICAgIHZhciBhcmdzID0gYXJndW1lbnRzO1xuICAgICAgICB2YXIgbGVuID0gYXJncy5sZW5ndGg7XG4gICAgICAgIHZhciBzdHIgPSBTdHJpbmcoZikucmVwbGFjZShmb3JtYXRSZWdFeHAsIGZ1bmN0aW9uICh4KSB7XG4gICAgICAgICAgICBpZiAoaSA+PSBsZW4pXG4gICAgICAgICAgICAgICAgcmV0dXJuIHg7XG4gICAgICAgICAgICBzd2l0Y2ggKHgpIHtcbiAgICAgICAgICAgICAgICBjYXNlICclcyc6IHJldHVybiBTdHJpbmcoYXJnc1tpKytdKTtcbiAgICAgICAgICAgICAgICBjYXNlICclZCc6IHJldHVybiBOdW1iZXIoYXJnc1tpKytdKTtcbiAgICAgICAgICAgICAgICBjYXNlICclaic6IHJldHVybiBKU09OLnN0cmluZ2lmeShhcmdzW2krK10pO1xuICAgICAgICAgICAgICAgIGNhc2UgJyUlJzogcmV0dXJuICclJztcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICByZXR1cm4geDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGZvciAodmFyIHggPSBhcmdzW2ldOyBpIDwgbGVuOyB4ID0gYXJnc1srK2ldKSB7XG4gICAgICAgICAgICBpZiAoeCA9PT0gbnVsbCB8fCB0eXBlb2YgeCAhPT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgICAgICBzdHIgKz0gJyAnICsgeDtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc3RyICs9ICcgJyArIGluc3BlY3QoeCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9O1xuICAgIC8qIEVORCBKU1NUWUxFRCAqL1xufVxuXG5mdW5jdGlvbiBpbmRlbnQocykge1xuICAgIHJldHVybiAnICAgICcgKyBzLnNwbGl0KC9cXHI/XFxuLykuam9pbignXFxuICAgICcpO1xufVxuXG5mdW5jdGlvbiBvYmpDb3B5KG9iaikge1xuICAgIGlmIChvYmogPT09IG51bGwpIHtcbiAgICAgICAgcmV0dXJuIG51bGw7XG4gICAgfSBlbHNlIGlmIChBcnJheS5pc0FycmF5KG9iaikpIHtcbiAgICAgICAgcmV0dXJuIG9iai5zbGljZSgpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBjb3B5ID0ge307XG4gICAgICAgIE9iamVjdC5rZXlzKG9iaikuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgY29weVtrXSA9IG9ialtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBjb3B5O1xuICAgIH1cbn1cblxuZnVuY3Rpb24gcHJpbnRIZWxwKCkge1xuICAgIC8qIEJFR0lOIEpTU1RZTEVEICovXG4gICAgcCgnVXNhZ2U6Jyk7XG4gICAgcCgnICBidW55YW4gW09QVElPTlNdIFtGSUxFIC4uLl0nKTtcbiAgICBwKCcgIC4uLiB8IGJ1bnlhbiBbT1BUSU9OU10nKTtcbiAgICBwKCcgIGJ1bnlhbiBbT1BUSU9OU10gLXAgUElEJyk7XG4gICAgcCgnJyk7XG4gICAgcCgnRmlsdGVyIGFuZCBwcmV0dHktcHJpbnQgQnVueWFuIGxvZyBmaWxlIGNvbnRlbnQuJyk7XG4gICAgcCgnJyk7XG4gICAgcCgnR2VuZXJhbCBvcHRpb25zOicpO1xuICAgIHAoJyAgLWgsIC0taGVscCAgICBwcmludCB0aGlzIGhlbHAgaW5mbyBhbmQgZXhpdCcpO1xuICAgIHAoJyAgLS12ZXJzaW9uICAgICBwcmludCB2ZXJzaW9uIG9mIHRoaXMgY29tbWFuZCBhbmQgZXhpdCcpO1xuICAgIHAoJycpO1xuICAgIHAoJ1J1bnRpbWUgbG9nIHNub29waW5nICh2aWEgRFRyYWNlLCBvbmx5IG9uIHN1cHBvcnRlZCBwbGF0Zm9ybXMpOicpO1xuICAgIHAoJyAgLXAgUElEICAgICAgICBQcm9jZXNzIGJ1bnlhbjpsb2ctKiBwcm9iZXMgZnJvbSB0aGUgcHJvY2VzcycpO1xuICAgIHAoJyAgICAgICAgICAgICAgICB3aXRoIHRoZSBnaXZlbiBQSUQuIENhbiBiZSB1c2VkIG11bHRpcGxlIHRpbWVzLCcpO1xuICAgIHAoJyAgICAgICAgICAgICAgICBvciBzcGVjaWZ5IGFsbCBwcm9jZXNzZXMgd2l0aCBcIipcIiwgb3IgYSBzZXQgb2YnKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgcHJvY2Vzc2VzIHdob3NlIGNvbW1hbmQgJiBhcmdzIG1hdGNoIGEgcGF0dGVybicpO1xuICAgIHAoJyAgICAgICAgICAgICAgICB3aXRoIFwiLXAgTkFNRVwiLicpO1xuICAgIHAoJycpO1xuICAgIHAoJ0ZpbHRlcmluZyBvcHRpb25zOicpO1xuICAgIHAoJyAgLWwsIC0tbGV2ZWwgTEVWRUwnKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgT25seSBzaG93IG1lc3NhZ2VzIGF0IG9yIGFib3ZlIHRoZSBzcGVjaWZpZWQgbGV2ZWwuJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIFlvdSBjYW4gc3BlY2lmeSBsZXZlbCAqbmFtZXMqIG9yIHRoZSBpbnRlcm5hbCBudW1lcmljJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIHZhbHVlcy4nKTtcbiAgICBwKCcgIC1jLCAtLWNvbmRpdGlvbiBDT05ESVRJT04nKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgUnVuIGVhY2ggbG9nIG1lc3NhZ2UgdGhyb3VnaCB0aGUgY29uZGl0aW9uIGFuZCcpO1xuICAgIHAoJyAgICAgICAgICAgICAgICBvbmx5IHNob3cgdGhvc2UgdGhhdCByZXR1cm4gdHJ1aXNoLiBFLmcuOicpO1xuICAgIHAoJyAgICAgICAgICAgICAgICAgICAgLWMgXFwndGhpcy5waWQgPT0gMTIzXFwnJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAgICAtYyBcXCd0aGlzLmxldmVsID09IERFQlVHXFwnJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAgICAtYyBcXCd0aGlzLm1zZy5pbmRleE9mKFwiYm9vbVwiKSAhPSAtMVxcJycpO1xuICAgIHAoJyAgICAgICAgICAgICAgICBcIkNPTkRJVElPTlwiIG11c3QgYmUgbGVnYWwgSlMgY29kZS4gYHRoaXNgIGhvbGRzJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIHRoZSBsb2cgcmVjb3JkLiBUaGUgVFJBQ0UsIERFQlVHLCAuLi4gRkFUQUwgdmFsdWVzJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIGFyZSBkZWZpbmVkIHRvIGhlbHAgd2l0aCBjb21wYXJpbmcgYHRoaXMubGV2ZWxgLicpO1xuICAgIHAoJyAgLS1zdHJpY3QgICAgICBTdXBwcmVzcyBhbGwgYnV0IGxlZ2FsIEJ1bnlhbiBKU09OIGxvZyBsaW5lcy4gQnkgZGVmYXVsdCcpO1xuICAgIHAoJyAgICAgICAgICAgICAgICBub24tSlNPTiwgYW5kIG5vbi1CdW55YW4gbGluZXMgYXJlIHBhc3NlZCB0aHJvdWdoLicpO1xuICAgIHAoJycpO1xuICAgIHAoJ091dHB1dCBvcHRpb25zOicpO1xuICAgIHAoJyAgLS1wYWdlciAgICAgICBQaXBlIG91dHB1dCBpbnRvIGBsZXNzYCAob3IgJFBBR0VSIGlmIHNldCksIGlmJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIHN0ZG91dCBpcyBhIFRUWS4gVGhpcyBvdmVycmlkZXMgJEJVTllBTl9OT19QQUdFUi4nKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgTm90ZTogUGFnaW5nIGlzIG9ubHkgc3VwcG9ydGVkIG9uIG5vZGUgPj0wLjguJyk7XG4gICAgcCgnICAtLW5vLXBhZ2VyICAgIERvIG5vdCBwaXBlIG91dHB1dCBpbnRvIGEgcGFnZXIuJyk7XG4gICAgcCgnICAtLWNvbG9yICAgICAgIENvbG9yaXplIG91dHB1dC4gRGVmYXVsdHMgdG8gdHJ5IGlmIG91dHB1dCcpO1xuICAgIHAoJyAgICAgICAgICAgICAgICBzdHJlYW0gaXMgYSBUVFkuJyk7XG4gICAgcCgnICAtLW5vLWNvbG9yICAgIEZvcmNlIG5vIGNvbG9yaW5nIChlLmcuIHRlcm1pbmFsIGRvZXNuXFwndCBzdXBwb3J0IGl0KScpO1xuICAgIHAoJyAgLW8sIC0tb3V0cHV0IE1PREUnKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgU3BlY2lmeSBhbiBvdXRwdXQgbW9kZS9mb3JtYXQuIE9uZSBvZicpO1xuICAgIHAoJyAgICAgICAgICAgICAgICAgIGxvbmc6ICh0aGUgZGVmYXVsdCkgcHJldHR5Jyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAganNvbjogSlNPTiBvdXRwdXQsIDItc3BhY2UgaW5kZW50Jyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAganNvbi1OOiBKU09OIG91dHB1dCwgTi1zcGFjZSBpbmRlbnQsIGUuZy4gXCJqc29uLTRcIicpO1xuICAgIHAoJyAgICAgICAgICAgICAgICAgIGJ1bnlhbjogMCBpbmRlbnRlZCBKU09OLCBidW55YW5cXCdzIG5hdGl2ZSBmb3JtYXQnKTtcbiAgICBwKCcgICAgICAgICAgICAgICAgICBpbnNwZWN0OiBub2RlLmpzIGB1dGlsLmluc3BlY3RgIG91dHB1dCcpO1xuICAgIHAoJyAgICAgICAgICAgICAgICAgIHNob3J0OiBsaWtlIFwibG9uZ1wiLCBidXQgbW9yZSBjb25jaXNlJyk7XG4gICAgcCgnICAtaiAgICAgICAgICAgIHNob3J0Y3V0IGZvciBgLW8ganNvbmAnKTtcbiAgICBwKCcgIC0wICAgICAgICAgICAgc2hvcnRjdXQgZm9yIGAtbyBidW55YW5gJyk7XG4gICAgcCgnICAtTCwgLS10aW1lIGxvY2FsJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgIERpc3BsYXkgdGltZSBmaWVsZCBpbiBsb2NhbCB0aW1lLCByYXRoZXIgdGhhbiBVVEMuJyk7XG4gICAgcCgnJyk7XG4gICAgcCgnRW52aXJvbm1lbnQgVmFyaWFibGVzOicpO1xuICAgIHAoJyAgQlVOWUFOX05PX0NPTE9SICAgIFNldCB0byBhIG5vbi1lbXB0eSB2YWx1ZSB0byBmb3JjZSBubyBvdXRwdXQgJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAgICAgY29sb3JpbmcuIFNlZSBcIi0tbm8tY29sb3JcIi4nKTtcbiAgICBwKCcgIEJVTllBTl9OT19QQUdFUiAgICBEaXNhYmxlIHBpcGluZyBvdXRwdXQgdG8gYSBwYWdlci4gJyk7XG4gICAgcCgnICAgICAgICAgICAgICAgICAgICAgU2VlIFwiLS1uby1wYWdlclwiLicpO1xuICAgIHAoJycpO1xuICAgIHAoJ1NlZSA8aHR0cHM6Ly9naXRodWIuY29tL3RyZW50bS9ub2RlLWJ1bnlhbj4gZm9yIG1vcmUgY29tcGxldGUgZG9jcy4nKTtcbiAgICBwKCdQbGVhc2UgcmVwb3J0IGJ1Z3MgdG8gPGh0dHBzOi8vZ2l0aHViLmNvbS90cmVudG0vbm9kZS1idW55YW4vaXNzdWVzPi4nKTtcbiAgICAvKiBFTkQgSlNTVFlMRUQgKi9cbn1cblxuLypcbiAqIElmIHRoZSB1c2VyIHNwZWNpZmllcyBtdWx0aXBsZSBpbnB1dCBzb3VyY2VzLCB3ZSB3YW50IHRvIHByaW50IG91dCByZWNvcmRzXG4gKiBmcm9tIGFsbCBzb3VyY2VzIGluIGEgc2luZ2xlLCBjaHJvbm9sb2dpY2FsbHkgb3JkZXJlZCBzdHJlYW0uICBUbyBkbyB0aGlzXG4gKiBlZmZpY2llbnRseSwgd2UgZmlyc3QgYXNzdW1lIHRoYXQgYWxsIHJlY29yZHMgd2l0aGluIGVhY2ggc291cmNlIGFyZSBvcmRlcmVkXG4gKiBhbHJlYWR5LCBzbyB3ZSBuZWVkIG9ubHkga2VlcCB0cmFjayBvZiB0aGUgbmV4dCByZWNvcmQgaW4gZWFjaCBzb3VyY2UgYW5kXG4gKiB0aGUgdGltZSBvZiB0aGUgbGFzdCByZWNvcmQgZW1pdHRlZC4gIFRvIGF2b2lkIGV4Y2VzcyBtZW1vcnkgdXNhZ2UsIHdlXG4gKiBwYXVzZSgpIHN0cmVhbXMgdGhhdCBhcmUgYWhlYWQgb2Ygb3RoZXJzLlxuICpcbiAqICdzdHJlYW1zJyBpcyBhbiBvYmplY3QgaW5kZXhlZCBieSBzb3VyY2UgbmFtZSAoZmlsZSBuYW1lKSB3aGljaCBzcGVjaWZpZXM6XG4gKlxuICogICAgc3RyZWFtICAgICAgICBBY3R1YWwgc3RyZWFtIG9iamVjdCwgc28gdGhhdCB3ZSBjYW4gcGF1c2UgYW5kIHJlc3VtZSBpdC5cbiAqXG4gKiAgICByZWNvcmRzICAgICAgIEFycmF5IG9mIGxvZyByZWNvcmRzIHdlJ3ZlIHJlYWQsIGJ1dCBub3QgeWV0IGVtaXR0ZWQuICBFYWNoXG4gKiAgICAgICAgICAgICAgICAgIHJlY29yZCBpbmNsdWRlcyAnbGluZScgKHRoZSByYXcgbGluZSksICdyZWMnICh0aGUgSlNPTlxuICogICAgICAgICAgICAgICAgICByZWNvcmQpLCBhbmQgJ3RpbWUnICh0aGUgcGFyc2VkIHRpbWUgdmFsdWUpLlxuICpcbiAqICAgIGRvbmUgICAgICAgICAgV2hldGhlciB0aGUgc3RyZWFtIGhhcyBhbnkgbW9yZSByZWNvcmRzIHRvIGVtaXQuXG4gKi9cbnZhciBzdHJlYW1zID0ge307XG5cbmZ1bmN0aW9uIGdvdFJlY29yZChmaWxlLCBsaW5lLCByZWMsIG9wdHMsIHN0eWxpemUpXG57XG4gICAgdmFyIHRpbWUgPSBuZXcgRGF0ZShyZWMudGltZSk7XG5cbiAgICBzdHJlYW1zW2ZpbGVdWydyZWNvcmRzJ10ucHVzaCh7IGxpbmU6IGxpbmUsIHJlYzogcmVjLCB0aW1lOiB0aW1lIH0pO1xuICAgIGVtaXROZXh0UmVjb3JkKG9wdHMsIHN0eWxpemUpO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXJSZWNvcmQocmVjLCBvcHRzKVxue1xuICAgIGlmIChvcHRzLmxldmVsICYmIHJlYy5sZXZlbCA8IG9wdHMubGV2ZWwpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cblxuICAgIGlmIChvcHRzLmNvbmRGdW5jcykge1xuICAgICAgICB2YXIgcmVjQ29weSA9IG9iakNvcHkocmVjKTtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLmNvbmRGdW5jcy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhc3MgPSBvcHRzLmNvbmRGdW5jc1tpXS5jYWxsKHJlY0NvcHkpO1xuICAgICAgICAgICAgaWYgKCFwYXNzKVxuICAgICAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSBpZiAob3B0cy5jb25kVm0pIHtcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBvcHRzLmNvbmRWbS5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgdmFyIHBhc3MgPSBvcHRzLmNvbmRWbVtpXS5ydW5Jbk5ld0NvbnRleHQocmVjKTtcbiAgICAgICAgICAgIGlmICghcGFzcylcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdHJ1ZTtcbn1cblxuZnVuY3Rpb24gZW1pdE5leHRSZWNvcmQob3B0cywgc3R5bGl6ZSlcbntcbiAgICB2YXIgb2ZpbGUsIHJlYWR5LCBtaW5maWxlLCByZWM7XG5cbiAgICBmb3IgKDs7KSB7XG4gICAgICAgIC8qXG4gICAgICAgICAqIFRha2UgYSBmaXJzdCBwYXNzIHRocm91Z2ggdGhlIGlucHV0IHN0cmVhbXMgdG8gc2VlIGlmIHdlIGhhdmUgYVxuICAgICAgICAgKiByZWNvcmQgZnJvbSBhbGwgb2YgdGhlbS4gIElmIG5vdCwgd2UnbGwgcGF1c2UgYW55IHN0cmVhbXMgZm9yXG4gICAgICAgICAqIHdoaWNoIHdlIGRvIGFscmVhZHkgaGF2ZSBhIHJlY29yZCAodG8gYXZvaWQgY29uc3VtaW5nIGV4Y2Vzc1xuICAgICAgICAgKiBtZW1vcnkpIGFuZCB0aGVuIHdhaXQgdW50aWwgd2UgaGF2ZSByZWNvcmRzIGZyb20gdGhlIG90aGVyc1xuICAgICAgICAgKiBiZWZvcmUgZW1pdHRpbmcgdGhlIG5leHQgcmVjb3JkLlxuICAgICAgICAgKlxuICAgICAgICAgKiBBcyBwYXJ0IG9mIHRoZSBzYW1lIHBhc3MsIHdlIGxvb2sgZm9yIHRoZSBlYXJsaWVzdCByZWNvcmRcbiAgICAgICAgICogd2UgaGF2ZSBub3QgeWV0IGVtaXR0ZWQuXG4gICAgICAgICAqL1xuICAgICAgICBtaW5maWxlID0gdW5kZWZpbmVkO1xuICAgICAgICByZWFkeSA9IHRydWU7XG4gICAgICAgIGZvciAob2ZpbGUgaW4gc3RyZWFtcykge1xuXG4gICAgICAgICAgICBpZiAoc3RyZWFtc1tvZmlsZV0uc3RyZWFtID09PSBudWxsIHx8XG4gICAgICAgICAgICAgICAgKCFzdHJlYW1zW29maWxlXS5kb25lICYmIHN0cmVhbXNbb2ZpbGVdLnJlY29yZHMubGVuZ3RoID09PSAwKSkge1xuICAgICAgICAgICAgICAgIHJlYWR5ID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmIChzdHJlYW1zW29maWxlXS5yZWNvcmRzLmxlbmd0aCA+IDAgJiZcbiAgICAgICAgICAgICAgICAobWluZmlsZSA9PT0gdW5kZWZpbmVkIHx8XG4gICAgICAgICAgICAgICAgICAgIHN0cmVhbXNbbWluZmlsZV0ucmVjb3Jkc1swXS50aW1lID5cbiAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbXNbb2ZpbGVdLnJlY29yZHNbMF0udGltZSkpIHtcbiAgICAgICAgICAgICAgICBtaW5maWxlID0gb2ZpbGU7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXJlYWR5IHx8IG1pbmZpbGUgPT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgZm9yIChvZmlsZSBpbiBzdHJlYW1zKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFzdHJlYW1zW29maWxlXS5zdHJlYW0gfHwgc3RyZWFtc1tvZmlsZV0uZG9uZSlcbiAgICAgICAgICAgICAgICAgICAgY29udGludWU7XG5cbiAgICAgICAgICAgICAgICBpZiAoc3RyZWFtc1tvZmlsZV0ucmVjb3Jkcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghc3RyZWFtc1tvZmlsZV0ucGF1c2VkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzdHJlYW1zW29maWxlXS5wYXVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtc1tvZmlsZV0uc3RyZWFtLnBhdXNlKCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHN0cmVhbXNbb2ZpbGVdLnBhdXNlZCkge1xuICAgICAgICAgICAgICAgICAgICBzdHJlYW1zW29maWxlXS5wYXVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICAgICAgc3RyZWFtc1tvZmlsZV0uc3RyZWFtLnJlc3VtZSgpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgLypcbiAgICAgICAgICogRW1pdCB0aGUgbmV4dCByZWNvcmQgZm9yICdtaW5maWxlJywgYW5kIGludm9rZSBvdXJzZWx2ZXMgYWdhaW4gdG9cbiAgICAgICAgICogbWFrZSBzdXJlIHdlIGVtaXQgYXMgbWFueSByZWNvcmRzIGFzIHdlIGNhbiByaWdodCBub3cuXG4gICAgICAgICAqL1xuICAgICAgICByZWMgPSBzdHJlYW1zW21pbmZpbGVdLnJlY29yZHMuc2hpZnQoKTtcbiAgICAgICAgZW1pdFJlY29yZChyZWMucmVjLCByZWMubGluZSwgb3B0cywgc3R5bGl6ZSk7XG4gICAgfVxufVxuXG4vKipcbiAqIFJldHVybiBhIGZ1bmN0aW9uIGZvciB0aGUgZ2l2ZW4gSlMgY29kZSB0aGF0IHJldHVybnMuXG4gKlxuICogSWYgbm8gJ3JldHVybicgaW4gdGhlIGdpdmVuIGphdmFzY3JpcHQgc25pcHBldCwgdGhlbiBhc3N1bWUgd2UgYXJlIGEgc2luZ2xlXG4gKiBzdGF0ZW1lbnQgYW5kIHdyYXAgaW4gJ3JldHVybiAoLi4uKScuIFRoaXMgaXMgZm9yIGNvbnZlbmllbmNlIGZvciBzaG9ydFxuICogJy1jIC4uLicgc25pcHBldHMuXG4gKi9cbmZ1bmN0aW9uIGZ1bmNXaXRoUmV0dXJuRnJvbVNuaXBwZXQoanMpIHtcbiAgICAvLyBhdXRvLVwicmV0dXJuXCJcbiAgICBpZiAoanMuaW5kZXhPZigncmV0dXJuJykgPT09IC0xKSB7XG4gICAgICAgIGlmIChqcy5zdWJzdHJpbmcoanMubGVuZ3RoIC0gMSkgPT09ICc7Jykge1xuICAgICAgICAgICAganMgPSBqcy5zdWJzdHJpbmcoMCwganMubGVuZ3RoIC0gMSk7XG4gICAgICAgIH1cbiAgICAgICAganMgPSAncmV0dXJuICgnICsganMgKyAnKSc7XG4gICAgfVxuXG4gICAgLy8gRXhwb3NlIGxldmVsIGRlZmluaXRpb25zIHRvIGNvbmRpdGlvbiBmdW5jIGNvbnRleHRcbiAgICB2YXIgdmFyRGVmcyA9IFtdO1xuICAgIE9iamVjdC5rZXlzKHVwcGVyTmFtZUZyb21MZXZlbCkuZm9yRWFjaChmdW5jdGlvbiAobHZsKSB7XG4gICAgICAgIHZhckRlZnMucHVzaChmb3JtYXQoJ3ZhciAlcyA9ICVkOycsXG4gICAgICAgICAgICAgICAgdXBwZXJOYW1lRnJvbUxldmVsW2x2bF0sIGx2bCkpO1xuICAgIH0pO1xuICAgIHZhckRlZnMgPSB2YXJEZWZzLmpvaW4oJ1xcbicpICsgJ1xcbic7XG5cbiAgICByZXR1cm4gKG5ldyBGdW5jdGlvbih2YXJEZWZzICsganMpKTtcbn1cblxuLyoqXG4gKiBQYXJzZSB0aGUgY29tbWFuZC1saW5lIG9wdGlvbnMgYW5kIGFyZ3VtZW50cyBpbnRvIGFuIG9iamVjdC5cbiAqXG4gKiAgICB7XG4gKiAgICAgICdhcmdzJzogWy4uLl0gICAgICAgLy8gYXJndW1lbnRzXG4gKiAgICAgICdoZWxwJzogdHJ1ZSwgICAgICAgLy8gdHJ1ZSBpZiAnLWgnIG9wdGlvbiBnaXZlblxuICogICAgICAgLy8gZXRjLlxuICogICAgfVxuICpcbiAqIEByZXR1cm4ge09iamVjdH0gVGhlIHBhcnNlZCBvcHRpb25zLiBgLmFyZ3NgIGlzIHRoZSBhcmd1bWVudCBsaXN0LlxuICogQHRocm93cyB7RXJyb3J9IElmIHRoZXJlIGlzIGFuIGVycm9yIHBhcnNpbmcgYXJndi5cbiAqL1xuZnVuY3Rpb24gcGFyc2VBcmd2KGFyZ3YpIHtcbiAgICB2YXIgcGFyc2VkID0ge1xuICAgICAgICBhcmdzOiBbXSxcbiAgICAgICAgaGVscDogZmFsc2UsXG4gICAgICAgIGNvbG9yOiBudWxsLFxuICAgICAgICBwYWdpbmF0ZTogbnVsbCxcbiAgICAgICAgb3V0cHV0TW9kZTogT01fTE9ORyxcbiAgICAgICAganNvbkluZGVudDogMixcbiAgICAgICAgbGV2ZWw6IG51bGwsXG4gICAgICAgIHN0cmljdDogZmFsc2UsXG4gICAgICAgIHBpZHM6IG51bGwsXG4gICAgICAgIHBpZHNUeXBlOiBudWxsLFxuICAgICAgICB0aW1lRm9ybWF0OiBUSU1FX1VUQyAgLy8gb25lIG9mIHRoZSBUSU1FXyBjb25zdGFudHNcbiAgICB9O1xuXG4gICAgLy8gVHVybiAnLWlIJyBpbnRvICctaSAtSCcsIGV4Y2VwdCBmb3IgYXJndW1lbnQtYWNjZXB0aW5nIG9wdGlvbnMuXG4gICAgdmFyIGFyZ3MgPSBhcmd2LnNsaWNlKDIpOyAgLy8gZHJvcCBbJ25vZGUnLCAnc2NyaXB0bmFtZSddXG4gICAgdmFyIG5ld0FyZ3MgPSBbXTtcbiAgICB2YXIgb3B0VGFrZXNBcmcgPSB7J2QnOiB0cnVlLCAnbyc6IHRydWUsICdjJzogdHJ1ZSwgJ2wnOiB0cnVlLCAncCc6IHRydWV9O1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJncy5sZW5ndGg7IGkrKykge1xuICAgICAgICBpZiAoYXJnc1tpXS5jaGFyQXQoMCkgPT09ICctJyAmJiBhcmdzW2ldLmNoYXJBdCgxKSAhPT0gJy0nICYmXG4gICAgICAgICAgICBhcmdzW2ldLmxlbmd0aCA+IDIpXG4gICAgICAgIHtcbiAgICAgICAgICAgIHZhciBzcGxpdE9wdHMgPSBhcmdzW2ldLnNsaWNlKDEpLnNwbGl0KCcnKTtcbiAgICAgICAgICAgIGZvciAodmFyIGogPSAwOyBqIDwgc3BsaXRPcHRzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgbmV3QXJncy5wdXNoKCctJyArIHNwbGl0T3B0c1tqXSk7XG4gICAgICAgICAgICAgICAgaWYgKG9wdFRha2VzQXJnW3NwbGl0T3B0c1tqXV0pIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIG9wdEFyZyA9IHNwbGl0T3B0cy5zbGljZShqKzEpLmpvaW4oJycpO1xuICAgICAgICAgICAgICAgICAgICBpZiAob3B0QXJnLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgbmV3QXJncy5wdXNoKG9wdEFyZyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgbmV3QXJncy5wdXNoKGFyZ3NbaV0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIGFyZ3MgPSBuZXdBcmdzO1xuXG4gICAgLy8gRXhwb3NlIGxldmVsIGRlZmluaXRpb25zIHRvIGNvbmRpdGlvbiB2bSBjb250ZXh0XG4gICAgdmFyIGNvbmREZWZpbmVzID0gW107XG4gICAgT2JqZWN0LmtleXModXBwZXJOYW1lRnJvbUxldmVsKS5mb3JFYWNoKGZ1bmN0aW9uIChsdmwpIHtcbiAgICAgICAgY29uZERlZmluZXMucHVzaChcbiAgICAgICAgICAgIGZvcm1hdCgnT2JqZWN0LnByb3RvdHlwZS4lcyA9ICVzOycsIHVwcGVyTmFtZUZyb21MZXZlbFtsdmxdLCBsdmwpKTtcbiAgICB9KTtcbiAgICBjb25kRGVmaW5lcyA9IGNvbmREZWZpbmVzLmpvaW4oJ1xcbicpICsgJ1xcbic7XG5cbiAgICB2YXIgZW5kT2ZPcHRpb25zID0gZmFsc2U7XG4gICAgd2hpbGUgKGFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgYXJnID0gYXJncy5zaGlmdCgpO1xuICAgICAgICBzd2l0Y2ggKGFyZykge1xuICAgICAgICAgICAgY2FzZSAnLS0nOlxuICAgICAgICAgICAgICAgIGVuZE9mT3B0aW9ucyA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctaCc6IC8vIGRpc3BsYXkgaGVscCBhbmQgZXhpdFxuICAgICAgICAgICAgY2FzZSAnLS1oZWxwJzpcbiAgICAgICAgICAgICAgICBwYXJzZWQuaGVscCA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctLXZlcnNpb24nOlxuICAgICAgICAgICAgICAgIHBhcnNlZC52ZXJzaW9uID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy0tc3RyaWN0JzpcbiAgICAgICAgICAgICAgICBwYXJzZWQuc3RyaWN0ID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy0tY29sb3InOlxuICAgICAgICAgICAgICAgIHBhcnNlZC5jb2xvciA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctLW5vLWNvbG9yJzpcbiAgICAgICAgICAgICAgICBwYXJzZWQuY29sb3IgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy0tcGFnZXInOlxuICAgICAgICAgICAgICAgIHBhcnNlZC5wYWdpbmF0ZSA9IHRydWU7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctLW5vLXBhZ2VyJzpcbiAgICAgICAgICAgICAgICBwYXJzZWQucGFnaW5hdGUgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy1vJzpcbiAgICAgICAgICAgIGNhc2UgJy0tb3V0cHV0JzpcbiAgICAgICAgICAgICAgICB2YXIgbmFtZSA9IGFyZ3Muc2hpZnQoKTtcbiAgICAgICAgICAgICAgICB2YXIgaWR4ID0gbmFtZS5sYXN0SW5kZXhPZignLScpO1xuICAgICAgICAgICAgICAgIGlmIChpZHggIT09IC0xKSB7XG4gICAgICAgICAgICAgICAgICAgIHZhciBpbmRlbnRhdGlvbiA9IE51bWJlcihuYW1lLnNsaWNlKGlkeCsxKSk7XG4gICAgICAgICAgICAgICAgICAgIGlmICghIGlzTmFOKGluZGVudGF0aW9uKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcGFyc2VkLmpzb25JbmRlbnQgPSBpbmRlbnRhdGlvbjtcbiAgICAgICAgICAgICAgICAgICAgICAgIG5hbWUgPSBuYW1lLnNsaWNlKDAsIGlkeCk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgcGFyc2VkLm91dHB1dE1vZGUgPSBPTV9GUk9NX05BTUVbbmFtZV07XG4gICAgICAgICAgICAgICAgaWYgKHBhcnNlZC5vdXRwdXRNb2RlID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIG91dHB1dCBtb2RlOiBcIicrbmFtZSsnXCInKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctaic6IC8vIG91dHB1dCB3aXRoIEpTT04uc3RyaW5naWZ5XG4gICAgICAgICAgICAgICAgcGFyc2VkLm91dHB1dE1vZGUgPSBPTV9KU09OO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLTAnOlxuICAgICAgICAgICAgICAgIHBhcnNlZC5vdXRwdXRNb2RlID0gT01fQlVOWUFOO1xuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgY2FzZSAnLUwnOlxuICAgICAgICAgICAgICAgIHBhcnNlZC50aW1lRm9ybWF0ID0gVElNRV9MT0NBTDtcbiAgICAgICAgICAgICAgICBpZiAoIW1vbWVudCkge1xuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgICAgICAgICAgICAgICAgICAnY291bGQgbm90IGZpbmQgbW9tZW50IHBhY2thZ2UgcmVxdWlyZWQgZm9yIFwiLUxcIicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy0tdGltZSc6XG4gICAgICAgICAgICAgICAgdmFyIHRpbWVBcmcgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aW1lQXJnKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAndXRjJzpcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLnRpbWVGb3JtYXQgPSBUSU1FX1VUQztcbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICBjYXNlICdsb2NhbCc6XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZC50aW1lRm9ybWF0ID0gVElNRV9MT0NBTDtcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFtb21lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignY291bGQgbm90IGZpbmQgbW9tZW50IHBhY2thZ2UgJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJ3JlcXVpcmVkIGZvciBcIi0tdGltZT1sb2NhbFwiJyk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgYnJlYWtcbiAgICAgICAgICAgICAgICBjYXNlIHVuZGVmaW5lZDpcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdtaXNzaW5nIGFyZ3VtZW50IHRvIFwiLS10aW1lXCInKTtcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdpbnZhbGlkIHRpbWUgZm9ybWF0OiBcIiVzXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgdGltZUFyZykpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy1wJzpcbiAgICAgICAgICAgICAgICBpZiAoIXBhcnNlZC5waWRzKSB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZC5waWRzID0gW107XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHZhciBwaWRBcmcgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgdmFyIHBpZCA9ICsocGlkQXJnKTtcbiAgICAgICAgICAgICAgICBpZiAoIWlzTmFOKHBpZCkgfHwgcGlkQXJnID09PSAnKicpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnNlZC5waWRzVHlwZSAmJiBwYXJzZWQucGlkc1R5cGUgIT09ICdudW0nKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdjYW5ub3QgbWl4IFBJRCBuYW1lIGFuZCAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyAnbnVtYmVyIGFyZ3VtZW50czogXCIlc1wiJywgcGlkQXJnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLnBpZHNUeXBlID0gJ251bSc7XG4gICAgICAgICAgICAgICAgICAgIGlmICghcGFyc2VkLnBpZHMpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnNlZC5waWRzID0gW107XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLnBpZHMucHVzaChpc05hTihwaWQpID8gcGlkQXJnIDogcGlkKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBpZiAocGFyc2VkLnBpZHNUeXBlICYmIHBhcnNlZC5waWRzVHlwZSAhPT0gJ25hbWUnKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdjYW5ub3QgbWl4IFBJRCBuYW1lIGFuZCAnXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyAnbnVtYmVyIGFyZ3VtZW50czogXCIlc1wiJywgcGlkQXJnKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLnBpZHNUeXBlID0gJ25hbWUnO1xuICAgICAgICAgICAgICAgICAgICBwYXJzZWQucGlkcyA9IHBpZEFyZztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlICctbCc6XG4gICAgICAgICAgICBjYXNlICctLWxldmVsJzpcbiAgICAgICAgICAgICAgICB2YXIgbGV2ZWxBcmcgPSBhcmdzLnNoaWZ0KCk7XG4gICAgICAgICAgICAgICAgdmFyIGxldmVsID0gKyhsZXZlbEFyZyk7XG4gICAgICAgICAgICAgICAgaWYgKGlzTmFOKGxldmVsKSkge1xuICAgICAgICAgICAgICAgICAgICBsZXZlbCA9ICtsZXZlbEZyb21OYW1lW2xldmVsQXJnLnRvTG93ZXJDYXNlKCldO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpZiAoaXNOYU4obGV2ZWwpKSB7XG4gICAgICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5rbm93biBsZXZlbCB2YWx1ZTogXCInK2xldmVsQXJnKydcIicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJzZWQubGV2ZWwgPSBsZXZlbDtcbiAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgIGNhc2UgJy1jJzpcbiAgICAgICAgICAgIGNhc2UgJy0tY29uZGl0aW9uJzpcbiAgICAgICAgICAgICAgICBnVXNpbmdDb25kaXRpb25PcHRzID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB2YXIgY29uZGl0aW9uID0gYXJncy5zaGlmdCgpO1xuICAgICAgICAgICAgICAgIGlmIChCb29sZWFuKHByb2Nlc3MuZW52LkJVTllBTl9FWEVDICYmXG4gICAgICAgICAgICAgICAgICAgIHByb2Nlc3MuZW52LkJVTllBTl9FWEVDID09PSAndm0nKSlcbiAgICAgICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZC5jb25kVm0gPSBwYXJzZWQuY29uZFZtIHx8IFtdO1xuICAgICAgICAgICAgICAgICAgICB2YXIgc2NyaXB0TmFtZSA9ICdidW55YW4tY29uZGl0aW9uLScrcGFyc2VkLmNvbmRWbS5sZW5ndGg7XG4gICAgICAgICAgICAgICAgICAgIHZhciBjb2RlID0gY29uZERlZmluZXMgKyBjb25kaXRpb247XG4gICAgICAgICAgICAgICAgICAgIHZhciBzY3JpcHQ7XG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQgPSB2bS5jcmVhdGVTY3JpcHQoY29kZSwgc2NyaXB0TmFtZSk7XG4gICAgICAgICAgICAgICAgICAgIH0gY2F0Y2ggKGNvbXBsRXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZm9ybWF0KCdpbGxlZ2FsIENPTkRJVElPTiBjb2RlOiAlc1xcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArICcgIENPTkRJVElPTiBzY3JpcHQ6XFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJyVzXFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJyAgRXJyb3I6XFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJyVzJyxcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb21wbEVyciwgaW5kZW50KGNvZGUpLCBpbmRlbnQoY29tcGxFcnIuc3RhY2spKSk7XG4gICAgICAgICAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgICAgICAgICAvLyBFbnN1cmUgdGhpcyBpcyBhIHJlYXNvbmFibHkgc2FmZSBDT05ESVRJT04uXG4gICAgICAgICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgICAgICAgICBzY3JpcHQucnVuSW5OZXdDb250ZXh0KG1pblZhbGlkUmVjb3JkKTtcbiAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoY29uZEVycikge1xuICAgICAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGZvcm1hdChcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvKiBKU1NUWUxFRCAqL1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICdDT05ESVRJT04gY29kZSBjYW5ub3Qgc2FmZWx5IGZpbHRlciBhIG1pbmltYWwgQnVueWFuIGxvZyByZWNvcmRcXG4nXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKyAnICBDT05ESVRJT04gc2NyaXB0OlxcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArICclc1xcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArICcgIE1pbmltYWwgQnVueWFuIGxvZyByZWNvcmQ6XFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJyVzXFxuJ1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgICsgJyAgRmlsdGVyIGVycm9yOlxcbidcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICArICclcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaW5kZW50KGNvZGUpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudChKU09OLnN0cmluZ2lmeShtaW5WYWxpZFJlY29yZCwgbnVsbCwgMikpLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGluZGVudChjb25kRXJyLnN0YWNrKVxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICkpO1xuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgIHBhcnNlZC5jb25kVm0ucHVzaChzY3JpcHQpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSAge1xuICAgICAgICAgICAgICAgICAgICBwYXJzZWQuY29uZEZ1bmNzID0gcGFyc2VkLmNvbmRGdW5jcyB8fCBbXTtcbiAgICAgICAgICAgICAgICAgICAgcGFyc2VkLmNvbmRGdW5jcy5wdXNoKGZ1bmNXaXRoUmV0dXJuRnJvbVNuaXBwZXQoY29uZGl0aW9uKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgZGVmYXVsdDogLy8gYXJndW1lbnRzXG4gICAgICAgICAgICAgICAgaWYgKCFlbmRPZk9wdGlvbnMgJiYgYXJnLmxlbmd0aCA+IDAgJiYgYXJnWzBdID09PSAnLScpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd1bmtub3duIG9wdGlvbiBcIicrYXJnKydcIicpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBwYXJzZWQuYXJncy5wdXNoKGFyZyk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy9UT0RPOiAnLS0nIGhhbmRsaW5nIGFuZCBlcnJvciBvbiBhIGZpcnN0IGFyZyB0aGF0IGxvb2tzIGxpa2UgYW4gb3B0aW9uLlxuXG4gICAgcmV0dXJuIHBhcnNlZDtcbn1cblxuXG5mdW5jdGlvbiBpc0ludGVnZXIocykge1xuICAgIHJldHVybiAocy5zZWFyY2goL14tP1swLTldKyQvKSA9PSAwKTtcbn1cblxuXG4vLyBodHRwOi8vZW4ud2lraXBlZGlhLm9yZy93aWtpL0FOU0lfZXNjYXBlX2NvZGUjZ3JhcGhpY3Ncbi8vIFN1Z2dlc3RlZCBjb2xvcnMgKHNvbWUgYXJlIHVucmVhZGFibGUgaW4gY29tbW9uIGNhc2VzKTpcbi8vIC0gR29vZDogY3lhbiwgeWVsbG93IChsaW1pdGVkIHVzZSksIGJvbGQsIGdyZWVuLCBtYWdlbnRhLCByZWRcbi8vIC0gQmFkOiBibHVlIChub3QgdmlzaWJsZSBvbiBjbWQuZXhlKSwgZ3JleSAoc2FtZSBjb2xvciBhcyBiYWNrZ3JvdW5kIG9uXG4vLyAgIFNvbGFyaXplZCBEYXJrIHRoZW1lIGZyb20gPGh0dHBzOi8vZ2l0aHViLmNvbS9hbHRlcmNhdGlvbi9zb2xhcml6ZWQ+LCBzZWVcbi8vICAgaXNzdWUgIzE2MClcbnZhciBjb2xvcnMgPSB7XG4gICAgJ2JvbGQnIDogWzEsIDIyXSxcbiAgICAnaXRhbGljJyA6IFszLCAyM10sXG4gICAgJ3VuZGVybGluZScgOiBbNCwgMjRdLFxuICAgICdpbnZlcnNlJyA6IFs3LCAyN10sXG4gICAgJ3doaXRlJyA6IFszNywgMzldLFxuICAgICdncmV5JyA6IFs5MCwgMzldLFxuICAgICdibGFjaycgOiBbMzAsIDM5XSxcbiAgICAnYmx1ZScgOiBbMzQsIDM5XSxcbiAgICAnY3lhbicgOiBbMzYsIDM5XSxcbiAgICAnZ3JlZW4nIDogWzMyLCAzOV0sXG4gICAgJ21hZ2VudGEnIDogWzM1LCAzOV0sXG4gICAgJ3JlZCcgOiBbMzEsIDM5XSxcbiAgICAneWVsbG93JyA6IFszMywgMzldXG59O1xuXG5mdW5jdGlvbiBzdHlsaXplV2l0aENvbG9yKHN0ciwgY29sb3IpIHtcbiAgICBpZiAoIXN0cilcbiAgICAgICAgcmV0dXJuICcnO1xuICAgIHZhciBjb2RlcyA9IGNvbG9yc1tjb2xvcl07XG4gICAgaWYgKGNvZGVzKSB7XG4gICAgICAgIHJldHVybiAnXFx4MUJbJyArIGNvZGVzWzBdICsgJ20nICsgc3RyICtcbiAgICAgICAgICAgICAgICAgICAgICdcXHgxQlsnICsgY29kZXNbMV0gKyAnbSc7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuIHN0cjtcbiAgICB9XG59XG5cbmZ1bmN0aW9uIHN0eWxpemVXaXRob3V0Q29sb3Ioc3RyLCBjb2xvcikge1xuICAgIHJldHVybiBzdHI7XG59XG5cblxuLyoqXG4gKiBJcyB0aGlzIGEgdmFsaWQgQnVueWFuIGxvZyByZWNvcmQuXG4gKi9cbmZ1bmN0aW9uIGlzVmFsaWRSZWNvcmQocmVjKSB7XG4gICAgaWYgKHJlYy52ID09IG51bGwgfHxcbiAgICAgICAgICAgIHJlYy5sZXZlbCA9PSBudWxsIHx8XG4gICAgICAgICAgICByZWMubmFtZSA9PSBudWxsIHx8XG4gICAgICAgICAgICByZWMuaG9zdG5hbWUgPT0gbnVsbCB8fFxuICAgICAgICAgICAgcmVjLnBpZCA9PSBudWxsIHx8XG4gICAgICAgICAgICByZWMudGltZSA9PSBudWxsIHx8XG4gICAgICAgICAgICByZWMubXNnID09IG51bGwpIHtcbiAgICAgICAgLy8gTm90IHZhbGlkIEJ1bnlhbiBsb2cuXG4gICAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9XG59XG52YXIgbWluVmFsaWRSZWNvcmQgPSB7XG4gICAgdjogMCwgICAvL1RPRE86IGdldCB0aGlzIGZyb20gYnVueWFuLkxPR19WRVJTSU9OXG4gICAgbGV2ZWw6IElORk8sXG4gICAgbmFtZTogJ25hbWUnLFxuICAgIGhvc3RuYW1lOiAnaG9zdG5hbWUnLFxuICAgIHBpZDogMTIzLFxuICAgIHRpbWU6IERhdGUubm93KCksXG4gICAgbXNnOiAnbXNnJ1xufTtcblxuXG4vKipcbiAqIFBhcnNlcyB0aGUgZ2l2ZW4gbG9nIGxpbmUgYW5kIGVpdGhlciBlbWl0cyBpdCByaWdodCBhd2F5IChmb3IgaW52YWxpZFxuICogcmVjb3Jkcykgb3IgZW5xdWV1ZXMgaXQgZm9yIGVtaXR0aW5nIGxhdGVyIHdoZW4gaXQncyB0aGUgbmV4dCBsaW5lIHRvIHNob3cuXG4gKi9cbmZ1bmN0aW9uIGhhbmRsZUxvZ0xpbmUoZmlsZSwgbGluZSwgb3B0cywgc3R5bGl6ZSkge1xuICAgIGN1cnJMaW5lID0gbGluZTsgLy8gaW50ZW50aW9uYWxseSBnbG9iYWxcblxuICAgIC8vIEVtaXQgbm9uLUpTT04gbGluZXMgaW1tZWRpYXRlbHkuXG4gICAgdmFyIHJlYztcbiAgICBpZiAoIWxpbmUpIHtcbiAgICAgICAgaWYgKCFvcHRzLnN0cmljdCkgZW1pdChsaW5lICsgJ1xcbicpO1xuICAgICAgICByZXR1cm47XG4gICAgfSBlbHNlIGlmIChsaW5lWzBdICE9PSAneycpIHtcbiAgICAgICAgaWYgKCFvcHRzLnN0cmljdCkgZW1pdChsaW5lICsgJ1xcbicpOyAgLy8gbm90IEpTT05cbiAgICAgICAgcmV0dXJuO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZWMgPSBKU09OLnBhcnNlKGxpbmUpO1xuICAgICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgICAgICBpZiAoIW9wdHMuc3RyaWN0KSBlbWl0KGxpbmUgKyAnXFxuJyk7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAoIWlzVmFsaWRSZWNvcmQocmVjKSkge1xuICAgICAgICBpZiAoIW9wdHMuc3RyaWN0KSBlbWl0KGxpbmUgKyAnXFxuJyk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICBpZiAoIWZpbHRlclJlY29yZChyZWMsIG9wdHMpKVxuICAgICAgICByZXR1cm47XG5cbiAgICBpZiAoZmlsZSA9PT0gbnVsbClcbiAgICAgICAgcmV0dXJuIGVtaXRSZWNvcmQocmVjLCBsaW5lLCBvcHRzLCBzdHlsaXplKTtcblxuICAgIHJldHVybiBnb3RSZWNvcmQoZmlsZSwgbGluZSwgcmVjLCBvcHRzLCBzdHlsaXplKTtcbn1cblxuLyoqXG4gKiBQcmludCBvdXQgYSBzaW5nbGUgcmVzdWx0LCBjb25zaWRlcmluZyBpbnB1dCBvcHRpb25zLlxuICovXG5mdW5jdGlvbiBlbWl0UmVjb3JkKHJlYywgbGluZSwgb3B0cywgc3R5bGl6ZSkge1xuICAgIHZhciBzaG9ydCA9IGZhbHNlO1xuXG4gICAgc3dpdGNoIChvcHRzLm91dHB1dE1vZGUpIHtcbiAgICBjYXNlIE9NX1NIT1JUOlxuICAgICAgICBzaG9ydCA9IHRydWU7XG4gICAgICAgIC8qIGpzbDpmYWxsLXRocnUgKi9cblxuICAgIGNhc2UgT01fTE9ORzpcbiAgICAgICAgLy8gICAgW3RpbWVdIExFVkVMOiBuYW1lWy9jb21wXS9waWQgb24gaG9zdG5hbWUgKHNyYyk6IG1zZyogKGV4dHJhcy4uLilcbiAgICAgICAgLy8gICAgICAgIG1zZypcbiAgICAgICAgLy8gICAgICAgIC0tXG4gICAgICAgIC8vICAgICAgICBsb25nIGFuZCBtdWx0aS1saW5lIGV4dHJhc1xuICAgICAgICAvLyAgICAgICAgLi4uXG4gICAgICAgIC8vIElmICdtc2cnIGlzIHNpbmdsZS1saW5lLCB0aGVuIGl0IGdvZXMgaW4gdGhlIHRvcCBsaW5lLlxuICAgICAgICAvLyBJZiAncmVxJywgc2hvdyB0aGUgcmVxdWVzdC5cbiAgICAgICAgLy8gSWYgJ3JlcycsIHNob3cgdGhlIHJlc3BvbnNlLlxuICAgICAgICAvLyBJZiAnZXJyJyBhbmQgJ2Vyci5zdGFjaycgdGhlbiBzaG93IHRoYXQuXG4gICAgICAgIGlmICghaXNWYWxpZFJlY29yZChyZWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZW1pdChsaW5lICsgJ1xcbicpO1xuICAgICAgICB9XG5cbiAgICAgICAgZGVsZXRlIHJlYy52O1xuXG4gICAgICAgIC8vIFRpbWUuXG4gICAgICAgIHZhciB0aW1lO1xuICAgICAgICBpZiAoIXNob3J0ICYmIG9wdHMudGltZUZvcm1hdCA9PT0gVElNRV9VVEMpIHtcbiAgICAgICAgICAgIC8vIEZhc3QgZGVmYXVsdCBwYXRoOiBXZSBhc3N1bWUgdGhlIHJhdyBgcmVjLnRpbWVgIGlzIGEgVVRDIHRpbWVcbiAgICAgICAgICAgIC8vIGluIElTTyA4NjAxIGZvcm1hdCAocGVyIHNwZWMpLlxuICAgICAgICAgICAgdGltZSA9ICdbJyArIHJlYy50aW1lICsgJ10nO1xuICAgICAgICB9IGVsc2UgaWYgKCFtb21lbnQgJiYgb3B0cy50aW1lRm9ybWF0ID09PSBUSU1FX1VUQykge1xuICAgICAgICAgICAgLy8gRG9uJ3QgcmVxdWlyZSBtb21lbnRqcyBpbnN0YWxsLCBhcyBsb25nIGFzIG5vdCB1c2luZyBUSU1FX0xPQ0FMLlxuICAgICAgICAgICAgdGltZSA9IHJlYy50aW1lLnN1YnN0cigxMSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB2YXIgdHpGb3JtYXQ7XG4gICAgICAgICAgICB2YXIgbW9UaW1lID0gbW9tZW50KHJlYy50aW1lKTtcbiAgICAgICAgICAgIHN3aXRjaCAob3B0cy50aW1lRm9ybWF0KSB7XG4gICAgICAgICAgICBjYXNlIFRJTUVfVVRDOlxuICAgICAgICAgICAgICAgIHR6Rm9ybWF0ID0gVElNRVpPTkVfVVRDX0ZPUk1BVFNbc2hvcnQgPyAnc2hvcnQnIDogJ2xvbmcnXTtcbiAgICAgICAgICAgICAgICBtb1RpbWUudXRjKCk7XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBjYXNlIFRJTUVfTE9DQUw6XG4gICAgICAgICAgICAgICAgdHpGb3JtYXQgPSBUSU1FWk9ORV9MT0NBTF9GT1JNQVRTW3Nob3J0ID8gJ3Nob3J0JyA6ICdsb25nJ107XG4gICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndW5leHBlY3RlZCB0aW1lRm9ybWF0OiAnICsgb3B0cy50aW1lRm9ybWF0KTtcbiAgICAgICAgICAgIH07XG4gICAgICAgICAgICB0aW1lID0gbW9UaW1lLmZvcm1hdCh0ekZvcm1hdCk7XG4gICAgICAgIH1cbiAgICAgICAgdGltZSA9IHN0eWxpemUodGltZSwgJ1hYWCcpO1xuICAgICAgICBkZWxldGUgcmVjLnRpbWU7XG5cbiAgICAgICAgdmFyIG5hbWVTdHIgPSByZWMubmFtZTtcbiAgICAgICAgZGVsZXRlIHJlYy5uYW1lO1xuXG4gICAgICAgIGlmIChyZWMuY29tcG9uZW50KSB7XG4gICAgICAgICAgICBuYW1lU3RyICs9ICcvJyArIHJlYy5jb21wb25lbnQ7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlYy5jb21wb25lbnQ7XG5cbiAgICAgICAgaWYgKCFzaG9ydClcbiAgICAgICAgICAgIG5hbWVTdHIgKz0gJy8nICsgcmVjLnBpZDtcbiAgICAgICAgZGVsZXRlIHJlYy5waWQ7XG5cbiAgICAgICAgdmFyIGxldmVsID0gKHVwcGVyUGFkZGVkTmFtZUZyb21MZXZlbFtyZWMubGV2ZWxdIHx8ICdMVkwnICsgcmVjLmxldmVsKTtcbiAgICAgICAgaWYgKG9wdHMuY29sb3IpIHtcbiAgICAgICAgICAgIHZhciBjb2xvckZyb21MZXZlbCA9IHtcbiAgICAgICAgICAgICAgICAxMDogJ3doaXRlJywgICAgLy8gVFJBQ0VcbiAgICAgICAgICAgICAgICAyMDogJ3llbGxvdycsICAgLy8gREVCVUdcbiAgICAgICAgICAgICAgICAzMDogJ2N5YW4nLCAgICAgLy8gSU5GT1xuICAgICAgICAgICAgICAgIDQwOiAnbWFnZW50YScsICAvLyBXQVJOXG4gICAgICAgICAgICAgICAgNTA6ICdyZWQnLCAgICAgIC8vIEVSUk9SXG4gICAgICAgICAgICAgICAgNjA6ICdpbnZlcnNlJywgIC8vIEZBVEFMXG4gICAgICAgICAgICB9O1xuICAgICAgICAgICAgbGV2ZWwgPSBzdHlsaXplKGxldmVsLCBjb2xvckZyb21MZXZlbFtyZWMubGV2ZWxdKTtcbiAgICAgICAgfVxuICAgICAgICBkZWxldGUgcmVjLmxldmVsO1xuXG4gICAgICAgIHZhciBzcmMgPSAnJztcbiAgICAgICAgaWYgKHJlYy5zcmMgJiYgcmVjLnNyYy5maWxlKSB7XG4gICAgICAgICAgICB2YXIgcyA9IHJlYy5zcmM7XG4gICAgICAgICAgICBpZiAocy5mdW5jKSB7XG4gICAgICAgICAgICAgICAgc3JjID0gZm9ybWF0KCcgKCVzOiVkIGluICVzKScsIHMuZmlsZSwgcy5saW5lLCBzLmZ1bmMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzcmMgPSBmb3JtYXQoJyAoJXM6JWQpJywgcy5maWxlLCBzLmxpbmUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgc3JjID0gc3R5bGl6ZShzcmMsICdncmVlbicpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZWMuc3JjO1xuXG4gICAgICAgIHZhciBob3N0bmFtZSA9IHJlYy5ob3N0bmFtZTtcbiAgICAgICAgZGVsZXRlIHJlYy5ob3N0bmFtZTtcblxuICAgICAgICB2YXIgZXh0cmFzID0gW107XG4gICAgICAgIHZhciBkZXRhaWxzID0gW107XG5cbiAgICAgICAgaWYgKHJlYy5yZXFfaWQpIHtcbiAgICAgICAgICAgIGV4dHJhcy5wdXNoKCdyZXFfaWQ9JyArIHJlYy5yZXFfaWQpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZWMucmVxX2lkO1xuICAgICAgICBpZiAocmVjLnJlcUlkKSB7XG4gICAgICAgICAgICBleHRyYXMucHVzaCgncmVxSWQ9JyArIHJlYy5yZXFJZCk7XG4gICAgICAgIH1cbiAgICAgICAgZGVsZXRlIHJlYy5yZXFJZDtcblxuICAgICAgICB2YXIgb25lbGluZU1zZztcbiAgICAgICAgaWYgKHJlYy5tc2cuaW5kZXhPZignXFxuJykgIT09IC0xKSB7XG4gICAgICAgICAgICBvbmVsaW5lTXNnID0gJyc7XG4gICAgICAgICAgICBkZXRhaWxzLnB1c2goaW5kZW50KHN0eWxpemUocmVjLm1zZykpKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9uZWxpbmVNc2cgPSAnICcgKyBzdHlsaXplKHJlYy5tc2cpO1xuICAgICAgICB9XG4gICAgICAgIGRlbGV0ZSByZWMubXNnO1xuXG4gICAgICAgIGlmIChyZWMucmVxICYmIHR5cGVvZiAocmVjLnJlcSkgPT09ICdvYmplY3QnKSB7XG4gICAgICAgICAgICB2YXIgcmVxID0gcmVjLnJlcTtcbiAgICAgICAgICAgIGRlbGV0ZSByZWMucmVxO1xuICAgICAgICAgICAgdmFyIGhlYWRlcnMgPSByZXEuaGVhZGVycztcbiAgICAgICAgICAgIGlmICghaGVhZGVycykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMgPSAnJztcbiAgICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIChoZWFkZXJzKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgICBoZWFkZXJzID0gJ1xcbicgKyBoZWFkZXJzO1xuICAgICAgICAgICAgfSBlbHNlIGlmICh0eXBlb2YgKGhlYWRlcnMpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMgPSAnXFxuJyArIE9iamVjdC5rZXlzKGhlYWRlcnMpLm1hcChmdW5jdGlvbiAoaCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaCArICc6ICcgKyBoZWFkZXJzW2hdO1xuICAgICAgICAgICAgICAgIH0pLmpvaW4oJ1xcbicpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdmFyIHMgPSBmb3JtYXQoJyVzICVzIEhUVFAvJXMlcycsIHJlcS5tZXRob2QsXG4gICAgICAgICAgICAgICAgcmVxLnVybCxcbiAgICAgICAgICAgICAgICByZXEuaHR0cFZlcnNpb24gfHwgJzEuMScsXG4gICAgICAgICAgICAgICAgaGVhZGVyc1xuICAgICAgICAgICAgKTtcbiAgICAgICAgICAgIGRlbGV0ZSByZXEudXJsO1xuICAgICAgICAgICAgZGVsZXRlIHJlcS5tZXRob2Q7XG4gICAgICAgICAgICBkZWxldGUgcmVxLmh0dHBWZXJzaW9uO1xuICAgICAgICAgICAgZGVsZXRlIHJlcS5oZWFkZXJzO1xuICAgICAgICAgICAgaWYgKHJlcS5ib2R5KSB7XG4gICAgICAgICAgICAgICAgcyArPSAnXFxuXFxuJyArICh0eXBlb2YgKHJlcS5ib2R5KSA9PT0gJ29iamVjdCdcbiAgICAgICAgICAgICAgICAgICAgPyBKU09OLnN0cmluZ2lmeShyZXEuYm9keSwgbnVsbCwgMikgOiByZXEuYm9keSk7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlcS5ib2R5O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKHJlcS50cmFpbGVycyAmJiBPYmplY3Qua2V5cyhyZXEudHJhaWxlcnMpID4gMCkge1xuICAgICAgICAgICAgICAgIHMgKz0gJ1xcbicgKyBPYmplY3Qua2V5cyhyZXEudHJhaWxlcnMpLm1hcChmdW5jdGlvbiAodCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdCArICc6ICcgKyByZXEudHJhaWxlcnNbdF07XG4gICAgICAgICAgICAgICAgfSkuam9pbignXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkZWxldGUgcmVxLnRyYWlsZXJzO1xuICAgICAgICAgICAgZGV0YWlscy5wdXNoKGluZGVudChzKSk7XG4gICAgICAgICAgICAvLyBFLmcuIGZvciBleHRyYSAnZm9vJyBmaWVsZCBvbiAncmVxJywgYWRkICdyZXEuZm9vJyBhdFxuICAgICAgICAgICAgLy8gdG9wLWxldmVsLiBUaGlzICpkb2VzKiBoYXZlIHRoZSBwb3RlbnRpYWwgdG8gc3RvbXAgb24gYVxuICAgICAgICAgICAgLy8gbGl0ZXJhbCAncmVxLmZvbycga2V5LlxuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVxKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICAgICAgcmVjWydyZXEuJyArIGtdID0gcmVxW2tdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChyZWMuY2xpZW50X3JlcSAmJiB0eXBlb2YgKHJlYy5jbGllbnRfcmVxKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIHZhciBjbGllbnRfcmVxID0gcmVjLmNsaWVudF9yZXE7XG4gICAgICAgICAgICBkZWxldGUgcmVjLmNsaWVudF9yZXE7XG4gICAgICAgICAgICB2YXIgaGVhZGVycyA9IGNsaWVudF9yZXEuaGVhZGVycztcbiAgICAgICAgICAgIHZhciBob3N0SGVhZGVyTGluZSA9ICcnO1xuICAgICAgICAgICAgdmFyIHMgPSAnJztcbiAgICAgICAgICAgIGlmIChjbGllbnRfcmVxLmFkZHJlc3MpIHtcbiAgICAgICAgICAgICAgICBob3N0SGVhZGVyTGluZSA9ICdcXG5Ib3N0OiAnICsgY2xpZW50X3JlcS5hZGRyZXNzO1xuICAgICAgICAgICAgICAgIGlmIChjbGllbnRfcmVxLnBvcnQpXG4gICAgICAgICAgICAgICAgICAgIGhvc3RIZWFkZXJMaW5lICs9ICc6JyArIGNsaWVudF9yZXEucG9ydDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSBjbGllbnRfcmVxLmhlYWRlcnM7XG4gICAgICAgICAgICBkZWxldGUgY2xpZW50X3JlcS5hZGRyZXNzO1xuICAgICAgICAgICAgZGVsZXRlIGNsaWVudF9yZXEucG9ydDtcbiAgICAgICAgICAgIHMgKz0gZm9ybWF0KCclcyAlcyBIVFRQLyVzJXMlcycsIGNsaWVudF9yZXEubWV0aG9kLFxuICAgICAgICAgICAgICAgIGNsaWVudF9yZXEudXJsLFxuICAgICAgICAgICAgICAgIGNsaWVudF9yZXEuaHR0cFZlcnNpb24gfHwgJzEuMScsXG4gICAgICAgICAgICAgICAgaG9zdEhlYWRlckxpbmUsXG4gICAgICAgICAgICAgICAgKGhlYWRlcnMgP1xuICAgICAgICAgICAgICAgICAgICAnXFxuJyArIE9iamVjdC5rZXlzKGhlYWRlcnMpLm1hcChcbiAgICAgICAgICAgICAgICAgICAgICAgIGZ1bmN0aW9uIChoKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGggKyAnOiAnICsgaGVhZGVyc1toXTtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pLmpvaW4oJ1xcbicpIDpcbiAgICAgICAgICAgICAgICAgICAgJycpKTtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGllbnRfcmVxLm1ldGhvZDtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGllbnRfcmVxLnVybDtcbiAgICAgICAgICAgIGRlbGV0ZSBjbGllbnRfcmVxLmh0dHBWZXJzaW9uO1xuICAgICAgICAgICAgaWYgKGNsaWVudF9yZXEuYm9keSkge1xuICAgICAgICAgICAgICAgIHMgKz0gJ1xcblxcbicgKyAodHlwZW9mIChjbGllbnRfcmVxLmJvZHkpID09PSAnb2JqZWN0JyA/XG4gICAgICAgICAgICAgICAgICAgIEpTT04uc3RyaW5naWZ5KGNsaWVudF9yZXEuYm9keSwgbnVsbCwgMikgOlxuICAgICAgICAgICAgICAgICAgICBjbGllbnRfcmVxLmJvZHkpO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSBjbGllbnRfcmVxLmJvZHk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFLmcuIGZvciBleHRyYSAnZm9vJyBmaWVsZCBvbiAnY2xpZW50X3JlcScsIGFkZFxuICAgICAgICAgICAgLy8gJ2NsaWVudF9yZXEuZm9vJyBhdCB0b3AtbGV2ZWwuIFRoaXMgKmRvZXMqIGhhdmUgdGhlIHBvdGVudGlhbFxuICAgICAgICAgICAgLy8gdG8gc3RvbXAgb24gYSBsaXRlcmFsICdjbGllbnRfcmVxLmZvbycga2V5LlxuICAgICAgICAgICAgT2JqZWN0LmtleXMoY2xpZW50X3JlcSkuZm9yRWFjaChmdW5jdGlvbiAoaykge1xuICAgICAgICAgICAgICAgIHJlY1snY2xpZW50X3JlcS4nICsga10gPSBjbGllbnRfcmVxW2tdO1xuICAgICAgICAgICAgfSlcbiAgICAgICAgICAgIGRldGFpbHMucHVzaChpbmRlbnQocykpO1xuICAgICAgICB9XG5cbiAgICAgICAgZnVuY3Rpb24gX3JlcyhyZXMpIHtcbiAgICAgICAgICAgIHZhciBzID0gJyc7XG4gICAgICAgICAgICBpZiAocmVzLnN0YXR1c0NvZGUgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHMgKz0gZm9ybWF0KCdIVFRQLzEuMSAlcyAlc1xcbicsIHJlcy5zdGF0dXNDb2RlLFxuICAgICAgICAgICAgICAgICAgICBodHRwLlNUQVRVU19DT0RFU1tyZXMuc3RhdHVzQ29kZV0pO1xuICAgICAgICAgICAgICAgIGRlbGV0ZSByZXMuc3RhdHVzQ29kZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIC8vIEhhbmRsZSBgcmVzLmhlYWRlcmAgb3IgYHJlcy5oZWFkZXJzYCBhcyBlaXRoZXIgYSBzdHJpbmcgb3JcbiAgICAgICAgICAgIC8vIGFuZCBvYmplY3Qgb2YgaGVhZGVyIGtleS92YWx1ZSBwYWlycy4gUHJlZmVyIGByZXMuaGVhZGVyYCBpZiBzZXRcbiAgICAgICAgICAgIC8vIChUT0RPOiBXaHk/IEkgZG9uJ3QgcmVjYWxsLiBUeXBpY2FsIG9mIHJlc3RpZnkgc2VyaWFsaXplcj9cbiAgICAgICAgICAgIC8vIFR5cGljYWwgSlNPTi5zdHJpbmdpZnkgb2YgYSBjb3JlIG5vZGUgSHR0cFJlc3BvbnNlPylcbiAgICAgICAgICAgIHZhciBoZWFkZXJUeXBlcyA9IHtzdHJpbmc6IHRydWUsIG9iamVjdDogdHJ1ZX07XG4gICAgICAgICAgICB2YXIgaGVhZGVycztcbiAgICAgICAgICAgIGlmIChyZXMuaGVhZGVyICYmIGhlYWRlclR5cGVzW3R5cGVvZiAocmVzLmhlYWRlcildKSB7XG4gICAgICAgICAgICAgICAgaGVhZGVycyA9IHJlcy5oZWFkZXI7XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlcy5oZWFkZXI7XG4gICAgICAgICAgICB9IGVsc2UgaWYgKHJlcy5oZWFkZXJzICYmIGhlYWRlclR5cGVzW3R5cGVvZiAocmVzLmhlYWRlcnMpXSkge1xuICAgICAgICAgICAgICAgIGhlYWRlcnMgPSByZXMuaGVhZGVycztcbiAgICAgICAgICAgICAgICBkZWxldGUgcmVzLmhlYWRlcnM7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoaGVhZGVycyA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICAgICAgLyogcGFzcyB0aHJvdWdoICovXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHR5cGVvZiAoaGVhZGVycykgPT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgcyArPSBoZWFkZXJzLnRyaW1SaWdodCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzICs9IE9iamVjdC5rZXlzKGhlYWRlcnMpLm1hcChcbiAgICAgICAgICAgICAgICAgICAgZnVuY3Rpb24gKGgpIHsgcmV0dXJuIGggKyAnOiAnICsgaGVhZGVyc1toXTsgfSkuam9pbignXFxuJyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAocmVzLmJvZHkgIT09IHVuZGVmaW5lZCkge1xuICAgICAgICAgICAgICAgIHZhciBib2R5ID0gKHR5cGVvZiAocmVzLmJvZHkpID09PSAnb2JqZWN0J1xuICAgICAgICAgICAgICAgICAgICA/IEpTT04uc3RyaW5naWZ5KHJlcy5ib2R5LCBudWxsLCAyKSA6IHJlcy5ib2R5KTtcbiAgICAgICAgICAgICAgICBpZiAoYm9keS5sZW5ndGggPiAwKSB7IHMgKz0gJ1xcblxcbicgKyBib2R5IH07XG4gICAgICAgICAgICAgICAgZGVsZXRlIHJlcy5ib2R5O1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzID0gcy50cmltUmlnaHQoKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChyZXMudHJhaWxlcikge1xuICAgICAgICAgICAgICAgIHMgKz0gJ1xcbicgKyByZXMudHJhaWxlcjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRlbGV0ZSByZXMudHJhaWxlcjtcbiAgICAgICAgICAgIGlmIChzKSB7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5wdXNoKGluZGVudChzKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICAvLyBFLmcuIGZvciBleHRyYSAnZm9vJyBmaWVsZCBvbiAncmVzJywgYWRkICdyZXMuZm9vJyBhdFxuICAgICAgICAgICAgLy8gdG9wLWxldmVsLiBUaGlzICpkb2VzKiBoYXZlIHRoZSBwb3RlbnRpYWwgdG8gc3RvbXAgb24gYVxuICAgICAgICAgICAgLy8gbGl0ZXJhbCAncmVzLmZvbycga2V5LlxuICAgICAgICAgICAgT2JqZWN0LmtleXMocmVzKS5mb3JFYWNoKGZ1bmN0aW9uIChrKSB7XG4gICAgICAgICAgICAgICAgcmVjWydyZXMuJyArIGtdID0gcmVzW2tdO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAocmVjLnJlcyAmJiB0eXBlb2YgKHJlYy5yZXMpID09PSAnb2JqZWN0Jykge1xuICAgICAgICAgICAgX3JlcyhyZWMucmVzKTtcbiAgICAgICAgICAgIGRlbGV0ZSByZWMucmVzO1xuICAgICAgICB9XG4gICAgICAgIGlmIChyZWMuY2xpZW50X3JlcyAmJiB0eXBlb2YgKHJlYy5jbGllbnRfcmVzKSA9PT0gJ29iamVjdCcpIHtcbiAgICAgICAgICAgIF9yZXMocmVjLmNsaWVudF9yZXMpO1xuICAgICAgICAgICAgZGVsZXRlIHJlYy5jbGllbnRfcmVzO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKHJlYy5lcnIgJiYgcmVjLmVyci5zdGFjaykge1xuICAgICAgICAgICAgdmFyIGVyciA9IHJlYy5lcnJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgKGVyci5zdGFjaykgIT09ICdzdHJpbmcnKSB7XG4gICAgICAgICAgICAgICAgZGV0YWlscy5wdXNoKGluZGVudChlcnIuc3RhY2sudG9TdHJpbmcoKSkpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnB1c2goaW5kZW50KGVyci5zdGFjaykpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZGVsZXRlIGVyci5tZXNzYWdlO1xuICAgICAgICAgICAgZGVsZXRlIGVyci5uYW1lO1xuICAgICAgICAgICAgZGVsZXRlIGVyci5zdGFjaztcbiAgICAgICAgICAgIC8vIEUuZy4gZm9yIGV4dHJhICdmb28nIGZpZWxkIG9uICdlcnInLCBhZGQgJ2Vyci5mb28nIGF0XG4gICAgICAgICAgICAvLyB0b3AtbGV2ZWwuIFRoaXMgKmRvZXMqIGhhdmUgdGhlIHBvdGVudGlhbCB0byBzdG9tcCBvbiBhXG4gICAgICAgICAgICAvLyBsaXRlcmFsICdlcnIuZm9vJyBrZXkuXG4gICAgICAgICAgICBPYmplY3Qua2V5cyhlcnIpLmZvckVhY2goZnVuY3Rpb24gKGspIHtcbiAgICAgICAgICAgICAgICByZWNbJ2Vyci4nICsga10gPSBlcnJba107XG4gICAgICAgICAgICB9KVxuICAgICAgICAgICAgZGVsZXRlIHJlYy5lcnI7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgbGVmdG92ZXIgPSBPYmplY3Qua2V5cyhyZWMpO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlZnRvdmVyLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIga2V5ID0gbGVmdG92ZXJbaV07XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSByZWNba2V5XTtcbiAgICAgICAgICAgIHZhciBzdHJpbmdpZmllZCA9IGZhbHNlO1xuICAgICAgICAgICAgaWYgKHR5cGVvZiAodmFsdWUpICE9PSAnc3RyaW5nJykge1xuICAgICAgICAgICAgICAgIHZhbHVlID0gSlNPTi5zdHJpbmdpZnkodmFsdWUsIG51bGwsIDIpO1xuICAgICAgICAgICAgICAgIHN0cmluZ2lmaWVkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICh2YWx1ZS5pbmRleE9mKCdcXG4nKSAhPT0gLTEgfHwgdmFsdWUubGVuZ3RoID4gNTApIHtcbiAgICAgICAgICAgICAgICBkZXRhaWxzLnB1c2goaW5kZW50KGtleSArICc6ICcgKyB2YWx1ZSkpO1xuICAgICAgICAgICAgfSBlbHNlIGlmICghc3RyaW5naWZpZWQgJiYgKHZhbHVlLmluZGV4T2YoJyAnKSAhPSAtMSB8fFxuICAgICAgICAgICAgICAgIHZhbHVlLmxlbmd0aCA9PT0gMCkpXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgICAgZXh0cmFzLnB1c2goa2V5ICsgJz0nICsgSlNPTi5zdHJpbmdpZnkodmFsdWUpKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgZXh0cmFzLnB1c2goa2V5ICsgJz0nICsgdmFsdWUpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgICAgZXh0cmFzID0gc3R5bGl6ZShcbiAgICAgICAgICAgIChleHRyYXMubGVuZ3RoID8gJyAoJyArIGV4dHJhcy5qb2luKCcsICcpICsgJyknIDogJycpLCAnWFhYJyk7XG4gICAgICAgIGRldGFpbHMgPSBzdHlsaXplKFxuICAgICAgICAgICAgKGRldGFpbHMubGVuZ3RoID8gZGV0YWlscy5qb2luKCdcXG4gICAgLS1cXG4nKSArICdcXG4nIDogJycpLCAnWFhYJyk7XG4gICAgICAgIGlmICghc2hvcnQpXG4gICAgICAgICAgICBlbWl0KGZvcm1hdCgnJXMgJXM6ICVzIG9uICVzJXM6JXMlc1xcbiVzJyxcbiAgICAgICAgICAgICAgICB0aW1lLFxuICAgICAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgICAgIG5hbWVTdHIsXG4gICAgICAgICAgICAgICAgaG9zdG5hbWUgfHwgJzxuby1ob3N0bmFtZT4nLFxuICAgICAgICAgICAgICAgIHNyYyxcbiAgICAgICAgICAgICAgICBvbmVsaW5lTXNnLFxuICAgICAgICAgICAgICAgIGV4dHJhcyxcbiAgICAgICAgICAgICAgICBkZXRhaWxzKSk7XG4gICAgICAgIGVsc2VcbiAgICAgICAgICBpZihbJ2FwcC9yZXEnLCAndWFwcC9yZXEnXS5maWx0ZXIobmFtZSA9PiBuYW1lU3RyLnN1YnN0cigwLCBuYW1lLmxlbmd0aCkudG9Mb3dlckNhc2UoKT09PSBuYW1lLnRvTG93ZXJDYXNlKCkpLmxlbmd0aCkge1xuICAgICAgICAgIC8vIGlmKG5hbWVTdHIuc3Vic3RyKDAsICdhcHAvcmVxJy5sZW5ndGgpID09PSAnYXBwL3JlcScpIHtcbiAgICAgICAgICAgIGVtaXQoZm9ybWF0KCclcyVzXFxuJyxcbiAgICAgICAgICAgICAgICBsZXZlbCxcbiAgICAgICAgICAgICAgICBvbmVsaW5lTXNnKSk7XG4gICAgICAgICAgfSBlbHNlIGlmKFsnYXBwJywgJ3VhcHAnXS5maWx0ZXIobmFtZSA9PiBuYW1lU3RyLnN1YnN0cigwLCBuYW1lLmxlbmd0aCkudG9Mb3dlckNhc2UoKT09PSBuYW1lLnRvTG93ZXJDYXNlKCkpLmxlbmd0aCkge1xuICAgICAgICAgICAgLy8gaWYobmFtZVN0ci5sZW5ndGggPT0gMykge1xuICAgICAgICAgICAgICBlbWl0KGZvcm1hdCgnJXMgJXM6JXMlc1xcbiVzJyxcbiAgICAgICAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgICAgICAgbmFtZVN0cixcbiAgICAgICAgICAgICAgICAgIG9uZWxpbmVNc2csXG4gICAgICAgICAgICAgICAgICBleHRyYXMsXG4gICAgICAgICAgICAgICAgICBkZXRhaWxzKSk7XG4gICAgICAgICAgICAvLyB9IGVsc2Uge31cblxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbWl0KGZvcm1hdCgnJXMgJXMgJXM6JXMlc1xcbiVzJyxcbiAgICAgICAgICAgICAgICB0aW1lLFxuICAgICAgICAgICAgICAgIGxldmVsLFxuICAgICAgICAgICAgICAgIG5hbWVTdHIsXG4gICAgICAgICAgICAgICAgb25lbGluZU1zZyxcbiAgICAgICAgICAgICAgICBleHRyYXMsXG4gICAgICAgICAgICAgICAgZGV0YWlscykpO1xuICAgICAgICAgIH1cbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE9NX0lOU1BFQ1Q6XG4gICAgICAgIGVtaXQodXRpbC5pbnNwZWN0KHJlYywgZmFsc2UsIEluZmluaXR5LCB0cnVlKSArICdcXG4nKTtcbiAgICAgICAgYnJlYWs7XG5cbiAgICBjYXNlIE9NX0JVTllBTjpcbiAgICAgICAgZW1pdChKU09OLnN0cmluZ2lmeShyZWMsIG51bGwsIDApICsgJ1xcbicpO1xuICAgICAgICBicmVhaztcblxuICAgIGNhc2UgT01fSlNPTjpcbiAgICAgICAgZW1pdChKU09OLnN0cmluZ2lmeShyZWMsIG51bGwsIG9wdHMuanNvbkluZGVudCkgKyAnXFxuJyk7XG4gICAgICAgIGJyZWFrO1xuXG4gICAgY2FzZSBPTV9TSU1QTEU6XG4gICAgICAgIC8qIEpTU1RZTEVEICovXG4gICAgICAgIC8vIDxodHRwOi8vbG9nZ2luZy5hcGFjaGUub3JnL2xvZzRqLzEuMi9hcGlkb2NzL29yZy9hcGFjaGUvbG9nNGovU2ltcGxlTGF5b3V0Lmh0bWw+XG4gICAgICAgIGlmICghaXNWYWxpZFJlY29yZChyZWMpKSB7XG4gICAgICAgICAgICByZXR1cm4gZW1pdChsaW5lICsgJ1xcbicpO1xuICAgICAgICB9XG4gICAgICAgIGVtaXQoZm9ybWF0KCclcyAtICVzXFxuJyxcbiAgICAgICAgICAgIHVwcGVyTmFtZUZyb21MZXZlbFtyZWMubGV2ZWxdIHx8ICdMVkwnICsgcmVjLmxldmVsLFxuICAgICAgICAgICAgcmVjLm1zZykpO1xuICAgICAgICBicmVhaztcbiAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ3Vua25vd24gb3V0cHV0IG1vZGU6ICcrb3B0cy5vdXRwdXRNb2RlKTtcbiAgICB9XG59XG5cblxudmFyIHN0ZG91dEZsdXNoZWQgPSB0cnVlO1xuZnVuY3Rpb24gZW1pdChzKSB7XG4gICAgdHJ5IHtcbiAgICAgICAgc3Rkb3V0Rmx1c2hlZCA9IHN0ZG91dC53cml0ZShzKTtcbiAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIEhhbmRsZSBhbnkgZXhjZXB0aW9ucyBpbiBzdGRvdXQgd3JpdGluZyBpbiBgc3Rkb3V0Lm9uKCdlcnJvcicsIC4uLilgLlxuICAgIH1cbn1cblxuXG4vKipcbiAqIEEgaGFja2VkIHVwIHZlcnNpb24gb2YgJ3Byb2Nlc3MuZXhpdCcgdGhhdCB3aWxsIGZpcnN0IGRyYWluIHN0ZG91dFxuICogYmVmb3JlIGV4aXRpbmcuICpXQVJOSU5HOiBUaGlzIGRvZXNuJ3Qgc3RvcCBldmVudCBwcm9jZXNzaW5nLiogSU9XLFxuICogY2FsbGVycyBoYXZlIHRvIGJlIGNhcmVmdWwgdGhhdCBjb2RlIGZvbGxvd2luZyB0aGlzIGNhbGwgaXNuJ3RcbiAqIGFjY2lkZW50YWxseSBleGVjdXRlZC5cbiAqXG4gKiBJbiBub2RlIHYwLjYgXCJwcm9jZXNzLnN0ZG91dCBhbmQgcHJvY2Vzcy5zdGRlcnIgYXJlIGJsb2NraW5nIHdoZW4gdGhleVxuICogcmVmZXIgdG8gcmVndWxhciBmaWxlcyBvciBUVFkgZmlsZSBkZXNjcmlwdG9ycy5cIiBIb3dldmVyLCB0aGlzIGhhY2sgbWlnaHRcbiAqIHN0aWxsIGJlIG5lY2Vzc2FyeSBpbiBhIHNoZWxsIHBpcGVsaW5lLlxuICovXG5mdW5jdGlvbiBkcmFpblN0ZG91dEFuZEV4aXQoY29kZSkge1xuICAgIGlmIChfREVCVUcpIHdhcm4oJyhkcmFpblN0ZG91dEFuZEV4aXQoJWQpKScsIGNvZGUpO1xuICAgIHN0ZG91dC5vbignZHJhaW4nLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGNsZWFudXBBbmRFeGl0KGNvZGUpO1xuICAgIH0pO1xuICAgIGlmIChzdGRvdXRGbHVzaGVkKSB7XG4gICAgICAgIGNsZWFudXBBbmRFeGl0KGNvZGUpO1xuICAgIH1cbn1cblxuXG4vKipcbiAqIFByb2Nlc3MgYWxsIGlucHV0IGZyb20gc3RkaW4uXG4gKlxuICogQHBhcmFtcyBvcHRzIHtPYmplY3R9IEJ1bnlhbiBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSBzdHlsaXplIHtGdW5jdGlvbn0gT3V0cHV0IHN0eWxpemUgZnVuY3Rpb24gdG8gdXNlLlxuICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gYGZ1bmN0aW9uICgpYFxuICovXG5mdW5jdGlvbiBwcm9jZXNzU3RkaW4ob3B0cywgc3R5bGl6ZSwgY2FsbGJhY2spIHtcbiAgICByZWFkaW5nU3RkaW4gPSB0cnVlO1xuICAgIHZhciBsZWZ0b3ZlciA9ICcnOyAgLy8gTGVmdC1vdmVyIHBhcnRpYWwgbGluZSBmcm9tIGxhc3QgY2h1bmsuXG4gICAgdmFyIHN0ZGluID0gcHJvY2Vzcy5zdGRpbjtcbiAgICBzdGRpbi5yZXN1bWUoKTtcbiAgICBzdGRpbi5zZXRFbmNvZGluZygndXRmOCcpO1xuICAgIHN0ZGluLm9uKCdkYXRhJywgZnVuY3Rpb24gKGNodW5rKSB7XG4gICAgICAgIHZhciBsaW5lcyA9IGNodW5rLnNwbGl0KC9cXHJcXG58XFxuLyk7XG4gICAgICAgIHZhciBsZW5ndGggPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGxlZnRvdmVyICs9IGxpbmVzWzBdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGhhbmRsZUxvZ0xpbmUobnVsbCwgbGVmdG92ZXIgKyBsaW5lc1swXSwgb3B0cywgc3R5bGl6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGVmdG92ZXIgPSBsaW5lcy5wb3AoKTtcbiAgICAgICAgbGVuZ3RoIC09IDE7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGhhbmRsZUxvZ0xpbmUobnVsbCwgbGluZXNbaV0sIG9wdHMsIHN0eWxpemUpO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgc3RkaW4ub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKGxlZnRvdmVyKSB7XG4gICAgICAgICAgICBoYW5kbGVMb2dMaW5lKG51bGwsIGxlZnRvdmVyLCBvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgICAgIGxlZnRvdmVyID0gJyc7XG4gICAgICAgIH1cbiAgICAgICAgY2FsbGJhY2soKTtcbiAgICB9KTtcbn1cblxuXG4vKipcbiAqIFByb2Nlc3MgYnVueWFuOmxvZy0qIHByb2JlcyBmcm9tIHRoZSBnaXZlbiBwaWQuXG4gKlxuICogQHBhcmFtcyBvcHRzIHtPYmplY3R9IEJ1bnlhbiBvcHRpb25zIG9iamVjdC5cbiAqIEBwYXJhbSBzdHlsaXplIHtGdW5jdGlvbn0gT3V0cHV0IHN0eWxpemUgZnVuY3Rpb24gdG8gdXNlLlxuICogQHBhcmFtIGNhbGxiYWNrIHtGdW5jdGlvbn0gYGZ1bmN0aW9uIChjb2RlKWBcbiAqL1xuZnVuY3Rpb24gcHJvY2Vzc1BpZHMob3B0cywgc3R5bGl6ZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgbGVmdG92ZXIgPSAnJzsgIC8vIExlZnQtb3ZlciBwYXJ0aWFsIGxpbmUgZnJvbSBsYXN0IGNodW5rLlxuXG4gICAgLyoqXG4gICAgICogR2V0IHRoZSBQSURzIHRvIGR0cmFjZS5cbiAgICAgKlxuICAgICAqIEBwYXJhbSBjYiB7RnVuY3Rpb259IGBmdW5jdGlvbiAoZXJyQ29kZSwgcGlkcylgXG4gICAgICovXG4gICAgZnVuY3Rpb24gZ2V0UGlkcyhjYikge1xuICAgICAgICBpZiAob3B0cy5waWRzVHlwZSA9PT0gJ251bScpIHtcbiAgICAgICAgICAgIHJldHVybiBjYihudWxsLCBvcHRzLnBpZHMpO1xuICAgICAgICB9XG4gICAgICAgIGlmIChwcm9jZXNzLnBsYXRmb3JtID09PSAnc3Vub3MnKSB7XG4gICAgICAgICAgICBleGVjRmlsZSgnL2Jpbi9wZ3JlcCcsIFsnLWxmJywgb3B0cy5waWRzXSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocGlkc0Vyciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpZHNFcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4oJ2J1bnlhbjogZXJyb3IgZ2V0dGluZyBQSURzIGZvciBcIiVzXCI6ICVzXFxuJXNcXG4lcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5waWRzLCBwaWRzRXJyLm1lc3NhZ2UsIHN0ZG91dCwgc3RkZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYigxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgcGlkcyA9IHN0ZG91dC50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpbmUudHJpbSgpLnNwbGl0KC9cXHMrLylbMF1cbiAgICAgICAgICAgICAgICAgICAgICAgIH0pXG4gICAgICAgICAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChwaWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gTnVtYmVyKHBpZCkgIT09IHByb2Nlc3MucGlkXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpZHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuKCdidW55YW46IGVycm9yOiBubyBtYXRjaGluZyBQSURzIGZvdW5kIGZvciBcIiVzXCInLFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9wdHMucGlkcyk7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2IoMik7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgY2IobnVsbCwgcGlkcyk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhciByZWdleCA9IG9wdHMucGlkcztcbiAgICAgICAgICAgIGlmIChyZWdleCAmJiAvW2EtekEtWjAtOV9dLy50ZXN0KHJlZ2V4WzBdKSkge1xuICAgICAgICAgICAgICAgIC8vICdmb28nIC0+ICdbZl1vbycgdHJpY2sgdG8gZXhjbHVkZSB0aGUgJ2dyZXAnIFBJRCBmcm9tIGl0c1xuICAgICAgICAgICAgICAgIC8vIG93biBzZWFyY2guXG4gICAgICAgICAgICAgICAgcmVnZXggPSAnWycgKyByZWdleFswXSArICddJyArIHJlZ2V4LnNsaWNlKDEpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZXhlYyhmb3JtYXQoJ3BzIC1BIC1vIHBpZCxjb21tYW5kIHwgZ3JlcCBcXCclc1xcJycsIHJlZ2V4KSxcbiAgICAgICAgICAgICAgICBmdW5jdGlvbiAocGlkc0Vyciwgc3Rkb3V0LCBzdGRlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBpZHNFcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4oJ2J1bnlhbjogZXJyb3IgZ2V0dGluZyBQSURzIGZvciBcIiVzXCI6ICVzXFxuJXNcXG4lcycsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5waWRzLCBwaWRzRXJyLm1lc3NhZ2UsIHN0ZG91dCwgc3RkZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYigxKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICB2YXIgcGlkcyA9IHN0ZG91dC50cmltKCkuc3BsaXQoJ1xcbicpXG4gICAgICAgICAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChsaW5lKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGxpbmUudHJpbSgpLnNwbGl0KC9cXHMrLylbMF07XG4gICAgICAgICAgICAgICAgICAgICAgICB9KVxuICAgICAgICAgICAgICAgICAgICAgICAgLmZpbHRlcihmdW5jdGlvbiAocGlkKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIE51bWJlcihwaWQpICE9PSBwcm9jZXNzLnBpZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgICAgICBpZiAocGlkcy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhcm4oJ2J1bnlhbjogZXJyb3I6IG5vIG1hdGNoaW5nIFBJRHMgZm91bmQgZm9yIFwiJXNcIicsXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgb3B0cy5waWRzKTtcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBjYigyKTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICBjYihudWxsLCBwaWRzKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgZ2V0UGlkcyhmdW5jdGlvbiAoZXJyQ29kZSwgcGlkcykge1xuICAgICAgICBpZiAoZXJyQ29kZSkge1xuICAgICAgICAgICAgcmV0dXJuIGNhbGxiYWNrKGVyckNvZGUpO1xuICAgICAgICB9XG5cbiAgICAgICAgdmFyIHByb2JlcyA9IHBpZHMubWFwKGZ1bmN0aW9uIChwaWQpIHtcbiAgICAgICAgICAgIGlmICghb3B0cy5sZXZlbClcbiAgICAgICAgICAgICAgICByZXR1cm4gZm9ybWF0KCdidW55YW4lczo6OmxvZy0qJywgcGlkKTtcblxuICAgICAgICAgICAgdmFyIHJ2YWwgPSBbXSwgbDtcblxuICAgICAgICAgICAgZm9yIChsIGluIGxldmVsRnJvbU5hbWUpIHtcbiAgICAgICAgICAgICAgICBpZiAobGV2ZWxGcm9tTmFtZVtsXSA+PSBvcHRzLmxldmVsKVxuICAgICAgICAgICAgICAgICAgICBydmFsLnB1c2goZm9ybWF0KCdidW55YW4lczo6OmxvZy0lcycsIHBpZCwgbCkpO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAocnZhbC5sZW5ndGggIT0gMClcbiAgICAgICAgICAgICAgICByZXR1cm4gcnZhbC5qb2luKCcsJyk7XG5cbiAgICAgICAgICAgIHdhcm4oJ2J1bnlhbjogZXJyb3I6IGxldmVsICglZCkgZXhjZWVkcyBtYXhpbXVtIGxvZ2dpbmcgbGV2ZWwnLFxuICAgICAgICAgICAgICAgIG9wdHMubGV2ZWwpO1xuICAgICAgICAgICAgcmV0dXJuIGRyYWluU3Rkb3V0QW5kRXhpdCgxKTtcbiAgICAgICAgfSkuam9pbignLCcpO1xuICAgICAgICB2YXIgYXJndiA9IFsnZHRyYWNlJywgJy1aJywgJy14JywgJ3N0cnNpemU9NGsnLFxuICAgICAgICAgICAgJy14JywgJ3N3aXRjaHJhdGU9MTBoeicsICctcW4nLFxuICAgICAgICAgICAgZm9ybWF0KCclc3twcmludGYoXCIlc1wiLCBjb3B5aW5zdHIoYXJnMCkpfScsIHByb2JlcyldO1xuICAgICAgICAvL2NvbnNvbGUubG9nKCdkdHJhY2UgYXJndjogJXMnLCBhcmd2KTtcbiAgICAgICAgdmFyIGR0cmFjZSA9IHNwYXduKGFyZ3ZbMF0sIGFyZ3Yuc2xpY2UoMSksXG4gICAgICAgICAgICAvLyBTaGFyZSB0aGUgc3RkZXJyIGhhbmRsZSB0byBoYXZlIGVycm9yIG91dHB1dCBjb21lXG4gICAgICAgICAgICAvLyBzdHJhaWdodCB0aHJvdWdoLiBPbmx5IHN1cHBvcnRlZCBpbiB2MC44Ky5cbiAgICAgICAgICAgIHtzdGRpbzogWydwaXBlJywgJ3BpcGUnLCBwcm9jZXNzLnN0ZGVycl19KTtcbiAgICAgICAgZHRyYWNlLm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgICAgICBpZiAoZS5zeXNjYWxsID09PSAnc3Bhd24nICYmIGUuZXJybm8gPT09ICdFTk9FTlQnKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignYnVueWFuOiBlcnJvcjogY291bGQgbm90IHNwYXduIFwiZHRyYWNlXCIgJyArXG4gICAgICAgICAgICAgICAgICAgICcoXCJidW55YW4gLXBcIiBpcyBvbmx5IHN1cHBvcnRlZCBvbiBwbGF0Zm9ybXMgd2l0aCBkdHJhY2UpJyk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ2J1bnlhbjogZXJyb3I6IHVuZXhwZWN0ZWQgZHRyYWNlIGVycm9yOiAlcycsIGUpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soMSk7XG4gICAgICAgIH0pXG4gICAgICAgIGNoaWxkID0gZHRyYWNlOyAvLyBpbnRlbnRpb25hbGx5IGdsb2JhbFxuXG4gICAgICAgIGZ1bmN0aW9uIGZpbmlzaChjb2RlKSB7XG4gICAgICAgICAgICBpZiAobGVmdG92ZXIpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVMb2dMaW5lKG51bGwsIGxlZnRvdmVyLCBvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgICAgICAgICBsZWZ0b3ZlciA9ICcnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgY2FsbGJhY2soY29kZSk7XG4gICAgICAgIH1cblxuICAgICAgICBkdHJhY2Uuc3Rkb3V0LnNldEVuY29kaW5nKCd1dGY4Jyk7XG4gICAgICAgIGR0cmFjZS5zdGRvdXQub24oJ2RhdGEnLCBmdW5jdGlvbiAoY2h1bmspIHtcbiAgICAgICAgICAgIHZhciBsaW5lcyA9IGNodW5rLnNwbGl0KC9cXHJcXG58XFxuLyk7XG4gICAgICAgICAgICB2YXIgbGVuZ3RoID0gbGluZXMubGVuZ3RoO1xuICAgICAgICAgICAgaWYgKGxlbmd0aCA9PT0gMSkge1xuICAgICAgICAgICAgICAgIGxlZnRvdmVyICs9IGxpbmVzWzBdO1xuICAgICAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmIChsZW5ndGggPiAxKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlTG9nTGluZShudWxsLCBsZWZ0b3ZlciArIGxpbmVzWzBdLCBvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGxlZnRvdmVyID0gbGluZXMucG9wKCk7XG4gICAgICAgICAgICBsZW5ndGggLT0gMTtcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVMb2dMaW5lKG51bGwsIGxpbmVzW2ldLCBvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG5cbiAgICAgICAgaWYgKG5vZGVTcGF3blN1cHBvcnRzU3RkaW8pIHtcbiAgICAgICAgICAgIGR0cmFjZS5vbignZXhpdCcsIGZpbmlzaCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAvLyBGYWxsYmFjayAoZm9yIDwgdjAuOCkgdG8gcGlwZSB0aGUgZHRyYWNlIHByb2Nlc3MnIHN0ZGVyciB0b1xuICAgICAgICAgICAgLy8gdGhpcyBzdGRlcnIuIFdhaXQgZm9yIGFsbCBvZiAoMSkgcHJvY2VzcyAnZXhpdCcsICgyKSBzdGRlcnJcbiAgICAgICAgICAgIC8vICdlbmQnLCBhbmQgKDIpIHN0ZG91dCAnZW5kJyBiZWZvcmUgcmV0dXJuaW5nIHRvIGVuc3VyZSBhbGxcbiAgICAgICAgICAgIC8vIHN0ZGVyciBpcyBmbHVzaGVkIChpc3N1ZSAjNTQpLlxuICAgICAgICAgICAgdmFyIHJldHVybkNvZGUgPSBudWxsO1xuICAgICAgICAgICAgdmFyIGV2ZW50c1JlbWFpbmluZyA9IDM7XG4gICAgICAgICAgICBmdW5jdGlvbiBjb3VudGRvd25Ub0ZpbmlzaChjb2RlKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuQ29kZSA9IGNvZGU7XG4gICAgICAgICAgICAgICAgZXZlbnRzUmVtYWluaW5nLS07XG4gICAgICAgICAgICAgICAgaWYgKGV2ZW50c1JlbWFpbmluZyA9PSAwKSB7XG4gICAgICAgICAgICAgICAgICAgIGZpbmlzaChyZXR1cm5Db2RlKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBkdHJhY2Uuc3RkZXJyLnBpcGUocHJvY2Vzcy5zdGRlcnIpO1xuICAgICAgICAgICAgZHRyYWNlLnN0ZGVyci5vbignZW5kJywgY291bnRkb3duVG9GaW5pc2gpO1xuICAgICAgICAgICAgZHRyYWNlLnN0ZGVyci5vbignZW5kJywgY291bnRkb3duVG9GaW5pc2gpO1xuICAgICAgICAgICAgZHRyYWNlLm9uKCdleGl0JywgY291bnRkb3duVG9GaW5pc2gpO1xuICAgICAgICB9XG4gICAgfSk7XG59XG5cblxuLyoqXG4gKiBQcm9jZXNzIGFsbCBpbnB1dCBmcm9tIHRoZSBnaXZlbiBsb2cgZmlsZS5cbiAqXG4gKiBAcGFyYW0gZmlsZSB7U3RyaW5nfSBMb2cgZmlsZSBwYXRoIHRvIHByb2Nlc3MuXG4gKiBAcGFyYW1zIG9wdHMge09iamVjdH0gQnVueWFuIG9wdGlvbnMgb2JqZWN0LlxuICogQHBhcmFtIHN0eWxpemUge0Z1bmN0aW9ufSBPdXRwdXQgc3R5bGl6ZSBmdW5jdGlvbiB0byB1c2UuXG4gKiBAcGFyYW0gY2FsbGJhY2sge0Z1bmN0aW9ufSBgZnVuY3Rpb24gKClgXG4gKi9cbmZ1bmN0aW9uIHByb2Nlc3NGaWxlKGZpbGUsIG9wdHMsIHN0eWxpemUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHN0cmVhbSA9IGZzLmNyZWF0ZVJlYWRTdHJlYW0oZmlsZSk7XG4gICAgaWYgKC9cXC5neiQvLnRlc3QoZmlsZSkpIHtcbiAgICAgICAgc3RyZWFtID0gc3RyZWFtLnBpcGUocmVxdWlyZSgnemxpYicpLmNyZWF0ZUd1bnppcCgpKTtcbiAgICB9XG4gICAgLy8gTWFudWFsbHkgZGVjb2RlIHN0cmVhbXMgLSBsYXp5IGxvYWQgaGVyZSBhcyBwZXIgbm9kZS9saWIvZnMuanNcbiAgICB2YXIgZGVjb2RlciA9IG5ldyAocmVxdWlyZSgnc3RyaW5nX2RlY29kZXInKS5TdHJpbmdEZWNvZGVyKSgndXRmOCcpO1xuXG4gICAgc3RyZWFtc1tmaWxlXS5zdHJlYW0gPSBzdHJlYW07XG5cbiAgICBzdHJlYW0ub24oJ2Vycm9yJywgZnVuY3Rpb24gKGVycikge1xuICAgICAgICBzdHJlYW1zW2ZpbGVdLmRvbmUgPSB0cnVlO1xuICAgICAgICBjYWxsYmFjayhlcnIpO1xuICAgIH0pO1xuXG4gICAgdmFyIGxlZnRvdmVyID0gJyc7ICAvLyBMZWZ0LW92ZXIgcGFydGlhbCBsaW5lIGZyb20gbGFzdCBjaHVuay5cbiAgICBzdHJlYW0ub24oJ2RhdGEnLCBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICB2YXIgY2h1bmsgPSBkZWNvZGVyLndyaXRlKGRhdGEpO1xuICAgICAgICBpZiAoIWNodW5rLmxlbmd0aCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHZhciBsaW5lcyA9IGNodW5rLnNwbGl0KC9cXHJcXG58XFxuLyk7XG4gICAgICAgIHZhciBsZW5ndGggPSBsaW5lcy5sZW5ndGg7XG4gICAgICAgIGlmIChsZW5ndGggPT09IDEpIHtcbiAgICAgICAgICAgIGxlZnRvdmVyICs9IGxpbmVzWzBdO1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGxlbmd0aCA+IDEpIHtcbiAgICAgICAgICAgIGhhbmRsZUxvZ0xpbmUoZmlsZSwgbGVmdG92ZXIgKyBsaW5lc1swXSwgb3B0cywgc3R5bGl6ZSk7XG4gICAgICAgIH1cbiAgICAgICAgbGVmdG92ZXIgPSBsaW5lcy5wb3AoKTtcbiAgICAgICAgbGVuZ3RoIC09IDE7XG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGhhbmRsZUxvZ0xpbmUoZmlsZSwgbGluZXNbaV0sIG9wdHMsIHN0eWxpemUpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICBzdHJlYW0ub24oJ2VuZCcsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc3RyZWFtc1tmaWxlXS5kb25lID0gdHJ1ZTtcbiAgICAgICAgaWYgKGxlZnRvdmVyKSB7XG4gICAgICAgICAgICBoYW5kbGVMb2dMaW5lKGZpbGUsIGxlZnRvdmVyLCBvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgICAgIGxlZnRvdmVyID0gJyc7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBlbWl0TmV4dFJlY29yZChvcHRzLCBzdHlsaXplKTtcbiAgICAgICAgfVxuICAgICAgICBjYWxsYmFjaygpO1xuICAgIH0pO1xufVxuXG5cbi8qKlxuICogRnJvbSBub2RlIGFzeW5jIG1vZHVsZS5cbiAqL1xuLyogQkVHSU4gSlNTVFlMRUQgKi9cbmZ1bmN0aW9uIGFzeW5jRm9yRWFjaChhcnIsIGl0ZXJhdG9yLCBjYWxsYmFjaykge1xuICAgIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgZnVuY3Rpb24gKCkge307XG4gICAgaWYgKCFhcnIubGVuZ3RoKSB7XG4gICAgICAgIHJldHVybiBjYWxsYmFjaygpO1xuICAgIH1cbiAgICB2YXIgY29tcGxldGVkID0gMDtcbiAgICBhcnIuZm9yRWFjaChmdW5jdGlvbiAoeCkge1xuICAgICAgICBpdGVyYXRvcih4LCBmdW5jdGlvbiAoZXJyKSB7XG4gICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyKTtcbiAgICAgICAgICAgICAgICBjYWxsYmFjayA9IGZ1bmN0aW9uICgpIHt9O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICAgICAgY29tcGxldGVkICs9IDE7XG4gICAgICAgICAgICAgICAgaWYgKGNvbXBsZXRlZCA9PT0gYXJyLmxlbmd0aCkge1xuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjaygpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfSk7XG59O1xuLyogRU5EIEpTU1RZTEVEICovXG5cblxuXG4vKipcbiAqIENsZWFudXAgYW5kIGV4aXQgcHJvcGVybHkuXG4gKlxuICogV2FybmluZzogdGhpcyBkb2Vzbid0IHN0b3AgcHJvY2Vzc2luZywgaS5lLiBwcm9jZXNzIGV4aXQgbWlnaHQgYmUgZGVsYXllZC5cbiAqIEl0IGlzIHVwIHRvIHRoZSBjYWxsZXIgdG8gZW5zdXJlIHRoYXQgbm8gc3Vic2VxdWVudCBidW55YW4gcHJvY2Vzc2luZ1xuICogaXMgZG9uZSBhZnRlciBjYWxsaW5nIHRoaXMuXG4gKlxuICogQHBhcmFtIGNvZGUge051bWJlcn0gZXhpdCBjb2RlLlxuICogQHBhcmFtIHNpZ25hbCB7U3RyaW5nfSBPcHRpb25hbCBzaWduYWwgbmFtZSwgaWYgdGhpcyB3YXMgZXhpdHRpbmcgYmVjYXVzZVxuICogICAgb2YgYSBzaWduYWwuXG4gKi9cbnZhciBjbGVhbmVkVXAgPSBmYWxzZTtcbmZ1bmN0aW9uIGNsZWFudXBBbmRFeGl0KGNvZGUsIHNpZ25hbCkge1xuICAgIC8vIEd1YXJkIG9uZSBjYWxsLlxuICAgIGlmIChjbGVhbmVkVXApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBjbGVhbmVkVXAgPSB0cnVlO1xuICAgIGlmIChfREVCVUcpIHdhcm4oJyhidW55YW46IGNsZWFudXBBbmRFeGl0KScpO1xuXG4gICAgLy8gQ2xlYXIgcG9zc2libHkgaW50ZXJydXB0ZWQgQU5TSSBjb2RlIChpc3N1ZSAjNTkpLlxuICAgIGlmICh1c2luZ0Fuc2lDb2Rlcykge1xuICAgICAgICBzdGRvdXQud3JpdGUoJ1xceDFCWzBtJyk7XG4gICAgfVxuXG4gICAgLy8gS2lsbCBwb3NzaWJsZSBkdHJhY2UgY2hpbGQuXG4gICAgaWYgKGNoaWxkKSB7XG4gICAgICAgIGNoaWxkLmtpbGwoc2lnbmFsKTtcbiAgICB9XG5cbiAgICBpZiAocGFnZXIpIHtcbiAgICAgICAgLy8gTGV0IHBhZ2VyIGtub3cgdGhhdCBvdXRwdXQgaXMgZG9uZSwgdGhlbiB3YWl0IGZvciBwYWdlciB0byBleGl0LlxuICAgICAgICBzdGRvdXQuZW5kKCk7XG4gICAgICAgIHBhZ2VyLm9uKCdleGl0JywgZnVuY3Rpb24gKHBhZ2VyQ29kZSkge1xuICAgICAgICAgICAgaWYgKF9ERUJVRylcbiAgICAgICAgICAgICAgICB3YXJuKCcoYnVueWFuOiBwYWdlciBleGl0IC0+IHByb2Nlc3MuZXhpdCglcykpJyxcbiAgICAgICAgICAgICAgICAgICAgcGFnZXJDb2RlIHx8IGNvZGUpO1xuICAgICAgICAgICAgcHJvY2Vzcy5leGl0KHBhZ2VyQ29kZSB8fCBjb2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKF9ERUJVRykgd2FybignKGJ1bnlhbjogcHJvY2Vzcy5leGl0KCVzKSknLCBjb2RlKTtcbiAgICAgICAgcHJvY2Vzcy5leGl0KGNvZGUpO1xuICAgIH1cbn1cblxuXG5cbi8vLS0tLSBtYWlubGluZVxuXG5wcm9jZXNzLm9uKCdTSUdJTlQnLCBmdW5jdGlvbiAoKSB7XG4gICAgLyoqXG4gICAgICogSWdub3JlIFNJR0lOVCAoQ3RybCtDKSBpZiBwcm9jZXNzaW5nIHN0ZGluIC0tIHdlIHNob3VsZCBwcm9jZXNzXG4gICAgICogcmVtYWluaW5nIG91dHB1dCBmcm9tIHByZWNlZGluZyBwcm9jZXNzIGluIHRoZSBwaXBlbGluZSBhbmRcbiAgICAgKiBleGNlcHQgKml0KiB0byBjbG9zZS5cbiAgICAgKi9cbiAgICBpZiAoIXJlYWRpbmdTdGRpbikge1xuICAgICAgICBjbGVhbnVwQW5kRXhpdCgxLCAnU0lHSU5UJyk7XG4gICAgfVxufSk7XG5wcm9jZXNzLm9uKCdTSUdRVUlUJywgZnVuY3Rpb24gKCkgeyBjbGVhbnVwQW5kRXhpdCgxLCAnU0lHUVVJVCcpOyB9KTtcbnByb2Nlc3Mub24oJ1NJR1RFUk0nLCBmdW5jdGlvbiAoKSB7IGNsZWFudXBBbmRFeGl0KDEsICdTSUdURVJNJyk7IH0pO1xucHJvY2Vzcy5vbignU0lHSFVQJywgZnVuY3Rpb24gKCkgeyBjbGVhbnVwQW5kRXhpdCgxLCAnU0lHSFVQJyk7IH0pO1xuXG5wcm9jZXNzLm9uKCd1bmNhdWdodEV4Y2VwdGlvbicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICBmdW5jdGlvbiBfaW5kZW50KHMpIHtcbiAgICAgICAgdmFyIGxpbmVzID0gcy5zcGxpdCgvXFxyP1xcbi8pO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxpbmVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBsaW5lc1tpXSA9ICcqICAgICAnICsgbGluZXNbaV07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpO1xuICAgIH1cblxuICAgIHZhciB0aXRsZSA9IGVuY29kZVVSSUNvbXBvbmVudChmb3JtYXQoXG4gICAgICAgICdCdW55YW4gJXMgY3Jhc2hlZDogJXMnLCBnZXRWZXJzaW9uKCksIFN0cmluZyhlcnIpKSk7XG4gICAgdmFyIGUgPSBjb25zb2xlLmVycm9yO1xuICAgIGUoJ2BgYCcpO1xuICAgIGUoJyogVGhlIEJ1bnlhbiBDTEkgY3Jhc2hlZCEnKTtcbiAgICBlKCcqJyk7XG4gICAgaWYgKGVyci5uYW1lID09PSAnUmVmZXJlbmNlRXJyb3InICYmIGdVc2luZ0NvbmRpdGlvbk9wdHMpIHtcbiAgICAgICAgLyogQkVHSU4gSlNTVFlMRUQgKi9cbiAgICAgICAgZSgnKiBUaGlzIGNyYXNoIHdhcyBkdWUgdG8gYSBcIlJlZmVyZW5jZUVycm9yXCIsIHdoaWNoIGlzIG9mdGVuIHRoZSByZXN1bHQgb2YgZ2l2ZW4nKTtcbiAgICAgICAgZSgnKiBgLWMgQ09ORElUSU9OYCBjb2RlIHRoYXQgZG9lc25cXCd0IGd1YXJkIGFnYWluc3QgdW5kZWZpbmVkIHZhbHVlcy4gSWYgdGhhdCBpcycpO1xuICAgICAgICAvKiBFTkQgSlNTVFlMRUQgKi9cbiAgICAgICAgZSgnKiBub3QgdGhlIHByb2JsZW06Jyk7XG4gICAgICAgIGUoJyonKTtcbiAgICB9XG4gICAgZSgnKiBQbGVhc2UgcmVwb3J0IHRoaXMgaXNzdWUgYW5kIGluY2x1ZGUgdGhlIGRldGFpbHMgYmVsb3c6Jyk7XG4gICAgZSgnKicpO1xuICAgIGUoJyogICAgaHR0cHM6Ly9naXRodWIuY29tL3RyZW50bS9ub2RlLWJ1bnlhbi9pc3N1ZXMvbmV3P3RpdGxlPSVzJywgdGl0bGUpO1xuICAgIGUoJyonKTtcbiAgICBlKCcqICogKicpO1xuICAgIGUoJyogcGxhdGZvcm06JywgcHJvY2Vzcy5wbGF0Zm9ybSk7XG4gICAgZSgnKiBub2RlIHZlcnNpb246JywgcHJvY2Vzcy52ZXJzaW9uKTtcbiAgICBlKCcqIGJ1bnlhbiB2ZXJzaW9uOicsIGdldFZlcnNpb24oKSk7XG4gICAgZSgnKiBhcmd2OiAlaicsIHByb2Nlc3MuYXJndik7XG4gICAgZSgnKiBsb2cgbGluZTogJWonLCBjdXJyTGluZSk7XG4gICAgZSgnKiBzdGFjazonKTtcbiAgICBlKF9pbmRlbnQoZXJyLnN0YWNrKSk7XG4gICAgZSgnYGBgJyk7XG4gICAgcHJvY2Vzcy5leGl0KDEpO1xufSk7XG5cblxuZnVuY3Rpb24gbWFpbihhcmd2KSB7XG4gICAgdHJ5IHtcbiAgICAgICAgdmFyIG9wdHMgPSBwYXJzZUFyZ3YoYXJndik7XG4gICAgfSBjYXRjaCAoZSkge1xuICAgICAgICB3YXJuKCdidW55YW46IGVycm9yOiAlcycsIGUubWVzc2FnZSk7XG4gICAgICAgIHJldHVybiBkcmFpblN0ZG91dEFuZEV4aXQoMSk7XG4gICAgfVxuICAgIGlmIChvcHRzLmhlbHApIHtcbiAgICAgICAgcHJpbnRIZWxwKCk7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG4gICAgaWYgKG9wdHMudmVyc2lvbikge1xuICAgICAgICBjb25zb2xlLmxvZygnYnVueWFuICcgKyBnZXRWZXJzaW9uKCkpO1xuICAgICAgICByZXR1cm47XG4gICAgfVxuICAgIGlmIChvcHRzLnBpZCAmJiBvcHRzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICB3YXJuKCdidW55YW46IGVycm9yOiBjYW5cXCd0IHVzZSBib3RoIFwiLXAgUElEXCIgKCVzKSBhbmQgZmlsZSAoJXMpIGFyZ3MnLFxuICAgICAgICAgICAgb3B0cy5waWQsIG9wdHMuYXJncy5qb2luKCcgJykpO1xuICAgICAgICByZXR1cm4gZHJhaW5TdGRvdXRBbmRFeGl0KDEpO1xuICAgIH1cbiAgICBpZiAob3B0cy5jb2xvciA9PT0gbnVsbCkge1xuICAgICAgICBpZiAocHJvY2Vzcy5lbnYuQlVOWUFOX05PX0NPTE9SICYmXG4gICAgICAgICAgICAgICAgcHJvY2Vzcy5lbnYuQlVOWUFOX05PX0NPTE9SLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIG9wdHMuY29sb3IgPSBmYWxzZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIG9wdHMuY29sb3IgPSBwcm9jZXNzLnN0ZG91dC5pc1RUWTtcbiAgICAgICAgfVxuICAgIH1cbiAgICB1c2luZ0Fuc2lDb2RlcyA9IG9wdHMuY29sb3I7IC8vIGludGVudGlvbmFsbHkgZ2xvYmFsXG4gICAgdmFyIHN0eWxpemUgPSAob3B0cy5jb2xvciA/IHN0eWxpemVXaXRoQ29sb3IgOiBzdHlsaXplV2l0aG91dENvbG9yKTtcblxuICAgIC8vIFBhZ2VyLlxuICAgIHZhciBwYWdpbmF0ZSA9IChcbiAgICAgICAgcHJvY2Vzcy5zdGRvdXQuaXNUVFkgJiZcbiAgICAgICAgcHJvY2Vzcy5zdGRpbi5pc1RUWSAmJlxuICAgICAgICAhb3B0cy5waWRzICYmIC8vIERvbid0IHBhZ2UgaWYgZm9sbG93aW5nIHByb2Nlc3Mgb3V0cHV0LlxuICAgICAgICBvcHRzLmFyZ3MubGVuZ3RoID4gMCAmJiAvLyBEb24ndCBwYWdlIGlmIG5vIGZpbGUgYXJncyB0byBwcm9jZXNzLlxuICAgICAgICBwcm9jZXNzLnBsYXRmb3JtICE9PSAnd2luMzInICYmXG4gICAgICAgIChub2RlVmVyWzBdID4gMCB8fCBub2RlVmVyWzFdID49IDgpICYmXG4gICAgICAgIChvcHRzLnBhZ2luYXRlID09PSB0cnVlIHx8XG4gICAgICAgICAgICAob3B0cy5wYWdpbmF0ZSAhPT0gZmFsc2UgJiZcbiAgICAgICAgICAgICAgICAoIXByb2Nlc3MuZW52LkJVTllBTl9OT19QQUdFUiB8fFxuICAgICAgICAgICAgICAgICAgICBwcm9jZXNzLmVudi5CVU5ZQU5fTk9fUEFHRVIubGVuZ3RoID09PSAwKSkpKTtcbiAgICBpZiAocGFnaW5hdGUpIHtcbiAgICAgICAgdmFyIHBhZ2VyQ21kID0gcHJvY2Vzcy5lbnYuUEFHRVIgfHwgJ2xlc3MnO1xuICAgICAgICAvKiBKU1NUWUxFRCAqL1xuICAgICAgICBhc3NlcnQub2socGFnZXJDbWQuaW5kZXhPZignXCInKSA9PT0gLTEgJiYgcGFnZXJDbWQuaW5kZXhPZihcIidcIikgPT09IC0xLFxuICAgICAgICAgICAgJ2Nhbm5vdCBwYXJzZSBQQUdFUiBxdW90ZXMgeWV0Jyk7XG4gICAgICAgIHZhciBhcmd2ID0gcGFnZXJDbWQuc3BsaXQoL1xccysvZyk7XG4gICAgICAgIHZhciBlbnYgPSBvYmpDb3B5KHByb2Nlc3MuZW52KTtcbiAgICAgICAgaWYgKGVudi5MRVNTID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgICAgIC8vIGdpdCdzIGRlZmF1bHQgaXMgTEVTUz1GUlNYLiBJIGRvbid0IGxpa2UgdGhlICdTJyBoZXJlIGJlY2F1c2VcbiAgICAgICAgICAgIC8vIGxpbmVzIGFyZSAqdHlwaWNhbGx5KiB3aWRlIHdpdGggYnVueWFuIG91dHB1dCBhbmQgc2Nyb2xsaW5nXG4gICAgICAgICAgICAvLyBob3Jpem9udGFsbHkgaXMgYSByb3lhbCBwYWluLiBOb3RlIGEgYnVnIGluIE1hYydzIGBsZXNzIC1GYCxcbiAgICAgICAgICAgIC8vIHN1Y2ggdGhhdCBTSUdXSU5DSCBjYW4ga2lsbCBpdC4gSWYgdGhhdCByZWFycyB0b28gbXVjaCB0aGVuXG4gICAgICAgICAgICAvLyBJJ2xsIHJlbW92ZSAnRicgZnJvbSBoZXJlLlxuICAgICAgICAgICAgZW52LkxFU1MgPSAnRlJYJztcbiAgICAgICAgfVxuICAgICAgICBpZiAoX0RFQlVHKSB3YXJuKCcocGFnZXI6IGFyZ3Y9JWosIGVudi5MRVNTPSVqKScsIGFyZ3YsIGVudi5MRVNTKTtcbiAgICAgICAgLy8gYHBhZ2VyYCBhbmQgYHN0ZG91dGAgaW50ZW50aW9uYWxseSBnbG9iYWwuXG4gICAgICAgIHBhZ2VyID0gc3Bhd24oYXJndlswXSwgYXJndi5zbGljZSgxKSxcbiAgICAgICAgICAgIC8vIFNoYXJlIHRoZSBzdGRlcnIgaGFuZGxlIHRvIGhhdmUgZXJyb3Igb3V0cHV0IGNvbWVcbiAgICAgICAgICAgIC8vIHN0cmFpZ2h0IHRocm91Z2guIE9ubHkgc3VwcG9ydGVkIGluIHYwLjgrLlxuICAgICAgICAgICAge2VudjogZW52LCBzdGRpbzogWydwaXBlJywgMSwgMl19KTtcbiAgICAgICAgc3Rkb3V0ID0gcGFnZXIuc3RkaW47XG5cbiAgICAgICAgLy8gRWFybHkgdGVybWluYXRpb24gb2YgdGhlIHBhZ2VyOiBqdXN0IHN0b3AuXG4gICAgICAgIHBhZ2VyLm9uKCdleGl0JywgZnVuY3Rpb24gKHBhZ2VyQ29kZSkge1xuICAgICAgICAgICAgaWYgKF9ERUJVRykgd2FybignKGJ1bnlhbjogcGFnZXIgZXhpdCknKTtcbiAgICAgICAgICAgIHBhZ2VyID0gbnVsbDtcbiAgICAgICAgICAgIHN0ZG91dC5lbmQoKVxuICAgICAgICAgICAgc3Rkb3V0ID0gcHJvY2Vzcy5zdGRvdXQ7XG4gICAgICAgICAgICBjbGVhbnVwQW5kRXhpdChwYWdlckNvZGUpO1xuICAgICAgICB9KTtcbiAgICB9XG5cbiAgICAvLyBTdGRvdXQgZXJyb3IgaGFuZGxpbmcuIChDb3VsZG4ndCBzZXR1cCB1bnRpbCBgc3Rkb3V0YCB3YXMgZGV0ZXJtaW5lZC4pXG4gICAgc3Rkb3V0Lm9uKCdlcnJvcicsIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgaWYgKF9ERUJVRykgd2FybignKHN0ZG91dCBlcnJvciBldmVudDogJXMpJywgZXJyKTtcbiAgICAgICAgaWYgKGVyci5jb2RlID09PSAnRVBJUEUnKSB7XG4gICAgICAgICAgICBkcmFpblN0ZG91dEFuZEV4aXQoMCk7XG4gICAgICAgIH0gZWxzZSBpZiAoZXJyLnRvU3RyaW5nKCkgPT09ICdFcnJvcjogVGhpcyBzb2NrZXQgaXMgY2xvc2VkLicpIHtcbiAgICAgICAgICAgIC8vIENvdWxkIGdldCB0aGlzIGlmIHRoZSBwYWdlciBjbG9zZXMgaXRzIHN0ZGluLCBidXQgaGFzbid0XG4gICAgICAgICAgICAvLyBleGl0ZWQgeWV0LlxuICAgICAgICAgICAgZHJhaW5TdGRvdXRBbmRFeGl0KDEpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgd2FybihlcnIpO1xuICAgICAgICAgICAgZHJhaW5TdGRvdXRBbmRFeGl0KDEpO1xuICAgICAgICB9XG4gICAgfSk7XG5cbiAgICB2YXIgcmV0dmFsID0gMDtcbiAgICBpZiAob3B0cy5waWRzKSB7XG4gICAgICAgIHByb2Nlc3NQaWRzKG9wdHMsIHN0eWxpemUsIGZ1bmN0aW9uIChjb2RlKSB7XG4gICAgICAgICAgICBjbGVhbnVwQW5kRXhpdChjb2RlKTtcbiAgICAgICAgfSk7XG4gICAgfSBlbHNlIGlmIChvcHRzLmFyZ3MubGVuZ3RoID4gMCkge1xuICAgICAgICB2YXIgZmlsZXMgPSBvcHRzLmFyZ3M7XG4gICAgICAgIGZpbGVzLmZvckVhY2goZnVuY3Rpb24gKGZpbGUpIHtcbiAgICAgICAgICAgIHN0cmVhbXNbZmlsZV0gPSB7IHN0cmVhbTogbnVsbCwgcmVjb3JkczogW10sIGRvbmU6IGZhbHNlIH1cbiAgICAgICAgfSk7XG4gICAgICAgIGFzeW5jRm9yRWFjaChmaWxlcyxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChmaWxlLCBuZXh0KSB7XG4gICAgICAgICAgICAgICAgcHJvY2Vzc0ZpbGUoZmlsZSwgb3B0cywgc3R5bGl6ZSwgZnVuY3Rpb24gKGVycikge1xuICAgICAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICB3YXJuKCdidW55YW46ICVzJywgZXJyLm1lc3NhZ2UpO1xuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dmFsICs9IDE7XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgbmV4dCgpO1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZ1bmN0aW9uIChlcnIpIHtcbiAgICAgICAgICAgICAgICBpZiAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgIHdhcm4oJ2J1bnlhbjogdW5leHBlY3RlZCBlcnJvcjogJXMnLCBlcnIuc3RhY2sgfHwgZXJyKTtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGRyYWluU3Rkb3V0QW5kRXhpdCgxKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgY2xlYW51cEFuZEV4aXQocmV0dmFsKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBwcm9jZXNzU3RkaW4ob3B0cywgc3R5bGl6ZSwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgY2xlYW51cEFuZEV4aXQocmV0dmFsKTtcbiAgICAgICAgfSk7XG4gICAgfVxufVxuXG5pZiAocmVxdWlyZS5tYWluID09PSBtb2R1bGUpIHtcbiAgICAvLyBIQUNLIGd1YXJkIGZvciA8aHR0cHM6Ly9naXRodWIuY29tL3RyZW50bS9qc29uL2lzc3Vlcy8yND4uXG4gICAgLy8gV2Ugb3ZlcnJpZGUgdGhlIGBwcm9jZXNzLnN0ZG91dC5lbmRgIGd1YXJkIHRoYXQgY29yZSBub2RlLmpzIHB1dHMgaW5cbiAgICAvLyBwbGFjZS4gVGhlIHJlYWwgZml4IGlzIHRoYXQgYC5lbmQoKWAgc2hvdWxkbid0IGJlIGNhbGxlZCBvbiBzdGRvdXRcbiAgICAvLyBpbiBub2RlIGNvcmUuIE5vZGUgdjAuNi45IGZpeGVzIHRoYXQuIE9ubHkgZ3VhcmQgZm9yIHYwLjYuMC4udjAuNi44LlxuICAgIGlmIChbMCwgNiwgMF0gPD0gbm9kZVZlciAmJiBub2RlVmVyIDw9IFswLCA2LCA4XSkge1xuICAgICAgICB2YXIgc3Rkb3V0ID0gcHJvY2Vzcy5zdGRvdXQ7XG4gICAgICAgIHN0ZG91dC5lbmQgPSBzdGRvdXQuZGVzdHJveSA9IHN0ZG91dC5kZXN0cm95U29vbiA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8qIHBhc3MgKi9cbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBtYWluKHByb2Nlc3MuYXJndik7XG59XG4iXX0=
//# sourceMappingURL=cli.js.map