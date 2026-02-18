// Local copy of E-IMZO core scripts (Base64, CAPIWS, EIMZOClient, helpers)
// This is adapted from the working HTML demo you provided.

(function (global) {
  "use strict";
  // existing version for noConflict()
  var _Base64 = global.Base64;
  var version = "2.1.4";
  // if node.js, we use Buffer
  var buffer;
  if (typeof module !== "undefined" && module.exports) {
    buffer = require("buffer").Buffer;
  }
  // constants
  var b64chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var b64tab = (function (bin) {
    var t = {};
    for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
    return t;
  })(b64chars);
  var fromCharCode = String.fromCharCode;
  // encoder stuff
  var cb_utob = function (c) {
    if (c.length < 2) {
      var cc = c.charCodeAt(0);
      return cc < 0x80
        ? c
        : cc < 0x800
          ? fromCharCode(0xc0 | (cc >>> 6)) + fromCharCode(0x80 | (cc & 0x3f))
          : fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) +
            fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
            fromCharCode(0x80 | (cc & 0x3f));
    } else {
      var cc =
        0x10000 +
        (c.charCodeAt(0) - 0xd800) * 0x400 +
        (c.charCodeAt(1) - 0xdc00);
      return (
        fromCharCode(0xf0 | ((cc >>> 18) & 0x07)) +
        fromCharCode(0x80 | ((cc >>> 12) & 0x3f)) +
        fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
        fromCharCode(0x80 | (cc & 0x3f))
      );
    }
  };
  var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
  var utob = function (u) {
    return u.replace(re_utob, cb_utob);
  };
  var cb_encode = function (ccc) {
    var padlen = [0, 2, 1][ccc.length % 3],
      ord =
        (ccc.charCodeAt(0) << 16) |
        ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8) |
        (ccc.length > 2 ? ccc.charCodeAt(2) : 0),
      chars = [
        b64chars.charAt(ord >>> 18),
        b64chars.charAt((ord >>> 12) & 63),
        padlen >= 2 ? "=" : b64chars.charAt((ord >>> 6) & 63),
        padlen >= 1 ? "=" : b64chars.charAt(ord & 63),
      ];
    return chars.join("");
  };
  var btoa =
    global.btoa && typeof global.btoa === "function"
      ? function (b) {
          return global.btoa(b);
        }
      : function (b) {
          return b.replace(/[\s\S]{1,3}/g, cb_encode);
        };
  var _encode = buffer
    ? function (u) {
        return new buffer(u).toString("base64");
      }
    : function (u) {
        return btoa(utob(u));
      };
  var encode = function (u, urisafe) {
    return !urisafe
      ? _encode(u)
      : _encode(u)
          .replace(/[+\/]/g, function (m0) {
            return m0 == "+" ? "-" : "_";
          })
          .replace(/=/g, "");
  };
  var encodeURI = function (u) {
    return encode(u, true);
  };
  // decoder stuff
  var re_btou = new RegExp(
    [
      "[\xC0-\xDF][\x80-\xBF]",
      "[\xE0-\xEF][\x80-\xBF]{2}",
      "[\xF0-\xF7][\x80-\xBF]{3}",
    ].join("|"),
    "g",
  );
  var cb_btou = function (cccc) {
    switch (cccc.length) {
      case 4:
        var cp =
            ((0x07 & cccc.charCodeAt(0)) << 18) |
            ((0x3f & cccc.charCodeAt(1)) << 12) |
            ((0x3f & cccc.charCodeAt(2)) << 6) |
            (0x3f & cccc.charCodeAt(3)),
          offset = cp - 0x10000;
        return (
          fromCharCode((offset >>> 10) + 0xd800) +
          fromCharCode((offset & 0x3ff) + 0xdc00)
        );
      case 3:
        return fromCharCode(
          ((0x0f & cccc.charCodeAt(0)) << 12) |
            ((0x3f & cccc.charCodeAt(1)) << 6) |
            (0x3f & cccc.charCodeAt(2)),
        );
      default:
        return fromCharCode(
          ((0x1f & cccc.charCodeAt(0)) << 6) | (0x3f & cccc.charCodeAt(1)),
        );
    }
  };
  var btou = function (b) {
    return b.replace(re_btou, cb_btou);
  };
  var cb_decode = function (cccc) {
    var len = cccc.length,
      padlen = len % 4,
      n =
        (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0) |
        (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0) |
        (len > 2 ? b64tab[cccc.charAt(2)] << 6 : 0) |
        (len > 3 ? b64tab[cccc.charAt(3)] : 0),
      chars = [
        fromCharCode(n >>> 16),
        fromCharCode((n >>> 8) & 0xff),
        fromCharCode(n & 0xff),
      ];
    chars.length -= [0, 0, 2, 1][padlen];
    return chars.join("");
  };
  var atob =
    global.atob && typeof global.atob === "function"
      ? function (a) {
          return global.atob(a);
        }
      : function (a) {
          return a.replace(/[\s\S]{1,4}/g, cb_decode);
        };
  var _decode = buffer
    ? function (a) {
        return new buffer(a, "base64").toString();
      }
    : function (a) {
        return btou(atob(a));
      };
  var decode = function (a) {
    return _decode(
      a
        .replace(/[-_]/g, function (m0) {
          return m0 == "-" ? "+" : "/";
        })
        .replace(/[^A-Za-z0-9+\/]/g, ""),
    );
  };
  var noConflict = function () {
    var Base64 = global.Base64;
    global.Base64 = _Base64;
    return Base64;
  };
  // export Base64
  global.Base64 = {
    VERSION: version,
    atob: atob,
    btoa: btoa,
    fromBase64: decode,
    toBase64: encode,
    utob: utob,
    encode: encode,
    encodeURI: encodeURI,
    btou: btou,
    decode: decode,
    noConflict: noConflict,
  };
  // if ES5 is available, make Base64.extendString() available
  if (typeof Object.defineProperty === "function") {
    var noEnum = function (v) {
      return {
        value: v,
        enumerable: false,
        writable: true,
        configurable: true,
      };
    };
    global.Base64.extendString = function () {
      Object.defineProperty(
        String.prototype,
        "fromBase64",
        noEnum(function () {
          return decode(this);
        }),
      );
      Object.defineProperty(
        String.prototype,
        "toBase64",
        noEnum(function (urisafe) {
          return encode(this, urisafe);
        }),
      );
      Object.defineProperty(
        String.prototype,
        "toBase64URI",
        noEnum(function () {
          return encode(this, true);
        }),
      );
    };
  }
  // that's it!
})(this);

