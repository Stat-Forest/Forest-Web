/* 
 * microAjax - simple XHR helper used by E-IMZO demo
 * added this.request as second argument for callback func
 * Usage: new microAjax(url, callback, postBody)
 */
function microAjax(url, callback, postBody) {
  this.bindFunction = function (fn, self) {
    return function () {
      return fn.apply(self, [self]);
    };
  };

  this.stateChange = function () {
    if (this.request.readyState === 4) {
      this.callbackFunction(this.request.responseText, this.request);
    }
  };

  this.getRequest = function () {
    if (window.ActiveXObject) {
      // IE
      return new ActiveXObject("Microsoft.XMLHTTP");
    } else if (window.XMLHttpRequest) {
      // Modern browsers
      return new XMLHttpRequest();
    }
    return false;
  };

  this.postBody = postBody || "";
  this.callbackFunction = callback;
  this.url = url;
  this.request = this.getRequest();

  if (this.request) {
    var req = this.request;
    req.onreadystatechange = this.bindFunction(this.stateChange, this);

    if (this.postBody !== "") {
      req.open("POST", url, true);
      req.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      req.setRequestHeader(
        "Content-type",
        "application/x-www-form-urlencoded; charset=UTF-8"
      );
      req.setRequestHeader("Connection", "close");
    } else {
      req.open("GET", url, true);
    }

    req.send(this.postBody);
  }
}