// Fallback CAPIWS implementation (WebSocket client to local cryptapi service)
// Matches the demo code structure.
var CAPIWS =
  typeof EIMZOEXT !== "undefined"
    ? EIMZOEXT
    : {
        URL:
          (window.location.protocol.toLowerCase() === "https:"
            ? "wss://127.0.0.1:64443"
            : "ws://127.0.0.1:64646") + "/service/cryptapi",
        callFunction: function (funcDef, callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            socket.send(JSON.stringify(funcDef));
          };
        },
        version: function (callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "version" };
            socket.send(JSON.stringify(o));
          };
        },
        apidoc: function (callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "apidoc" };
            socket.send(JSON.stringify(o));
          };
        },
        apikey: function (domainAndKey, callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "apikey", arguments: domainAndKey };
            socket.send(JSON.stringify(o));
          };
        },
        // findTokens - USB-tokenlarni topish
        findTokens: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success) {
              if (success) success();
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { plugin: "ftjc", name: "find_tokens" };
            socket.send(JSON.stringify(o));
          };
        },
        // findPfxs - PFX fayllarni topish
        findPfxs: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success) {
              if (success) success();
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { plugin: "pfx", name: "find_pfxs" };
            socket.send(JSON.stringify(o));
          };
        },
        // list_all_user_keys - barcha kalitlarni ro'yxatga olish
        list_all_user_keys: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success && data.items) {
              if (success) success(data.items);
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { name: "list_all_user_keys" };
            socket.send(JSON.stringify(o));
          };
        },
      };

// Version requirements and UI helpers (from demo)
var EIMZO_MAJOR = 3;
var EIMZO_MINOR = 37;

var errorCAPIWS =
  "Ошибка соединения с E-IMZO. Возможно у вас не установлен модуль E-IMZO.";
var errorBrowserWS =
  "Браузер не поддерживает технологию WebSocket. Установите последнюю версию браузера.";
var errorUpdateApp =
  'ВНИМАНИЕ !!! Установите новую версию приложения E-IMZO.<br /><a href="https://e-imzo.uz/main/downloads/" role="button">Скачать ПО E-IMZO</a>';
var errorWrongPassword = "Пароль неверный.";

var AppLoad = function () {
  // API_KEYS demo to'g'risida: bu yerda demo serverlar uchun API kalitlar bor.
  // Production'da siz .env dan API_KEYS o'qib ishlatishingiz mumkin.
  EIMZOClient.API_KEYS = [
    "null",
    "E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D",
    "localhost",
    "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
    "127.0.0.1",
    "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
    "test.e-imzo.uz",
    "DE783306B4717AFE4AE1B185E1D967C265AA397A35D8955C7D7E38A36F02798AA62FBABE2ABA15C888FE2F057474F35A5FC783D23005E4347A3E34D6C1DDBAE5",
    "test.e-imzo.local",
    "D56ABC7F43A23466D9ADB1A2335E7430FCE0F46B0EC99B578D554333245FC071357AE9E7E2F75F96B73AEEE7E0D61AE84E414F5CD795D8B6484E5645CAF958FC",
    "stat-urmon.uz",
    "52FB67CF97CB3CA3E61AB8DA1D9AB57D1C05DDE5BD605F49357846ADBD35AC426F241AF0AFE14AE03568754653B98B52BC12DC86B14E3BB5D0F6A93D34FDDBE5",
  ];

  if (typeof uiLoading === "function") {
    uiLoading();
  }

  EIMZOClient.checkVersion(
    function (major, minor) {
      var newVersion = EIMZO_MAJOR * 100 + EIMZO_MINOR;
      var installedVersion = parseInt(major) * 100 + parseInt(minor);
      if (installedVersion < newVersion) {
        if (typeof uiUpdateApp === "function") uiUpdateApp();
      } else {
        EIMZOClient.installApiKeys(
          function () {
            if (typeof uiAppLoad === "function") uiAppLoad();
          },
          function (e, r) {
            if (r) {
              if (typeof uiShowMessage === "function") uiShowMessage(r);
            } else {
              if (typeof wsError === "function") wsError(e);
            }
          },
        );
      }
    },
    function (e, r) {
      if (r) {
        if (typeof uiShowMessage === "function") uiShowMessage(r);
      } else {
        if (typeof uiNotLoaded === "function") uiNotLoaded(e);
      }
    },
  );
};

// Minimal UI helper stubs (they will be overridden by page code if defined)
if (typeof uiShowMessage === "undefined") {
  var uiShowMessage = function (message) {
    alert(message);
  };
}
if (typeof uiLoading === "undefined") {
  var uiLoading = function () {};
}
if (typeof uiLoaded === "undefined") {
  var uiLoaded = function () {};
}
if (typeof uiUpdateApp === "undefined") {
  var uiUpdateApp = function () {};
}
if (typeof uiNotLoaded === "undefined") {
  var uiNotLoaded = function (e) {
    uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e));
  };
}

var wsErroCodeDesc = function (code) {
  var reason;
  if (code == 1000)
    reason =
      code +
      " - " +
      "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
  else if (code == 1001)
    reason =
      code +
      " - " +
      'An endpoint is "going away", such as a server going down or a browser having navigated away from a page.';
  else if (code == 1002)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection due to a protocol error";
  else if (code == 1003)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
  else if (code == 1004)
    reason =
      code +
      " - " +
      "Reserved. The specific meaning might be defined in the future.";
  else if (code == 1005)
    reason = code + " - " + "No status code was actually present.";
  else if (code == 1006)
    reason =
      code +
      " - " +
      "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
  else if (code == 1007)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message.";
  else if (code == 1008)
    reason =
      code +
      " - " +
      'An endpoint is terminating the connection because it has received a message that "violates its policy".';
  else if (code == 1009)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
  else if (code == 1010)
    reason =
      code +
      " - " +
      "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake.";
  else if (code == 1011)
    reason =
      code +
      " - " +
      "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
  else if (code == 1015)
    reason =
      code +
      " - " +
      "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
  else reason = code;
  return reason;
};

var wsError = function (e) {
  if (e) {
    uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e));
  } else {
    uiShowMessage(errorBrowserWS);
  }
};

// Date va dates helperlari
Date.prototype.yyyymmdd = function () {
  var yyyy = this.getFullYear().toString();
  var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
  var dd = this.getDate().toString();
  return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
};
Date.prototype.ddmmyyyy = function () {
  var yyyy = this.getFullYear().toString();
  var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
  var dd = this.getDate().toString();
  return (
    (dd[1] ? dd : "0" + dd[0]) + "." + (mm[1] ? mm : "0" + mm[0]) + "." + yyyy
  ); // padding
};
var dates = {
  convert: function (d) {
    return d.constructor === Date
      ? d
      : d.constructor === Array
        ? new Date(d[0], d[1], d[2])
        : d.constructor === Number
          ? new Date(d)
          : d.constructor === String
            ? new Date(d)
            : typeof d === "object"
              ? new Date(d.year, d.month, d.date)
              : NaN;
  },
  compare: function (a, b) {
    return isFinite((a = this.convert(a).valueOf())) &&
      isFinite((b = this.convert(b).valueOf()))
      ? (a > b) - (a < b)
      : NaN;
  },
  inRange: function (d, start, end) {
    return isFinite((d = this.convert(d).valueOf())) &&
      isFinite((start = this.convert(start).valueOf())) &&
      isFinite((end = this.convert(end).valueOf()))
      ? start <= d && d <= end
      : NaN;
  },
};

// String.prototype.splitKeep helper
String.prototype.splitKeep = function (splitter, ahead) {
  var self = this;
  var result = [];
  if (splitter != "") {
    function getSubst(value) {
      var substChar = value[0] == "0" ? "1" : "0";
      var subst = "";
      for (var i = 0; i < value.length; i++) {
        subst += substChar;
      }
      return subst;
    }
    var matches = [];
    var replaceName = splitter instanceof RegExp ? "replace" : "replaceAll";
    var r = self[replaceName](splitter, function (m, i) {
      matches.push({ value: m, index: i });
      return getSubst(m);
    });
    var lastIndex = 0;
    for (var j = 0; j < matches.length; j++) {
      var m2 = matches[j];
      var nextIndex = ahead === true ? m2.index : m2.index + m2.value.length;
      if (nextIndex != lastIndex) {
        var part = self.substring(lastIndex, nextIndex);
        result.push(part);
        lastIndex = nextIndex;
      }
    }
    if (lastIndex < self.length) {
      var part2 = self.substring(lastIndex, self.length);
      result.push(part2);
    }
  } else {
    result.add(self);
  }
  return result;
};

// EIMZOClient - core wrapper around CAPIWS
var EIMZOClient = {
  NEW_API: false,
  NEW_API2: false,
  NEW_API3: false,
  API_KEYS: [
    "localhost",
    "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
    "127.0.0.1",
    "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
  ],
  checkVersion: function (success, fail) {
    CAPIWS.version(
      function (event, data) {
        if (data.success === true) {
          if (data.major && data.minor) {
            var installedVersion =
              parseInt(data.major) * 100 + parseInt(data.minor);
            EIMZOClient.NEW_API = installedVersion >= 336;
            EIMZOClient.NEW_API2 = installedVersion >= 412;
            EIMZOClient.NEW_API3 = installedVersion >= 486;
            success(data.major, data.minor);
          } else {
            fail(null, "E-IMZO Version is undefined");
          }
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  installApiKeys: function (success, fail) {
    CAPIWS.apikey(
      EIMZOClient.API_KEYS,
      function (event, data) {
        if (data.success) {
          success();
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  listAllUserKeys: function (itemIdGen, itemUiGen, success, fail) {
    var items = [];
    var errors = [];
    if (!EIMZOClient.NEW_API) {
      fail(null, "Please install new version of E-IMZO");
    } else {
      if (EIMZOClient.NEW_API2) {
        EIMZOClient._findPfxs2(
          itemIdGen,
          itemUiGen,
          items,
          errors,
          function (firstItmId2) {
            if (items.length === 0 && errors.length > 0) {
              fail(errors[0].e, errors[0].r);
            } else {
              var firstId = null;
              if (items.length === 1) {
                if (firstItmId2) {
                  firstId = firstItmId2;
                }
              }
              success(items, firstId);
            }
          },
        );
      } else {
        EIMZOClient._findPfxs2(
          itemIdGen,
          itemUiGen,
          items,
          errors,
          function (firstItmId2) {
            EIMZOClient._findTokens2(
              itemIdGen,
              itemUiGen,
              items,
              errors,
              function (firstItmId3) {
                if (items.length === 0 && errors.length > 0) {
                  fail(errors[0].e, errors[0].r);
                } else {
                  var firstId = null;
                  if (items.length === 1) {
                    if (firstItmId2) {
                      firstId = firstItmId2;
                    } else if (firstItmId3) {
                      firstId = firstItmId3;
                    }
                  }
                  success(items, firstId);
                }
              },
            );
          },
        );
      }
    }
  },
  loadKey: function (itemObject, success, fail, verifyPassword) {
    if (itemObject) {
      var vo = itemObject;
      if (vo.type === "pfx") {
        CAPIWS.callFunction(
          {
            plugin: "pfx",
            name: "load_key",
            arguments: [vo.disk, vo.path, vo.name, vo.alias],
          },
          function (event, data) {
            if (data.success) {
              var id = data.keyId;
              if (verifyPassword) {
                CAPIWS.callFunction(
                  { name: "verify_password", plugin: "pfx", arguments: [id] },
                  function (event, data) {
                    if (data.success) {
                      success(id);
                    } else {
                      fail(null, data.reason);
                    }
                  },
                  function (e) {
                    fail(e, null);
                  },
                );
              } else {
                success(id);
              }
            } else {
              fail(null, data.reason);
            }
          },
          function (e) {
            fail(e, null);
          },
        );
      } else if (vo.type === "ftjc") {
        CAPIWS.callFunction(
          { plugin: "ftjc", name: "load_key", arguments: [vo.cardUID] },
          function (event, data) {
            if (data.success) {
              var id = data.keyId;
              if (verifyPassword) {
                CAPIWS.callFunction(
                  {
                    plugin: "ftjc",
                    name: "verify_pin",
                    arguments: [id, "1"],
                  },
                  function (event, data) {
                    if (data.success) {
                      success(id);
                    } else {
                      fail(null, data.reason);
                    }
                  },
                  function (e) {
                    fail(e, null);
                  },
                );
              } else {
                success(id);
              }
            } else {
              fail(null, data.reason);
            }
          },
          function (e) {
            fail(e, null);
          },
        );
      }
    }
  },
  createPkcs7: function (
    id,
    data,
    timestamper,
    success,
    fail,
    detached,
    isDataBase64Encoded,
  ) {
    var data64;
    if (isDataBase64Encoded === true) {
      data64 = data;
    } else {
      data64 = Base64.encode(data);
    }
    if (detached === true) {
      detached = "yes";
    } else {
      detached = "no";
    }
    CAPIWS.callFunction(
      {
        plugin: "pkcs7",
        name: "create_pkcs7",
        arguments: [data64, id, detached],
      },
      function (event, data) {
        if (data.success) {
          var pkcs7 = data.pkcs7_64;
          success(pkcs7);
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  _getX500Val: function (s, f) {
    var res = s.splitKeep(/,[A-Z]+=/g, true);
    for (var i in res) {
      var n = res[i].search((i > 0 ? "," : "") + f + "=");
      if (n !== -1) {
        return res[i].slice(n + f.length + 1 + (i > 0 ? 1 : 0));
      }
    }
    return "";
  },
  _findPfxs2: function (itemIdGen, itemUiGen, items, errors, callback) {
    var itmkey0;
    CAPIWS.callFunction(
      { plugin: "pfx", name: "list_all_certificates" },
      function (event, data) {
        if (data.success) {
          for (var rec in data.certificates) {
            var el = data.certificates[rec];
            var x500name_ex = el.alias.toUpperCase();
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.1=", "INN=");
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.2=", "PINFL=");
            var vo = {
              disk: el.disk,
              path: el.path,
              name: el.name,
              alias: el.alias,
              serialNumber: EIMZOClient._getX500Val(
                x500name_ex,
                "SERIALNUMBER",
              ),
              validFrom: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDFROM")
                  .replace(/\./g, "-")
                  .replace(" ", "T"),
              ),
              validTo: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDTO")
                  .replace(/\./g, "-")
                  .replace(" ", "T"),
              ),
              CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
              TIN: EIMZOClient._getX500Val(x500name_ex, "INN")
                ? EIMZOClient._getX500Val(x500name_ex, "INN")
                : EIMZOClient._getX500Val(x500name_ex, "UID"),
              UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
              PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
              O: EIMZOClient._getX500Val(x500name_ex, "O"),
              T: EIMZOClient._getX500Val(x500name_ex, "T"),
              type: "pfx",
            };
            if (!vo.TIN && !vo.PINFL) continue;
            var itmkey = itemIdGen(vo, rec);
            if (!itmkey0) {
              itmkey0 = itmkey;
            }
            var itm = itemUiGen(itmkey, vo);
            items.push(itm);
          }
        } else {
          errors.push({ r: data.reason });
        }
        callback(itmkey0);
      },
      function (e) {
        errors.push({ e: e });
        callback(itmkey0);
      },
    );
  },
  _findTokens2: function (itemIdGen, itemUiGen, items, errors, callback) {
    var itmkey0;
    CAPIWS.callFunction(
      { plugin: "ftjc", name: "list_all_keys", arguments: [""] },
      function (event, data) {
        if (data.success) {
          for (var rec in data.tokens) {
            var el = data.tokens[rec];
            var x500name_ex = el.info.toUpperCase();
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.1=", "INN=");
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.2=", "PINFL=");
            var vo = {
              cardUID: el.cardUID,
              statusInfo: el.statusInfo,
              ownerName: el.ownerName,
              info: el.info,
              serialNumber: EIMZOClient._getX500Val(
                x500name_ex,
                "SERIALNUMBER",
              ),
              validFrom: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDFROM"),
              ),
              validTo: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDTO"),
              ),
              CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
              TIN: EIMZOClient._getX500Val(x500name_ex, "INN")
                ? EIMZOClient._getX500Val(x500name_ex, "INN")
                : EIMZOClient._getX500Val(x500name_ex, "UID"),
              UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
              PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
              O: EIMZOClient._getX500Val(x500name_ex, "O"),
              T: EIMZOClient._getX500Val(x500name_ex, "T"),
              type: "ftjc",
            };
            if (!vo.TIN && !vo.PINFL) continue;
            var itmkey = itemIdGen(vo, rec);
            if (!itmkey0) {
              itmkey0 = itmkey;
            }
            var itm = itemUiGen(itmkey, vo);
            items.push(itm);
          }
        } else {
          errors.push({ r: data.reason });
        }
        callback(itmkey0);
      },
      function (e) {
        errors.push({ e: e });
        callback(itmkey0);
      },
    );
  },
};

// Optional: automatically run AppLoad on window.onload if not already set
if (typeof window !== "undefined" && typeof window.onload === "undefined") {
  window.onload = AppLoad;
}

// Local copy of E-IMZO core scripts (Base64, CAPIWS, EIMZOClient, helpers)
// This is adapted from the working HTML demo you provided.

(function (global) {
  "use strict";
  // existing version for noConflict()
  var _Base64 = global.Base64;
  var version = "2.1.4";
  // if node.js, we use Buffer
  var buffer;
  if (typeof module !== "undefined" && module.exports) {
    buffer = require("buffer").Buffer;
  }
  // constants
  var b64chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var b64tab = (function (bin) {
    var t = {};
    for (var i = 0, l = bin.length; i < l; i++) t[bin.charAt(i)] = i;
    return t;
  })(b64chars);
  var fromCharCode = String.fromCharCode;
  // encoder stuff
  var cb_utob = function (c) {
    if (c.length < 2) {
      var cc = c.charCodeAt(0);
      return cc < 0x80
        ? c
        : cc < 0x800
          ? fromCharCode(0xc0 | (cc >>> 6)) + fromCharCode(0x80 | (cc & 0x3f))
          : fromCharCode(0xe0 | ((cc >>> 12) & 0x0f)) +
            fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
            fromCharCode(0x80 | (cc & 0x3f));
    } else {
      var cc =
        0x10000 +
        (c.charCodeAt(0) - 0xd800) * 0x400 +
        (c.charCodeAt(1) - 0xdc00);
      return (
        fromCharCode(0xf0 | ((cc >>> 18) & 0x07)) +
        fromCharCode(0x80 | ((cc >>> 12) & 0x3f)) +
        fromCharCode(0x80 | ((cc >>> 6) & 0x3f)) +
        fromCharCode(0x80 | (cc & 0x3f))
      );
    }
  };
  var re_utob = /[\uD800-\uDBFF][\uDC00-\uDFFFF]|[^\x00-\x7F]/g;
  var utob = function (u) {
    return u.replace(re_utob, cb_utob);
  };
  var cb_encode = function (ccc) {
    var padlen = [0, 2, 1][ccc.length % 3],
      ord =
        (ccc.charCodeAt(0) << 16) |
        ((ccc.length > 1 ? ccc.charCodeAt(1) : 0) << 8) |
        (ccc.length > 2 ? ccc.charCodeAt(2) : 0),
      chars = [
        b64chars.charAt(ord >>> 18),
        b64chars.charAt((ord >>> 12) & 63),
        padlen >= 2 ? "=" : b64chars.charAt((ord >>> 6) & 63),
        padlen >= 1 ? "=" : b64chars.charAt(ord & 63),
      ];
    return chars.join("");
  };
  var btoa =
    global.btoa && typeof global.btoa === "function"
      ? function (b) {
          return global.btoa(b);
        }
      : function (b) {
          return b.replace(/[\s\S]{1,3}/g, cb_encode);
        };
  var _encode = buffer
    ? function (u) {
        return new buffer(u).toString("base64");
      }
    : function (u) {
        return btoa(utob(u));
      };
  var encode = function (u, urisafe) {
    return !urisafe
      ? _encode(u)
      : _encode(u)
          .replace(/[+/]/g, function (m0) {
            return m0 == "+" ? "-" : "_";
          })
          .replace(/=/g, "");
  };
  var encodeURI = function (u) {
    return encode(u, true);
  };
  // decoder stuff
  var re_btou = new RegExp(
    [
      "[\xC0-\xDF][\x80-\xBF]",
      "[\xE0-\xEF][\x80-\xBF]{2}",
      "[\xF0-\xF7][\x80-\xBF]{3}",
    ].join("|"),
    "g",
  );
  var cb_btou = function (cccc) {
    switch (cccc.length) {
      case 4:
        var cp =
            ((0x07 & cccc.charCodeAt(0)) << 18) |
            ((0x3f & cccc.charCodeAt(1)) << 12) |
            ((0x3f & cccc.charCodeAt(2)) << 6) |
            (0x3f & cccc.charCodeAt(3)),
          offset = cp - 0x10000;
        return (
          fromCharCode((offset >>> 10) + 0xd800) +
          fromCharCode((offset & 0x3ff) + 0xdc00)
        );
      case 3:
        return fromCharCode(
          ((0x0f & cccc.charCodeAt(0)) << 12) |
            ((0x3f & cccc.charCodeAt(1)) << 6) |
            (0x3f & cccc.charCodeAt(2)),
        );
      default:
        return fromCharCode(
          ((0x1f & cccc.charCodeAt(0)) << 6) | (0x3f & cccc.charCodeAt(1)),
        );
    }
  };
  var btou = function (b) {
    return b.replace(re_btou, cb_btou);
  };
  var cb_decode = function (cccc) {
    var len = cccc.length,
      padlen = len % 4,
      n =
        (len > 0 ? b64tab[cccc.charAt(0)] << 18 : 0) |
        (len > 1 ? b64tab[cccc.charAt(1)] << 12 : 0) |
        (len > 2 ? b64tab[cccc.charAt(2)] << 6 : 0) |
        (len > 3 ? b64tab[cccc.charAt(3)] : 0),
      chars = [
        fromCharCode(n >>> 16),
        fromCharCode((n >>> 8) & 0xff),
        fromCharCode(n & 0xff),
      ];
    chars.length -= [0, 0, 2, 1][padlen];
    return chars.join("");
  };
  var atob =
    global.atob && typeof global.atob === "function"
      ? function (a) {
          return global.atob(a);
        }
      : function (a) {
          return a.replace(/[\s\S]{1,4}/g, cb_decode);
        };
  var _decode = buffer
    ? function (a) {
        return new buffer(a, "base64").toString();
      }
    : function (a) {
        return btou(atob(a));
      };
  var decode = function (a) {
    return _decode(
      a
        .replace(/[-_]/g, function (m0) {
          return m0 == "-" ? "+" : "/";
        })
        .replace(/[^A-Za-z0-9+/]/g, ""),
    );
  };
  var noConflict = function () {
    var Base64 = global.Base64;
    global.Base64 = _Base64;
    return Base64;
  };
  // export Base64
  global.Base64 = {
    VERSION: version,
    atob: atob,
    btoa: btoa,
    fromBase64: decode,
    toBase64: encode,
    utob: utob,
    encode: encode,
    encodeURI: encodeURI,
    btou: btou,
    decode: decode,
    noConflict: noConflict,
  };
  // if ES5 is available, make Base64.extendString() available
  if (typeof Object.defineProperty === "function") {
    var noEnum = function (v) {
      return {
        value: v,
        enumerable: false,
        writable: true,
        configurable: true,
      };
    };
    global.Base64.extendString = function () {
      Object.defineProperty(
        String.prototype,
        "fromBase64",
        noEnum(function () {
          return decode(this);
        }),
      );
      Object.defineProperty(
        String.prototype,
        "toBase64",
        noEnum(function (urisafe) {
          return encode(this, urisafe);
        }),
      );
      Object.defineProperty(
        String.prototype,
        "toBase64URI",
        noEnum(function () {
          return encode(this, true);
        }),
      );
    };
  }
  // that's it!
})(this);

// Fallback CAPIWS implementation (WebSocket client to local cryptapi service)
// Matches the demo code structure.
var CAPIWS =
  typeof EIMZOEXT !== "undefined"
    ? EIMZOEXT
    : {
        URL:
          (window.location.protocol.toLowerCase() === "https:"
            ? "wss://127.0.0.1:64443"
            : "ws://127.0.0.1:64646") + "/service/cryptapi",
        callFunction: function (funcDef, callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            socket.send(JSON.stringify(funcDef));
          };
        },
        version: function (callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "version" };
            socket.send(JSON.stringify(o));
          };
        },
        apidoc: function (callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "apidoc" };
            socket.send(JSON.stringify(o));
          };
        },
        apikey: function (domainAndKey, callback, error) {
          if (!window.WebSocket) {
            if (error) error();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (error) error(e);
            return;
          }
          socket.onclose = function (e) {
            if (error) {
              if (e.code != 1000) {
                error(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            callback(event, data);
          };
          socket.onopen = function () {
            var o = { name: "apikey", arguments: domainAndKey };
            socket.send(JSON.stringify(o));
          };
        },
        // findTokens - USB-tokenlarni topish
        findTokens: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success) {
              if (success) success();
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { plugin: "ftjc", name: "find_tokens" };
            socket.send(JSON.stringify(o));
          };
        },
        // findPfxs - PFX fayllarni topish
        findPfxs: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success) {
              if (success) success();
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { plugin: "pfx", name: "find_pfxs" };
            socket.send(JSON.stringify(o));
          };
        },
        // list_all_user_keys - barcha kalitlarni ro'yxatga olish
        list_all_user_keys: function (success, fail) {
          if (!window.WebSocket) {
            if (fail) fail();
            return;
          }
          var socket;
          try {
            socket = new WebSocket(this.URL);
          } catch (e) {
            if (fail) fail(e);
            return;
          }
          socket.onclose = function (e) {
            if (fail) {
              if (e.code != 1000) {
                fail(e.code);
              }
            }
          };
          socket.onmessage = function (event) {
            var data = JSON.parse(event.data);
            socket.close();
            if (data.success && data.items) {
              if (success) success(data.items);
            } else {
              if (fail) fail(null, data.reason);
            }
          };
          socket.onopen = function () {
            var o = { name: "list_all_user_keys" };
            socket.send(JSON.stringify(o));
          };
        },
      };

// Version requirements and UI helpers (from demo)
var EIMZO_MAJOR = 3;
var EIMZO_MINOR = 37;

var errorCAPIWS =
  "Ошибка соединения с E-IMZO. Возможно у вас не установлен модуль E-IMZO.";
var errorBrowserWS =
  "Браузер не поддерживает технологию WebSocket. Установите последнюю версию браузера.";
var errorUpdateApp =
  'ВНИМАНИЕ !!! Установите новую версию приложения E-IMZO.<br /><a href="https://e-imzo.uz/main/downloads/" role="button">Скачать ПО E-IMZO</a>';
var errorWrongPassword = "Пароль неверный.";

var AppLoad = function () {
  // API_KEYS demo to'g'risida: bu yerda demo serverlar uchun API kalitlar bor.
  // Production'da siz .env dan API_KEYS o'qib ishlatishingiz mumkin.
  EIMZOClient.API_KEYS = [
    "null",
    "E0A205EC4E7B78BBB56AFF83A733A1BB9FD39D562E67978CC5E7D73B0951DB1954595A20672A63332535E13CC6EC1E1FC8857BB09E0855D7E76E411B6FA16E9D",
    "localhost",
    "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
    "127.0.0.1",
    "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
    "test.e-imzo.uz",
    "DE783306B4717AFE4AE1B185E1D967C265AA397A35D8955C7D7E38A36F02798AA62FBABE2ABA15C888FE2F057474F35A5FC783D23005E4347A3E34D6C1DDBAE5",
    "test.e-imzo.local",
    "D56ABC7F43A23466D9ADB1A2335E7430FCE0F46B0EC99B578D554333245FC071357AE9E7E2F75F96B73AEEE7E0D61AE84E414F5CD795D8B6484E5645CAF958FC",
    "stat-urmon.uz",
    "HEX_API_KEY_FOR_stat-urmon.uz",
  ];

  if (typeof uiLoading === "function") {
    uiLoading();
  }

  EIMZOClient.checkVersion(
    function (major, minor) {
      var newVersion = EIMZO_MAJOR * 100 + EIMZO_MINOR;
      var installedVersion = parseInt(major) * 100 + parseInt(minor);
      if (installedVersion < newVersion) {
        if (typeof uiUpdateApp === "function") uiUpdateApp();
      } else {
        EIMZOClient.installApiKeys(
          function () {
            if (typeof uiAppLoad === "function") uiAppLoad();
          },
          function (e, r) {
            if (r) {
              if (typeof uiShowMessage === "function") uiShowMessage(r);
            } else {
              if (typeof wsError === "function") wsError(e);
            }
          },
        );
      }
    },
    function (e, r) {
      if (r) {
        if (typeof uiShowMessage === "function") uiShowMessage(r);
      } else {
        if (typeof uiNotLoaded === "function") uiNotLoaded(e);
      }
    },
  );
};

// Minimal UI helper stubs (they will be overridden by page code if defined)
if (typeof uiShowMessage === "undefined") {
  var uiShowMessage = function (message) {
    alert(message);
  };
}
if (typeof uiLoading === "undefined") {
  var uiLoading = function () {};
}
if (typeof uiLoaded === "undefined") {
  var uiLoaded = function () {};
}
if (typeof uiUpdateApp === "undefined") {
  var uiUpdateApp = function () {};
}
if (typeof uiNotLoaded === "undefined") {
  var uiNotLoaded = function (e) {
    uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e));
  };
}

var wsErroCodeDesc = function (code) {
  var reason;
  if (code == 1000)
    reason =
      code +
      " - " +
      "Normal closure, meaning that the purpose for which the connection was established has been fulfilled.";
  else if (code == 1001)
    reason =
      code +
      " - " +
      'An endpoint is "going away", such as a server going down or a browser having navigated away from a page.';
  else if (code == 1002)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection due to a protocol error";
  else if (code == 1003)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).";
  else if (code == 1004)
    reason =
      code +
      " - " +
      "Reserved. The specific meaning might be defined in the future.";
  else if (code == 1005)
    reason = code + " - " + "No status code was actually present.";
  else if (code == 1006)
    reason =
      code +
      " - " +
      "The connection was closed abnormally, e.g., without sending or receiving a Close control frame";
  else if (code == 1007)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message.";
  else if (code == 1008)
    reason =
      code +
      " - " +
      'An endpoint is terminating the connection because it has received a message that "violates its policy".';
  else if (code == 1009)
    reason =
      code +
      " - " +
      "An endpoint is terminating the connection because it has received a message that is too big for it to process.";
  else if (code == 1010)
    reason =
      code +
      " - " +
      "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake.";
  else if (code == 1011)
    reason =
      code +
      " - " +
      "A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.";
  else if (code == 1015)
    reason =
      code +
      " - " +
      "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).";
  else reason = code;
  return reason;
};

var wsError = function (e) {
  if (e) {
    uiShowMessage(errorCAPIWS + " : " + wsErroCodeDesc(e));
  } else {
    uiShowMessage(errorBrowserWS);
  }
};

// Date va dates helperlari
Date.prototype.yyyymmdd = function () {
  var yyyy = this.getFullYear().toString();
  var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
  var dd = this.getDate().toString();
  return yyyy + (mm[1] ? mm : "0" + mm[0]) + (dd[1] ? dd : "0" + dd[0]); // padding
};
Date.prototype.ddmmyyyy = function () {
  var yyyy = this.getFullYear().toString();
  var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
  var dd = this.getDate().toString();
  return (
    (dd[1] ? dd : "0" + dd[0]) + "." + (mm[1] ? mm : "0" + mm[0]) + "." + yyyy
  ); // padding
};
var dates = {
  convert: function (d) {
    return d.constructor === Date
      ? d
      : d.constructor === Array
        ? new Date(d[0], d[1], d[2])
        : d.constructor === Number
          ? new Date(d)
          : d.constructor === String
            ? new Date(d)
            : typeof d === "object"
              ? new Date(d.year, d.month, d.date)
              : NaN;
  },
  compare: function (a, b) {
    return isFinite((a = this.convert(a).valueOf())) &&
      isFinite((b = this.convert(b).valueOf()))
      ? (a > b) - (a < b)
      : NaN;
  },
  inRange: function (d, start, end) {
    return isFinite((d = this.convert(d).valueOf())) &&
      isFinite((start = this.convert(start).valueOf())) &&
      isFinite((end = this.convert(end).valueOf()))
      ? start <= d && d <= end
      : NaN;
  },
};

// String.prototype.splitKeep helper
String.prototype.splitKeep = function (splitter, ahead) {
  var self = this;
  var result = [];
  if (splitter != "") {
    function getSubst(value) {
      var substChar = value[0] == "0" ? "1" : "0";
      var subst = "";
      for (var i = 0; i < value.length; i++) {
        subst += substChar;
      }
      return subst;
    }
    var matches = [];
    var replaceName = splitter instanceof RegExp ? "replace" : "replaceAll";
    var r = self[replaceName](splitter, function (m, i) {
      matches.push({ value: m, index: i });
      return getSubst(m);
    });
    var lastIndex = 0;
    for (var j = 0; j < matches.length; j++) {
      var m2 = matches[j];
      var nextIndex = ahead === true ? m2.index : m2.index + m2.value.length;
      if (nextIndex != lastIndex) {
        var part = self.substring(lastIndex, nextIndex);
        result.push(part);
        lastIndex = nextIndex;
      }
    }
    if (lastIndex < self.length) {
      var part2 = self.substring(lastIndex, self.length);
      result.push(part2);
    }
  } else {
    result.add(self);
  }
  return result;
};

// EIMZOClient - core wrapper around CAPIWS
var EIMZOClient = {
  NEW_API: false,
  NEW_API2: false,
  NEW_API3: false,
  API_KEYS: [
    "localhost",
    "96D0C1491615C82B9A54D9989779DF825B690748224C2B04F500F370D51827CE2644D8D4A82C18184D73AB8530BB8ED537269603F61DB0D03D2104ABF789970B",
    "127.0.0.1",
    "A7BCFA5D490B351BE0754130DF03A068F855DB4333D43921125B9CF2670EF6A40370C646B90401955E1F7BC9CDBF59CE0B2C5467D820BE189C845D0B79CFC96F",
  ],
  checkVersion: function (success, fail) {
    CAPIWS.version(
      function (event, data) {
        if (data.success === true) {
          if (data.major && data.minor) {
            var installedVersion =
              parseInt(data.major) * 100 + parseInt(data.minor);
            EIMZOClient.NEW_API = installedVersion >= 336;
            EIMZOClient.NEW_API2 = installedVersion >= 412;
            EIMZOClient.NEW_API3 = installedVersion >= 486;
            success(data.major, data.minor);
          } else {
            fail(null, "E-IMZO Version is undefined");
          }
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  installApiKeys: function (success, fail) {
    CAPIWS.apikey(
      EIMZOClient.API_KEYS,
      function (event, data) {
        if (data.success) {
          success();
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  listAllUserKeys: function (itemIdGen, itemUiGen, success, fail) {
    var items = [];
    var errors = [];
    if (!EIMZOClient.NEW_API) {
      fail(null, "Please install new version of E-IMZO");
    } else {
      if (EIMZOClient.NEW_API2) {
        EIMZOClient._findPfxs2(
          itemIdGen,
          itemUiGen,
          items,
          errors,
          function (firstItmId2) {
            if (items.length === 0 && errors.length > 0) {
              fail(errors[0].e, errors[0].r);
            } else {
              var firstId = null;
              if (items.length === 1) {
                if (firstItmId2) {
                  firstId = firstItmId2;
                }
              }
              success(items, firstId);
            }
          },
        );
      } else {
        EIMZOClient._findPfxs2(
          itemIdGen,
          itemUiGen,
          items,
          errors,
          function (firstItmId2) {
            EIMZOClient._findTokens2(
              itemIdGen,
              itemUiGen,
              items,
              errors,
              function (firstItmId3) {
                if (items.length === 0 && errors.length > 0) {
                  fail(errors[0].e, errors[0].r);
                } else {
                  var firstId = null;
                  if (items.length === 1) {
                    if (firstItmId2) {
                      firstId = firstItmId2;
                    } else if (firstItmId3) {
                      firstId = firstItmId3;
                    }
                  }
                  success(items, firstId);
                }
              },
            );
          },
        );
      }
    }
  },
  loadKey: function (itemObject, success, fail, verifyPassword) {
    if (itemObject) {
      var vo = itemObject;
      if (vo.type === "pfx") {
        CAPIWS.callFunction(
          {
            plugin: "pfx",
            name: "load_key",
            arguments: [vo.disk, vo.path, vo.name, vo.alias],
          },
          function (event, data) {
            if (data.success) {
              var id = data.keyId;
              if (verifyPassword) {
                CAPIWS.callFunction(
                  { name: "verify_password", plugin: "pfx", arguments: [id] },
                  function (event, data) {
                    if (data.success) {
                      success(id);
                    } else {
                      fail(null, data.reason);
                    }
                  },
                  function (e) {
                    fail(e, null);
                  },
                );
              } else {
                success(id);
              }
            } else {
              fail(null, data.reason);
            }
          },
          function (e) {
            fail(e, null);
          },
        );
      } else if (vo.type === "ftjc") {
        CAPIWS.callFunction(
          { plugin: "ftjc", name: "load_key", arguments: [vo.cardUID] },
          function (event, data) {
            if (data.success) {
              var id = data.keyId;
              if (verifyPassword) {
                CAPIWS.callFunction(
                  {
                    plugin: "ftjc",
                    name: "verify_pin",
                    arguments: [id, "1"],
                  },
                  function (event, data) {
                    if (data.success) {
                      success(id);
                    } else {
                      fail(null, data.reason);
                    }
                  },
                  function (e) {
                    fail(e, null);
                  },
                );
              } else {
                success(id);
              }
            } else {
              fail(null, data.reason);
            }
          },
          function (e) {
            fail(e, null);
          },
        );
      }
    }
  },
  createPkcs7: function (
    id,
    data,
    timestamper,
    success,
    fail,
    detached,
    isDataBase64Encoded,
  ) {
    var data64;
    if (isDataBase64Encoded === true) {
      data64 = data;
    } else {
      data64 = Base64.encode(data);
    }
    if (detached === true) {
      detached = "yes";
    } else {
      detached = "no";
    }
    CAPIWS.callFunction(
      {
        plugin: "pkcs7",
        name: "create_pkcs7",
        arguments: [data64, id, detached],
      },
      function (event, data) {
        if (data.success) {
          var pkcs7 = data.pkcs7_64;
          success(pkcs7);
        } else {
          fail(null, data.reason);
        }
      },
      function (e) {
        fail(e, null);
      },
    );
  },
  _getX500Val: function (s, f) {
    var res = s.splitKeep(/,[A-Z]+=/g, true);
    for (var i in res) {
      var n = res[i].search((i > 0 ? "," : "") + f + "=");
      if (n !== -1) {
        return res[i].slice(n + f.length + 1 + (i > 0 ? 1 : 0));
      }
    }
    return "";
  },
  _findPfxs2: function (itemIdGen, itemUiGen, items, errors, callback) {
    var itmkey0;
    CAPIWS.callFunction(
      { plugin: "pfx", name: "list_all_certificates" },
      function (event, data) {
        if (data.success) {
          for (var rec in data.certificates) {
            var el = data.certificates[rec];
            var x500name_ex = el.alias.toUpperCase();
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.1=", "INN=");
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.2=", "PINFL=");
            var vo = {
              disk: el.disk,
              path: el.path,
              name: el.name,
              alias: el.alias,
              serialNumber: EIMZOClient._getX500Val(
                x500name_ex,
                "SERIALNUMBER",
              ),
              validFrom: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDFROM")
                  .replace(/\./g, "-")
                  .replace(" ", "T"),
              ),
              validTo: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDTO")
                  .replace(/\./g, "-")
                  .replace(" ", "T"),
              ),
              CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
              TIN: EIMZOClient._getX500Val(x500name_ex, "INN")
                ? EIMZOClient._getX500Val(x500name_ex, "INN")
                : EIMZOClient._getX500Val(x500name_ex, "UID"),
              UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
              PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
              O: EIMZOClient._getX500Val(x500name_ex, "O"),
              T: EIMZOClient._getX500Val(x500name_ex, "T"),
              type: "pfx",
            };
            if (!vo.TIN && !vo.PINFL) continue;
            var itmkey = itemIdGen(vo, rec);
            if (!itmkey0) {
              itmkey0 = itmkey;
            }
            var itm = itemUiGen(itmkey, vo);
            items.push(itm);
          }
        } else {
          errors.push({ r: data.reason });
        }
        callback(itmkey0);
      },
      function (e) {
        errors.push({ e: e });
        callback(itmkey0);
      },
    );
  },
  _findTokens2: function (itemIdGen, itemUiGen, items, errors, callback) {
    var itmkey0;
    CAPIWS.callFunction(
      { plugin: "ftjc", name: "list_all_keys", arguments: [""] },
      function (event, data) {
        if (data.success) {
          for (var rec in data.tokens) {
            var el = data.tokens[rec];
            var x500name_ex = el.info.toUpperCase();
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.1=", "INN=");
            x500name_ex = x500name_ex.replace("1.2.860.3.16.1.2=", "PINFL=");
            var vo = {
              cardUID: el.cardUID,
              statusInfo: el.statusInfo,
              ownerName: el.ownerName,
              info: el.info,
              serialNumber: EIMZOClient._getX500Val(
                x500name_ex,
                "SERIALNUMBER",
              ),
              validFrom: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDFROM"),
              ),
              validTo: new Date(
                EIMZOClient._getX500Val(x500name_ex, "VALIDTO"),
              ),
              CN: EIMZOClient._getX500Val(x500name_ex, "CN"),
              TIN: EIMZOClient._getX500Val(x500name_ex, "INN")
                ? EIMZOClient._getX500Val(x500name_ex, "INN")
                : EIMZOClient._getX500Val(x500name_ex, "UID"),
              UID: EIMZOClient._getX500Val(x500name_ex, "UID"),
              PINFL: EIMZOClient._getX500Val(x500name_ex, "PINFL"),
              O: EIMZOClient._getX500Val(x500name_ex, "O"),
              T: EIMZOClient._getX500Val(x500name_ex, "T"),
              type: "ftjc",
            };
            if (!vo.TIN && !vo.PINFL) continue;
            var itmkey = itemIdGen(vo, rec);
            if (!itmkey0) {
              itmkey0 = itmkey;
            }
            var itm = itemUiGen(itmkey, vo);
            items.push(itm);
          }
        } else {
          errors.push({ r: data.reason });
        }
        callback(itmkey0);
      },
      function (e) {
        errors.push({ e: e });
        callback(itmkey0);
      },
    );
  },
};

// Optional: automatically run AppLoad on window.onload if not already set
if (typeof window !== "undefined" && typeof window.onload === "undefined") {
  window.onload = AppLoad;
}
