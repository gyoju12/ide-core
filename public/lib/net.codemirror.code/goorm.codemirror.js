// CodeMirror version 3.12
//
// CodeMirror is the only global var we claim
window.CodeMirror = (function() {
  "use strict";

  // BROWSER SNIFFING

  // Crude, but necessary to handle a number of hard-to-feature-detect
  // bugs and behavior differences.
  var gecko = /gecko\/\d/i.test(navigator.userAgent);
  var ie = /MSIE \d/.test(navigator.userAgent);
  var ie_lt8 = ie && (document.documentMode == null || document.documentMode < 8);
  var ie_lt9 = ie && (document.documentMode == null || document.documentMode < 9);
  var webkit = /WebKit\//.test(navigator.userAgent);
  var qtwebkit = webkit && /Qt\/\d+\.\d+/.test(navigator.userAgent);
  var chrome = /Chrome\//.test(navigator.userAgent);
  var opera = /Opera\//.test(navigator.userAgent);
  var safari = /Apple Computer/.test(navigator.vendor);
  var khtml = /KHTML\//.test(navigator.userAgent);
  var mac_geLion = /Mac OS X 1\d\D([7-9]|\d\d)\D/.test(navigator.userAgent);
  var mac_geMountainLion = /Mac OS X 1\d\D([8-9]|\d\d)\D/.test(navigator.userAgent);
  var phantom = /PhantomJS/.test(navigator.userAgent);

  var ios = /AppleWebKit/.test(navigator.userAgent) && /Mobile\/\w+/.test(navigator.userAgent);
  // This is woefully incomplete. Suggestions for alternative methods welcome.
  var mobile = ios || /Android|webOS|BlackBerry|Opera Mini|Opera Mobi|IEMobile/i.test(navigator.userAgent);
  var mac = ios || /Mac/.test(navigator.platform);
  var windows = /windows/i.test(navigator.platform);

  var opera_version = opera && navigator.userAgent.match(/Version\/(\d*\.\d*)/);
  if (opera_version) opera_version = Number(opera_version[1]);
  // Some browsers use the wrong event properties to signal cmd/ctrl on OS X
  var flipCtrlCmd = mac && (qtwebkit || opera && (opera_version == null || opera_version < 12.11));
  var captureMiddleClick = gecko || (ie && !ie_lt9);

  // Optimize some code when these features are not used
  var sawReadOnlySpans = false, sawCollapsedSpans = false;

  // CONSTRUCTOR

  function CodeMirror(place, options) {
    if (!(this instanceof CodeMirror)) return new CodeMirror(place, options);

    this.options = options = options || {};
    // Determine effective options based on given values and defaults.
    for (var opt in defaults) if (!options.hasOwnProperty(opt) && defaults.hasOwnProperty(opt))
      options[opt] = defaults[opt];
    setGuttersForLineNumbers(options);

    var docStart = typeof options.value == "string" ? 0 : options.value.first;
    var display = this.display = makeDisplay(place, docStart);
    display.wrapper.CodeMirror = this;
    updateGutters(this);
    if (options.autofocus && !mobile) focusInput(this);

    this.state = {keyMaps: [],
                  overlays: [],
                  modeGen: 0,
                  overwrite: false, focused: false,
                  suppressEdits: false, pasteIncoming: false,
                  draggingText: false,
                  highlight: new Delayed()};

    themeChanged(this);
    if (options.lineWrapping)
      this.display.wrapper.className += " CodeMirror-wrap";

    var doc = options.value;
    if (typeof doc == "string") doc = new Doc(options.value, options.mode);
    operation(this, attachDoc)(this, doc);

    // Override magic textarea content restore that IE sometimes does
    // on our hidden textarea on reload
    if (ie) setTimeout(bind(resetInput, this, true), 20);

    registerEventHandlers(this);
    // IE throws unspecified error in certain cases, when
    // trying to access activeElement before onload
    var hasFocus; try { hasFocus = (document.activeElement == display.input); } catch(e) { }
    if (hasFocus || (options.autofocus && !mobile)) setTimeout(bind(onFocus, this), 20);
    else onBlur(this);

    operation(this, function() {
      for (var opt in optionHandlers)
        if (optionHandlers.propertyIsEnumerable(opt))
          optionHandlers[opt](this, options[opt], Init);
      for (var i = 0; i < initHooks.length; ++i) initHooks[i](this);
    })();
  }

  // DISPLAY CONSTRUCTOR

  function makeDisplay(place, docStart) {
    var d = {};

    var input = d.input = elt("textarea", null, null, "position: absolute; padding: 0; width: 1px; height: 1em; outline: none; font-size: 4px;");
    if (webkit) input.style.width = "1000px";
    else input.setAttribute("wrap", "off");
    // if border: 0; -- iOS fails to open keyboard (issue #1287)
    if (ios) input.style.border = "1px solid black";
    input.setAttribute("autocorrect", "off"); input.setAttribute("autocapitalize", "off");

    // Wraps and hides input textarea
    d.inputDiv = elt("div", [input], null, "overflow: hidden; position: relative; width: 3px; height: 0px;");
    // The actual fake scrollbars.
    d.scrollbarH = elt("div", [elt("div", null, null, "height: 1px")], "CodeMirror-hscrollbar");
    d.scrollbarV = elt("div", [elt("div", null, null, "width: 1px")], "CodeMirror-vscrollbar");
    d.scrollbarFiller = elt("div", null, "CodeMirror-scrollbar-filler");
    // DIVs containing the selection and the actual code
    d.lineDiv = elt("div");
    d.selectionDiv = elt("div", null, null, "position: relative; z-index: 1");
    // Blinky cursor, and element used to ensure cursor fits at the end of a line
    d.cursor = elt("div", "\u00a0", "CodeMirror-cursor");
    // Secondary cursor, shown when on a 'jump' in bi-directional text
    d.otherCursor = elt("div", "\u00a0", "CodeMirror-cursor CodeMirror-secondarycursor");
    // Used to measure text size
    d.measure = elt("div", null, "CodeMirror-measure");
    // Wraps everything that needs to exist inside the vertically-padded coordinate system
    d.lineSpace = elt("div", [d.measure, d.selectionDiv, d.lineDiv, d.cursor, d.otherCursor],
                         null, "position: relative; outline: none");
    // Moved around its parent to cover visible view
    d.mover = elt("div", [elt("div", [d.lineSpace], "CodeMirror-lines")], null, "position: relative");
    // Set to the height of the text, causes scrolling
    d.sizer = elt("div", [d.mover], "CodeMirror-sizer");
    // D is needed because behavior of elts with overflow: auto and padding is inconsistent across browsers
    d.heightForcer = elt("div", null, null, "position: absolute; height: " + scrollerCutOff + "px; width: 1px;");
    // Will contain the gutters, if any
    d.gutters = elt("div", null, "CodeMirror-gutters");
    d.lineGutter = null;
    // Helper element to properly size the gutter backgrounds
    var scrollerInner = elt("div", [d.sizer, d.heightForcer, d.gutters], null, "position: relative; min-height: 100%");
    // Provides scrolling
    d.scroller = elt("div", [scrollerInner], "CodeMirror-scroll");
    d.scroller.setAttribute("tabIndex", "-1");
    // The element in which the editor lives.
    d.wrapper = elt("div", [d.inputDiv, d.scrollbarH, d.scrollbarV,
                            d.scrollbarFiller, d.scroller], "CodeMirror");
    // Work around IE7 z-index bug
    if (ie_lt8) { d.gutters.style.zIndex = -1; d.scroller.style.paddingRight = 0; }
    if (place.appendChild) place.appendChild(d.wrapper); else place(d.wrapper);

    // Needed to hide big blue blinking cursor on Mobile Safari
    if (ios) input.style.width = "0px";
    if (!webkit) d.scroller.draggable = true;
    // Needed to handle Tab key in KHTML
    if (khtml) { d.inputDiv.style.height = "1px"; d.inputDiv.style.position = "absolute"; }
    // Need to set a minimum width to see the scrollbar on IE7 (but must not set it on IE8).
    else if (ie_lt8) d.scrollbarH.style.minWidth = d.scrollbarV.style.minWidth = "18px";

    // Current visible range (may be bigger than the view window).
    d.viewOffset = d.lastSizeC = 0;
    d.showingFrom = d.showingTo = docStart;

    // Used to only resize the line number gutter when necessary (when
    // the amount of lines crosses a boundary that makes its width change)
    d.lineNumWidth = d.lineNumInnerWidth = d.lineNumChars = null;
    // See readInput and resetInput
    d.prevInput = "";
    // Set to true when a non-horizontal-scrolling widget is added. As
    // an optimization, widget aligning is skipped when d is false.
    d.alignWidgets = false;
    // Flag that indicates whether we currently expect input to appear
    // (after some event like 'keypress' or 'input') and are polling
    // intensively.
    d.pollingFast = false;
    // Self-resetting timeout for the poller
    d.poll = new Delayed();

    d.cachedCharWidth = d.cachedTextHeight = null;
    d.measureLineCache = [];
    d.measureLineCachePos = 0;

    // Tracks when resetInput has punted to just putting a short
    // string instead of the (large) selection.
    d.inaccurateSelection = false;

    // Tracks the maximum line length so that the horizontal scrollbar
    // can be kept static when scrolling.
    d.maxLine = null;
    d.maxLineLength = 0;
    d.maxLineChanged = false;

    // Used for measuring wheel scrolling granularity
    d.wheelDX = d.wheelDY = d.wheelStartX = d.wheelStartY = null;

    return d;
  }

  // STATE UPDATES

  // Used to get the editor into a consistent state again when options change.

  function loadMode(cm) {
    cm.doc.mode = CodeMirror.getMode(cm.options, cm.doc.modeOption);
    cm.doc.iter(function(line) {
      if (line.stateAfter) line.stateAfter = null;
      if (line.styles) line.styles = null;
    });
    cm.doc.frontier = cm.doc.first;
    startWorker(cm, 100);
    cm.state.modeGen++;
    if (cm.curOp) regChange(cm);
  }

  function wrappingChanged(cm) {
    if (cm.options.lineWrapping) {
      cm.display.wrapper.className += " CodeMirror-wrap";
      cm.display.sizer.style.minWidth = "";
    } else {
      cm.display.wrapper.className = cm.display.wrapper.className.replace(" CodeMirror-wrap", "");
      computeMaxLength(cm);
    }
    estimateLineHeights(cm);
    regChange(cm);
    clearCaches(cm);
    setTimeout(function(){updateScrollbars(cm.display, cm.doc.height);}, 100);
  }

  function estimateHeight(cm) {
    var th = textHeight(cm.display), wrapping = cm.options.lineWrapping;
    var perLine = wrapping && Math.max(5, cm.display.scroller.clientWidth / charWidth(cm.display) - 3);
    return function(line) {
      if (lineIsHidden(cm.doc, line))
        return 0;
      else if (wrapping)
        return (Math.ceil(line.text.length / perLine) || 1) * th;
      else
        return th;
    };
  }

  function estimateLineHeights(cm) {
    var doc = cm.doc, est = estimateHeight(cm);
    doc.iter(function(line) {
      var estHeight = est(line);
      if (estHeight != line.height) updateLineHeight(line, estHeight);
    });
  }

  function keyMapChanged(cm) {
    var style = keyMap[cm.options.keyMap].style;
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-keymap-\S+/g, "") +
      (style ? " cm-keymap-" + style : "");
  }

  function themeChanged(cm) {
    cm.display.wrapper.className = cm.display.wrapper.className.replace(/\s*cm-s-\S+/g, "") +
      cm.options.theme.replace(/(^|\s)\s*/g, " cm-s-");
    clearCaches(cm);
  }

  function guttersChanged(cm) {
    updateGutters(cm);
    regChange(cm);
  }

  function updateGutters(cm) {
    var gutters = cm.display.gutters, specs = cm.options.gutters;
    removeChildren(gutters);
    for (var i = 0; i < specs.length; ++i) {
      var gutterClass = specs[i];
      var gElt = gutters.appendChild(elt("div", null, "CodeMirror-gutter " + gutterClass));
      if (gutterClass == "CodeMirror-linenumbers") {
        cm.display.lineGutter = gElt;
        gElt.style.width = (cm.display.lineNumWidth || 1) + "px";
      }
    }
    gutters.style.display = i ? "" : "none";
  }

  function lineLength(doc, line) {
    if (line.height == 0) return 0;
    var len = line.text.length, merged, cur = line;
    while (merged = collapsedSpanAtStart(cur)) {
      var found = merged.find();
      cur = getLine(doc, found.from.line);
      len += found.from.ch - found.to.ch;
    }
    cur = line;
    while (merged = collapsedSpanAtEnd(cur)) {
      var found = merged.find();
      len -= cur.text.length - found.from.ch;
      cur = getLine(doc, found.to.line);
      len += cur.text.length - found.to.ch;
    }
    return len;
  }

  function computeMaxLength(cm) {
    var d = cm.display, doc = cm.doc;
    d.maxLine = getLine(doc, doc.first);
    d.maxLineLength = lineLength(doc, d.maxLine);
    d.maxLineChanged = true;
    doc.iter(function(line) {
      var len = lineLength(doc, line);
      if (len > d.maxLineLength) {
        d.maxLineLength = len;
        d.maxLine = line;
      }
    });
  }

  // Make sure the gutters options contains the element
  // "CodeMirror-linenumbers" when the lineNumbers option is true.
  function setGuttersForLineNumbers(options) {
    var found = false;
    for (var i = 0; i < options.gutters.length; ++i) {
      if (options.gutters[i] == "CodeMirror-linenumbers") {
        if (options.lineNumbers) found = true;
        else options.gutters.splice(i--, 1);
      }
    }
    if (!found && options.lineNumbers)
      options.gutters.push("CodeMirror-linenumbers");
  }

  // SCROLLBARS

  // Re-synchronize the fake scrollbars with the actual size of the
  // content. Optionally force a scrollTop.
  function updateScrollbars(d /* display */, docHeight) {
    var totalHeight = docHeight + paddingVert(d);
    d.sizer.style.minHeight = d.heightForcer.style.top = totalHeight + "px";
    var scrollHeight = Math.max(totalHeight, d.scroller.scrollHeight);
    var needsH = d.scroller.scrollWidth > d.scroller.clientWidth;
    var needsV = scrollHeight > d.scroller.clientHeight;
    if (needsV) {
      d.scrollbarV.style.display = "block";
      d.scrollbarV.style.bottom = needsH ? scrollbarWidth(d.measure) + "px" : "0";
      d.scrollbarV.firstChild.style.height =
        (scrollHeight - d.scroller.clientHeight + d.scrollbarV.clientHeight) + "px";
    } else d.scrollbarV.style.display = "";
    if (needsH) {
      d.scrollbarH.style.display = "block";
      d.scrollbarH.style.right = needsV ? scrollbarWidth(d.measure) + "px" : "0";
      d.scrollbarH.firstChild.style.width =
        (d.scroller.scrollWidth - d.scroller.clientWidth + d.scrollbarH.clientWidth) + "px";
    } else d.scrollbarH.style.display = "";
    if (needsH && needsV) {
      d.scrollbarFiller.style.display = "block";
      d.scrollbarFiller.style.height = d.scrollbarFiller.style.width = scrollbarWidth(d.measure) + "px";
    } else d.scrollbarFiller.style.display = "";

    if (mac_geLion && scrollbarWidth(d.measure) === 0)
      d.scrollbarV.style.minWidth = d.scrollbarH.style.minHeight = mac_geMountainLion ? "18px" : "12px";
  }

  function visibleLines(display, doc, viewPort) {
    var top = display.scroller.scrollTop, height = display.wrapper.clientHeight;
    if (typeof viewPort == "number") top = viewPort;
    else if (viewPort) {top = viewPort.top; height = viewPort.bottom - viewPort.top;}
    top = Math.floor(top - paddingTop(display));
    var bottom = Math.ceil(top + height);
    return {from: lineAtHeight(doc, top), to: lineAtHeight(doc, bottom)};
  }

  // LINE NUMBERS

  function alignHorizontally(cm) {
    var display = cm.display;
    if (!display.alignWidgets && (!display.gutters.firstChild || !cm.options.fixedGutter)) return;
    var comp = compensateForHScroll(display) - display.scroller.scrollLeft + cm.doc.scrollLeft;
    var gutterW = display.gutters.offsetWidth, l = comp + "px";
    for (var n = display.lineDiv.firstChild; n; n = n.nextSibling) if (n.alignable) {
      for (var i = 0, a = n.alignable; i < a.length; ++i) a[i].style.left = l;
    }
    if (cm.options.fixedGutter)
      display.gutters.style.left = (comp + gutterW) + "px";
  }

  function maybeUpdateLineNumberWidth(cm) {
    if (!cm.options.lineNumbers) return false;
    var doc = cm.doc, last = lineNumberFor(cm.options, doc.first + doc.size - 1), display = cm.display;
    if (last.length != display.lineNumChars) {
      var test = display.measure.appendChild(elt("div", [elt("div", last)],
                                                 "CodeMirror-linenumber CodeMirror-gutter-elt"));
      var innerW = test.firstChild.offsetWidth, padding = test.offsetWidth - innerW;
      display.lineGutter.style.width = "";
      display.lineNumInnerWidth = Math.max(innerW, display.lineGutter.offsetWidth - padding);
      display.lineNumWidth = display.lineNumInnerWidth + padding;
      display.lineNumChars = display.lineNumInnerWidth ? last.length : -1;
      display.lineGutter.style.width = display.lineNumWidth + "px";
      return true;
    }
    return false;
  }

  function lineNumberFor(options, i) {
    return String(options.lineNumberFormatter(i + options.firstLineNumber));
  }
  function compensateForHScroll(display) {
    return getRect(display.scroller).left - getRect(display.sizer).left;
  }

  // DISPLAY DRAWING

  function updateDisplay(cm, changes, viewPort) {
    var oldFrom = cm.display.showingFrom, oldTo = cm.display.showingTo, updated;
    var visible = visibleLines(cm.display, cm.doc, viewPort);
    for (;;) {
      if (updateDisplayInner(cm, changes, visible)) {
        updated = true;
        signalLater(cm, "update", cm);
        if (cm.display.showingFrom != oldFrom || cm.display.showingTo != oldTo)
          signalLater(cm, "viewportChange", cm, cm.display.showingFrom, cm.display.showingTo);
      } else break;
      updateSelection(cm);
      updateScrollbars(cm.display, cm.doc.height);

      // Clip forced viewport to actual scrollable area
      if (viewPort)
        viewPort = Math.min(cm.display.scroller.scrollHeight - cm.display.scroller.clientHeight,
                            typeof viewPort == "number" ? viewPort : viewPort.top);
      visible = visibleLines(cm.display, cm.doc, viewPort);
      if (visible.from >= cm.display.showingFrom && visible.to <= cm.display.showingTo)
        break;
      changes = [];
    }

    return updated;
  }

  // Uses a set of changes plus the current scroll position to
  // determine which DOM updates have to be made, and makes the
  // updates.
  function updateDisplayInner(cm, changes, visible) {
    var display = cm.display, doc = cm.doc;
    if (!display.wrapper.clientWidth) {
      display.showingFrom = display.showingTo = doc.first;
      display.viewOffset = 0;
      return;
    }

    // Bail out if the visible area is already rendered and nothing changed.
    if (changes.length == 0 &&
        visible.from > display.showingFrom && visible.to < display.showingTo)
      return;

    if (maybeUpdateLineNumberWidth(cm))
      changes = [{from: doc.first, to: doc.first + doc.size}];
    var gutterW = display.sizer.style.marginLeft = display.gutters.offsetWidth + "px";
    display.scrollbarH.style.left = cm.options.fixedGutter ? gutterW : "0";

    // Used to determine which lines need their line numbers updated
    var positionsChangedFrom = Infinity;
    if (cm.options.lineNumbers)
      for (var i = 0; i < changes.length; ++i)
        if (changes[i].diff) { positionsChangedFrom = changes[i].from; break; }

    var end = doc.first + doc.size;
    var from = Math.max(visible.from - cm.options.viewportMargin, doc.first);
    var to = Math.min(end, visible.to + cm.options.viewportMargin);
    if (display.showingFrom < from && from - display.showingFrom < 20) from = Math.max(doc.first, display.showingFrom);
    if (display.showingTo > to && display.showingTo - to < 20) to = Math.min(end, display.showingTo);
    if (sawCollapsedSpans) {
      from = lineNo(visualLine(doc, getLine(doc, from)));
      while (to < end && lineIsHidden(doc, getLine(doc, to))) ++to;
    }

    // Create a range of theoretically intact lines, and punch holes
    // in that using the change info.
    var intact = [{from: Math.max(display.showingFrom, doc.first),
                   to: Math.min(display.showingTo, end)}];
    if (intact[0].from >= intact[0].to) intact = [];
    else intact = computeIntact(intact, changes);
    // When merged lines are present, we might have to reduce the
    // intact ranges because changes in continued fragments of the
    // intact lines do require the lines to be redrawn.
    if (sawCollapsedSpans)
      for (var i = 0; i < intact.length; ++i) {
        var range = intact[i], merged;
        while (merged = collapsedSpanAtEnd(getLine(doc, range.to - 1))) {
          var newTo = merged.find().from.line;
          if (newTo > range.from) range.to = newTo;
          else { intact.splice(i--, 1); break; }
        }
      }

    // Clip off the parts that won't be visible
    var intactLines = 0;
    for (var i = 0; i < intact.length; ++i) {
      var range = intact[i];
      if (range.from < from) range.from = from;
      if (range.to > to) range.to = to;
      if (range.from >= range.to) intact.splice(i--, 1);
      else intactLines += range.to - range.from;
    }
    if (intactLines == to - from && from == display.showingFrom && to == display.showingTo) {
      updateViewOffset(cm);
      return;
    }
    intact.sort(function(a, b) {return a.from - b.from;});

    // Avoid crashing on IE's "unspecified error" when in iframes
    try {
      var focused = document.activeElement;
    } catch(e) {}
    if (intactLines < (to - from) * .7) display.lineDiv.style.display = "none";
    patchDisplay(cm, from, to, intact, positionsChangedFrom);
    display.lineDiv.style.display = "";
    if (focused && document.activeElement != focused && focused.offsetHeight) focused.focus();

    var different = from != display.showingFrom || to != display.showingTo ||
      display.lastSizeC != display.wrapper.clientHeight;
    // This is just a bogus formula that detects when the editor is
    // resized or the font size changes.
    if (different) display.lastSizeC = display.wrapper.clientHeight;
    display.showingFrom = from; display.showingTo = to;
    startWorker(cm, 100);

    var prevBottom = display.lineDiv.offsetTop;
    for (var node = display.lineDiv.firstChild, height; node; node = node.nextSibling) if (node.lineObj) {
      if (ie_lt8) {
        var bot = node.offsetTop + node.offsetHeight;
        height = bot - prevBottom;
        prevBottom = bot;
      } else {
        var box = getRect(node);
        height = box.bottom - box.top;
      }
      var diff = node.lineObj.height - height;
      if (height < 2) height = textHeight(display);
      if (diff > .001 || diff < -.001) {
        updateLineHeight(node.lineObj, height);
        var widgets = node.lineObj.widgets;
        if (widgets) for (var i = 0; i < widgets.length; ++i)
          widgets[i].height = widgets[i].node.offsetHeight;
      }
    }
    updateViewOffset(cm);

    return true;
  }

  function updateViewOffset(cm) {
    var off = cm.display.viewOffset = heightAtLine(cm, getLine(cm.doc, cm.display.showingFrom));
    // Position the mover div to align with the current virtual scroll position
    cm.display.mover.style.top = off + "px";
  }

  function computeIntact(intact, changes) {
    for (var i = 0, l = changes.length || 0; i < l; ++i) {
      var change = changes[i], intact2 = [], diff = change.diff || 0;
      for (var j = 0, l2 = intact.length; j < l2; ++j) {
        var range = intact[j];
        if (change.to <= range.from && change.diff) {
          intact2.push({from: range.from + diff, to: range.to + diff});
        } else if (change.to <= range.from || change.from >= range.to) {
          intact2.push(range);
        } else {
          if (change.from > range.from)
            intact2.push({from: range.from, to: change.from});
          if (change.to < range.to)
            intact2.push({from: change.to + diff, to: range.to + diff});
        }
      }
      intact = intact2;
    }
    return intact;
  }

  function getDimensions(cm) {
    var d = cm.display, left = {}, width = {};
    for (var n = d.gutters.firstChild, i = 0; n; n = n.nextSibling, ++i) {
      left[cm.options.gutters[i]] = n.offsetLeft;
      width[cm.options.gutters[i]] = n.offsetWidth;
    }
    return {fixedPos: compensateForHScroll(d),
            gutterTotalWidth: d.gutters.offsetWidth,
            gutterLeft: left,
            gutterWidth: width,
            wrapperWidth: d.wrapper.clientWidth};
  }

  function patchDisplay(cm, from, to, intact, updateNumbersFrom) {
    var dims = getDimensions(cm);
    var display = cm.display, lineNumbers = cm.options.lineNumbers;
    if (!intact.length && (!webkit || !cm.display.currentWheelTarget))
      removeChildren(display.lineDiv);
    var container = display.lineDiv, cur = container.firstChild;

    function rm(node) {
      var next = node.nextSibling;
      if (webkit && mac && cm.display.currentWheelTarget == node) {
        node.style.display = "none";
        node.lineObj = null;
      } else {
        node.parentNode.removeChild(node);
      }
      return next;
    }

    var nextIntact = intact.shift(), lineN = from;
    cm.doc.iter(from, to, function(line) {
      if (nextIntact && nextIntact.to == lineN) nextIntact = intact.shift();
      if (lineIsHidden(cm.doc, line)) {
        if (line.height != 0) updateLineHeight(line, 0);
        if (line.widgets && cur.previousSibling) for (var i = 0; i < line.widgets.length; ++i)
          if (line.widgets[i].showIfHidden) {
            var prev = cur.previousSibling;
            if (/pre/i.test(prev.nodeName)) {
              var wrap = elt("div", null, null, "position: relative");
              prev.parentNode.replaceChild(wrap, prev);
              wrap.appendChild(prev);
              prev = wrap;
            }
            var wnode = prev.appendChild(elt("div", [line.widgets[i].node], "CodeMirror-linewidget"));
            positionLineWidget(line.widgets[i], wnode, prev, dims);
          }
      } else if (nextIntact && nextIntact.from <= lineN && nextIntact.to > lineN) {
        // This line is intact. Skip to the actual node. Update its
        // line number if needed.
        while (cur.lineObj != line) cur = rm(cur);
        if (lineNumbers && updateNumbersFrom <= lineN && cur.lineNumber)
          setTextContent(cur.lineNumber, lineNumberFor(cm.options, lineN));
        cur = cur.nextSibling;
      } else {
        // For lines with widgets, make an attempt to find and reuse
        // the existing element, so that widgets aren't needlessly
        // removed and re-inserted into the dom
        if (line.widgets) for (var j = 0, search = cur, reuse; search && j < 20; ++j, search = search.nextSibling)
          if (search.lineObj == line && /div/i.test(search.nodeName)) { reuse = search; break; }
        // This line needs to be generated.
        var lineNode = buildLineElement(cm, line, lineN, dims, reuse);
        if (lineNode != reuse) {
          container.insertBefore(lineNode, cur);
        } else {
          while (cur != reuse) cur = rm(cur);
          cur = cur.nextSibling;
        }

        lineNode.lineObj = line;
      }
      ++lineN;
    });
    while (cur) cur = rm(cur);
  }

  function buildLineElement(cm, line, lineNo, dims, reuse) {
    var lineElement = lineContent(cm, line);
    var markers = line.gutterMarkers, display = cm.display, wrap;

    if (!cm.options.lineNumbers && !markers && !line.bgClass && !line.wrapClass && !line.widgets)
      return lineElement;

    // Lines with gutter elements, widgets or a background class need
    // to be wrapped again, and have the extra elements added to the
    // wrapper div

    if (reuse) {
      reuse.alignable = null;
      var isOk = true, widgetsSeen = 0;
      for (var n = reuse.firstChild, next; n; n = next) {
        next = n.nextSibling;
        if (!/\bCodeMirror-linewidget\b/.test(n.className)) {
          reuse.removeChild(n);
        } else {
          for (var i = 0, first = true; i < line.widgets.length; ++i) {
            var widget = line.widgets[i], isFirst = false;
            if (!widget.above) { isFirst = first; first = false; }
            if (widget.node == n.firstChild) {
              positionLineWidget(widget, n, reuse, dims);
              ++widgetsSeen;
              if (isFirst) reuse.insertBefore(lineElement, n);
              break;
            }
          }
          if (i == line.widgets.length) { isOk = false; break; }
        }
      }
      if (isOk && widgetsSeen == line.widgets.length) {
        wrap = reuse;
        reuse.className = line.wrapClass || "";
      }
    }
    if (!wrap) {
      wrap = elt("div", null, line.wrapClass, "position: relative");
      wrap.appendChild(lineElement);
    }
    // Kludge to make sure the styled element lies behind the selection (by z-index)
    if (line.bgClass)
      wrap.insertBefore(elt("div", null, line.bgClass + " CodeMirror-linebackground"), wrap.firstChild);
    if (cm.options.lineNumbers || markers) {
      var gutterWrap = wrap.insertBefore(elt("div", null, null, "position: absolute; left: " +
                                             (cm.options.fixedGutter ? dims.fixedPos : -dims.gutterTotalWidth) + "px"),
                                         wrap.firstChild);
      if (cm.options.fixedGutter) (wrap.alignable || (wrap.alignable = [])).push(gutterWrap);
      if (cm.options.lineNumbers && (!markers || !markers["CodeMirror-linenumbers"]))
        wrap.lineNumber = gutterWrap.appendChild(
          elt("div", lineNumberFor(cm.options, lineNo),
              "CodeMirror-linenumber CodeMirror-gutter-elt",
              "left: " + dims.gutterLeft["CodeMirror-linenumbers"] + "px; width: "
              + display.lineNumInnerWidth + "px"));
      if (markers)
        for (var k = 0; k < cm.options.gutters.length; ++k) {
          var id = cm.options.gutters[k], found = markers.hasOwnProperty(id) && markers[id];
          if (found)
            gutterWrap.appendChild(elt("div", [found], "CodeMirror-gutter-elt", "left: " +
                                       dims.gutterLeft[id] + "px; width: " + dims.gutterWidth[id] + "px"));
        }
    }
    if (ie_lt8) wrap.style.zIndex = 2;
    if (line.widgets && wrap != reuse) for (var i = 0, ws = line.widgets; i < ws.length; ++i) {
      var widget = ws[i], node = elt("div", [widget.node], "CodeMirror-linewidget");
      positionLineWidget(widget, node, wrap, dims);
      if (widget.above)
        wrap.insertBefore(node, cm.options.lineNumbers && line.height != 0 ? gutterWrap : lineElement);
      else
        wrap.appendChild(node);
      signalLater(widget, "redraw");
    }
    return wrap;
  }

  function positionLineWidget(widget, node, wrap, dims) {
    if (widget.noHScroll) {
      (wrap.alignable || (wrap.alignable = [])).push(node);
      var width = dims.wrapperWidth;
      node.style.left = dims.fixedPos + "px";
      if (!widget.coverGutter) {
        width -= dims.gutterTotalWidth;
        node.style.paddingLeft = dims.gutterTotalWidth + "px";
      }
      node.style.width = width + "px";
    }
    if (widget.coverGutter) {
      node.style.zIndex = 5;
      node.style.position = "relative";
      if (!widget.noHScroll) node.style.marginLeft = -dims.gutterTotalWidth + "px";
    }
  }

  // SELECTION / CURSOR

  function updateSelection(cm) {
    var display = cm.display;
    var collapsed = posEq(cm.doc.sel.from, cm.doc.sel.to);
    if (collapsed || cm.options.showCursorWhenSelecting)
      updateSelectionCursor(cm);
    else
      display.cursor.style.display = display.otherCursor.style.display = "none";
    if (!collapsed)
      updateSelectionRange(cm);
    else
      display.selectionDiv.style.display = "none";

    // Move the hidden textarea near the cursor to prevent scrolling artifacts
    if (cm.options.moveInputWithCursor) {
      var headPos = cursorCoords(cm, cm.doc.sel.head, "div");
      var wrapOff = getRect(display.wrapper), lineOff = getRect(display.lineDiv);
      display.inputDiv.style.top = Math.max(0, Math.min(display.wrapper.clientHeight - 10,
                                                        headPos.top + lineOff.top - wrapOff.top)) + "px";
      display.inputDiv.style.left = Math.max(0, Math.min(display.wrapper.clientWidth - 10,
                                                         headPos.left + lineOff.left - wrapOff.left)) + "px";
    }
  }

  // No selection, plain cursor
  function updateSelectionCursor(cm) {
    var display = cm.display, pos = cursorCoords(cm, cm.doc.sel.head, "div");
    display.cursor.style.left = pos.left + "px";
    display.cursor.style.top = pos.top + "px";
    display.cursor.style.height = Math.max(0, pos.bottom - pos.top) * cm.options.cursorHeight + "px";
    display.cursor.style.display = "";

    if (pos.other) {
      display.otherCursor.style.display = "";
      display.otherCursor.style.left = pos.other.left + "px";
      display.otherCursor.style.top = pos.other.top + "px";
      display.otherCursor.style.height = (pos.other.bottom - pos.other.top) * .85 + "px";
    } else { display.otherCursor.style.display = "none"; }
  }

  // Highlight selection
  function updateSelectionRange(cm) {
    var display = cm.display, doc = cm.doc, sel = cm.doc.sel;
    var fragment = document.createDocumentFragment();
    var clientWidth = display.lineSpace.offsetWidth, pl = paddingLeft(cm.display);

    function add(left, top, width, bottom) {
      if (top < 0) top = 0;
      fragment.appendChild(elt("div", null, "CodeMirror-selected", "position: absolute; left: " + left +
                               "px; top: " + top + "px; width: " + (width == null ? clientWidth - left : width) +
                               "px; height: " + (bottom - top) + "px"));
    }

    function drawForLine(line, fromArg, toArg, retTop) {
      var lineObj = getLine(doc, line);
      var lineLen = lineObj.text.length, rVal = retTop ? Infinity : -Infinity;
      function coords(ch) {
        return charCoords(cm, Pos(line, ch), "div", lineObj);
      }

      iterateBidiSections(getOrder(lineObj), fromArg || 0, toArg == null ? lineLen : toArg, function(from, to, dir) {
        var leftPos = coords(from), rightPos, left, right;
        if (from == to) {
          rightPos = leftPos;
          left = right = leftPos.left;
        } else {
          rightPos = coords(to - 1);
          if (dir == "rtl") { var tmp = leftPos; leftPos = rightPos; rightPos = tmp; }
          left = leftPos.left;
          right = rightPos.right;
        }
        if (rightPos.top - leftPos.top > 3) { // Different lines, draw top part
          add(left, leftPos.top, null, leftPos.bottom);
          left = pl;
          if (leftPos.bottom < rightPos.top) add(left, leftPos.bottom, null, rightPos.top);
        }
        if (toArg == null && to == lineLen) right = clientWidth;
        if (fromArg == null && from == 0) left = pl;
        rVal = retTop ? Math.min(rightPos.top, rVal) : Math.max(rightPos.bottom, rVal);
        if (left < pl + 1) left = pl;
        add(left, rightPos.top, right - left, rightPos.bottom);
      });
      return rVal;
    }

    if (sel.from.line == sel.to.line) {
      drawForLine(sel.from.line, sel.from.ch, sel.to.ch);
    } else {
      var fromObj = getLine(doc, sel.from.line);
      var cur = fromObj, merged, path = [sel.from.line, sel.from.ch], singleLine;
      while (merged = collapsedSpanAtEnd(cur)) {
        var found = merged.find();
        path.push(found.from.ch, found.to.line, found.to.ch);
        if (found.to.line == sel.to.line) {
          path.push(sel.to.ch);
          singleLine = true;
          break;
        }
        cur = getLine(doc, found.to.line);
      }

      // This is a single, merged line
      if (singleLine) {
        for (var i = 0; i < path.length; i += 3)
          drawForLine(path[i], path[i+1], path[i+2]);
      } else {
        var middleTop, middleBot, toObj = getLine(doc, sel.to.line);
        if (sel.from.ch)
          // Draw the first line of selection.
          middleTop = drawForLine(sel.from.line, sel.from.ch, null, false);
        else
          // Simply include it in the middle block.
          middleTop = heightAtLine(cm, fromObj) - display.viewOffset;

        if (!sel.to.ch)
          middleBot = heightAtLine(cm, toObj) - display.viewOffset;
        else
          middleBot = drawForLine(sel.to.line, collapsedSpanAtStart(toObj) ? null : 0, sel.to.ch, true);

        if (middleTop < middleBot) add(pl, middleTop, null, middleBot);
      }
    }

    removeChildrenAndAdd(display.selectionDiv, fragment);
    display.selectionDiv.style.display = "";
  }

  // Cursor-blinking
  function restartBlink(cm) {
    if (!cm.state.focused) return;
    var display = cm.display;
    clearInterval(display.blinker);
    var on = true;
    display.cursor.style.visibility = display.otherCursor.style.visibility = "";
    display.blinker = setInterval(function() {
      display.cursor.style.visibility = display.otherCursor.style.visibility = (on = !on) ? "" : "hidden";
    }, cm.options.cursorBlinkRate);
  }

  // HIGHLIGHT WORKER

  function startWorker(cm, time) {
    if (cm.doc.mode.startState && cm.doc.frontier < cm.display.showingTo)
      cm.state.highlight.set(time, bind(highlightWorker, cm));
  }

  function highlightWorker(cm) {
    var doc = cm.doc;
    if (doc.frontier < doc.first) doc.frontier = doc.first;
    if (doc.frontier >= cm.display.showingTo) return;
    var end = +new Date + cm.options.workTime;
    var state = copyState(doc.mode, getStateBefore(cm, doc.frontier));
    var changed = [], prevChange;
    doc.iter(doc.frontier, Math.min(doc.first + doc.size, cm.display.showingTo + 500), function(line) {
      if (doc.frontier >= cm.display.showingFrom) { // Visible
        var oldStyles = line.styles;
        line.styles = highlightLine(cm, line, state);
        var ischange = !oldStyles || oldStyles.length != line.styles.length;
        for (var i = 0; !ischange && i < oldStyles.length; ++i) ischange = oldStyles[i] != line.styles[i];
        if (ischange) {
          if (prevChange && prevChange.end == doc.frontier) prevChange.end++;
          else changed.push(prevChange = {start: doc.frontier, end: doc.frontier + 1});
        }
        line.stateAfter = copyState(doc.mode, state);
      } else {
        processLine(cm, line, state);
        line.stateAfter = doc.frontier % 5 == 0 ? copyState(doc.mode, state) : null;
      }
      ++doc.frontier;
      if (+new Date > end) {
        startWorker(cm, cm.options.workDelay);
        return true;
      }
    });
    if (changed.length)
      operation(cm, function() {
        for (var i = 0; i < changed.length; ++i)
          regChange(this, changed[i].start, changed[i].end);
      })();
  }

  // Finds the line to start with when starting a parse. Tries to
  // find a line with a stateAfter, so that it can start with a
  // valid state. If that fails, it returns the line with the
  // smallest indentation, which tends to need the least context to
  // parse correctly.
  function findStartLine(cm, n) {
    var minindent, minline, doc = cm.doc;
    for (var search = n, lim = n - 100; search > lim; --search) {
      if (search <= doc.first) return doc.first;
      var line = getLine(doc, search - 1);
      if (line.stateAfter) return search;
      var indented = countColumn(line.text, null, cm.options.tabSize);
      if (minline == null || minindent > indented) {
        minline = search - 1;
        minindent = indented;
      }
    }
    return minline;
  }

  function getStateBefore(cm, n) {
    var doc = cm.doc, display = cm.display;
      if (!doc.mode.startState) return true;
    var pos = findStartLine(cm, n), state = pos > doc.first && getLine(doc, pos-1).stateAfter;
    if (!state) state = startState(doc.mode);
    else state = copyState(doc.mode, state);
    doc.iter(pos, n, function(line) {
      processLine(cm, line, state);
      var save = pos == n - 1 || pos % 5 == 0 || pos >= display.showingFrom && pos < display.showingTo;
      line.stateAfter = save ? copyState(doc.mode, state) : null;
      ++pos;
    });
    return state;
  }

  // POSITION MEASUREMENT

  function paddingTop(display) {return display.lineSpace.offsetTop;}
  function paddingVert(display) {return display.mover.offsetHeight - display.lineSpace.offsetHeight;}
  function paddingLeft(display) {
    var e = removeChildrenAndAdd(display.measure, elt("pre", null, null, "text-align: left")).appendChild(elt("span", "x"));
    return e.offsetLeft;
  }

  function measureChar(cm, line, ch, data) {
    var dir = -1;
    data = data || measureLine(cm, line);

    ch = parseInt(ch);

    for (var pos = ch;; pos += dir) {
      var r = data[pos];
      if (r) break;
      if (dir < 0 && pos == 0) dir = 1;
    }
    return {left: pos < ch ? r.right : r.left,
            right: pos > ch ? r.left : r.right,
            top: r.top, bottom: r.bottom};
  }

  function findCachedMeasurement(cm, line) {
    var cache = cm.display.measureLineCache;
    for (var i = 0; i < cache.length; ++i) {
      var memo = cache[i];
      if (memo.text == line.text && memo.markedSpans == line.markedSpans &&
          cm.display.scroller.clientWidth == memo.width &&
          memo.classes == line.textClass + "|" + line.bgClass + "|" + line.wrapClass)
        return memo.measure;
    }
  }

  function measureLine(cm, line) {
    // First look in the cache
    var measure = findCachedMeasurement(cm, line);
    if (!measure) {
      // Failing that, recompute and store result in cache
      measure = measureLineInner(cm, line);
      var cache = cm.display.measureLineCache;
      var memo = {text: line.text, width: cm.display.scroller.clientWidth,
                  markedSpans: line.markedSpans, measure: measure,
                  classes: line.textClass + "|" + line.bgClass + "|" + line.wrapClass};
      if (cache.length == 16) cache[++cm.display.measureLineCachePos % 16] = memo;
      else cache.push(memo);
    }
    return measure;
  }

  function measureLineInner(cm, line) {
    var display = cm.display, measure = emptyArray(line.text.length);
    var pre = lineContent(cm, line, measure);

    // IE does not cache element positions of inline elements between
    // calls to getBoundingClientRect. This makes the loop below,
    // which gathers the positions of all the characters on the line,
    // do an amount of layout work quadratic to the number of
    // characters. When line wrapping is off, we try to improve things
    // by first subdividing the line into a bunch of inline blocks, so
    // that IE can reuse most of the layout information from caches
    // for those blocks. This does interfere with line wrapping, so it
    // doesn't work when wrapping is on, but in that case the
    // situation is slightly better, since IE does cache line-wrapping
    // information and only recomputes per-line.
    if (ie && !ie_lt8 && !cm.options.lineWrapping && pre.childNodes.length > 100) {
      var fragment = document.createDocumentFragment();
      var chunk = 10, n = pre.childNodes.length;
      for (var i = 0, chunks = Math.ceil(n / chunk); i < chunks; ++i) {
        var wrap = elt("div", null, null, "display: inline-block");
        for (var j = 0; j < chunk && n; ++j) {
          wrap.appendChild(pre.firstChild);
          --n;
        }
        fragment.appendChild(wrap);
      }
      pre.appendChild(fragment);
    }

    removeChildrenAndAdd(display.measure, pre);

    var outer = getRect(display.lineDiv);
    var vranges = [], data = emptyArray(line.text.length), maxBot = pre.offsetHeight;
    // Work around an IE7/8 bug where it will sometimes have randomly
    // replaced our pre with a clone at this point.
    if (ie_lt9 && display.measure.first != pre)
      removeChildrenAndAdd(display.measure, pre);

    for (var i = 0, cur; i < measure.length; ++i) if (cur = measure[i]) {
      var size = getRect(cur);
      var top = Math.max(0, size.top - outer.top), bot = Math.min(size.bottom - outer.top, maxBot);
      for (var j = 0; j < vranges.length; j += 2) {
        var rtop = vranges[j], rbot = vranges[j+1];
        if (rtop > bot || rbot < top) continue;
        if (rtop <= top && rbot >= bot ||
            top <= rtop && bot >= rbot ||
            Math.min(bot, rbot) - Math.max(top, rtop) >= (bot - top) >> 1) {
          vranges[j] = Math.min(top, rtop);
          vranges[j+1] = Math.max(bot, rbot);
          break;
        }
      }
      if (j == vranges.length) vranges.push(top, bot);
      var right = size.right;
      if (cur.measureRight) right = getRect(cur.measureRight).left;
      data[i] = {left: size.left - outer.left, right: right - outer.left, top: j};
    }
    for (var i = 0, cur; i < data.length; ++i) if (cur = data[i]) {
      var vr = cur.top;
      cur.top = vranges[vr]; cur.bottom = vranges[vr+1];
    }

    return data;
  }

  function measureLineWidth(cm, line) {
    var hasBadSpan = false;
    if (line.markedSpans) for (var i = 0; i < line.markedSpans; ++i) {
      var sp = line.markedSpans[i];
      if (sp.collapsed && (sp.to == null || sp.to == line.text.length)) hasBadSpan = true;
    }
    var cached = !hasBadSpan && findCachedMeasurement(cm, line);
    if (cached) return measureChar(cm, line, line.text.length, cached).right;

    var pre = lineContent(cm, line);
    var end = pre.appendChild(zeroWidthElement(cm.display.measure));
    removeChildrenAndAdd(cm.display.measure, pre);
    return getRect(end).right - getRect(cm.display.lineDiv).left;
  }

  function clearCaches(cm) {
    cm.display.measureLineCache.length = cm.display.measureLineCachePos = 0;
    cm.display.cachedCharWidth = cm.display.cachedTextHeight = null;
    if (!cm.options.lineWrapping) cm.display.maxLineChanged = true;
    cm.display.lineNumChars = null;
  }

  // Context is one of "line", "div" (display.lineDiv), "local"/null (editor), or "page"
  function intoCoordSystem(cm, lineObj, rect, context) {
    if (lineObj.widgets) for (var i = 0; i < lineObj.widgets.length; ++i) if (lineObj.widgets[i].above) {
      var size = widgetHeight(lineObj.widgets[i]);
      rect.top += size; rect.bottom += size;
    }
    if (context == "line") return rect;
    if (!context) context = "local";
    var yOff = heightAtLine(cm, lineObj);
    if (context != "local") yOff -= cm.display.viewOffset;
    if (context == "page") {
      var lOff = getRect(cm.display.lineSpace);
      yOff += lOff.top + (window.pageYOffset || (document.documentElement || document.body).scrollTop);
      var xOff = lOff.left + (window.pageXOffset || (document.documentElement || document.body).scrollLeft);
      rect.left += xOff; rect.right += xOff;
    }
    rect.top += yOff; rect.bottom += yOff;
    return rect;
  }

  // Context may be "window", "page", "div", or "local"/null
  // Result is in "div" coords
  function fromCoordSystem(cm, coords, context) {
    if (context == "div") return coords;
    var left = coords.left, top = coords.top;
    if (context == "page") {
      left -= window.pageXOffset || (document.documentElement || document.body).scrollLeft;
      top -= window.pageYOffset || (document.documentElement || document.body).scrollTop;
    }
    var lineSpaceBox = getRect(cm.display.lineSpace);
    left -= lineSpaceBox.left;
    top -= lineSpaceBox.top;
    if (context == "local" || !context) {
      var editorBox = getRect(cm.display.wrapper);
      left += editorBox.left;
      top += editorBox.top;
    }
    return {left: left, top: top};
  }

  function charCoords(cm, pos, context, lineObj) {
    if (!lineObj) lineObj = getLine(cm.doc, pos.line);
    return intoCoordSystem(cm, lineObj, measureChar(cm, lineObj, pos.ch), context);
  }

  function cursorCoords(cm, pos, context, lineObj, measurement) {
    lineObj = lineObj || getLine(cm.doc, pos.line);
    if (!measurement) measurement = measureLine(cm, lineObj);
    function get(ch, right) {
      var m = measureChar(cm, lineObj, ch, measurement);
      if (right) m.left = m.right; else m.right = m.left;
      return intoCoordSystem(cm, lineObj, m, context);
    }
    var order = getOrder(lineObj), ch = pos.ch;
    if (!order) return get(ch);
    var main, other, linedir = order[0].level;
    for (var i = 0; i < order.length; ++i) {
      var part = order[i], rtl = part.level % 2, nb, here;
      if (part.from < ch && part.to > ch) return get(ch, rtl);
      var left = rtl ? part.to : part.from, right = rtl ? part.from : part.to;
      if (left == ch) {
        // IE returns bogus offsets and widths for edges where the
        // direction flips, but only for the side with the lower
        // level. So we try to use the side with the higher level.
        if (i && part.level < (nb = order[i-1]).level) here = get(nb.level % 2 ? nb.from : nb.to - 1, true);
        else here = get(rtl && part.from != part.to ? ch - 1 : ch);
        if (rtl == linedir) main = here; else other = here;
      } else if (right == ch) {
        var nb = i < order.length - 1 && order[i+1];
        if (!rtl && nb && nb.from == nb.to) continue;
        if (nb && part.level < nb.level) here = get(nb.level % 2 ? nb.to - 1 : nb.from);
        else here = get(rtl ? ch : ch - 1, true);
        if (rtl == linedir) main = here; else other = here;
      }
    }
    if (linedir && !ch) other = get(order[0].to - 1);
    if (!main) return other;
    if (other) main.other = other;
    return main;
  }

  function PosMaybeOutside(line, ch, outside) {
    var pos = new Pos(line, ch);
    if (outside) pos.outside = true;
    return pos;
  }

  // Coords must be lineSpace-local
  function coordsChar(cm, x, y) {
    var doc = cm.doc;
    y += cm.display.viewOffset;
    if (y < 0) return PosMaybeOutside(doc.first, 0, true);
    var lineNo = lineAtHeight(doc, y), last = doc.first + doc.size - 1;
    if (lineNo > last)
      return PosMaybeOutside(doc.first + doc.size - 1, getLine(doc, last).text.length, true);
    if (x < 0) x = 0;

    for (;;) {
      var lineObj = getLine(doc, lineNo);
      var found = coordsCharInner(cm, lineObj, lineNo, x, y);
      var merged = collapsedSpanAtEnd(lineObj);
      var mergedPos = merged && merged.find();
      if (merged && found.ch >= mergedPos.from.ch)
        lineNo = mergedPos.to.line;
      else
        return found;
    }
  }

  function coordsCharInner(cm, lineObj, lineNo, x, y) {
    var innerOff = y - heightAtLine(cm, lineObj);
    var wrongLine = false, adjust = 2 * cm.display.wrapper.clientWidth;
    var measurement = measureLine(cm, lineObj);

    function getX(ch) {
      var sp = cursorCoords(cm, Pos(lineNo, ch), "line",
                            lineObj, measurement);
      wrongLine = true;
      if (innerOff > sp.bottom) return sp.left - adjust;
      else if (innerOff < sp.top) return sp.left + adjust;
      else wrongLine = false;
      return sp.left;
    }

    var bidi = getOrder(lineObj), dist = lineObj.text.length;
    var from = lineLeft(lineObj), to = lineRight(lineObj);
    var fromX = getX(from), fromOutside = wrongLine, toX = getX(to), toOutside = wrongLine;

    if (x > toX) return PosMaybeOutside(lineNo, to, toOutside);
    // Do a binary search between these bounds.
    for (;;) {
      if (bidi ? to == from || to == moveVisually(lineObj, from, 1) : to - from <= 1) {
        var after = x - fromX < toX - x, ch = after ? from : to;
        while (isExtendingChar.test(lineObj.text.charAt(ch))) ++ch;
        var pos = PosMaybeOutside(lineNo, ch, after ? fromOutside : toOutside);
        pos.after = after;
        return pos;
      }
      var step = Math.ceil(dist / 2), middle = from + step;
      if (bidi) {
        middle = from;
        for (var i = 0; i < step; ++i) middle = moveVisually(lineObj, middle, 1);
      }
      var middleX = getX(middle);
      if (middleX > x) {to = middle; toX = middleX; if (toOutside = wrongLine) toX += 1000; dist = step;}
      else {from = middle; fromX = middleX; fromOutside = wrongLine; dist -= step;}
    }
  }

  var measureText;
  function textHeight(display) {
    if (display.cachedTextHeight != null) return display.cachedTextHeight;
    if (measureText == null) {
      measureText = elt("pre");
      // Measure a bunch of lines, for browsers that compute
      // fractional heights.
      for (var i = 0; i < 49; ++i) {
        measureText.appendChild(document.createTextNode("x"));
        measureText.appendChild(elt("br"));
      }
      measureText.appendChild(document.createTextNode("x"));
    }
    removeChildrenAndAdd(display.measure, measureText);
    var height = measureText.offsetHeight / 50;
    if (height > 3) display.cachedTextHeight = height;
    removeChildren(display.measure);
    return height || 1;
  }

  function charWidth(display) {
    if (display.cachedCharWidth != null) return display.cachedCharWidth;
    var anchor = elt("span", "x");
    var pre = elt("pre", [anchor]);
    removeChildrenAndAdd(display.measure, pre);
    var width = anchor.offsetWidth;
    if (width > 2) display.cachedCharWidth = width;
    return width || 10;
  }

  // OPERATIONS

  // Operations are used to wrap changes in such a way that each
  // change won't have to update the cursor and display (which would
  // be awkward, slow, and error-prone), but instead updates are
  // batched and then all combined and executed at once.

  var nextOpId = 0;
  function startOperation(cm) {
    cm.curOp = {
      // An array of ranges of lines that have to be updated. See
      // updateDisplay.
      changes: [],
      updateInput: null,
      userSelChange: null,
      textChanged: null,
      selectionChanged: false,
      cursorActivity: false,
      updateMaxLine: false,
      updateScrollPos: false,
      id: ++nextOpId
    };
    if (!delayedCallbackDepth++) delayedCallbacks = [];
  }

  function endOperation(cm) {
    var op = cm.curOp, doc = cm.doc, display = cm.display;
    cm.curOp = null;

    if (op.updateMaxLine) computeMaxLength(cm);
    if (display.maxLineChanged && !cm.options.lineWrapping && display.maxLine) {
      var width = measureLineWidth(cm, display.maxLine);
      display.sizer.style.minWidth = Math.max(0, width + 3 + scrollerCutOff) + "px";
      display.maxLineChanged = false;
      var maxScrollLeft = Math.max(0, display.sizer.offsetLeft + display.sizer.offsetWidth - display.scroller.clientWidth);
      if (maxScrollLeft < doc.scrollLeft && !op.updateScrollPos)
        setScrollLeft(cm, Math.min(display.scroller.scrollLeft, maxScrollLeft), true);
    }
    var newScrollPos, updated;
    if (op.updateScrollPos) {
      newScrollPos = op.updateScrollPos;
    } else if (op.selectionChanged && display.scroller.clientHeight) { // don't rescroll if not visible
      var coords = cursorCoords(cm, doc.sel.head);
      newScrollPos = calculateScrollPos(cm, coords.left, coords.top, coords.left, coords.bottom);
    }
    if (op.changes.length || newScrollPos && newScrollPos.scrollTop != null) {
      updated = updateDisplay(cm, op.changes, newScrollPos && newScrollPos.scrollTop);
      if (cm.display.scroller.offsetHeight) cm.doc.scrollTop = cm.display.scroller.scrollTop;
    }
    if (!updated && op.selectionChanged) updateSelection(cm);
    if (op.updateScrollPos) {
      display.scroller.scrollTop = display.scrollbarV.scrollTop = doc.scrollTop = newScrollPos.scrollTop;
      display.scroller.scrollLeft = display.scrollbarH.scrollLeft = doc.scrollLeft = newScrollPos.scrollLeft;
      alignHorizontally(cm);
      if (op.scrollToPos)
        scrollPosIntoView(cm, clipPos(cm.doc, op.scrollToPos), op.scrollToPosMargin);
    } else if (newScrollPos) {
      scrollCursorIntoView(cm);
    }
    if (op.selectionChanged) restartBlink(cm);

    if (cm.state.focused && op.updateInput)
      resetInput(cm, op.userSelChange);

    var hidden = op.maybeHiddenMarkers, unhidden = op.maybeUnhiddenMarkers;
    if (hidden) for (var i = 0; i < hidden.length; ++i)
      if (!hidden[i].lines.length) signal(hidden[i], "hide");
    if (unhidden) for (var i = 0; i < unhidden.length; ++i)
      if (unhidden[i].lines.length) signal(unhidden[i], "unhide");

    var delayed;
    if (!--delayedCallbackDepth) {
      delayed = delayedCallbacks;
      delayedCallbacks = null;
    }
    if (op.textChanged)
      signal(cm, "change", cm, op.textChanged);
    if (op.cursorActivity) signal(cm, "cursorActivity", cm);
    if (delayed) for (var i = 0; i < delayed.length; ++i) delayed[i]();
  }

  // Wraps a function in an operation. Returns the wrapped function.
  function operation(cm1, f) {
    return function() {
      var cm = cm1 || this, withOp = !cm.curOp;
      if (withOp) startOperation(cm);
      try { var result = f.apply(cm, arguments); }
      finally { if (withOp) endOperation(cm); }
      return result;
    };
  }
  function docOperation(f) {
    return function() {
      var withOp = this.cm && !this.cm.curOp, result;
      if (withOp) startOperation(this.cm);
      try { result = f.apply(this, arguments); }
      finally { if (withOp) endOperation(this.cm); }
      return result;
    };
  }
  function runInOp(cm, f) {
    var withOp = !cm.curOp, result;
    if (withOp) startOperation(cm);
    try { result = f(); }
    finally { if (withOp) endOperation(cm); }
    return result;
  }

  function regChange(cm, from, to, lendiff) {
    if (from == null) from = cm.doc.first;
    if (to == null) to = cm.doc.first + cm.doc.size;
    cm.curOp.changes.push({from: from, to: to, diff: lendiff});
  }

  // INPUT HANDLING

  function slowPoll(cm) {
    if (cm.display.pollingFast) return;
    cm.display.poll.set(cm.options.pollInterval, function() {
      readInput(cm);
      if (cm.state.focused) slowPoll(cm);
    });
  }

  function fastPoll(cm) {
    var missed = false;
    cm.display.pollingFast = true;
    function p() {
      var changed = readInput(cm);
      if (!changed && !missed) {missed = true; cm.display.poll.set(60, p);}
      else {cm.display.pollingFast = false; slowPoll(cm);}
    }
    cm.display.poll.set(20, p);
  }

  // prevInput is a hack to work with IME. If we reset the textarea
  // on every change, that breaks IME. So we look for changes
  // compared to the previous content instead. (Modern browsers have
  // events that indicate IME taking place, but these are not widely
  // supported or compatible enough yet to rely on.)
  function readInput(cm) {
    var input = cm.display.input, prevInput = cm.display.prevInput, doc = cm.doc, sel = doc.sel;
    if (!cm.state.focused || hasSelection(input) || isReadOnly(cm)) return false;
    var text = input.value;
    if (text == prevInput && posEq(sel.from, sel.to)) return false;
    if (ie && !ie_lt9 && cm.display.inputHasSelection === text) {
      resetInput(cm, true);
      return false;
    }

    var withOp = !cm.curOp;
    if (withOp) startOperation(cm);
    sel.shift = false;
    var same = 0, l = Math.min(prevInput.length, text.length);
    while (same < l && prevInput.charCodeAt(same) == text.charCodeAt(same)) ++same;
    var from = sel.from, to = sel.to;
    if (same < prevInput.length)
      from = Pos(from.line, from.ch - (prevInput.length - same));
    else if (cm.state.overwrite && posEq(from, to) && !cm.state.pasteIncoming)
      to = Pos(to.line, Math.min(getLine(doc, to.line).text.length, to.ch + (text.length - same)));
    var updateInput = cm.curOp.updateInput;
    makeChange(cm.doc, {from: from, to: to, text: splitLines(text.slice(same)),
                        origin: cm.state.pasteIncoming ? "paste" : "+input"}, "end");

    cm.curOp.updateInput = updateInput;
    if (text.length > 1000 || text.indexOf("\n") > -1) input.value = cm.display.prevInput = "";
    else cm.display.prevInput = text;
    if (withOp) endOperation(cm);
    cm.state.pasteIncoming = false;
    return true;
  }

  function resetInput(cm, user) {
    var minimal, selected, doc = cm.doc;
    if (!posEq(doc.sel.from, doc.sel.to)) {
      cm.display.prevInput = "";
      minimal = hasCopyEvent &&
        (doc.sel.to.line - doc.sel.from.line > 100 || (selected = cm.getSelection()).length > 1000);
      var content = minimal ? "-" : selected || cm.getSelection();
      cm.display.input.value = content;
      if (cm.state.focused) selectInput(cm.display.input);
      if (ie && !ie_lt9) cm.display.inputHasSelection = content;
    } else if (user) {
      cm.display.prevInput = cm.display.input.value = "";
      if (ie && !ie_lt9) cm.display.inputHasSelection = null;
    }
    cm.display.inaccurateSelection = minimal;
  }

  function focusInput(cm) {
    if (cm.options.readOnly != "nocursor" && (!mobile || document.activeElement != cm.display.input))
      cm.display.input.focus();
  }

  function isReadOnly(cm) {
    return cm.options.readOnly || cm.doc.cantEdit;
  }

  // EVENT HANDLERS

  function registerEventHandlers(cm) {
    var d = cm.display;
    on(d.scroller, "mousedown", operation(cm, onMouseDown));
    if (ie)
      on(d.scroller, "dblclick", operation(cm, function(e) {
        var pos = posFromMouse(cm, e);
        if (!pos || clickInGutter(cm, e) || eventInWidget(cm.display, e)) return;
        e_preventDefault(e);
        var word = findWordAt(getLine(cm.doc, pos.line).text, pos);
        extendSelection(cm.doc, word.from, word.to);
      }));
    else
      on(d.scroller, "dblclick", e_preventDefault);
    on(d.lineSpace, "selectstart", function(e) {
      if (!eventInWidget(d, e)) e_preventDefault(e);
    });
    // Gecko browsers fire contextmenu *after* opening the menu, at
    // which point we can't mess with it anymore. Context menu is
    // handled in onMouseDown for Gecko.
    if (!captureMiddleClick) on(d.scroller, "contextmenu", function(e) {onContextMenu(cm, e);});

    on(d.scroller, "scroll", function() {
      if (d.scroller.clientHeight) {
        setScrollTop(cm, d.scroller.scrollTop);
        setScrollLeft(cm, d.scroller.scrollLeft, true);
        signal(cm, "scroll", cm);
      }
    });
    on(d.scrollbarV, "scroll", function() {
      if (d.scroller.clientHeight) setScrollTop(cm, d.scrollbarV.scrollTop);
    });
    on(d.scrollbarH, "scroll", function() {
      if (d.scroller.clientHeight) setScrollLeft(cm, d.scrollbarH.scrollLeft);
    });

    on(d.scroller, "mousewheel", function(e){onScrollWheel(cm, e);});
    on(d.scroller, "DOMMouseScroll", function(e){onScrollWheel(cm, e);});

    function reFocus() { if (cm.state.focused) setTimeout(bind(focusInput, cm), 0); }
    on(d.scrollbarH, "mousedown", reFocus);
    on(d.scrollbarV, "mousedown", reFocus);
    // Prevent wrapper from ever scrolling
    on(d.wrapper, "scroll", function() { d.wrapper.scrollTop = d.wrapper.scrollLeft = 0; });

    function onResize() {
      // Might be a text scaling operation, clear size caches.
      d.cachedCharWidth = d.cachedTextHeight = null;
      clearCaches(cm);
      runInOp(cm, bind(regChange, cm));
    }
    on(window, "resize", onResize);
    // Above handler holds on to the editor and its data structures.
    // Here we poll to unregister it when the editor is no longer in
    // the document, so that it can be garbage-collected.
    function unregister() {
      for (var p = d.wrapper.parentNode; p && p != document.body; p = p.parentNode) {}
      if (p) setTimeout(unregister, 5000);
      else off(window, "resize", onResize);
    }
    setTimeout(unregister, 5000);

    on(d.input, "keyup", operation(cm, function(e) {
      if (cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e))) return;
      if (e.keyCode == 16) cm.doc.sel.shift = false;
    }));
    on(d.input, "input", bind(fastPoll, cm));
    on(d.input, "keydown", operation(cm, onKeyDown));
    on(d.input, "keypress", operation(cm, onKeyPress));
    on(d.input, "focus", bind(onFocus, cm));
    on(d.input, "blur", bind(onBlur, cm));

    function drag_(e) {
      if (cm.options.onDragEvent && cm.options.onDragEvent(cm, addStop(e))) return;
      e_stop(e);
    }
    if (cm.options.dragDrop) {
      on(d.scroller, "dragstart", function(e){onDragStart(cm, e);});
      on(d.scroller, "dragenter", drag_);
      on(d.scroller, "dragover", drag_);
      on(d.scroller, "drop", operation(cm, onDrop));
    }
    on(d.scroller, "paste", function(e){
      if (eventInWidget(d, e)) return;
      focusInput(cm);
      fastPoll(cm);
    });
    on(d.input, "paste", function() {
      cm.state.pasteIncoming = true;
      fastPoll(cm);
    });

    function prepareCopy() {
      if (d.inaccurateSelection) {
        d.prevInput = "";
        d.inaccurateSelection = false;
        d.input.value = cm.getSelection();
        selectInput(d.input);
      }
    }
    on(d.input, "cut", prepareCopy);
    on(d.input, "copy", prepareCopy);

    // Needed to handle Tab key in KHTML
    if (khtml) on(d.sizer, "mouseup", function() {
        if (document.activeElement == d.input) d.input.blur();
        focusInput(cm);
    });
  }

  function eventInWidget(display, e) {
    for (var n = e_target(e); n != display.wrapper; n = n.parentNode) {
      if (!n) return true;
      if (/\bCodeMirror-(?:line)?widget\b/.test(n.className) ||
          n.parentNode == display.sizer && n != display.mover) return true;
    }
  }

  function posFromMouse(cm, e, liberal) {
    var display = cm.display;
    if (!liberal) {
      var target = e_target(e);
      if (target == display.scrollbarH || target == display.scrollbarH.firstChild ||
          target == display.scrollbarV || target == display.scrollbarV.firstChild ||
          target == display.scrollbarFiller) return null;
    }
    var x, y, space = getRect(display.lineSpace);
    // Fails unpredictably on IE[67] when mouse is dragged around quickly.
    try { x = e.clientX; y = e.clientY; } catch (e) { return null; }
    return coordsChar(cm, x - space.left, y - space.top);
  }

  var lastClick, lastDoubleClick;
  function onMouseDown(e) {
    var cm = this, display = cm.display, doc = cm.doc, sel = doc.sel;
    sel.shift = e.shiftKey;

    if (eventInWidget(display, e)) {
      if (!webkit) {
        display.scroller.draggable = false;
        setTimeout(function(){display.scroller.draggable = true;}, 100);
      }
      return;
    }
    if (clickInGutter(cm, e)) return;
    var start = posFromMouse(cm, e);

    switch (e_button(e)) {
    case 3:
      if (captureMiddleClick) onContextMenu.call(cm, cm, e);
      return;
    case 2:
      if (start) extendSelection(cm.doc, start);
      setTimeout(bind(focusInput, cm), 20);
      e_preventDefault(e);
      return;
    }
    // For button 1, if it was clicked inside the editor
    // (posFromMouse returning non-null), we have to adjust the
    // selection.
    if (!start) {if (e_target(e) == display.scroller) e_preventDefault(e); return;}

    if (!cm.state.focused) onFocus(cm);

    var now = +new Date, type = "single";
    if (lastDoubleClick && lastDoubleClick.time > now - 400 && posEq(lastDoubleClick.pos, start)) {
      type = "triple";
      e_preventDefault(e);
      setTimeout(bind(focusInput, cm), 20);
      selectLine(cm, start.line);
    } else if (lastClick && lastClick.time > now - 400 && posEq(lastClick.pos, start)) {
      type = "double";
      lastDoubleClick = {time: now, pos: start};
      e_preventDefault(e);
      var word = findWordAt(getLine(doc, start.line).text, start);
      extendSelection(cm.doc, word.from, word.to);
    } else { lastClick = {time: now, pos: start}; }

    var last = start;
    if (cm.options.dragDrop && dragAndDrop && !isReadOnly(cm) && !posEq(sel.from, sel.to) &&
        !posLess(start, sel.from) && !posLess(sel.to, start) && type == "single") {
      var dragEnd = operation(cm, function(e2) {
        if (webkit) display.scroller.draggable = false;
        cm.state.draggingText = false;
        off(document, "mouseup", dragEnd);
        off(display.scroller, "drop", dragEnd);
        if (Math.abs(e.clientX - e2.clientX) + Math.abs(e.clientY - e2.clientY) < 10) {
          e_preventDefault(e2);
          extendSelection(cm.doc, start);
          focusInput(cm);
        }
      });
      // Let the drag handler handle this.
      if (webkit) display.scroller.draggable = true;
      cm.state.draggingText = dragEnd;
      // IE's approach to draggable
      if (display.scroller.dragDrop) display.scroller.dragDrop();
      on(document, "mouseup", dragEnd);
      on(display.scroller, "drop", dragEnd);
      return;
    }
    e_preventDefault(e);
    if (type == "single") extendSelection(cm.doc, clipPos(doc, start));

    var startstart = sel.from, startend = sel.to, lastPos = start;

    function doSelect(cur) {
      if (posEq(lastPos, cur)) return;
      lastPos = cur;

      if (type == "single") {
        extendSelection(cm.doc, clipPos(doc, start), cur);
        return;
      }

      startstart = clipPos(doc, startstart);
      startend = clipPos(doc, startend);
      if (type == "double") {
        var word = findWordAt(getLine(doc, cur.line).text, cur);
        if (posLess(cur, startstart)) extendSelection(cm.doc, word.from, startend);
        else extendSelection(cm.doc, startstart, word.to);
      } else if (type == "triple") {
        if (posLess(cur, startstart)) extendSelection(cm.doc, startend, clipPos(doc, Pos(cur.line, 0)));
        else extendSelection(cm.doc, startstart, clipPos(doc, Pos(cur.line + 1, 0)));
      }
    }

    var editorSize = getRect(display.wrapper);
    // Used to ensure timeout re-tries don't fire when another extend
    // happened in the meantime (clearTimeout isn't reliable -- at
    // least on Chrome, the timeouts still happen even when cleared,
    // if the clear happens after their scheduled firing time).
    var counter = 0;

    function extend(e) {
      var curCount = ++counter;
      var cur = posFromMouse(cm, e, true);
      if (!cur) return;
      if (!posEq(cur, last)) {
        if (!cm.state.focused) onFocus(cm);
        last = cur;
        doSelect(cur);
        var visible = visibleLines(display, doc);
        if (cur.line >= visible.to || cur.line < visible.from)
          setTimeout(operation(cm, function(){if (counter == curCount) extend(e);}), 150);
      } else {
        var outside = e.clientY < editorSize.top ? -20 : e.clientY > editorSize.bottom ? 20 : 0;
        if (outside) setTimeout(operation(cm, function() {
          if (counter != curCount) return;
          display.scroller.scrollTop += outside;
          extend(e);
        }), 50);
      }
    }

    function done(e) {
      counter = Infinity;
      var cur = posFromMouse(cm, e);
      if (cur) doSelect(cur);
      e_preventDefault(e);
      focusInput(cm);
      off(document, "mousemove", move);
      off(document, "mouseup", up);
    }

    var move = operation(cm, function(e) {
      if (!ie && !e_button(e)) done(e);
      else extend(e);
    });
    var up = operation(cm, done);
    on(document, "mousemove", move);
    on(document, "mouseup", up);
  }

  function onDrop(e) {
    var cm = this;
    if (eventInWidget(cm.display, e) || (cm.options.onDragEvent && cm.options.onDragEvent(cm, addStop(e))))
      return;
    e_preventDefault(e);
    var pos = posFromMouse(cm, e, true), files = e.dataTransfer.files;
    if (!pos || isReadOnly(cm)) return;
    if (files && files.length && window.FileReader && window.File) {
      var n = files.length, text = Array(n), read = 0;
      var loadFile = function(file, i) {
        var reader = new FileReader;
        reader.onload = function() {
          text[i] = reader.result;
          if (++read == n) {
            pos = clipPos(cm.doc, pos);
            makeChange(cm.doc, {from: pos, to: pos, text: splitLines(text.join("\n")), origin: "paste"}, "around");
          }
        };
        reader.readAsText(file);
      };
      for (var i = 0; i < n; ++i) loadFile(files[i], i);
    } else {
      // Don't do a replace if the drop happened inside of the selected text.
      if (cm.state.draggingText && !(posLess(pos, cm.doc.sel.from) || posLess(cm.doc.sel.to, pos))) {
        cm.state.draggingText(e);
        // Ensure the editor is re-focused
        setTimeout(bind(focusInput, cm), 20);
        return;
      }
      try {
        var text = e.dataTransfer.getData("Text");
        if (text) {
          var curFrom = cm.doc.sel.from, curTo = cm.doc.sel.to;
          setSelection(cm.doc, pos, pos);
          if (cm.state.draggingText) replaceRange(cm.doc, "", curFrom, curTo, "paste");
          cm.replaceSelection(text, null, "paste");
          focusInput(cm);
          onFocus(cm);
        }
      }
      catch(e){}
    }
  }

  function clickInGutter(cm, e) {
    var display = cm.display;
    try { var mX = e.clientX, mY = e.clientY; }
    catch(e) { return false; }

    if (mX >= Math.floor(getRect(display.gutters).right)) return false;
    e_preventDefault(e);
    if (!hasHandler(cm, "gutterClick")) return true;

    var lineBox = getRect(display.lineDiv);
    if (mY > lineBox.bottom) return true;
    mY -= lineBox.top - display.viewOffset;

    for (var i = 0; i < cm.options.gutters.length; ++i) {
      var g = display.gutters.childNodes[i];
      if (g && getRect(g).right >= mX) {
        var line = lineAtHeight(cm.doc, mY);
        var gutter = cm.options.gutters[i];
        signalLater(cm, "gutterClick", cm, line, gutter, e);
        break;
      }
    }
    return true;
  }

  function onDragStart(cm, e) {
    if (ie && !cm.state.draggingText) { e_stop(e); return; }
    if (eventInWidget(cm.display, e)) return;

    var txt = cm.getSelection();
    e.dataTransfer.setData("Text", txt);

    // Use dummy image instead of default browsers image.
    // Recent Safari (~6.0.2) have a tendency to segfault when this happens, so we don't do it there.
    if (e.dataTransfer.setDragImage) {
      var img = elt("img", null, null, "position: fixed; left: 0; top: 0;");
      if (opera) {
        img.width = img.height = 1;
        cm.display.wrapper.appendChild(img);
        // Force a relayout, or Opera won't use our image for some obscure reason
        img._top = img.offsetTop;
      }
      if (safari) {
        if (cm.display.dragImg) {
          img = cm.display.dragImg;
        } else {
          cm.display.dragImg = img;
          img.src = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
          cm.display.wrapper.appendChild(img);
        }
      }
      e.dataTransfer.setDragImage(img, 0, 0);
      if (opera) img.parentNode.removeChild(img);
    }
  }

  function setScrollTop(cm, val) {
    if (Math.abs(cm.doc.scrollTop - val) < 2) return;
    cm.doc.scrollTop = val;
    if (!gecko) updateDisplay(cm, [], val);
    if (cm.display.scroller.scrollTop != val) cm.display.scroller.scrollTop = val;
    if (cm.display.scrollbarV.scrollTop != val) cm.display.scrollbarV.scrollTop = val;
    if (gecko) updateDisplay(cm, []);
  }
  function setScrollLeft(cm, val, isScroller) {
    if (isScroller ? val == cm.doc.scrollLeft : Math.abs(cm.doc.scrollLeft - val) < 2) return;
    val = Math.min(val, cm.display.scroller.scrollWidth - cm.display.scroller.clientWidth);
    cm.doc.scrollLeft = val;
    alignHorizontally(cm);
    if (cm.display.scroller.scrollLeft != val) cm.display.scroller.scrollLeft = val;
    if (cm.display.scrollbarH.scrollLeft != val) cm.display.scrollbarH.scrollLeft = val;
  }

  // Since the delta values reported on mouse wheel events are
  // unstandardized between browsers and even browser versions, and
  // generally horribly unpredictable, this code starts by measuring
  // the scroll effect that the first few mouse wheel events have,
  // and, from that, detects the way it can convert deltas to pixel
  // offsets afterwards.
  //
  // The reason we want to know the amount a wheel event will scroll
  // is that it gives us a chance to update the display before the
  // actual scrolling happens, reducing flickering.

  var wheelSamples = 0, wheelPixelsPerUnit = null;
  // Fill in a browser-detected starting value on browsers where we
  // know one. These don't have to be accurate -- the result of them
  // being wrong would just be a slight flicker on the first wheel
  // scroll (if it is large enough).
  if (ie) wheelPixelsPerUnit = -.53;
  else if (gecko) wheelPixelsPerUnit = 15;
  else if (chrome) wheelPixelsPerUnit = -.7;
  else if (safari) wheelPixelsPerUnit = -1/3;

  function onScrollWheel(cm, e) {
    var dx = e.wheelDeltaX, dy = e.wheelDeltaY;
    if (dx == null && e.detail && e.axis == e.HORIZONTAL_AXIS) dx = e.detail;
    if (dy == null && e.detail && e.axis == e.VERTICAL_AXIS) dy = e.detail;
    else if (dy == null) dy = e.wheelDelta;

    var display = cm.display, scroll = display.scroller;
    // Quit if there's nothing to scroll here
    if (!(dx && scroll.scrollWidth > scroll.clientWidth ||
          dy && scroll.scrollHeight > scroll.clientHeight)) return;

    // Webkit browsers on OS X abort momentum scrolls when the target
    // of the scroll event is removed from the scrollable element.
    // This hack (see related code in patchDisplay) makes sure the
    // element is kept around.
    if (dy && mac && webkit) {
      for (var cur = e.target; cur != scroll; cur = cur.parentNode) {
        if (cur.lineObj) {
          cm.display.currentWheelTarget = cur;
          break;
        }
      }
    }

    // On some browsers, horizontal scrolling will cause redraws to
    // happen before the gutter has been realigned, causing it to
    // wriggle around in a most unseemly way. When we have an
    // estimated pixels/delta value, we just handle horizontal
    // scrolling entirely here. It'll be slightly off from native, but
    // better than glitching out.
    if (dx && !gecko && !opera && wheelPixelsPerUnit != null) {
      if (dy)
        setScrollTop(cm, Math.max(0, Math.min(scroll.scrollTop + dy * wheelPixelsPerUnit, scroll.scrollHeight - scroll.clientHeight)));
      setScrollLeft(cm, Math.max(0, Math.min(scroll.scrollLeft + dx * wheelPixelsPerUnit, scroll.scrollWidth - scroll.clientWidth)));
      e_preventDefault(e);
      display.wheelStartX = null; // Abort measurement, if in progress
      return;
    }

    if (dy && wheelPixelsPerUnit != null) {
      var pixels = dy * wheelPixelsPerUnit;
      var top = cm.doc.scrollTop, bot = top + display.wrapper.clientHeight;
      if (pixels < 0) top = Math.max(0, top + pixels - 50);
      else bot = Math.min(cm.doc.height, bot + pixels + 50);
      updateDisplay(cm, [], {top: top, bottom: bot});
    }

    if (wheelSamples < 20) {
      if (display.wheelStartX == null) {
        display.wheelStartX = scroll.scrollLeft; display.wheelStartY = scroll.scrollTop;
        display.wheelDX = dx; display.wheelDY = dy;
        setTimeout(function() {
          if (display.wheelStartX == null) return;
          var movedX = scroll.scrollLeft - display.wheelStartX;
          var movedY = scroll.scrollTop - display.wheelStartY;
          var sample = (movedY && display.wheelDY && movedY / display.wheelDY) ||
            (movedX && display.wheelDX && movedX / display.wheelDX);
          display.wheelStartX = display.wheelStartY = null;
          if (!sample) return;
          wheelPixelsPerUnit = (wheelPixelsPerUnit * wheelSamples + sample) / (wheelSamples + 1);
          ++wheelSamples;
        }, 200);
      } else {
        display.wheelDX += dx; display.wheelDY += dy;
      }
    }
  }

  function doHandleBinding(cm, bound, dropShift) {
    if (typeof bound == "string") {
      bound = commands[bound];
      if (!bound) return false;
    }
    // Ensure previous input has been read, so that the handler sees a
    // consistent view of the document
    if (cm.display.pollingFast && readInput(cm)) cm.display.pollingFast = false;
    var doc = cm.doc, prevShift = doc.sel.shift, done = false;
    try {
      if (isReadOnly(cm)) cm.state.suppressEdits = true;
      if (dropShift) doc.sel.shift = false;
      done = bound(cm) != Pass;
    } finally {
      doc.sel.shift = prevShift;
      cm.state.suppressEdits = false;
    }
    return done;
  }

  function allKeyMaps(cm) {
    var maps = cm.state.keyMaps.slice(0);
    if (cm.options.extraKeys) maps.push(cm.options.extraKeys);
    maps.push(cm.options.keyMap);
    return maps;
  }

  var maybeTransition;
  function handleKeyBinding(cm, e) {
    // Handle auto keymap transitions
    var startMap = getKeyMap(cm.options.keyMap), next = startMap.auto;
    clearTimeout(maybeTransition);
    if (next && !isModifierKey(e)) maybeTransition = setTimeout(function() {
      if (getKeyMap(cm.options.keyMap) == startMap)
        cm.options.keyMap = (next.call ? next.call(null, cm) : next);
    }, 50);

    var name = keyName(e, true), handled = false;
    if (!name) return false;
    var keymaps = allKeyMaps(cm);

    if (e.shiftKey) {
      // First try to resolve full name (including 'Shift-'). Failing
      // that, see if there is a cursor-motion command (starting with
      // 'go') bound to the keyname without 'Shift-'.
      handled = lookupKey("Shift-" + name, keymaps, function(b) {return doHandleBinding(cm, b, true);})
             || lookupKey(name, keymaps, function(b) {
                  if (typeof b == "string" && /^go[A-Z]/.test(b)) return doHandleBinding(cm, b);
                });
    } else {
      handled = lookupKey(name, keymaps, function(b) { return doHandleBinding(cm, b); });
    }
    if (handled == "stop") handled = false;

    if (handled) {
      e_preventDefault(e);
      restartBlink(cm);
      if (ie_lt9) { e.oldKeyCode = e.keyCode; e.keyCode = 0; }
    }
    return handled;
  }

  function handleCharBinding(cm, e, ch) {
    var handled = lookupKey("'" + ch + "'", allKeyMaps(cm),
                            function(b) { return doHandleBinding(cm, b, true); });
    if (handled) {
      e_preventDefault(e);
      restartBlink(cm);
    }
    return handled;
  }

  var lastStoppedKey = null;
  function onKeyDown(e) {
    var cm = this;
    if (!cm.state.focused) onFocus(cm);
    if (ie && e.keyCode == 27) { e.returnValue = false; }
    if (cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e))) return;
    var code = e.keyCode;
    // IE does strange things with escape.
    cm.doc.sel.shift = code == 16 || e.shiftKey;
    // First give onKeyEvent option a chance to handle this.
    var handled = handleKeyBinding(cm, e);
    if (opera) {
      lastStoppedKey = handled ? code : null;
      // Opera has no cut event... we try to at least catch the key combo
      if (!handled && code == 88 && !hasCopyEvent && (mac ? e.metaKey : e.ctrlKey))
        cm.replaceSelection("");
    }
  }

  function onKeyPress(e) {
    var cm = this;
    if (cm.options.onKeyEvent && cm.options.onKeyEvent(cm, addStop(e))) return;
    var keyCode = e.keyCode, charCode = e.charCode;
    if (opera && keyCode == lastStoppedKey) {lastStoppedKey = null; e_preventDefault(e); return;}
    if (((opera && (!e.which || e.which < 10)) || khtml) && handleKeyBinding(cm, e)) return;
    var ch = String.fromCharCode(charCode == null ? keyCode : charCode);
    if (this.options.electricChars && this.doc.mode.electricChars &&
        this.options.smartIndent && !isReadOnly(this) &&
        this.doc.mode.electricChars.indexOf(ch) > -1)
      setTimeout(operation(cm, function() {indentLine(cm, cm.doc.sel.to.line, "smart");}), 75);
    if (handleCharBinding(cm, e, ch)) return;
    if (ie && !ie_lt9) cm.display.inputHasSelection = null;
    fastPoll(cm);
  }

  function onFocus(cm) {
    if (cm.options.readOnly == "nocursor") return;
    if (!cm.state.focused) {
      signal(cm, "focus", cm);
      cm.state.focused = true;
      if (cm.display.wrapper.className.search(/\bCodeMirror-focused\b/) == -1)
        cm.display.wrapper.className += " CodeMirror-focused";
      resetInput(cm, true);
    }
    slowPoll(cm);
    restartBlink(cm);
  }
  function onBlur(cm) {
    if (cm.state.focused) {
      signal(cm, "blur", cm);
      cm.state.focused = false;
      cm.display.wrapper.className = cm.display.wrapper.className.replace(" CodeMirror-focused", "");
    }
    clearInterval(cm.display.blinker);
    setTimeout(function() {if (!cm.state.focused) cm.doc.sel.shift = false;}, 150);
  }

  var detectingSelectAll;
  function onContextMenu(cm, e) {
    var display = cm.display, sel = cm.doc.sel;
    if (eventInWidget(display, e)) return;

    var pos = posFromMouse(cm, e), scrollPos = display.scroller.scrollTop;
    if (!pos || opera) return; // Opera is difficult.
    if (posEq(sel.from, sel.to) || posLess(pos, sel.from) || !posLess(pos, sel.to))
      operation(cm, setSelection)(cm.doc, pos, pos);

    var oldCSS = display.input.style.cssText;
    display.inputDiv.style.position = "absolute";
    display.input.style.cssText = "position: fixed; width: 30px; height: 30px; top: " + (e.clientY - 5) +
      "px; left: " + (e.clientX - 5) + "px; z-index: 1000; background: white; outline: none;" +
      "border-width: 0; outline: none; overflow: hidden; opacity: .05; -ms-opacity: .05; filter: alpha(opacity=5);";
    focusInput(cm);
    resetInput(cm, true);
    // Adds "Select all" to context menu in FF
    if (posEq(sel.from, sel.to)) display.input.value = display.prevInput = " ";

    function rehide() {
      display.inputDiv.style.position = "relative";
      display.input.style.cssText = oldCSS;
      if (ie_lt9) display.scrollbarV.scrollTop = display.scroller.scrollTop = scrollPos;
      slowPoll(cm);

      // Try to detect the user choosing select-all
      if (display.input.selectionStart != null && (!ie || ie_lt9)) {
        clearTimeout(detectingSelectAll);
        var extval = display.input.value = " " + (posEq(sel.from, sel.to) ? "" : display.input.value), i = 0;
        display.prevInput = " ";
        display.input.selectionStart = 1; display.input.selectionEnd = extval.length;
        var poll = function(){
          if (display.prevInput == " " && display.input.selectionStart == 0)
            operation(cm, commands.selectAll)(cm);
          else if (i++ < 10) detectingSelectAll = setTimeout(poll, 500);
          else resetInput(cm);
        };
        detectingSelectAll = setTimeout(poll, 200);
      }
    }

    if (captureMiddleClick) {
      e_stop(e);
      var mouseup = function() {
        off(window, "mouseup", mouseup);
        setTimeout(rehide, 20);
      };
      on(window, "mouseup", mouseup);
    } else {
      setTimeout(rehide, 50);
    }
  }

  // UPDATING

  function changeEnd(change) {
    if (!change.text) return change.to;
    return Pos(change.from.line + change.text.length - 1,
               lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0));
  }

  // Make sure a position will be valid after the given change.
  function clipPostChange(doc, change, pos) {
    if (!posLess(change.from, pos)) return clipPos(doc, pos);
    var diff = (change.text.length - 1) - (change.to.line - change.from.line);
    if (pos.line > change.to.line + diff) {
      var preLine = pos.line - diff, lastLine = doc.first + doc.size - 1;
      if (preLine > lastLine) return Pos(lastLine, getLine(doc, lastLine).text.length);
      return clipToLen(pos, getLine(doc, preLine).text.length);
    }
    if (pos.line == change.to.line + diff)
      return clipToLen(pos, lst(change.text).length + (change.text.length == 1 ? change.from.ch : 0) +
                       getLine(doc, change.to.line).text.length - change.to.ch);
    var inside = pos.line - change.from.line;
    return clipToLen(pos, change.text[inside].length + (inside ? 0 : change.from.ch));
  }

  // Hint can be null|"end"|"start"|"around"|{anchor,head}
  function computeSelAfterChange(doc, change, hint) {
    if (hint && typeof hint == "object") // Assumed to be {anchor, head} object
      return {anchor: clipPostChange(doc, change, hint.anchor),
              head: clipPostChange(doc, change, hint.head)};

    if (hint == "start") return {anchor: change.from, head: change.from};

    var end = changeEnd(change);
    if (hint == "around") return {anchor: change.from, head: end};
    if (hint == "end") return {anchor: end, head: end};

    // hint is null, leave the selection alone as much as possible
    var adjustPos = function(pos) {
      if (posLess(pos, change.from)) return pos;
      if (!posLess(change.to, pos)) return end;

      var line = pos.line + change.text.length - (change.to.line - change.from.line) - 1, ch = pos.ch;
      if (pos.line == change.to.line) ch += end.ch - change.to.ch;
      return Pos(line, ch);
    };
    return {anchor: adjustPos(doc.sel.anchor), head: adjustPos(doc.sel.head)};
  }

  function filterChange(doc, change) {
    var obj = {
      canceled: false,
      from: change.from,
      to: change.to,
      text: change.text,
      origin: change.origin,
      update: function(from, to, text, origin) {
        if (from) this.from = clipPos(doc, from);
        if (to) this.to = clipPos(doc, to);
        if (text) this.text = text;
        if (origin !== undefined) this.origin = origin;
      },
      cancel: function() { this.canceled = true; }
    };
    signal(doc, "beforeChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeChange", doc.cm, obj);

    if (obj.canceled) return null;
    return {from: obj.from, to: obj.to, text: obj.text, origin: obj.origin};
  }

  // Replace the range from from to to by the strings in replacement.
  // change is a {from, to, text [, origin]} object
  function makeChange(doc, change, selUpdate, ignoreReadOnly) {
    if (doc.cm) {
      if (!doc.cm.curOp) return operation(doc.cm, makeChange)(doc, change, selUpdate, ignoreReadOnly);
      if (doc.cm.state.suppressEdits) return;
    }

    if (hasHandler(doc, "beforeChange") || doc.cm && hasHandler(doc.cm, "beforeChange")) {
      change = filterChange(doc, change);
      if (!change) return;
    }

    // Possibly split or suppress the update based on the presence
    // of read-only spans in its range.
    var split = sawReadOnlySpans && !ignoreReadOnly && removeReadOnlyRanges(doc, change.from, change.to);
    if (split) {
      for (var i = split.length - 1; i >= 1; --i)
        makeChangeNoReadonly(doc, {from: split[i].from, to: split[i].to, text: [""]});
      if (split.length)
        makeChangeNoReadonly(doc, {from: split[0].from, to: split[0].to, text: change.text}, selUpdate);
    } else {
      makeChangeNoReadonly(doc, change, selUpdate);
    }
  }

  function makeChangeNoReadonly(doc, change, selUpdate) {
    var selAfter = computeSelAfterChange(doc, change, selUpdate);
    addToHistory(doc, change, selAfter, doc.cm ? doc.cm.curOp.id : NaN);

    makeChangeSingleDoc(doc, change, selAfter, stretchSpansOverChange(doc, change));
    var rebased = [];

    linkedDocs(doc, function(doc, sharedHist) {
      if (!sharedHist && indexOf(rebased, doc.history) == -1) {
        rebaseHist(doc.history, change);
        rebased.push(doc.history);
      }
      makeChangeSingleDoc(doc, change, null, stretchSpansOverChange(doc, change));
    });
  }

  function makeChangeFromHistory(doc, type) {
    if (doc.cm && doc.cm.state.suppressEdits) return;

    var hist = doc.history;
    var event = (type == "undo" ? hist.done : hist.undone).pop();
    if (!event) return;
    hist.dirtyCounter += type == "undo" ? -1 : 1;

    var anti = {changes: [], anchorBefore: event.anchorAfter, headBefore: event.headAfter,
                anchorAfter: event.anchorBefore, headAfter: event.headBefore};
    (type == "undo" ? hist.undone : hist.done).push(anti);

    for (var i = event.changes.length - 1; i >= 0; --i) {
      var change = event.changes[i];
      change.origin = type;
      anti.changes.push(historyChangeFromChange(doc, change));

      var after = i ? computeSelAfterChange(doc, change, null)
                    : {anchor: event.anchorBefore, head: event.headBefore};
      makeChangeSingleDoc(doc, change, after, mergeOldSpans(doc, change));
      var rebased = [];

      linkedDocs(doc, function(doc, sharedHist) {
        if (!sharedHist && indexOf(rebased, doc.history) == -1) {
          rebaseHist(doc.history, change);
          rebased.push(doc.history);
        }
        makeChangeSingleDoc(doc, change, null, mergeOldSpans(doc, change));
      });
    }
  }

  function shiftDoc(doc, distance) {
    function shiftPos(pos) {return Pos(pos.line + distance, pos.ch);}
    doc.first += distance;
    if (doc.cm) regChange(doc.cm, doc.first, doc.first, distance);
    doc.sel.head = shiftPos(doc.sel.head); doc.sel.anchor = shiftPos(doc.sel.anchor);
    doc.sel.from = shiftPos(doc.sel.from); doc.sel.to = shiftPos(doc.sel.to);
  }

  function makeChangeSingleDoc(doc, change, selAfter, spans) {
    if (doc.cm && !doc.cm.curOp)
      return operation(doc.cm, makeChangeSingleDoc)(doc, change, selAfter, spans);

    if (change.to.line < doc.first) {
      shiftDoc(doc, change.text.length - 1 - (change.to.line - change.from.line));
      return;
    }
    if (change.from.line > doc.lastLine()) return;

    // Clip the change to the size of this doc
    if (change.from.line < doc.first) {
      var shift = change.text.length - 1 - (doc.first - change.from.line);
      shiftDoc(doc, shift);
      change = {from: Pos(doc.first, 0), to: Pos(change.to.line + shift, change.to.ch),
                text: [lst(change.text)], origin: change.origin};
    }
    var last = doc.lastLine();
    if (change.to.line > last) {
      change = {from: change.from, to: Pos(last, getLine(doc, last).text.length),
                text: [change.text[0]], origin: change.origin};
    }

    change.removed = getBetween(doc, change.from, change.to);

    if (!selAfter) selAfter = computeSelAfterChange(doc, change, null);
    if (doc.cm) makeChangeSingleDocInEditor(doc.cm, change, spans, selAfter);
    else updateDoc(doc, change, spans, selAfter);
  }

  function makeChangeSingleDocInEditor(cm, change, spans, selAfter) {
    var doc = cm.doc, display = cm.display, from = change.from, to = change.to;

    var recomputeMaxLength = false, checkWidthStart = from.line;
    if (!cm.options.lineWrapping) {
      checkWidthStart = lineNo(visualLine(doc, getLine(doc, from.line)));
      doc.iter(checkWidthStart, to.line + 1, function(line) {
        if (line == display.maxLine) {
          recomputeMaxLength = true;
          return true;
        }
      });
    }

    if (!posLess(doc.sel.head, change.from) && !posLess(change.to, doc.sel.head))
      cm.curOp.cursorActivity = true;

    updateDoc(doc, change, spans, selAfter, estimateHeight(cm));

    if (!cm.options.lineWrapping) {
      doc.iter(checkWidthStart, from.line + change.text.length, function(line) {
        var len = lineLength(doc, line);
        if (len > display.maxLineLength) {
          display.maxLine = line;
          display.maxLineLength = len;
          display.maxLineChanged = true;
          recomputeMaxLength = false;
        }
      });
      if (recomputeMaxLength) cm.curOp.updateMaxLine = true;
    }

    // Adjust frontier, schedule worker
    doc.frontier = Math.min(doc.frontier, from.line);
    startWorker(cm, 400);

    var lendiff = change.text.length - (to.line - from.line) - 1;
    // Remember that these lines changed, for updating the display
    regChange(cm, from.line, to.line + 1, lendiff);

    if (hasHandler(cm, "change")) {
      var changeObj = {from: from, to: to,
                       text: change.text,
                       removed: change.removed,
                       origin: change.origin};
      if (cm.curOp.textChanged) {
        for (var cur = cm.curOp.textChanged; cur.next; cur = cur.next) {}
        cur.next = changeObj;
      } else cm.curOp.textChanged = changeObj;
    }
  }

  function replaceRange(doc, code, from, to, origin) {
    if (!to) to = from;
    if (posLess(to, from)) { var tmp = to; to = from; from = tmp; }
    if (typeof code == "string") code = splitLines(code);
    makeChange(doc, {from: from, to: to, text: code, origin: origin}, null);
  }

  // POSITION OBJECT

  function Pos(line, ch) {
    if (!(this instanceof Pos)) return new Pos(line, ch);
    this.line = line; this.ch = ch;
  }
  CodeMirror.Pos = Pos;

  function posEq(a, b) {return a.line == b.line && a.ch == b.ch;}
  function posLess(a, b) {return a.line < b.line || (a.line == b.line && a.ch < b.ch);}
  function copyPos(x) {return Pos(x.line, x.ch);}

  // SELECTION

  function clipLine(doc, n) {return Math.max(doc.first, Math.min(n, doc.first + doc.size - 1));}
  function clipPos(doc, pos) {
    if (pos.line < doc.first) return Pos(doc.first, 0);
    var last = doc.first + doc.size - 1;
    if (pos.line > last) return Pos(last, getLine(doc, last).text.length);
    return clipToLen(pos, getLine(doc, pos.line).text.length);
  }
  function clipToLen(pos, linelen) {
    var ch = pos.ch;
    if (ch == null || ch > linelen) return Pos(pos.line, linelen);
    else if (ch < 0) return Pos(pos.line, 0);
    else return pos;
  }
  function isLine(doc, l) {return l >= doc.first && l < doc.first + doc.size;}

  // If shift is held, this will move the selection anchor. Otherwise,
  // it'll set the whole selection.
  function extendSelection(doc, pos, other, bias) {
    if (doc.sel.shift || doc.sel.extend) {
      var anchor = doc.sel.anchor;
      if (other) {
        var posBefore = posLess(pos, anchor);
        if (posBefore != posLess(other, anchor)) {
          anchor = pos;
          pos = other;
        } else if (posBefore != posLess(pos, other)) {
          pos = other;
        }
      }
      setSelection(doc, anchor, pos, bias);
    } else {
      setSelection(doc, pos, other || pos, bias);
    }
    if (doc.cm) doc.cm.curOp.userSelChange = true;
  }

  function filterSelectionChange(doc, anchor, head) {
    var obj = {anchor: anchor, head: head};
    signal(doc, "beforeSelectionChange", doc, obj);
    if (doc.cm) signal(doc.cm, "beforeSelectionChange", doc.cm, obj);
    obj.anchor = clipPos(doc, obj.anchor); obj.head = clipPos(doc, obj.head);
    return obj;
  }

  // Update the selection. Last two args are only used by
  // updateDoc, since they have to be expressed in the line
  // numbers before the update.
  function setSelection(doc, anchor, head, bias, checkAtomic) {
    if (!checkAtomic && hasHandler(doc, "beforeSelectionChange") || doc.cm && hasHandler(doc.cm, "beforeSelectionChange")) {
      var filtered = filterSelectionChange(doc, anchor, head);
      head = filtered.head;
      anchor = filtered.anchor;
    }

    var sel = doc.sel;
    sel.goalColumn = null;
    // Skip over atomic spans.
    if (checkAtomic || !posEq(anchor, sel.anchor))
      anchor = skipAtomic(doc, anchor, bias, checkAtomic != "push");
    if (checkAtomic || !posEq(head, sel.head))
      head = skipAtomic(doc, head, bias, checkAtomic != "push");

    if (posEq(sel.anchor, anchor) && posEq(sel.head, head)) return;

    sel.anchor = anchor; sel.head = head;
    var inv = posLess(head, anchor);
    sel.from = inv ? head : anchor;
    sel.to = inv ? anchor : head;

    if (doc.cm)
      doc.cm.curOp.updateInput = doc.cm.curOp.selectionChanged =
        doc.cm.curOp.cursorActivity = true;

    signalLater(doc, "cursorActivity", doc);
  }

  function reCheckSelection(cm) {
    setSelection(cm.doc, cm.doc.sel.from, cm.doc.sel.to, null, "push");
  }

  function skipAtomic(doc, pos, bias, mayClear) {
    var flipped = false, curPos = pos;
    var dir = bias || 1;
    doc.cantEdit = false;
    search: for (;;) {
      var line = getLine(doc, curPos.line);
      if (line.markedSpans) {
        for (var i = 0; i < line.markedSpans.length; ++i) {
          var sp = line.markedSpans[i], m = sp.marker;
          if ((sp.from == null || (m.inclusiveLeft ? sp.from <= curPos.ch : sp.from < curPos.ch)) &&
              (sp.to == null || (m.inclusiveRight ? sp.to >= curPos.ch : sp.to > curPos.ch))) {
            if (mayClear) {
              signal(m, "beforeCursorEnter");
              if (m.explicitlyCleared) {
                if (!line.markedSpans) break;
                else {--i; continue;}
              }
            }
            if (!m.atomic) continue;
            var newPos = m.find()[dir < 0 ? "from" : "to"];
            if (posEq(newPos, curPos)) {
              newPos.ch += dir;
              if (newPos.ch < 0) {
                if (newPos.line > doc.first) newPos = clipPos(doc, Pos(newPos.line - 1));
                else newPos = null;
              } else if (newPos.ch > line.text.length) {
                if (newPos.line < doc.first + doc.size - 1) newPos = Pos(newPos.line + 1, 0);
                else newPos = null;
              }
              if (!newPos) {
                if (flipped) {
                  // Driven in a corner -- no valid cursor position found at all
                  // -- try again *with* clearing, if we didn't already
                  if (!mayClear) return skipAtomic(doc, pos, bias, true);
                  // Otherwise, turn off editing until further notice, and return the start of the doc
                  doc.cantEdit = true;
                  return Pos(doc.first, 0);
                }
                flipped = true; newPos = pos; dir = -dir;
              }
            }
            curPos = newPos;
            continue search;
          }
        }
      }
      return curPos;
    }
  }

  // SCROLLING

  function scrollCursorIntoView(cm) {
    var coords = scrollPosIntoView(cm, cm.doc.sel.head);
    if (!cm.state.focused) return;
    var display = cm.display, box = getRect(display.sizer), doScroll = null, pTop = paddingTop(cm.display);
    if (coords.top + pTop + box.top < 0) doScroll = true;
    else if (coords.bottom + pTop + box.top > (window.innerHeight || document.documentElement.clientHeight)) doScroll = false;
    if (doScroll != null && !phantom) {
      var hidden = display.cursor.style.display == "none";
      if (hidden) {
        display.cursor.style.display = "";
        display.cursor.style.left = coords.left + "px";
        display.cursor.style.top = (coords.top - display.viewOffset) + "px";
      }
      display.cursor.scrollIntoView(doScroll);
      if (hidden) display.cursor.style.display = "none";
    }
  }

  function scrollPosIntoView(cm, pos, margin) {
    if (margin == null) margin = 0;
    for (;;) {
      var changed = false, coords = cursorCoords(cm, pos);
      var scrollPos = calculateScrollPos(cm, coords.left, coords.top - margin, coords.left, coords.bottom + margin);
      var startTop = cm.doc.scrollTop, startLeft = cm.doc.scrollLeft;
      if (scrollPos.scrollTop != null) {
        setScrollTop(cm, scrollPos.scrollTop);
        if (Math.abs(cm.doc.scrollTop - startTop) > 1) changed = true;
      }
      if (scrollPos.scrollLeft != null) {
        setScrollLeft(cm, scrollPos.scrollLeft);
        if (Math.abs(cm.doc.scrollLeft - startLeft) > 1) changed = true;
      }
      if (!changed) return coords;
    }
  }

  function scrollIntoView(cm, x1, y1, x2, y2) {
    var scrollPos = calculateScrollPos(cm, x1, y1, x2, y2);
    if (scrollPos.scrollTop != null) setScrollTop(cm, scrollPos.scrollTop);
    if (scrollPos.scrollLeft != null) setScrollLeft(cm, scrollPos.scrollLeft);
  }

  function calculateScrollPos(cm, x1, y1, x2, y2) {
    var display = cm.display, pt = paddingTop(display);
    y1 += pt; y2 += pt;
    if (y1 < 0) y1 = 0;
    var screen = display.scroller.clientHeight - scrollerCutOff, screentop = display.scroller.scrollTop, result = {};
    var docBottom = cm.doc.height + paddingVert(display);
    var atTop = y1 < pt + 10, atBottom = y2 + pt > docBottom - 10;
    if (y1 < screentop) {
      result.scrollTop = atTop ? 0 : y1;
    } else if (y2 > screentop + screen) {
      var newTop = Math.min(y1, (atBottom ? docBottom : y2) - screen);
      if (newTop != screentop) result.scrollTop = newTop;
    }

    var screenw = display.scroller.clientWidth - scrollerCutOff, screenleft = display.scroller.scrollLeft;
    x1 += display.gutters.offsetWidth; x2 += display.gutters.offsetWidth;
    var gutterw = display.gutters.offsetWidth;
    var atLeft = x1 < gutterw + 10;
    if (x1 < screenleft + gutterw || atLeft) {
      if (atLeft) x1 = 0;
      result.scrollLeft = Math.max(0, x1 - 10 - gutterw);
    } else if (x2 > screenw + screenleft - 3) {
      result.scrollLeft = x2 + 10 - screenw;
    }
    return result;
  }

  function updateScrollPos(cm, left, top) {
    cm.curOp.updateScrollPos = {scrollLeft: left == null ? cm.doc.scrollLeft : left,
                                scrollTop: top == null ? cm.doc.scrollTop : top};
  }

  function addToScrollPos(cm, left, top) {
    var pos = cm.curOp.updateScrollPos || (cm.curOp.updateScrollPos = {scrollLeft: cm.doc.scrollLeft, scrollTop: cm.doc.scrollTop});
    var scroll = cm.display.scroller;
    pos.scrollTop = Math.max(0, Math.min(scroll.scrollHeight - scroll.clientHeight, pos.scrollTop + top));
    pos.scrollLeft = Math.max(0, Math.min(scroll.scrollWidth - scroll.clientWidth, pos.scrollLeft + left));
  }

  // API UTILITIES

  function indentLine(cm, n, how, aggressive) {
    var doc = cm.doc;
    if (!how) how = "add";
    if (how == "smart") {
      if (!cm.doc.mode.indent) how = "prev";
      else var state = getStateBefore(cm, n);
    }

    var tabSize = cm.options.tabSize;
    var line = getLine(doc, n), curSpace = countColumn(line.text, null, tabSize);
    var curSpaceString = line.text.match(/^\s*/)[0], indentation;
    if (how == "smart") {
      indentation = cm.doc.mode.indent(state, line.text.slice(curSpaceString.length), line.text);
      if (indentation == Pass) {
        if (!aggressive) return;
        how = "prev";
      }
    }
    if (how == "prev") {
      if (n > doc.first) indentation = countColumn(getLine(doc, n-1).text, null, tabSize);
      else indentation = 0;
    } else if (how == "add") {
      indentation = curSpace + cm.options.indentUnit;
    } else if (how == "subtract") {
      indentation = curSpace - cm.options.indentUnit;
    }
    indentation = Math.max(0, indentation);

    var indentString = "", pos = 0;
    if (cm.options.indentWithTabs)
      for (var i = Math.floor(indentation / tabSize); i; --i) {pos += tabSize; indentString += "\t";}
    if (pos < indentation) indentString += spaceStr(indentation - pos);

    if (indentString != curSpaceString)
      replaceRange(cm.doc, indentString, Pos(n, 0), Pos(n, curSpaceString.length), "+input");
    line.stateAfter = null;
  }

  function changeLine(cm, handle, op) {
    var no = handle, line = handle, doc = cm.doc;
    if (typeof handle == "number") line = getLine(doc, clipLine(doc, handle));
    else no = lineNo(handle);
    if (no == null) return null;
    if (op(line, no)) regChange(cm, no, no + 1);
    else return null;
    return line;
  }

  function findPosH(doc, pos, dir, unit, visually) {
    var line = pos.line, ch = pos.ch;
    var lineObj = getLine(doc, line);
    var possible = true;
    function findNextLine() {
      var l = line + dir;
      if (l < doc.first || l >= doc.first + doc.size) return (possible = false);
      line = l;
      return lineObj = getLine(doc, l);
    }
    function moveOnce(boundToLine) {
      var next = (visually ? moveVisually : moveLogically)(lineObj, ch, dir, true);
      if (next == null) {
        if (!boundToLine && findNextLine()) {
          if (visually) ch = (dir < 0 ? lineRight : lineLeft)(lineObj);
          else ch = dir < 0 ? lineObj.text.length : 0;
        } else return (possible = false);
      } else ch = next;
      return true;
    }

    if (unit == "char") moveOnce();
    else if (unit == "column") moveOnce(true);
    else if (unit == "word" || unit == "group") {
      var sawType = null, group = unit == "group";
      for (var first = true;; first = false) {
        if (dir < 0 && !moveOnce(!first)) break;
        var cur = lineObj.text.charAt(ch) || "\n";
        var type = isWordChar(cur) ? "w"
          : !group ? null
          : /\s/.test(cur) ? null
          : "p";
        if (sawType && sawType != type) {
          if (dir < 0) {dir = 1; moveOnce();}
          break;
        }
        if (type) sawType = type;
        if (dir > 0 && !moveOnce(!first)) break;
      }
    }
    var result = skipAtomic(doc, Pos(line, ch), dir, true);
    if (!possible) result.hitSide = true;
    return result;
  }

  function findPosV(cm, pos, dir, unit) {
    var doc = cm.doc, x = pos.left, y;
    if (unit == "page") {
      var pageSize = Math.min(cm.display.wrapper.clientHeight, window.innerHeight || document.documentElement.clientHeight);
      y = pos.top + dir * (pageSize - (dir < 0 ? 1.5 : .5) * textHeight(cm.display));
    } else if (unit == "line") {
      y = dir > 0 ? pos.bottom + 3 : pos.top - 3;
    }
    for (;;) {
      var target = coordsChar(cm, x, y);
      if (!target.outside) break;
      if (dir < 0 ? y <= 0 : y >= doc.height) { target.hitSide = true; break; }
      y += dir * 5;
    }
    return target;
  }

  function findWordAt(line, pos) {
    var start = pos.ch, end = pos.ch;
    if (line) {
      if (pos.after === false || end == line.length) --start; else ++end;
      var startChar = line.charAt(start);
      var check = isWordChar(startChar) ? isWordChar
        : /\s/.test(startChar) ? function(ch) {return /\s/.test(ch);}
        : function(ch) {return !/\s/.test(ch) && !isWordChar(ch);};
      while (start > 0 && check(line.charAt(start - 1))) --start;
      while (end < line.length && check(line.charAt(end))) ++end;
    }
    return {from: Pos(pos.line, start), to: Pos(pos.line, end)};
  }

  function selectLine(cm, line) {
    extendSelection(cm.doc, Pos(line, 0), clipPos(cm.doc, Pos(line + 1, 0)));
  }

  // PROTOTYPE

  // The publicly visible API. Note that operation(null, f) means
  // 'wrap f in an operation, performed on its `this` parameter'

  CodeMirror.prototype = {
    focus: function(){window.focus(); focusInput(this); onFocus(this); fastPoll(this);},

    setOption: function(option, value) {
      var options = this.options, old = options[option];
      if (options[option] == value && option != "mode") return;
      options[option] = value;
      if (optionHandlers.hasOwnProperty(option))
        operation(this, optionHandlers[option])(this, value, old);
    },

    getOption: function(option) {return this.options[option];},
    getDoc: function() {return this.doc;},

    addKeyMap: function(map, bottom) {
      this.state.keyMaps[bottom ? "push" : "unshift"](map);
    },
    removeKeyMap: function(map) {
      var maps = this.state.keyMaps;
      for (var i = 0; i < maps.length; ++i)
        if ((typeof map == "string" ? maps[i].name : maps[i]) == map) {
          maps.splice(i, 1);
          return true;
        }
    },

    addOverlay: operation(null, function(spec, options) {
      var mode = spec.token ? spec : CodeMirror.getMode(this.options, spec);
      if (mode.startState) throw new Error("Overlays may not be stateful.");
      this.state.overlays.push({mode: mode, modeSpec: spec, opaque: options && options.opaque});
      this.state.modeGen++;
      regChange(this);
    }),
    removeOverlay: operation(null, function(spec) {
      var overlays = this.state.overlays;
      for (var i = 0; i < overlays.length; ++i) {
        if (overlays[i].modeSpec == spec) {
          overlays.splice(i, 1);
          this.state.modeGen++;
          regChange(this);
          return;
        }
      }
    }),

    indentLine: operation(null, function(n, dir, aggressive) {
      if (typeof dir != "string") {
        if (dir == null) dir = this.options.smartIndent ? "smart" : "prev";
        else dir = dir ? "add" : "subtract";
      }
      if (isLine(this.doc, n)) indentLine(this, n, dir, aggressive);
    }),
    indentSelection: operation(null, function(how) {
      var sel = this.doc.sel;
      if (posEq(sel.from, sel.to)) return indentLine(this, sel.from.line, how);
      var e = sel.to.line - (sel.to.ch ? 0 : 1);
      for (var i = sel.from.line; i <= e; ++i) indentLine(this, i, how);
    }),

    // Fetch the parser token for a given character. Useful for hacks
    // that want to inspect the mode state (say, for completion).
    getTokenAt: function(pos) {
      var doc = this.doc;
      pos = clipPos(doc, pos);
      var state = getStateBefore(this, pos.line), mode = this.doc.mode;
      var line = getLine(doc, pos.line);
      var stream = new StringStream(line.text, this.options.tabSize);
      while (stream.pos < pos.ch && !stream.eol()) {
        stream.start = stream.pos;
        var style = mode.token(stream, state);
      }
      return {start: stream.start,
              end: stream.pos,
              string: stream.current(),
              className: style || null, // Deprecated, use 'type' instead
              type: style || null,
              state: state};
    },

    getStateAfter: function(line) {
      var doc = this.doc;
      line = clipLine(doc, line == null ? doc.first + doc.size - 1: line);
      return getStateBefore(this, line + 1);
    },

    cursorCoords: function(start, mode) {
      var pos, sel = this.doc.sel;
      if (start == null) pos = sel.head;
      else if (typeof start == "object") pos = clipPos(this.doc, start);
      else pos = start ? sel.from : sel.to;
      return cursorCoords(this, pos, mode || "page");
    },

    charCoords: function(pos, mode) {
      return charCoords(this, clipPos(this.doc, pos), mode || "page");
    },

    coordsChar: function(coords, mode) {
      coords = fromCoordSystem(this, coords, mode || "page");
      return coordsChar(this, coords.left, coords.top);
    },

    defaultTextHeight: function() { return textHeight(this.display); },
    defaultCharWidth: function() { return charWidth(this.display); },

    setGutterMarker: operation(null, function(line, gutterID, value) {
      return changeLine(this, line, function(line) {
        var markers = line.gutterMarkers || (line.gutterMarkers = {});
        markers[gutterID] = value;
        if (!value && isEmpty(markers)) line.gutterMarkers = null;
        return true;
      });
    }),

    clearGutter: operation(null, function(gutterID) {
      var cm = this, doc = cm.doc, i = doc.first;
      doc.iter(function(line) {
        if (line.gutterMarkers && line.gutterMarkers[gutterID]) {
          line.gutterMarkers[gutterID] = null;
          regChange(cm, i, i + 1);
          if (isEmpty(line.gutterMarkers)) line.gutterMarkers = null;
        }
        ++i;
      });
    }),

    addLineClass: operation(null, function(handle, where, cls) {
      return changeLine(this, handle, function(line) {
        var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : "wrapClass";
        if (!line[prop]) line[prop] = cls;
        else if (new RegExp("\\b" + cls + "\\b").test(line[prop])) return false;
        else line[prop] += " " + cls;
        return true;
      });
    }),

    removeLineClass: operation(null, function(handle, where, cls) {
      return changeLine(this, handle, function(line) {
        var prop = where == "text" ? "textClass" : where == "background" ? "bgClass" : "wrapClass";
        var cur = line[prop];
        if (!cur) return false;
        else if (cls == null) line[prop] = null;
        else {
          var upd = cur.replace(new RegExp("^" + cls + "\\b\\s*|\\s*\\b" + cls + "\\b"), "");
          if (upd == cur) return false;
          line[prop] = upd || null;
        }
        return true;
      });
    }),

    addLineWidget: operation(null, function(handle, node, options) {
      return addLineWidget(this, handle, node, options);
    }),

    removeLineWidget: function(widget) { widget.clear(); },

    lineInfo: function(line) {
      if (typeof line == "number") {
        if (!isLine(this.doc, line)) return null;
        var n = line;
        line = getLine(this.doc, line);
        if (!line) return null;
      } else {
        var n = lineNo(line);
        if (n == null) return null;
      }
      return {line: n, handle: line, text: line.text, gutterMarkers: line.gutterMarkers,
              textClass: line.textClass, bgClass: line.bgClass, wrapClass: line.wrapClass,
              widgets: line.widgets};
    },

    getViewport: function() { return {from: this.display.showingFrom, to: this.display.showingTo};},

    addWidget: function(pos, node, scroll, vert, horiz) {
      var display = this.display;
      pos = cursorCoords(this, clipPos(this.doc, pos));
      var top = pos.bottom, left = pos.left;
      node.style.position = "absolute";
      display.sizer.appendChild(node);
      if (vert == "over") {
        top = pos.top;
      } else if (vert == "above" || vert == "near") {
        var vspace = Math.max(display.wrapper.clientHeight, this.doc.height),
        hspace = Math.max(display.sizer.clientWidth, display.lineSpace.clientWidth);
        // Default to positioning above (if specified and possible); otherwise default to positioning below
        if ((vert == 'above' || pos.bottom + node.offsetHeight > vspace) && pos.top > node.offsetHeight)
          top = pos.top - node.offsetHeight;
        else if (pos.bottom + node.offsetHeight <= vspace)
          top = pos.bottom;
        if (left + node.offsetWidth > hspace)
          left = hspace - node.offsetWidth;
      }
      node.style.top = (top + paddingTop(display)) + "px";
      node.style.left = node.style.right = "";
      if (horiz == "right") {
        left = display.sizer.clientWidth - node.offsetWidth;
        node.style.right = "0px";
      } else {
        if (horiz == "left") left = 0;
        else if (horiz == "middle") left = (display.sizer.clientWidth - node.offsetWidth) / 2;
        node.style.left = left + "px";
      }
      if (scroll)
        scrollIntoView(this, left, top, left + node.offsetWidth, top + node.offsetHeight);
    },

    triggerOnKeyDown: operation(null, onKeyDown),

    execCommand: function(cmd) {return commands[cmd](this);},

    findPosH: function(from, amount, unit, visually) {
      var dir = 1;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        cur = findPosH(this.doc, cur, dir, unit, visually);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveH: operation(null, function(dir, unit) {
      var sel = this.doc.sel, pos;
      if (sel.shift || sel.extend || posEq(sel.from, sel.to))
        pos = findPosH(this.doc, sel.head, dir, unit, this.options.rtlMoveVisually);
      else
        pos = dir < 0 ? sel.from : sel.to;
      extendSelection(this.doc, pos, pos, dir);
    }),

    deleteH: operation(null, function(dir, unit) {
      var sel = this.doc.sel;
      if (!posEq(sel.from, sel.to)) replaceRange(this.doc, "", sel.from, sel.to, "+delete");
      else replaceRange(this.doc, "", sel.from, findPosH(this.doc, sel.head, dir, unit, false), "+delete");
      this.curOp.userSelChange = true;
    }),

    findPosV: function(from, amount, unit, goalColumn) {
      var dir = 1, x = goalColumn;
      if (amount < 0) { dir = -1; amount = -amount; }
      for (var i = 0, cur = clipPos(this.doc, from); i < amount; ++i) {
        var coords = cursorCoords(this, cur, "div");
        if (x == null) x = coords.left;
        else coords.left = x;
        cur = findPosV(this, coords, dir, unit);
        if (cur.hitSide) break;
      }
      return cur;
    },

    moveV: operation(null, function(dir, unit) {
      var sel = this.doc.sel;
      var pos = cursorCoords(this, sel.head, "div");
      if (sel.goalColumn != null) pos.left = sel.goalColumn;
      var target = findPosV(this, pos, dir, unit);

      if (unit == "page") addToScrollPos(this, 0, charCoords(this, target, "div").top - pos.top);
      extendSelection(this.doc, target, target, dir);
      sel.goalColumn = pos.left;
    }),

    toggleOverwrite: function() {
      if (this.state.overwrite = !this.state.overwrite)
        this.display.cursor.className += " CodeMirror-overwrite";
      else
        this.display.cursor.className = this.display.cursor.className.replace(" CodeMirror-overwrite", "");
    },
    hasFocus: function() { return this.state.focused; },

    scrollTo: operation(null, function(x, y) {
      updateScrollPos(this, x, y);
    }),
    getScrollInfo: function() {
      var scroller = this.display.scroller, co = scrollerCutOff;
      return {left: scroller.scrollLeft, top: scroller.scrollTop,
              height: scroller.scrollHeight - co, width: scroller.scrollWidth - co,
              clientHeight: scroller.clientHeight - co, clientWidth: scroller.clientWidth - co};
    },

    scrollIntoView: operation(null, function(pos, margin) {
      if (typeof pos == "number") pos = Pos(pos, 0);
      if (!margin) margin = 0;
      var coords = pos;

      if (!pos || pos.line != null) {
        this.curOp.scrollToPos = pos ? clipPos(this.doc, pos) : this.doc.sel.head;
        this.curOp.scrollToPosMargin = margin;
        coords = cursorCoords(this, this.curOp.scrollToPos);
      }
      var sPos = calculateScrollPos(this, coords.left, coords.top - margin, coords.right, coords.bottom + margin);
      updateScrollPos(this, sPos.scrollLeft, sPos.scrollTop);
    }),

    setSize: function(width, height) {
      function interpret(val) {
        return typeof val == "number" || /^\d+$/.test(String(val)) ? val + "px" : val;
      }
      if (width != null) this.display.wrapper.style.width = interpret(width);
      if (height != null) this.display.wrapper.style.height = interpret(height);
      this.refresh();
    },

    on: function(type, f) {on(this, type, f);},
    off: function(type, f) {off(this, type, f);},

    operation: function(f){return runInOp(this, f);},

    refresh: operation(null, function() {
      clearCaches(this);
      updateScrollPos(this, this.doc.scrollLeft, this.doc.scrollTop);
      regChange(this);
    }),

    swapDoc: operation(null, function(doc) {
      var old = this.doc;
      old.cm = null;
      attachDoc(this, doc);
      clearCaches(this);
      resetInput(this, true);
      updateScrollPos(this, doc.scrollLeft, doc.scrollTop);
      return old;
    }),

    getInputField: function(){return this.display.input;},
    getWrapperElement: function(){return this.display.wrapper;},
    getScrollerElement: function(){return this.display.scroller;},
    getGutterElement: function(){return this.display.gutters;}
  };

  // OPTION DEFAULTS

  var optionHandlers = CodeMirror.optionHandlers = {};

  // The default configuration options.
  var defaults = CodeMirror.defaults = {};

  function option(name, deflt, handle, notOnInit) {
    CodeMirror.defaults[name] = deflt;
    if (handle) optionHandlers[name] =
      notOnInit ? function(cm, val, old) {if (old != Init) handle(cm, val, old);} : handle;
  }

  var Init = CodeMirror.Init = {toString: function(){return "CodeMirror.Init";}};

  // These two are, on init, called from the constructor because they
  // have to be initialized before the editor can start at all.
  option("value", "", function(cm, val) {
    cm.setValue(val);
  }, true);
  option("mode", null, function(cm, val) {
    cm.doc.modeOption = val;
    loadMode(cm);
  }, true);

  option("indentUnit", 2, loadMode, true);
  option("indentWithTabs", false);
  option("smartIndent", true);
  option("tabSize", 4, function(cm) {
    loadMode(cm);
    clearCaches(cm);
    regChange(cm);
  }, true);
  option("electricChars", true);
  option("rtlMoveVisually", !windows);

  option("theme", "default", function(cm) {
    themeChanged(cm);
    guttersChanged(cm);
  }, true);
  option("keyMap", "default", keyMapChanged);
  option("extraKeys", null);

  option("onKeyEvent", null);
  option("onDragEvent", null);

  option("lineWrapping", false, wrappingChanged, true);
  option("gutters", [], function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("fixedGutter", true, function(cm, val) {
    cm.display.gutters.style.left = val ? compensateForHScroll(cm.display) + "px" : "0";
    cm.refresh();
  }, true);
  option("lineNumbers", false, function(cm) {
    setGuttersForLineNumbers(cm.options);
    guttersChanged(cm);
  }, true);
  option("firstLineNumber", 1, guttersChanged, true);
  option("lineNumberFormatter", function(integer) {return integer;}, guttersChanged, true);
  option("showCursorWhenSelecting", false, updateSelection, true);

  option("readOnly", false, function(cm, val) {
    if (val == "nocursor") {onBlur(cm); cm.display.input.blur();}
    else if (!val) resetInput(cm, true);
  });
  option("dragDrop", true);

  option("cursorBlinkRate", 530);
  option("cursorHeight", 1);
  option("workTime", 100);
  option("workDelay", 100);
  option("flattenSpans", true);
  option("pollInterval", 100);
  option("undoDepth", 40, function(cm, val){cm.doc.history.undoDepth = val;});
  option("historyEventDelay", 500);
  option("viewportMargin", 10, function(cm){cm.refresh();}, true);
  option("maxHighlightLength", 10000, function(cm){loadMode(cm); cm.refresh();}, true);
  option("moveInputWithCursor", true, function(cm, val) {
    if (!val) cm.display.inputDiv.style.top = cm.display.inputDiv.style.left = 0;
  });

  option("tabindex", null, function(cm, val) {
    cm.display.input.tabIndex = val || "";
  });
  option("autofocus", null);

  // MODE DEFINITION AND QUERYING

  // Known modes, by name and by MIME
  var modes = CodeMirror.modes = {}, mimeModes = CodeMirror.mimeModes = {};

  CodeMirror.defineMode = function(name, mode) {
    if (!CodeMirror.defaults.mode && name != "null") CodeMirror.defaults.mode = name;
    if (arguments.length > 2) {
      mode.dependencies = [];
      for (var i = 2; i < arguments.length; ++i) mode.dependencies.push(arguments[i]);
    }
    modes[name] = mode;
  };

  CodeMirror.defineMIME = function(mime, spec) {
    mimeModes[mime] = spec;
  };

  CodeMirror.resolveMode = function(spec) {
    if (typeof spec == "string" && mimeModes.hasOwnProperty(spec))
      spec = mimeModes[spec];
    else if (typeof spec == "string" && /^[\w\-]+\/[\w\-]+\+xml$/.test(spec))
      return CodeMirror.resolveMode("application/xml");
    if (typeof spec == "string") return {name: spec};
    else return spec || {name: "null"};
  };

  CodeMirror.getMode = function(options, spec) {
    spec = CodeMirror.resolveMode(spec);
    var mfactory = modes[spec.name];
    if (!mfactory) return CodeMirror.getMode(options, "text/plain");
    var modeObj = mfactory(options, spec);
    if (modeExtensions.hasOwnProperty(spec.name)) {
      var exts = modeExtensions[spec.name];
      for (var prop in exts) {
        if (!exts.hasOwnProperty(prop)) continue;
        if (modeObj.hasOwnProperty(prop)) modeObj["_" + prop] = modeObj[prop];
        modeObj[prop] = exts[prop];
      }
    }
    modeObj.name = spec.name;
    return modeObj;
  };

  CodeMirror.defineMode("null", function() {
    return {token: function(stream) {stream.skipToEnd();}};
  });
  CodeMirror.defineMIME("text/plain", "null");

  var modeExtensions = CodeMirror.modeExtensions = {};
  CodeMirror.extendMode = function(mode, properties) {
    var exts = modeExtensions.hasOwnProperty(mode) ? modeExtensions[mode] : (modeExtensions[mode] = {});
    copyObj(properties, exts);
  };

  // EXTENSIONS

  CodeMirror.defineExtension = function(name, func) {
    CodeMirror.prototype[name] = func;
  };
  CodeMirror.defineDocExtension = function(name, func) {
    Doc.prototype[name] = func;
  };
  CodeMirror.defineOption = option;

  var initHooks = [];
  CodeMirror.defineInitHook = function(f) {initHooks.push(f);};

  // MODE STATE HANDLING

  // Utility functions for working with state. Exported because modes
  // sometimes need to do this.
  function copyState(mode, state) {
    if (state === true) return state;
    if (mode.copyState) return mode.copyState(state);
    var nstate = {};
    for (var n in state) {
      var val = state[n];
      if (val instanceof Array) val = val.concat([]);
      nstate[n] = val;
    }
    return nstate;
  }
  CodeMirror.copyState = copyState;

  function startState(mode, a1, a2) {
    return mode.startState ? mode.startState(a1, a2) : true;
  }
  CodeMirror.startState = startState;

  CodeMirror.innerMode = function(mode, state) {
    while (mode.innerMode) {
      var info = mode.innerMode(state);
      state = info.state;
      mode = info.mode;
    }
    return info || {mode: mode, state: state};
  };

  // STANDARD COMMANDS

  var commands = CodeMirror.commands = {
    selectAll: function(cm) {cm.setSelection(Pos(cm.firstLine(), 0), Pos(cm.lastLine()));},
    killLine: function(cm) {
      var from = cm.getCursor(true), to = cm.getCursor(false), sel = !posEq(from, to);
      if (!sel && cm.getLine(from.line).length == from.ch)
        cm.replaceRange("", from, Pos(from.line + 1, 0), "+delete");
      else cm.replaceRange("", from, sel ? to : Pos(from.line), "+delete");
    },
    deleteLine: function(cm) {
      var l = cm.getCursor().line;
      cm.replaceRange("", Pos(l, 0), Pos(l), "+delete");
    },
    undo: function(cm) {cm.undo();},
    redo: function(cm) {cm.redo();},
    goDocStart: function(cm) {cm.extendSelection(Pos(cm.firstLine(), 0));},
    goDocEnd: function(cm) {cm.extendSelection(Pos(cm.lastLine()));},
    goLineStart: function(cm) {
      cm.extendSelection(lineStart(cm, cm.getCursor().line));
    },
    goLineStartSmart: function(cm) {
      var cur = cm.getCursor(), start = lineStart(cm, cur.line);
      var line = cm.getLineHandle(start.line);
      var order = getOrder(line);
      if (!order || order[0].level == 0) {
        var firstNonWS = Math.max(0, line.text.search(/\S/));
        var inWS = cur.line == start.line && cur.ch <= firstNonWS && cur.ch;
        cm.extendSelection(Pos(start.line, inWS ? 0 : firstNonWS));
      } else cm.extendSelection(start);
    },
    goLineEnd: function(cm) {
      cm.extendSelection(lineEnd(cm, cm.getCursor().line));
    },
    goLineRight: function(cm) {
      var top = cm.charCoords(cm.getCursor(), "div").top + 5;
      cm.extendSelection(cm.coordsChar({left: cm.display.lineDiv.offsetWidth + 100, top: top}, "div"));
    },
    goLineLeft: function(cm) {
      var top = cm.charCoords(cm.getCursor(), "div").top + 5;
      cm.extendSelection(cm.coordsChar({left: 0, top: top}, "div"));
    },
    goLineUp: function(cm) {cm.moveV(-1, "line");},
    goLineDown: function(cm) {cm.moveV(1, "line");},
    goPageUp: function(cm) {cm.moveV(-1, "page");},
    goPageDown: function(cm) {cm.moveV(1, "page");},
    goCharLeft: function(cm) {cm.moveH(-1, "char");},
    goCharRight: function(cm) {cm.moveH(1, "char");},
    goColumnLeft: function(cm) {cm.moveH(-1, "column");},
    goColumnRight: function(cm) {cm.moveH(1, "column");},
    goWordLeft: function(cm) {cm.moveH(-1, "word");},
    goGroupRight: function(cm) {cm.moveH(1, "group");},
    goGroupLeft: function(cm) {cm.moveH(-1, "group");},
    goWordRight: function(cm) {cm.moveH(1, "word");},
    delCharBefore: function(cm) {cm.deleteH(-1, "char");},
    delCharAfter: function(cm) {cm.deleteH(1, "char");},
    delWordBefore: function(cm) {cm.deleteH(-1, "word");},
    delWordAfter: function(cm) {cm.deleteH(1, "word");},
    delGroupBefore: function(cm) {cm.deleteH(-1, "group");},
    delGroupAfter: function(cm) {cm.deleteH(1, "group");},
    indentAuto: function(cm) {cm.indentSelection("smart");},
    indentMore: function(cm) {cm.indentSelection("add");},
    indentLess: function(cm) {cm.indentSelection("subtract");},
    insertTab: function(cm) {cm.replaceSelection("\t", "end", "+input");},
    defaultTab: function(cm) {
      if (cm.somethingSelected()) cm.indentSelection("add");
      else cm.replaceSelection("\t", "end", "+input");
    },
    transposeChars: function(cm) {
      var cur = cm.getCursor(), line = cm.getLine(cur.line);
      if (cur.ch > 0 && cur.ch < line.length - 1)
        cm.replaceRange(line.charAt(cur.ch) + line.charAt(cur.ch - 1),
                        Pos(cur.line, cur.ch - 1), Pos(cur.line, cur.ch + 1));
    },
    newlineAndIndent: function(cm) {
      operation(cm, function() {
        cm.replaceSelection("\n", "end", "+input");
        cm.indentLine(cm.getCursor().line, null, true);
      })();
    },
    toggleOverwrite: function(cm) {cm.toggleOverwrite();}
  };

  // STANDARD KEYMAPS

  var keyMap = CodeMirror.keyMap = {};
  keyMap.basic = {
    "Left": "goCharLeft", "Right": "goCharRight", "Up": "goLineUp", "Down": "goLineDown",
    "End": "goLineEnd", "Home": "goLineStartSmart", "PageUp": "goPageUp", "PageDown": "goPageDown",
    "Delete": "delCharAfter", "Backspace": "delCharBefore", "Tab": "defaultTab", "Shift-Tab": "indentAuto",
    "Enter": "newlineAndIndent", "Insert": "toggleOverwrite"
  };
  // Note that the save and find-related commands aren't defined by
  // default. Unknown commands are simply ignored.
  keyMap.pcDefault = {
    "Ctrl-A": "selectAll", "Ctrl-D": "deleteLine", "Ctrl-Z": "undo", "Shift-Ctrl-Z": "redo", "Ctrl-Y": "redo",
    "Ctrl-Home": "goDocStart", "Alt-Up": "goDocStart", "Ctrl-End": "goDocEnd", "Ctrl-Down": "goDocEnd",
    "Ctrl-Left": "goGroupLeft", "Ctrl-Right": "goGroupRight", "Alt-Left": "goLineStart", "Alt-Right": "goLineEnd",
    "Ctrl-Backspace": "delGroupBefore", "Ctrl-Delete": "delGroupAfter", "Ctrl-S": "save", "Ctrl-F": "find",
    "Ctrl-G": "findNext", "Shift-Ctrl-G": "findPrev", "Shift-Ctrl-F": "replace", "Shift-Ctrl-R": "replaceAll",
    "Ctrl-[": "indentLess", "Ctrl-]": "indentMore",
    fallthrough: "basic"
  };
  keyMap.macDefault = {
    "Cmd-A": "selectAll", "Cmd-D": "deleteLine", "Cmd-Z": "undo", "Shift-Cmd-Z": "redo", "Cmd-Y": "redo",
    "Cmd-Up": "goDocStart", "Cmd-End": "goDocEnd", "Cmd-Down": "goDocEnd", "Alt-Left": "goGroupLeft",
    "Alt-Right": "goGroupRight", "Cmd-Left": "goLineStart", "Cmd-Right": "goLineEnd", "Alt-Backspace": "delGroupBefore",
    "Ctrl-Alt-Backspace": "delGroupAfter", "Alt-Delete": "delGroupAfter", "Cmd-S": "save", "Cmd-F": "find",
    "Cmd-G": "findNext", "Shift-Cmd-G": "findPrev", "Cmd-Alt-F": "replace", "Shift-Cmd-Alt-F": "replaceAll",
    "Cmd-[": "indentLess", "Cmd-]": "indentMore",
    fallthrough: ["basic", "emacsy"]
  };
  keyMap["default"] = mac ? keyMap.macDefault : keyMap.pcDefault;
  keyMap.emacsy = {
    "Ctrl-F": "goCharRight", "Ctrl-B": "goCharLeft", "Ctrl-P": "goLineUp", "Ctrl-N": "goLineDown",
    "Alt-F": "goWordRight", "Alt-B": "goWordLeft", "Ctrl-A": "goLineStart", "Ctrl-E": "goLineEnd",
    "Ctrl-V": "goPageDown", "Shift-Ctrl-V": "goPageUp", "Ctrl-D": "delCharAfter", "Ctrl-H": "delCharBefore",
    "Alt-D": "delWordAfter", "Alt-Backspace": "delWordBefore", "Ctrl-K": "killLine", "Ctrl-T": "transposeChars"
  };

  // KEYMAP DISPATCH

  function getKeyMap(val) {
    if (typeof val == "string") return keyMap[val];
    else return val;
  }

  function lookupKey(name, maps, handle) {
    function lookup(map) {
      map = getKeyMap(map);
      var found = map[name];
      if (found === false) return "stop";
      if (found != null && handle(found)) return true;
      if (map.nofallthrough) return "stop";

      var fallthrough = map.fallthrough;
      if (fallthrough == null) return false;
      if (Object.prototype.toString.call(fallthrough) != "[object Array]")
        return lookup(fallthrough);
      for (var i = 0, e = fallthrough.length; i < e; ++i) {
        var done = lookup(fallthrough[i]);
        if (done) return done;
      }
      return false;
    }

    for (var i = 0; i < maps.length; ++i) {
      var done = lookup(maps[i]);
      if (done) return done;
    }
  }
  function isModifierKey(event) {
    var name = keyNames[event.keyCode];
    return name == "Ctrl" || name == "Alt" || name == "Shift" || name == "Mod";
  }
  function keyName(event, noShift) {
    if (opera && event.keyCode == 34 && event["char"]) return false;
    var name = keyNames[event.keyCode];
    if (name == null || event.altGraphKey) return false;
    if (event.altKey) name = "Alt-" + name;
    if (flipCtrlCmd ? event.metaKey : event.ctrlKey) name = "Ctrl-" + name;
    if (flipCtrlCmd ? event.ctrlKey : event.metaKey) name = "Cmd-" + name;
    if (!noShift && event.shiftKey) name = "Shift-" + name;
    return name;
  }
  CodeMirror.lookupKey = lookupKey;
  CodeMirror.isModifierKey = isModifierKey;
  CodeMirror.keyName = keyName;

  // FROMTEXTAREA

  CodeMirror.fromTextArea = function(textarea, options) {
    if (!options) options = {};
    options.value = textarea.value;
    if (!options.tabindex && textarea.tabindex)
      options.tabindex = textarea.tabindex;
    if (!options.placeholder && textarea.placeholder)
      options.placeholder = textarea.placeholder;
    // Set autofocus to true if this textarea is focused, or if it has
    // autofocus and no other element is focused.
    if (options.autofocus == null) {
      var hasFocus = document.body;
      // doc.activeElement occasionally throws on IE
      try { hasFocus = document.activeElement; } catch(e) {}
      options.autofocus = hasFocus == textarea ||
        textarea.getAttribute("autofocus") != null && hasFocus == document.body;
    }

    function save() {textarea.value = cm.getValue();}
    if (textarea.form) {
      on(textarea.form, "submit", save);
      // Deplorable hack to make the submit method do the right thing.
      if (!options.leaveSubmitMethodAlone) {
        var form = textarea.form, realSubmit = form.submit;
        try {
          var wrappedSubmit = form.submit = function() {
            save();
            form.submit = realSubmit;
            form.submit();
            form.submit = wrappedSubmit;
          };
        } catch(e) {}
      }
    }

    textarea.style.display = "none";
    var cm = CodeMirror(function(node) {
      textarea.parentNode.insertBefore(node, textarea.nextSibling);
    }, options);
    cm.save = save;
    cm.getTextArea = function() { return textarea; };
    cm.toTextArea = function() {
      save();
      textarea.parentNode.removeChild(cm.getWrapperElement());
      textarea.style.display = "";
      if (textarea.form) {
        off(textarea.form, "submit", save);
        if (typeof textarea.form.submit == "function")
          textarea.form.submit = realSubmit;
      }
    };
    return cm;
  };

  // STRING STREAM

  // Fed to the mode parsers, provides helper functions to make
  // parsers more succinct.

  // The character stream used by a mode's parser.
  function StringStream(string, tabSize) {
    this.pos = this.start = 0;
    this.string = string;
    this.tabSize = tabSize || 8;
    this.lastColumnPos = this.lastColumnValue = 0;
  }

  StringStream.prototype = {
    eol: function() {return this.pos >= this.string.length;},
    sol: function() {return this.pos == 0;},
    peek: function() {return this.string.charAt(this.pos) || undefined;},
    next: function() {
      if (this.pos < this.string.length)
        return this.string.charAt(this.pos++);
    },
    eat: function(match) {
      var ch = this.string.charAt(this.pos);
      if (typeof match == "string") var ok = ch == match;
      else var ok = ch && (match.test ? match.test(ch) : match(ch));
      if (ok) {++this.pos; return ch;}
    },
    eatWhile: function(match) {
      var start = this.pos;
      while (this.eat(match)){}
      return this.pos > start;
    },
    eatSpace: function() {
      var start = this.pos;
      while (/[\s\u00a0]/.test(this.string.charAt(this.pos))) ++this.pos;
      return this.pos > start;
    },
    skipToEnd: function() {this.pos = this.string.length;},
    skipTo: function(ch) {
      var found = this.string.indexOf(ch, this.pos);
      if (found > -1) {this.pos = found; return true;}
    },
    backUp: function(n) {this.pos -= n;},
    column: function() {
      if (this.lastColumnPos < this.start) {
        this.lastColumnValue = countColumn(this.string, this.start, this.tabSize, this.lastColumnPos, this.lastColumnValue);
        this.lastColumnPos = this.start;
      }
      return this.lastColumnValue;
    },
    indentation: function() {return countColumn(this.string, null, this.tabSize);},
    match: function(pattern, consume, caseInsensitive) {
      if (typeof pattern == "string") {
        var cased = function(str) {return caseInsensitive ? str.toLowerCase() : str;};
        var substr = this.string.substr(this.pos, pattern.length);
        if (cased(substr) == cased(pattern)) {
          if (consume !== false) this.pos += pattern.length;
          return true;
        }
      } else {
        var match = this.string.slice(this.pos).match(pattern);
        if (match && match.index > 0) return null;
        if (match && consume !== false) this.pos += match[0].length;
        return match;
      }
    },
    current: function(){return this.string.slice(this.start, this.pos);}
  };
  CodeMirror.StringStream = StringStream;

  // TEXTMARKERS

  function TextMarker(doc, type) {
    this.lines = [];
    this.type = type;
    this.doc = doc;
  }
  CodeMirror.TextMarker = TextMarker;

  TextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    var cm = this.doc.cm, withOp = cm && !cm.curOp;
    if (withOp) startOperation(cm);
    var min = null, max = null;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.to != null) max = lineNo(line);
      line.markedSpans = removeMarkedSpan(line.markedSpans, span);
      if (span.from != null)
        min = lineNo(line);
      else if (this.collapsed && !lineIsHidden(this.doc, line) && cm)
        updateLineHeight(line, textHeight(cm.display));
    }
    if (cm && this.collapsed && !cm.options.lineWrapping) for (var i = 0; i < this.lines.length; ++i) {
      var visual = visualLine(cm.doc, this.lines[i]), len = lineLength(cm.doc, visual);
      if (len > cm.display.maxLineLength) {
        cm.display.maxLine = visual;
        cm.display.maxLineLength = len;
        cm.display.maxLineChanged = true;
      }
    }

    if (min != null && cm) regChange(cm, min, max + 1);
    this.lines.length = 0;
    this.explicitlyCleared = true;
    if (this.collapsed && this.doc.cantEdit) {
      this.doc.cantEdit = false;
      if (cm) reCheckSelection(cm);
    }
    if (withOp) endOperation(cm);
    signalLater(this, "clear");
  };

  TextMarker.prototype.find = function() {
    var from, to;
    for (var i = 0; i < this.lines.length; ++i) {
      var line = this.lines[i];
      var span = getMarkedSpanFor(line.markedSpans, this);
      if (span.from != null || span.to != null) {
        var found = lineNo(line);
        if (span.from != null) from = Pos(found, span.from);
        if (span.to != null) to = Pos(found, span.to);
      }
    }
    if (this.type == "bookmark") return from;
    return from && {from: from, to: to};
  };

  TextMarker.prototype.getOptions = function(copyWidget) {
    var repl = this.replacedWith;
    return {className: this.className,
            inclusiveLeft: this.inclusiveLeft, inclusiveRight: this.inclusiveRight,
            atomic: this.atomic,
            collapsed: this.collapsed,
            replacedWith: copyWidget ? repl && repl.cloneNode(true) : repl,
            readOnly: this.readOnly,
            startStyle: this.startStyle, endStyle: this.endStyle};
  };

  TextMarker.prototype.attachLine = function(line) {
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      if (!op.maybeHiddenMarkers || indexOf(op.maybeHiddenMarkers, this) == -1)
        (op.maybeUnhiddenMarkers || (op.maybeUnhiddenMarkers = [])).push(this);
    }
    this.lines.push(line);
  };
  TextMarker.prototype.detachLine = function(line) {
    this.lines.splice(indexOf(this.lines, line), 1);
    if (!this.lines.length && this.doc.cm) {
      var op = this.doc.cm.curOp;
      (op.maybeHiddenMarkers || (op.maybeHiddenMarkers = [])).push(this);
    }
  };

  function markText(doc, from, to, options, type) {
    if (options && options.shared) return markTextShared(doc, from, to, options, type);
    if (doc.cm && !doc.cm.curOp) return operation(doc.cm, markText)(doc, from, to, options, type);

    var marker = new TextMarker(doc, type);
    if (type == "range" && !posLess(from, to)) return marker;
    if (options) copyObj(options, marker);
    if (marker.replacedWith) {
      marker.collapsed = true;
      marker.replacedWith = elt("span", [marker.replacedWith], "CodeMirror-widget");
    }
    if (marker.collapsed) sawCollapsedSpans = true;

    if (marker.addToHistory)
      addToHistory(doc, {from: from, to: to, origin: "markText"},
                   {head: doc.sel.head, anchor: doc.sel.anchor}, NaN);

    var curLine = from.line, size = 0, collapsedAtStart, collapsedAtEnd, cm = doc.cm, updateMaxLine;
    doc.iter(curLine, to.line + 1, function(line) {
      if (cm && marker.collapsed && !cm.options.lineWrapping && visualLine(doc, line) == cm.display.maxLine)
        updateMaxLine = true;
      var span = {from: null, to: null, marker: marker};
      size += line.text.length;
      if (curLine == from.line) {span.from = from.ch; size -= from.ch;}
      if (curLine == to.line) {span.to = to.ch; size -= line.text.length - to.ch;}
      if (marker.collapsed) {
        if (curLine == to.line) collapsedAtEnd = collapsedSpanAt(line, to.ch);
        if (curLine == from.line) collapsedAtStart = collapsedSpanAt(line, from.ch);
        else updateLineHeight(line, 0);
      }
      addMarkedSpan(line, span);
      ++curLine;
    });
    if (marker.collapsed) doc.iter(from.line, to.line + 1, function(line) {
      if (lineIsHidden(doc, line)) updateLineHeight(line, 0);
    });

    if (marker.clearOnEnter) on(marker, "beforeCursorEnter", function() { marker.clear(); });

    if (marker.readOnly) {
      sawReadOnlySpans = true;
      if (doc.history.done.length || doc.history.undone.length)
        doc.clearHistory();
    }
    if (marker.collapsed) {
      if (collapsedAtStart != collapsedAtEnd)
        throw new Error("Inserting collapsed marker overlapping an existing one");
      marker.size = size;
      marker.atomic = true;
    }
    if (cm) {
      if (updateMaxLine) cm.curOp.updateMaxLine = true;
      if (marker.className || marker.startStyle || marker.endStyle || marker.collapsed)
        regChange(cm, from.line, to.line + 1);
      if (marker.atomic) reCheckSelection(cm);
    }
    return marker;
  }

  // SHARED TEXTMARKERS

  function SharedTextMarker(markers, primary) {
    this.markers = markers;
    this.primary = primary;
    for (var i = 0, me = this; i < markers.length; ++i) {
      markers[i].parent = this;
      on(markers[i], "clear", function(){me.clear();});
    }
  }
  CodeMirror.SharedTextMarker = SharedTextMarker;

  SharedTextMarker.prototype.clear = function() {
    if (this.explicitlyCleared) return;
    this.explicitlyCleared = true;
    for (var i = 0; i < this.markers.length; ++i)
      this.markers[i].clear();
    signalLater(this, "clear");
  };
  SharedTextMarker.prototype.find = function() {
    return this.primary.find();
  };
  SharedTextMarker.prototype.getOptions = function(copyWidget) {
    var inner = this.primary.getOptions(copyWidget);
    inner.shared = true;
    return inner;
  };

  function markTextShared(doc, from, to, options, type) {
    options = copyObj(options);
    options.shared = false;
    var markers = [markText(doc, from, to, options, type)], primary = markers[0];
    var widget = options.replacedWith;
    linkedDocs(doc, function(doc) {
      if (widget) options.replacedWith = widget.cloneNode(true);
      markers.push(markText(doc, clipPos(doc, from), clipPos(doc, to), options, type));
      for (var i = 0; i < doc.linked.length; ++i)
        if (doc.linked[i].isParent) return;
      primary = lst(markers);
    });
    return new SharedTextMarker(markers, primary);
  }

  // TEXTMARKER SPANS

  function getMarkedSpanFor(spans, marker) {
    if (spans) for (var i = 0; i < spans.length; ++i) {
      var span = spans[i];
      if (span.marker == marker) return span;
    }
  }
  function removeMarkedSpan(spans, span) {
    for (var r, i = 0; i < spans.length; ++i)
      if (spans[i] != span) (r || (r = [])).push(spans[i]);
    return r;
  }
  function addMarkedSpan(line, span) {
    line.markedSpans = line.markedSpans ? line.markedSpans.concat([span]) : [span];
    span.marker.attachLine(line);
  }

  function markedSpansBefore(old, startCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= startCh : span.from < startCh);
      if (startsBefore || marker.type == "bookmark" && span.from == startCh && (!isInsert || !span.marker.insertLeft)) {
        var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= startCh : span.to > startCh);
        (nw || (nw = [])).push({from: span.from,
                                to: endsAfter ? null : span.to,
                                marker: marker});
      }
    }
    return nw;
  }

  function markedSpansAfter(old, endCh, isInsert) {
    if (old) for (var i = 0, nw; i < old.length; ++i) {
      var span = old[i], marker = span.marker;
      var endsAfter = span.to == null || (marker.inclusiveRight ? span.to >= endCh : span.to > endCh);
      if (endsAfter || marker.type == "bookmark" && span.from == endCh && (!isInsert || span.marker.insertLeft)) {
        var startsBefore = span.from == null || (marker.inclusiveLeft ? span.from <= endCh : span.from < endCh);
        (nw || (nw = [])).push({from: startsBefore ? null : span.from - endCh,
                                to: span.to == null ? null : span.to - endCh,
                                marker: marker});
      }
    }
    return nw;
  }

  function stretchSpansOverChange(doc, change) {
    var oldFirst = isLine(doc, change.from.line) && getLine(doc, change.from.line).markedSpans;
    var oldLast = isLine(doc, change.to.line) && getLine(doc, change.to.line).markedSpans;
    if (!oldFirst && !oldLast) return null;

    var startCh = change.from.ch, endCh = change.to.ch, isInsert = posEq(change.from, change.to);
    // Get the spans that 'stick out' on both sides
    var first = markedSpansBefore(oldFirst, startCh, isInsert);
    var last = markedSpansAfter(oldLast, endCh, isInsert);

    // Next, merge those two ends
    var sameLine = change.text.length == 1, offset = lst(change.text).length + (sameLine ? startCh : 0);
    if (first) {
      // Fix up .to properties of first
      for (var i = 0; i < first.length; ++i) {
        var span = first[i];
        if (span.to == null) {
          var found = getMarkedSpanFor(last, span.marker);
          if (!found) span.to = startCh;
          else if (sameLine) span.to = found.to == null ? null : found.to + offset;
        }
      }
    }
    if (last) {
      // Fix up .from in last (or move them into first in case of sameLine)
      for (var i = 0; i < last.length; ++i) {
        var span = last[i];
        if (span.to != null) span.to += offset;
        if (span.from == null) {
          var found = getMarkedSpanFor(first, span.marker);
          if (!found) {
            span.from = offset;
            if (sameLine) (first || (first = [])).push(span);
          }
        } else {
          span.from += offset;
          if (sameLine) (first || (first = [])).push(span);
        }
      }
    }

    var newMarkers = [first];
    if (!sameLine) {
      // Fill gap with whole-line-spans
      var gap = change.text.length - 2, gapMarkers;
      if (gap > 0 && first)
        for (var i = 0; i < first.length; ++i)
          if (first[i].to == null)
            (gapMarkers || (gapMarkers = [])).push({from: null, to: null, marker: first[i].marker});
      for (var i = 0; i < gap; ++i)
        newMarkers.push(gapMarkers);
      newMarkers.push(last);
    }
    return newMarkers;
  }

  function mergeOldSpans(doc, change) {
    var old = getOldSpans(doc, change);
    var stretched = stretchSpansOverChange(doc, change);
    if (!old) return stretched;
    if (!stretched) return old;

    for (var i = 0; i < old.length; ++i) {
      var oldCur = old[i], stretchCur = stretched[i];
      if (oldCur && stretchCur) {
        spans: for (var j = 0; j < stretchCur.length; ++j) {
          var span = stretchCur[j];
          for (var k = 0; k < oldCur.length; ++k)
            if (oldCur[k].marker == span.marker) continue spans;
          oldCur.push(span);
        }
      } else if (stretchCur) {
        old[i] = stretchCur;
      }
    }
    return old;
  }

  function removeReadOnlyRanges(doc, from, to) {
    var markers = null;
    doc.iter(from.line, to.line + 1, function(line) {
      if (line.markedSpans) for (var i = 0; i < line.markedSpans.length; ++i) {
        var mark = line.markedSpans[i].marker;
        if (mark.readOnly && (!markers || indexOf(markers, mark) == -1))
          (markers || (markers = [])).push(mark);
      }
    });
    if (!markers) return null;
    var parts = [{from: from, to: to}];
    for (var i = 0; i < markers.length; ++i) {
      var mk = markers[i], m = mk.find();
      for (var j = 0; j < parts.length; ++j) {
        var p = parts[j];
        if (posLess(p.to, m.from) || posLess(m.to, p.from)) continue;
        var newParts = [j, 1];
        if (posLess(p.from, m.from) || !mk.inclusiveLeft && posEq(p.from, m.from))
          newParts.push({from: p.from, to: m.from});
        if (posLess(m.to, p.to) || !mk.inclusiveRight && posEq(p.to, m.to))
          newParts.push({from: m.to, to: p.to});
        parts.splice.apply(parts, newParts);
        j += newParts.length - 1;
      }
    }
    return parts;
  }

  function collapsedSpanAt(line, ch) {
    var sps = sawCollapsedSpans && line.markedSpans, found;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (!sp.marker.collapsed) continue;
      if ((sp.from == null || sp.from < ch) &&
          (sp.to == null || sp.to > ch) &&
          (!found || found.width < sp.marker.width))
        found = sp.marker;
    }
    return found;
  }
  function collapsedSpanAtStart(line) { return collapsedSpanAt(line, -1); }
  function collapsedSpanAtEnd(line) { return collapsedSpanAt(line, line.text.length + 1); }

  function visualLine(doc, line) {
    var merged;
    while (merged = collapsedSpanAtStart(line))
      line = getLine(doc, merged.find().from.line);
    return line;
  }

  function lineIsHidden(doc, line) {
    var sps = sawCollapsedSpans && line.markedSpans;
    if (sps) for (var sp, i = 0; i < sps.length; ++i) {
      sp = sps[i];
      if (!sp.marker.collapsed) continue;
      if (sp.from == null) return true;
      if (sp.from == 0 && sp.marker.inclusiveLeft && lineIsHiddenInner(doc, line, sp))
        return true;
    }
  }
  function lineIsHiddenInner(doc, line, span) {
    if (span.to == null) {
      var end = span.marker.find().to, endLine = getLine(doc, end.line);
      return lineIsHiddenInner(doc, endLine, getMarkedSpanFor(endLine.markedSpans, span.marker));
    }
    if (span.marker.inclusiveRight && span.to == line.text.length)
      return true;
    for (var sp, i = 0; i < line.markedSpans.length; ++i) {
      sp = line.markedSpans[i];
      if (sp.marker.collapsed && sp.from == span.to &&
          (sp.marker.inclusiveLeft || span.marker.inclusiveRight) &&
          lineIsHiddenInner(doc, line, sp)) return true;
    }
  }

  function detachMarkedSpans(line) {
    var spans = line.markedSpans;
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.detachLine(line);
    line.markedSpans = null;
  }

  function attachMarkedSpans(line, spans) {
    if (!spans) return;
    for (var i = 0; i < spans.length; ++i)
      spans[i].marker.attachLine(line);
    line.markedSpans = spans;
  }

  // LINE WIDGETS

  var LineWidget = CodeMirror.LineWidget = function(cm, node, options) {
    for (var opt in options) if (options.hasOwnProperty(opt))
      this[opt] = options[opt];
    this.cm = cm;
    this.node = node;
  };
  function widgetOperation(f) {
    return function() {
      var withOp = !this.cm.curOp;
      if (withOp) startOperation(this.cm);
      try {var result = f.apply(this, arguments);}
      finally {if (withOp) endOperation(this.cm);}
      return result;
    };
  }
  LineWidget.prototype.clear = widgetOperation(function() {
    var ws = this.line.widgets, no = lineNo(this.line);
    if (no == null || !ws) return;
    for (var i = 0; i < ws.length; ++i) if (ws[i] == this) ws.splice(i--, 1);
    if (!ws.length) this.line.widgets = null;
    updateLineHeight(this.line, Math.max(0, this.line.height - widgetHeight(this)));
    regChange(this.cm, no, no + 1);
  });
  LineWidget.prototype.changed = widgetOperation(function() {
    var oldH = this.height;
    this.height = null;
    var diff = widgetHeight(this) - oldH;
    if (!diff) return;
    updateLineHeight(this.line, this.line.height + diff);
    var no = lineNo(this.line);
    regChange(this.cm, no, no + 1);
  });

  function widgetHeight(widget) {
    if (widget.height != null) return widget.height;
    if (!widget.node.parentNode || widget.node.parentNode.nodeType != 1)
      removeChildrenAndAdd(widget.cm.display.measure, elt("div", [widget.node], null, "position: relative"));
    return widget.height = widget.node.offsetHeight;
  }

  function addLineWidget(cm, handle, node, options) {
    var widget = new LineWidget(cm, node, options);
    if (widget.noHScroll) cm.display.alignWidgets = true;
    changeLine(cm, handle, function(line) {
      (line.widgets || (line.widgets = [])).push(widget);
      widget.line = line;
      if (!lineIsHidden(cm.doc, line) || widget.showIfHidden) {
        var aboveVisible = heightAtLine(cm, line) < cm.display.scroller.scrollTop;
        updateLineHeight(line, line.height + widgetHeight(widget));
        if (aboveVisible) addToScrollPos(cm, 0, widget.height);
      }
      return true;
    });
    return widget;
  }

  // LINE DATA STRUCTURE

  // Line objects. These hold state related to a line, including
  // highlighting info (the styles array).
  function makeLine(text, markedSpans, estimateHeight) {
    var line = {text: text};
    attachMarkedSpans(line, markedSpans);
    line.height = estimateHeight ? estimateHeight(line) : 1;
    return line;
  }

  function updateLine(line, text, markedSpans, estimateHeight) {
    line.text = text;
    if (line.stateAfter) line.stateAfter = null;
    if (line.styles) line.styles = null;
    if (line.order != null) line.order = null;
    detachMarkedSpans(line);
    attachMarkedSpans(line, markedSpans);
    var estHeight = estimateHeight ? estimateHeight(line) : 1;
    if (estHeight != line.height) updateLineHeight(line, estHeight);
  }

  function cleanUpLine(line) {
    line.parent = null;
    detachMarkedSpans(line);
  }

  // Run the given mode's parser over a line, update the styles
  // array, which contains alternating fragments of text and CSS
  // classes.
  function runMode(cm, text, mode, state, f) {
    var flattenSpans = mode.flattenSpans;
    if (flattenSpans == null) flattenSpans = cm.options.flattenSpans;
    var curText = "", curStyle = null;
    var stream = new StringStream(text, cm.options.tabSize), style;
    if (text == "" && mode.blankLine) mode.blankLine(state);
    while (!stream.eol()) {
      if (stream.pos > cm.options.maxHighlightLength) {
        flattenSpans = false;
        // Webkit seems to refuse to render text nodes longer than 57444 characters
        stream.pos = Math.min(text.length, stream.start + 50000);
        style = null;
      } else {
        style = mode.token(stream, state);
      }
      var substr = stream.current();
      stream.start = stream.pos;
      if (!flattenSpans || curStyle != style) {
        if (curText) f(curText, curStyle);
        curText = substr; curStyle = style;
      } else curText = curText + substr;
    }
    if (curText) f(curText, curStyle);
  }

  function highlightLine(cm, line, state) {
    // A styles array always starts with a number identifying the
    // mode/overlays that it is based on (for easy invalidation).
    var st = [cm.state.modeGen];
    // Compute the base array of styles
    runMode(cm, line.text, cm.doc.mode, state, function(txt, style) {st.push(txt, style);});

    // Run overlays, adjust style array.
    for (var o = 0; o < cm.state.overlays.length; ++o) {
      var overlay = cm.state.overlays[o], i = 1;
      runMode(cm, line.text, overlay.mode, true, function(txt, style) {
        var start = i, len = txt.length;
        // Ensure there's a token end at the current position, and that i points at it
        while (len) {
          var cur = st[i], len_ = cur.length;
          if (len_ <= len) {
            len -= len_;
          } else {
            st.splice(i, 1, cur.slice(0, len), st[i+1], cur.slice(len));
            len = 0;
          }
          i += 2;
        }
        if (!style) return;
        if (overlay.opaque) {
          st.splice(start, i - start, txt, style);
          i = start + 2;
        } else {
          for (; start < i; start += 2) {
            var cur = st[start+1];
            st[start+1] = cur ? cur + " " + style : style;
          }
        }
      });
    }

    return st;
  }

  function getLineStyles(cm, line) {
    if (!line.styles || line.styles[0] != cm.state.modeGen)
      line.styles = highlightLine(cm, line, line.stateAfter = getStateBefore(cm, lineNo(line)));
    return line.styles;
  }

  // Lightweight form of highlight -- proceed over this line and
  // update state, but don't save a style array.
  function processLine(cm, line, state) {
    var mode = cm.doc.mode;
    var stream = new StringStream(line.text, cm.options.tabSize);
    if (line.text == "" && mode.blankLine) mode.blankLine(state);
    while (!stream.eol() && stream.pos <= cm.options.maxHighlightLength) {
      mode.token(stream, state);
      stream.start = stream.pos;
    }
  }

  var styleToClassCache = {};
  function styleToClass(style) {
    if (!style) return null;
    return styleToClassCache[style] ||
      (styleToClassCache[style] = "cm-" + style.replace(/ +/g, " cm-"));
  }

  function lineContent(cm, realLine, measure) {
    var merged, line = realLine, lineBefore, sawBefore, simple = true;
    while (merged = collapsedSpanAtStart(line)) {
      simple = false;
      line = getLine(cm.doc, merged.find().from.line);
      if (!lineBefore) lineBefore = line;
    }

    var builder = {pre: elt("pre"), col: 0, pos: 0, display: !measure,
                   measure: null, addedOne: false, cm: cm};
    if (line.textClass) builder.pre.className = line.textClass;

    do {
      builder.measure = line == realLine && measure;
      builder.pos = 0;
      builder.addToken = builder.measure ? buildTokenMeasure : buildToken;
      if ((ie || webkit) && cm.getOption("lineWrapping"))
        builder.addToken = buildTokenSplitSpaces(builder.addToken);
      if (measure && sawBefore && line != realLine && !builder.addedOne) {
        measure[0] = builder.pre.appendChild(zeroWidthElement(cm.display.measure));
        builder.addedOne = true;
      }
      var next = insertLineContent(line, builder, getLineStyles(cm, line));
      sawBefore = line == lineBefore;
      if (next) {
        line = getLine(cm.doc, next.to.line);
        simple = false;
      }
    } while (next);

    if (measure && !builder.addedOne)
      measure[0] = builder.pre.appendChild(simple ? elt("span", "\u00a0") : zeroWidthElement(cm.display.measure));
    if (!builder.pre.firstChild && !lineIsHidden(cm.doc, realLine))
      builder.pre.appendChild(document.createTextNode("\u00a0"));

    var order;
    // Work around problem with the reported dimensions of single-char
    // direction spans on IE (issue #1129). See also the comment in
    // cursorCoords.
    if (measure && ie && (order = getOrder(line))) {
      var l = order.length - 1;
      if (order[l].from == order[l].to) --l;
      var last = order[l], prev = order[l - 1];
      if (last.from + 1 == last.to && prev && last.level < prev.level) {
        var span = measure[builder.pos - 1];
        if (span) span.parentNode.insertBefore(span.measureRight = zeroWidthElement(cm.display.measure),
                                               span.nextSibling);
      }
    }

    signal(cm, "renderLine", cm, realLine, builder.pre);
    return builder.pre;
  }

  var tokenSpecialChars = /[\t\u0000-\u0019\u00ad\u200b\u2028\u2029\uFEFF]/g;
  function buildToken(builder, text, style, startStyle, endStyle) {
    if (!text) return;
    if (!tokenSpecialChars.test(text)) {
      builder.col += text.length;
      var content = document.createTextNode(text);
    } else {
      var content = document.createDocumentFragment(), pos = 0;
      while (true) {
        tokenSpecialChars.lastIndex = pos;
        var m = tokenSpecialChars.exec(text);
        var skipped = m ? m.index - pos : text.length - pos;
        if (skipped) {
          content.appendChild(document.createTextNode(text.slice(pos, pos + skipped)));
          builder.col += skipped;
        }
        if (!m) break;
        pos += skipped + 1;
        if (m[0] == "\t") {
          var tabSize = builder.cm.options.tabSize, tabWidth = tabSize - builder.col % tabSize;
          content.appendChild(elt("span", spaceStr(tabWidth), "cm-tab"));
          builder.col += tabWidth;
        } else {
          var token = elt("span", "\u2022", "cm-invalidchar");
          token.title = "\\u" + m[0].charCodeAt(0).toString(16);
          content.appendChild(token);
          builder.col += 1;
        }
      }
    }
    if (style || startStyle || endStyle || builder.measure) {
      var fullStyle = style || "";
      if (startStyle) fullStyle += startStyle;
      if (endStyle) fullStyle += endStyle;
      return builder.pre.appendChild(elt("span", [content], fullStyle));
    }
    builder.pre.appendChild(content);
  }

  function buildTokenMeasure(builder, text, style, startStyle, endStyle) {
    var wrapping = builder.cm.options.lineWrapping;
    for (var i = 0; i < text.length; ++i) {
      var ch = text.charAt(i), start = i == 0;
      if (ch >= "\ud800" && ch < "\udbff" && i < text.length - 1) {
        ch = text.slice(i, i + 2);
        ++i;
      } else if (i && wrapping &&
                 spanAffectsWrapping.test(text.slice(i - 1, i + 1))) {
        builder.pre.appendChild(elt("wbr"));
      }
      var span = builder.measure[builder.pos] =
        buildToken(builder, ch, style,
                   start && startStyle, i == text.length - 1 && endStyle);
      // In IE single-space nodes wrap differently than spaces
      // embedded in larger text nodes, except when set to
      // white-space: normal (issue #1268).
      if (ie && wrapping && ch == " " && i && !/\s/.test(text.charAt(i - 1)) &&
          i < text.length - 1 && !/\s/.test(text.charAt(i + 1)))
        span.style.whiteSpace = "normal";
      builder.pos += ch.length;
    }
    if (text.length) builder.addedOne = true;
  }

  function buildTokenSplitSpaces(inner) {
    function split(old) {
      var out = " ";
      for (var i = 0; i < old.length - 2; ++i) out += i % 2 ? " " : "\u00a0";
      out += " ";
      return out;
    }
    return function(builder, text, style, startStyle, endStyle) {
      return inner(builder, text.replace(/ {3,}/, split), style, startStyle, endStyle);
    };
  }

  function buildCollapsedSpan(builder, size, widget) {
    if (widget) {
      if (!builder.display) widget = widget.cloneNode(true);
      builder.pre.appendChild(widget);
      if (builder.measure && size) {
        builder.measure[builder.pos] = widget;
        builder.addedOne = true;
      }
    }
    builder.pos += size;
  }

  // Outputs a number of spans to make up a line, taking highlighting
  // and marked text into account.
  function insertLineContent(line, builder, styles) {
    var spans = line.markedSpans;
    if (!spans) {
      for (var i = 1; i < styles.length; i+=2)
        builder.addToken(builder, styles[i], styleToClass(styles[i+1]));
      return;
    }

    var allText = line.text, len = allText.length;
    var pos = 0, i = 1, text = "", style;
    var nextChange = 0, spanStyle, spanEndStyle, spanStartStyle, collapsed;
    for (;;) {
      if (nextChange == pos) { // Update current marker set
        spanStyle = spanEndStyle = spanStartStyle = "";
        collapsed = null; nextChange = Infinity;
        var foundBookmark = null;
        for (var j = 0; j < spans.length; ++j) {
          var sp = spans[j], m = sp.marker;
          if (sp.from <= pos && (sp.to == null || sp.to > pos)) {
            if (sp.to != null && nextChange > sp.to) { nextChange = sp.to; spanEndStyle = ""; }
            if (m.className) spanStyle += " " + m.className;
            if (m.startStyle && sp.from == pos) spanStartStyle += " " + m.startStyle;
            if (m.endStyle && sp.to == nextChange) spanEndStyle += " " + m.endStyle;
            if (m.collapsed && (!collapsed || collapsed.marker.width < m.width))
              collapsed = sp;
          } else if (sp.from > pos && nextChange > sp.from) {
            nextChange = sp.from;
          }
          if (m.type == "bookmark" && sp.from == pos && m.replacedWith)
            foundBookmark = m.replacedWith;
        }
        if (collapsed && (collapsed.from || 0) == pos) {
          buildCollapsedSpan(builder, (collapsed.to == null ? len : collapsed.to) - pos,
                             collapsed.from != null && collapsed.marker.replacedWith);
          if (collapsed.to == null) return collapsed.marker.find();
        }
        if (foundBookmark && !collapsed) buildCollapsedSpan(builder, 0, foundBookmark);
      }
      if (pos >= len) break;

      var upto = Math.min(len, nextChange);
      while (true) {
        if (text) {
          var end = pos + text.length;
          if (!collapsed) {
            var tokenText = end > upto ? text.slice(0, upto - pos) : text;
            builder.addToken(builder, tokenText, style ? style + spanStyle : spanStyle,
                             spanStartStyle, pos + tokenText.length == nextChange ? spanEndStyle : "");
          }
          if (end >= upto) {text = text.slice(upto - pos); pos = upto; break;}
          pos = end;
          spanStartStyle = "";
        }
        text = styles[i++]; style = styleToClass(styles[i++]);
      }
    }
  }

  // DOCUMENT DATA STRUCTURE

  function updateDoc(doc, change, markedSpans, selAfter, estimateHeight) {
    function spansFor(n) {return markedSpans ? markedSpans[n] : null;}
    function update(line, text, spans) {
      updateLine(line, text, spans, estimateHeight);
      signalLater(line, "change", line, change);
    }

    var from = change.from, to = change.to, text = change.text;
    var firstLine = getLine(doc, from.line), lastLine = getLine(doc, to.line);
    var lastText = lst(text), lastSpans = spansFor(text.length - 1), nlines = to.line - from.line;

    // First adjust the line structure
    if (from.ch == 0 && to.ch == 0 && lastText == "") {
      // This is a whole-line replace. Treated specially to make
      // sure line objects move the way they are supposed to.
      for (var i = 0, e = text.length - 1, added = []; i < e; ++i)
        added.push(makeLine(text[i], spansFor(i), estimateHeight));
      update(lastLine, lastLine.text, lastSpans);
      if (nlines) doc.remove(from.line, nlines);
      if (added.length) doc.insert(from.line, added);
    } else if (firstLine == lastLine) {
      if (text.length == 1) {
        update(firstLine, firstLine.text.slice(0, from.ch) + lastText + firstLine.text.slice(to.ch), lastSpans);
      } else {
        for (var added = [], i = 1, e = text.length - 1; i < e; ++i)
          added.push(makeLine(text[i], spansFor(i), estimateHeight));
        added.push(makeLine(lastText + firstLine.text.slice(to.ch), lastSpans, estimateHeight));
        update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
        doc.insert(from.line + 1, added);
      }
    } else if (text.length == 1) {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0] + lastLine.text.slice(to.ch), spansFor(0));
      doc.remove(from.line + 1, nlines);
    } else {
      update(firstLine, firstLine.text.slice(0, from.ch) + text[0], spansFor(0));
      update(lastLine, lastText + lastLine.text.slice(to.ch), lastSpans);
      for (var i = 1, e = text.length - 1, added = []; i < e; ++i)
        added.push(makeLine(text[i], spansFor(i), estimateHeight));
      if (nlines > 1) doc.remove(from.line + 1, nlines - 1);
      doc.insert(from.line + 1, added);
    }

    signalLater(doc, "change", doc, change);
    setSelection(doc, selAfter.anchor, selAfter.head, null, true);
  }

  function LeafChunk(lines) {
    this.lines = lines;
    this.parent = null;
    for (var i = 0, e = lines.length, height = 0; i < e; ++i) {
      lines[i].parent = this;
      height += lines[i].height;
    }
    this.height = height;
  }

  LeafChunk.prototype = {
    chunkSize: function() { return this.lines.length; },
    removeInner: function(at, n) {
      for (var i = at, e = at + n; i < e; ++i) {
        var line = this.lines[i];
        this.height -= line.height;
        cleanUpLine(line);
        signalLater(line, "delete");
      }
      this.lines.splice(at, n);
    },
    collapse: function(lines) {
      lines.splice.apply(lines, [lines.length, 0].concat(this.lines));
    },
    insertInner: function(at, lines, height) {
      this.height += height;
      this.lines = this.lines.slice(0, at).concat(lines).concat(this.lines.slice(at));
      for (var i = 0, e = lines.length; i < e; ++i) lines[i].parent = this;
    },
    iterN: function(at, n, op) {
      for (var e = at + n; at < e; ++at)
        if (op(this.lines[at])) return true;
    }
  };

  function BranchChunk(children) {
    this.children = children;
    var size = 0, height = 0;
    for (var i = 0, e = children.length; i < e; ++i) {
      var ch = children[i];
      size += ch.chunkSize(); height += ch.height;
      ch.parent = this;
    }
    this.size = size;
    this.height = height;
    this.parent = null;
  }

  BranchChunk.prototype = {
    chunkSize: function() { return this.size; },
    removeInner: function(at, n) {
      this.size -= n;
      for (var i = 0; i < this.children.length; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var rm = Math.min(n, sz - at), oldHeight = child.height;
          child.removeInner(at, rm);
          this.height -= oldHeight - child.height;
          if (sz == rm) { this.children.splice(i--, 1); child.parent = null; }
          if ((n -= rm) == 0) break;
          at = 0;
        } else at -= sz;
      }
      if (this.size - n < 25) {
        var lines = [];
        this.collapse(lines);
        this.children = [new LeafChunk(lines)];
        this.children[0].parent = this;
      }
    },
    collapse: function(lines) {
      for (var i = 0, e = this.children.length; i < e; ++i) this.children[i].collapse(lines);
    },
    insertInner: function(at, lines, height) {
      this.size += lines.length;
      this.height += height;
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at <= sz) {
          child.insertInner(at, lines, height);
          if (child.lines && child.lines.length > 50) {
            while (child.lines.length > 50) {
              var spilled = child.lines.splice(child.lines.length - 25, 25);
              var newleaf = new LeafChunk(spilled);
              child.height -= newleaf.height;
              this.children.splice(i + 1, 0, newleaf);
              newleaf.parent = this;
            }
            this.maybeSpill();
          }
          break;
        }
        at -= sz;
      }
    },
    maybeSpill: function() {
      if (this.children.length <= 10) return;
      var me = this;
      do {
        var spilled = me.children.splice(me.children.length - 5, 5);
        var sibling = new BranchChunk(spilled);
        if (!me.parent) { // Become the parent node
          var copy = new BranchChunk(me.children);
          copy.parent = me;
          me.children = [copy, sibling];
          me = copy;
        } else {
          me.size -= sibling.size;
          me.height -= sibling.height;
          var myIndex = indexOf(me.parent.children, me);
          me.parent.children.splice(myIndex + 1, 0, sibling);
        }
        sibling.parent = me.parent;
      } while (me.children.length > 10);
      me.parent.maybeSpill();
    },
    iterN: function(at, n, op) {
      for (var i = 0, e = this.children.length; i < e; ++i) {
        var child = this.children[i], sz = child.chunkSize();
        if (at < sz) {
          var used = Math.min(n, sz - at);
          if (child.iterN(at, used, op)) return true;
          if ((n -= used) == 0) break;
          at = 0;
        } else at -= sz;
      }
    }
  };

  var nextDocId = 0;
  var Doc = CodeMirror.Doc = function(text, mode, firstLine) {
    if (!(this instanceof Doc)) return new Doc(text, mode, firstLine);
    if (firstLine == null) firstLine = 0;

    BranchChunk.call(this, [new LeafChunk([makeLine("", null)])]);
    this.first = firstLine;
    this.scrollTop = this.scrollLeft = 0;
    this.cantEdit = false;
    this.history = makeHistory();
    this.frontier = firstLine;
    var start = Pos(firstLine, 0);
    this.sel = {from: start, to: start, head: start, anchor: start, shift: false, extend: false, goalColumn: null};
    this.id = ++nextDocId;
    this.modeOption = mode;

    if (typeof text == "string") text = splitLines(text);
    updateDoc(this, {from: start, to: start, text: text}, null, {head: start, anchor: start});
  };

  Doc.prototype = createObj(BranchChunk.prototype, {
    iter: function(from, to, op) {
      if (op) this.iterN(from - this.first, to - from, op);
      else this.iterN(this.first, this.first + this.size, from);
    },

    insert: function(at, lines) {
      var height = 0;
      for (var i = 0, e = lines.length; i < e; ++i) height += lines[i].height;
      this.insertInner(at - this.first, lines, height);
    },
    remove: function(at, n) { this.removeInner(at - this.first, n); },

    getValue: function(lineSep) {
      var lines = getLines(this, this.first, this.first + this.size);
      if (lineSep === false) return lines;
      return lines.join(lineSep || "\n");
    },
    setValue: function(code) {
      var top = Pos(this.first, 0), last = this.first + this.size - 1;
      makeChange(this, {from: top, to: Pos(last, getLine(this, last).text.length),
                        text: splitLines(code), origin: "setValue"},
                 {head: top, anchor: top}, true);
    },
    replaceRange: function(code, from, to, origin) {
      from = clipPos(this, from);
      to = to ? clipPos(this, to) : from;
      replaceRange(this, code, from, to, origin);
    },
    getRange: function(from, to, lineSep) {
      var lines = getBetween(this, clipPos(this, from), clipPos(this, to));
      if (lineSep === false) return lines;
      return lines.join(lineSep || "\n");
    },

    getLine: function(line) {var l = this.getLineHandle(line); return l && l.text;},
    setLine: function(line, text) {
      if (isLine(this, line))
        replaceRange(this, text, Pos(line, 0), clipPos(this, Pos(line)));
    },
    removeLine: function(line) {
      if (line) replaceRange(this, "", clipPos(this, Pos(line - 1)), clipPos(this, Pos(line)));
      else replaceRange(this, "", Pos(0, 0), clipPos(this, Pos(1, 0)));
    },

    getLineHandle: function(line) {if (isLine(this, line)) return getLine(this, line);},
    getLineNumber: function(line) {return lineNo(line);},

    lineCount: function() {return this.size;},
    firstLine: function() {return this.first;},
    lastLine: function() {return this.first + this.size - 1;},

    clipPos: function(pos) {return clipPos(this, pos);},

    getCursor: function(start) {
      var sel = this.sel, pos;
      if (start == null || start == "head") pos = sel.head;
      else if (start == "anchor") pos = sel.anchor;
      else if (start == "end" || start === false) pos = sel.to;
      else pos = sel.from;
      return copyPos(pos);
    },
    somethingSelected: function() {return !posEq(this.sel.head, this.sel.anchor);},

    setCursor: docOperation(function(line, ch, extend) {
      var pos = clipPos(this, typeof line == "number" ? Pos(line, ch || 0) : line);
      if (extend) extendSelection(this, pos);
      else setSelection(this, pos, pos);
    }),
    setSelection: docOperation(function(anchor, head) {
      setSelection(this, clipPos(this, anchor), clipPos(this, head || anchor));
    }),
    extendSelection: docOperation(function(from, to) {
      extendSelection(this, clipPos(this, from), to && clipPos(this, to));
    }),

    getSelection: function(lineSep) {return this.getRange(this.sel.from, this.sel.to, lineSep);},
    replaceSelection: function(code, collapse, origin) {
      makeChange(this, {from: this.sel.from, to: this.sel.to, text: splitLines(code), origin: origin}, collapse || "around");
    },
    undo: docOperation(function() {makeChangeFromHistory(this, "undo");}),
    redo: docOperation(function() {makeChangeFromHistory(this, "redo");}),

    setExtending: function(val) {this.sel.extend = val;},

    historySize: function() {
      var hist = this.history;
      return {undo: hist.done.length, redo: hist.undone.length};
    },
    clearHistory: function() {this.history = makeHistory();},

    markClean: function() {
      this.history.dirtyCounter = 0;
      this.history.lastOp = this.history.lastOrigin = null;
    },
    isClean: function () {return this.history.dirtyCounter == 0;},

    getHistory: function() {
      return {done: copyHistoryArray(this.history.done),
              undone: copyHistoryArray(this.history.undone)};
    },
    setHistory: function(histData) {
      var hist = this.history = makeHistory();
      hist.done = histData.done.slice(0);
      hist.undone = histData.undone.slice(0);
    },

    markText: function(from, to, options) {
      return markText(this, clipPos(this, from), clipPos(this, to), options, "range");
    },
    setBookmark: function(pos, options) {
      var realOpts = {replacedWith: options && (options.nodeType == null ? options.widget : options),
                      insertLeft: options && options.insertLeft};
      pos = clipPos(this, pos);
      return markText(this, pos, pos, realOpts, "bookmark");
    },
    findMarksAt: function(pos) {
      pos = clipPos(this, pos);
      var markers = [], spans = getLine(this, pos.line).markedSpans;
      if (spans) for (var i = 0; i < spans.length; ++i) {
        var span = spans[i];
        if ((span.from == null || span.from <= pos.ch) &&
            (span.to == null || span.to >= pos.ch))
          markers.push(span.marker.parent || span.marker);
      }
      return markers;
    },
    getAllMarks: function() {
      var markers = [];
      this.iter(function(line) {
        var sps = line.markedSpans;
        if (sps) for (var i = 0; i < sps.length; ++i)
          if (sps[i].from != null) markers.push(sps[i].marker);
      });
      return markers;
    },

    posFromIndex: function(off) {
      var ch, lineNo = this.first;
      this.iter(function(line) {
        var sz = line.text.length + 1;
        if (sz > off) { ch = off; return true; }
        off -= sz;
        ++lineNo;
      });
      return clipPos(this, Pos(lineNo, ch));
    },
    indexFromPos: function (coords) {
      coords = clipPos(this, coords);
      var index = coords.ch;
      if (coords.line < this.first || coords.ch < 0) return 0;
      this.iter(this.first, coords.line, function (line) {
        index += line.text.length + 1;
      });
      return index;
    },

    copy: function(copyHistory) {
      var doc = new Doc(getLines(this, this.first, this.first + this.size), this.modeOption, this.first);
      doc.scrollTop = this.scrollTop; doc.scrollLeft = this.scrollLeft;
      doc.sel = {from: this.sel.from, to: this.sel.to, head: this.sel.head, anchor: this.sel.anchor,
                 shift: this.sel.shift, extend: false, goalColumn: this.sel.goalColumn};
      if (copyHistory) {
        doc.history.undoDepth = this.history.undoDepth;
        doc.setHistory(this.getHistory());
      }
      return doc;
    },

    linkedDoc: function(options) {
      if (!options) options = {};
      var from = this.first, to = this.first + this.size;
      if (options.from != null && options.from > from) from = options.from;
      if (options.to != null && options.to < to) to = options.to;
      var copy = new Doc(getLines(this, from, to), options.mode || this.modeOption, from);
      if (options.sharedHist) copy.history = this.history;
      (this.linked || (this.linked = [])).push({doc: copy, sharedHist: options.sharedHist});
      copy.linked = [{doc: this, isParent: true, sharedHist: options.sharedHist}];
      return copy;
    },
    unlinkDoc: function(other) {
      if (other instanceof CodeMirror) other = other.doc;
      if (this.linked) for (var i = 0; i < this.linked.length; ++i) {
        var link = this.linked[i];
        if (link.doc != other) continue;
        this.linked.splice(i, 1);
        other.unlinkDoc(this);
        break;
      }
      // If the histories were shared, split them again
      if (other.history == this.history) {
        var splitIds = [other.id];
        linkedDocs(other, function(doc) {splitIds.push(doc.id);}, true);
        other.history = makeHistory();
        other.history.done = copyHistoryArray(this.history.done, splitIds);
        other.history.undone = copyHistoryArray(this.history.undone, splitIds);
      }
    },
    iterLinkedDocs: function(f) {linkedDocs(this, f);},

    getMode: function() {return this.mode;},
    getEditor: function() {return this.cm;}
  });

  Doc.prototype.eachLine = Doc.prototype.iter;

  // The Doc methods that should be available on CodeMirror instances
  var dontDelegate = "iter insert remove copy getEditor".split(" ");
  for (var prop in Doc.prototype) if (Doc.prototype.hasOwnProperty(prop) && indexOf(dontDelegate, prop) < 0)
    CodeMirror.prototype[prop] = (function(method) {
      return function() {return method.apply(this.doc, arguments);};
    })(Doc.prototype[prop]);

  function linkedDocs(doc, f, sharedHistOnly) {
    function propagate(doc, skip, sharedHist) {
      if (doc.linked) for (var i = 0; i < doc.linked.length; ++i) {
        var rel = doc.linked[i];
        if (rel.doc == skip) continue;
        var shared = sharedHist && rel.sharedHist;
        if (sharedHistOnly && !shared) continue;
        f(rel.doc, shared);
        propagate(rel.doc, doc, shared);
      }
    }
    propagate(doc, null, true);
  }

  function attachDoc(cm, doc) {
    if (doc.cm) throw new Error("This document is already in use.");
    cm.doc = doc;
    doc.cm = cm;
    estimateLineHeights(cm);
    loadMode(cm);
    if (!cm.options.lineWrapping) computeMaxLength(cm);
    cm.options.mode = doc.modeOption;
    regChange(cm);
  }

  // LINE UTILITIES

  function getLine(chunk, n) {
    n -= chunk.first;
    while (!chunk.lines) {
      for (var i = 0;; ++i) {
        var child = chunk.children[i], sz = child.chunkSize();
        if (n < sz) { chunk = child; break; }
        n -= sz;
      }
    }
    return chunk.lines[n];
  }

  function getBetween(doc, start, end) {
    var out = [], n = start.line;
    doc.iter(start.line, end.line + 1, function(line) {
      var text = line.text;
      if (n == end.line) text = text.slice(0, end.ch);
      if (n == start.line) text = text.slice(start.ch);
      out.push(text);
      ++n;
    });
    return out;
  }
  function getLines(doc, from, to) {
    var out = [];
    doc.iter(from, to, function(line) { out.push(line.text); });
    return out;
  }

  function updateLineHeight(line, height) {
    var diff = height - line.height;
    for (var n = line; n; n = n.parent) n.height += diff;
  }

  function lineNo(line) {
    if (line.parent == null) return null;
    var cur = line.parent, no = indexOf(cur.lines, line);
    for (var chunk = cur.parent; chunk; cur = chunk, chunk = chunk.parent) {
      for (var i = 0;; ++i) {
        if (chunk.children[i] == cur) break;
        no += chunk.children[i].chunkSize();
      }
    }
    return no + cur.first;
  }

  function lineAtHeight(chunk, h) {
    var n = chunk.first;
    outer: do {
      for (var i = 0, e = chunk.children.length; i < e; ++i) {
        var child = chunk.children[i], ch = child.height;
        if (h < ch) { chunk = child; continue outer; }
        h -= ch;
        n += child.chunkSize();
      }
      return n;
    } while (!chunk.lines);
    for (var i = 0, e = chunk.lines.length; i < e; ++i) {
      var line = chunk.lines[i], lh = line.height;
      if (h < lh) break;
      h -= lh;
    }
    return n + i;
  }

  function heightAtLine(cm, lineObj) {
    lineObj = visualLine(cm.doc, lineObj);

    var h = 0, chunk = lineObj.parent;
    for (var i = 0; i < chunk.lines.length; ++i) {
      var line = chunk.lines[i];
      if (line == lineObj) break;
      else h += line.height;
    }
    for (var p = chunk.parent; p; chunk = p, p = chunk.parent) {
      for (var i = 0; i < p.children.length; ++i) {
        var cur = p.children[i];
        if (cur == chunk) break;
        else h += cur.height;
      }
    }
    return h;
  }

  function getOrder(line) {
    var order = line.order;
    if (order == null) order = line.order = bidiOrdering(line.text);
    return order;
  }

  // HISTORY

  function makeHistory() {
    return {
      // Arrays of history events. Doing something adds an event to
      // done and clears undo. Undoing moves events from done to
      // undone, redoing moves them in the other direction.
      done: [], undone: [], undoDepth: Infinity,
      // Used to track when changes can be merged into a single undo
      // event
      lastTime: 0, lastOp: null, lastOrigin: null,
      // Used by the isClean() method
      dirtyCounter: 0
    };
  }

  function attachLocalSpans(doc, change, from, to) {
    var existing = change["spans_" + doc.id], n = 0;
    doc.iter(Math.max(doc.first, from), Math.min(doc.first + doc.size, to), function(line) {
      if (line.markedSpans)
        (existing || (existing = change["spans_" + doc.id] = {}))[n] = line.markedSpans;
      ++n;
    });
  }

  function historyChangeFromChange(doc, change) {
    var histChange = {from: change.from, to: changeEnd(change), text: getBetween(doc, change.from, change.to)};
    attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);
    linkedDocs(doc, function(doc) {attachLocalSpans(doc, histChange, change.from.line, change.to.line + 1);}, true);
    return histChange;
  }

  function addToHistory(doc, change, selAfter, opId) {
    var hist = doc.history;
    hist.undone.length = 0;
    var time = +new Date, cur = lst(hist.done);

    if (cur &&
        (hist.lastOp == opId ||
         hist.lastOrigin == change.origin && change.origin &&
         ((change.origin.charAt(0) == "+" && doc.cm && hist.lastTime > time - doc.cm.options.historyEventDelay) ||
          change.origin.charAt(0) == "*"))) {
      // Merge this change into the last event
      var last = lst(cur.changes);
      if (posEq(change.from, change.to) && posEq(change.from, last.to)) {
        // Optimized case for simple insertion -- don't want to add
        // new changesets for every character typed
        last.to = changeEnd(change);
      } else {
        // Add new sub-event
        cur.changes.push(historyChangeFromChange(doc, change));
      }
      cur.anchorAfter = selAfter.anchor; cur.headAfter = selAfter.head;
    } else {
      // Can not be merged, start a new event.
      cur = {changes: [historyChangeFromChange(doc, change)],
             anchorBefore: doc.sel.anchor, headBefore: doc.sel.head,
             anchorAfter: selAfter.anchor, headAfter: selAfter.head};
      hist.done.push(cur);
      while (hist.done.length > hist.undoDepth)
        hist.done.shift();
      if (hist.dirtyCounter < 0)
        // The user has made a change after undoing past the last clean state.
        // We can never get back to a clean state now until markClean() is called.
        hist.dirtyCounter = NaN;
      else
        hist.dirtyCounter++;
    }
    hist.lastTime = time;
    hist.lastOp = opId;
    hist.lastOrigin = change.origin;
  }

  function removeClearedSpans(spans) {
    if (!spans) return null;
    for (var i = 0, out; i < spans.length; ++i) {
      if (spans[i].marker.explicitlyCleared) { if (!out) out = spans.slice(0, i); }
      else if (out) out.push(spans[i]);
    }
    return !out ? spans : out.length ? out : null;
  }

  function getOldSpans(doc, change) {
    var found = change["spans_" + doc.id];
    if (!found) return null;
    for (var i = 0, nw = []; i < change.text.length; ++i)
      nw.push(removeClearedSpans(found[i]));
    return nw;
  }

  // Used both to provide a JSON-safe object in .getHistory, and, when
  // detaching a document, to split the history in two
  function copyHistoryArray(events, newGroup) {
    for (var i = 0, copy = []; i < events.length; ++i) {
      var event = events[i], changes = event.changes, newChanges = [];
      copy.push({changes: newChanges, anchorBefore: event.anchorBefore, headBefore: event.headBefore,
                 anchorAfter: event.anchorAfter, headAfter: event.headAfter});
      for (var j = 0; j < changes.length; ++j) {
        var change = changes[j], m;
        newChanges.push({from: change.from, to: change.to, text: change.text});
        if (newGroup) for (var prop in change) if (m = prop.match(/^spans_(\d+)$/)) {
          if (indexOf(newGroup, Number(m[1])) > -1) {
            lst(newChanges)[prop] = change[prop];
            delete change[prop];
          }
        }
      }
    }
    return copy;
  }

  // Rebasing/resetting history to deal with externally-sourced changes

  function rebaseHistSel(pos, from, to, diff) {
    if (to < pos.line) {
      pos.line += diff;
    } else if (from < pos.line) {
      pos.line = from;
      pos.ch = 0;
    }
  }

  // Tries to rebase an array of history events given a change in the
  // document. If the change touches the same lines as the event, the
  // event, and everything 'behind' it, is discarded. If the change is
  // before the event, the event's positions are updated. Uses a
  // copy-on-write scheme for the positions, to avoid having to
  // reallocate them all on every rebase, but also avoid problems with
  // shared position objects being unsafely updated.
  function rebaseHistArray(array, from, to, diff) {
    for (var i = 0; i < array.length; ++i) {
      var sub = array[i], ok = true;
      for (var j = 0; j < sub.changes.length; ++j) {
        var cur = sub.changes[j];
        if (!sub.copied) { cur.from = copyPos(cur.from); cur.to = copyPos(cur.to); }
        if (to < cur.from.line) {
          cur.from.line += diff;
          cur.to.line += diff;
        } else if (from <= cur.to.line) {
          ok = false;
          break;
        }
      }
      if (!sub.copied) {
        sub.anchorBefore = copyPos(sub.anchorBefore); sub.headBefore = copyPos(sub.headBefore);
        sub.anchorAfter = copyPos(sub.anchorAfter); sub.readAfter = copyPos(sub.headAfter);
        sub.copied = true;
      }
      if (!ok) {
        array.splice(0, i + 1);
        i = 0;
      } else {
        rebaseHistSel(sub.anchorBefore); rebaseHistSel(sub.headBefore);
        rebaseHistSel(sub.anchorAfter); rebaseHistSel(sub.headAfter);
      }
    }
  }

  function rebaseHist(hist, change) {
    var from = change.from.line, to = change.to.line, diff = change.text.length - (to - from) - 1;
    rebaseHistArray(hist.done, from, to, diff);
    rebaseHistArray(hist.undone, from, to, diff);
  }

  // EVENT OPERATORS

  function stopMethod() {e_stop(this);}
  // Ensure an event has a stop method.
  function addStop(event) {
    if (!event.stop) event.stop = stopMethod;
    return event;
  }

  function e_preventDefault(e) {
    if (e.preventDefault) e.preventDefault();
    else e.returnValue = false;
  }
  function e_stopPropagation(e) {
    if (e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
  }
  function e_stop(e) {e_preventDefault(e); e_stopPropagation(e);}
  CodeMirror.e_stop = e_stop;
  CodeMirror.e_preventDefault = e_preventDefault;
  CodeMirror.e_stopPropagation = e_stopPropagation;

  function e_target(e) {return e.target || e.srcElement;}
  function e_button(e) {
    var b = e.which;
    if (b == null) {
      if (e.button & 1) b = 1;
      else if (e.button & 2) b = 3;
      else if (e.button & 4) b = 2;
    }
    if (mac && e.ctrlKey && b == 1) b = 3;
    return b;
  }

  // EVENT HANDLING

  function on(emitter, type, f) {
    if (emitter.addEventListener)
      emitter.addEventListener(type, f, false);
    else if (emitter.attachEvent)
      emitter.attachEvent("on" + type, f);
    else {
      var map = emitter._handlers || (emitter._handlers = {});
      var arr = map[type] || (map[type] = []);
      arr.push(f);
    }
  }

  function off(emitter, type, f) {
    if (emitter.removeEventListener)
      emitter.removeEventListener(type, f, false);
    else if (emitter.detachEvent)
      emitter.detachEvent("on" + type, f);
    else {
      var arr = emitter._handlers && emitter._handlers[type];
      if (!arr) return;
      for (var i = 0; i < arr.length; ++i)
        if (arr[i] == f) { arr.splice(i, 1); break; }
    }
  }

  function signal(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2);
    for (var i = 0; i < arr.length; ++i) arr[i].apply(null, args);
  }

  var delayedCallbacks, delayedCallbackDepth = 0;
  function signalLater(emitter, type /*, values...*/) {
    var arr = emitter._handlers && emitter._handlers[type];
    if (!arr) return;
    var args = Array.prototype.slice.call(arguments, 2);
    if (!delayedCallbacks) {
      ++delayedCallbackDepth;
      delayedCallbacks = [];
      setTimeout(fireDelayed, 0);
    }
    function bnd(f) {return function(){f.apply(null, args);};};
    for (var i = 0; i < arr.length; ++i)
      delayedCallbacks.push(bnd(arr[i]));
  }

  function fireDelayed() {
    --delayedCallbackDepth;
    var delayed = delayedCallbacks;
    delayedCallbacks = null;
    for (var i = 0; i < delayed.length; ++i) delayed[i]();
  }

  function hasHandler(emitter, type) {
    var arr = emitter._handlers && emitter._handlers[type];
    return arr && arr.length > 0;
  }

  CodeMirror.on = on; CodeMirror.off = off; CodeMirror.signal = signal;

  // MISC UTILITIES

  // Number of pixels added to scroller and sizer to hide scrollbar
  var scrollerCutOff = 30;

  // Returned or thrown by various protocols to signal 'I'm not
  // handling this'.
  var Pass = CodeMirror.Pass = {toString: function(){return "CodeMirror.Pass";}};

  function Delayed() {this.id = null;}
  Delayed.prototype = {set: function(ms, f) {clearTimeout(this.id); this.id = setTimeout(f, ms);}};

  // Counts the column offset in a string, taking tabs into account.
  // Used mostly to find indentation.
  function countColumn(string, end, tabSize, startIndex, startValue) {
    if (end == null) {
      end = string.search(/[^\s\u00a0]/);
      if (end == -1) end = string.length;
    }
    for (var i = startIndex || 0, n = startValue || 0; i < end; ++i) {
      if (string.charAt(i) == "\t") n += tabSize - (n % tabSize);
      else ++n;
    }
    return n;
  }
  CodeMirror.countColumn = countColumn;

  var spaceStrs = [""];
  function spaceStr(n) {
    while (spaceStrs.length <= n)
      spaceStrs.push(lst(spaceStrs) + " ");
    return spaceStrs[n];
  }

  function lst(arr) { return arr[arr.length-1]; }

  function selectInput(node) {
    if (ios) { // Mobile Safari apparently has a bug where select() is broken.
      node.selectionStart = 0;
      node.selectionEnd = node.value.length;
    } else node.select();
  }

  function indexOf(collection, elt) {
    if (collection.indexOf) return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i)
      if (collection[i] == elt) return i;
    return -1;
  }

  function createObj(base, props) {
    function Obj() {}
    Obj.prototype = base;
    var inst = new Obj();
    if (props) copyObj(props, inst);
    return inst;
  }

  function copyObj(obj, target) {
    if (!target) target = {};
    for (var prop in obj) if (obj.hasOwnProperty(prop)) target[prop] = obj[prop];
    return target;
  }

  function emptyArray(size) {
    for (var a = [], i = 0; i < size; ++i) a.push(undefined);
    return a;
  }

  function bind(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function(){return f.apply(null, args);};
  }

  var nonASCIISingleCaseWordChar = /[\u3040-\u309f\u30a0-\u30ff\u3400-\u4db5\u4e00-\u9fcc]/;
  function isWordChar(ch) {
    return /\w/.test(ch) || ch > "\x80" &&
      (ch.toUpperCase() != ch.toLowerCase() || nonASCIISingleCaseWordChar.test(ch));
  }

  function isEmpty(obj) {
    for (var n in obj) if (obj.hasOwnProperty(n) && obj[n]) return false;
    return true;
  }

  var isExtendingChar = /[\u0300-\u036F\u0483-\u0487\u0488-\u0489\u0591-\u05BD\u05BF\u05C1-\u05C2\u05C4-\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7-\u06E8\u06EA-\u06ED\uA66F\uA670-\uA672\uA674-\uA67D\uA69F\udc00-\udfff]/;

  // DOM UTILITIES

  function elt(tag, content, className, style) {
    var e = document.createElement(tag);
    if (className) e.className = className;
    if (style) e.style.cssText = style;
    if (typeof content == "string") setTextContent(e, content);
    else if (content) for (var i = 0; i < content.length; ++i) e.appendChild(content[i]);
    return e;
  }

  function removeChildren(e) {
    for (var count = e.childNodes.length; count > 0; --count)
      e.removeChild(e.firstChild);
    return e;
  }

  function removeChildrenAndAdd(parent, e) {
    return removeChildren(parent).appendChild(e);
  }

  function setTextContent(e, str) {
    if (ie_lt9) {
      e.innerHTML = "";
      e.appendChild(document.createTextNode(str));
    } else e.textContent = str;
  }

  function getRect(node) {
    return node.getBoundingClientRect();
  }
  CodeMirror.replaceGetRect = function(f) { getRect = f; };

  // FEATURE DETECTION

  // Detect drag-and-drop
  var dragAndDrop = function() {
    // There is *some* kind of drag-and-drop support in IE6-8, but I
    // couldn't get it to work yet.
    if (ie_lt9) return false;
    var div = elt('div');
    return "draggable" in div || "dragDrop" in div;
  }();

  // For a reason I have yet to figure out, some browsers disallow
  // word wrapping between certain characters *only* if a new inline
  // element is started between them. This makes it hard to reliably
  // measure the position of things, since that requires inserting an
  // extra span. This terribly fragile set of regexps matches the
  // character combinations that suffer from this phenomenon on the
  // various browsers.
  var spanAffectsWrapping = /^$/; // Won't match any two-character string
  if (gecko) spanAffectsWrapping = /$'/;
  else if (safari && !/Version\/([6-9]|\d\d)\b/.test(navigator.userAgent)) spanAffectsWrapping = /\-[^ \-?]|\?[^ !'\"\),.\-\/:;\?\]\}]/;
  else if (webkit) spanAffectsWrapping = /[~!#%&*)=+}\]|\"\.>,:;][({[<]|-[^\-?\.]|\?[\w~`@#$%\^&*(_=+{[|><]/;

  var knownScrollbarWidth;
  function scrollbarWidth(measure) {
    if (knownScrollbarWidth != null) return knownScrollbarWidth;
    var test = elt("div", null, null, "width: 50px; height: 50px; overflow-x: scroll");
    removeChildrenAndAdd(measure, test);
    if (test.offsetWidth)
      knownScrollbarWidth = test.offsetHeight - test.clientHeight;
    return knownScrollbarWidth || 0;
  }

  var zwspSupported;
  function zeroWidthElement(measure) {
    if (zwspSupported == null) {
      var test = elt("span", "\u200b");
      removeChildrenAndAdd(measure, elt("span", [test, document.createTextNode("x")]));
      if (measure.firstChild.offsetHeight != 0)
        zwspSupported = test.offsetWidth <= 1 && test.offsetHeight > 2 && !ie_lt8;
    }
    if (zwspSupported) return elt("span", "\u200b");
    else return elt("span", "\u00a0", null, "display: inline-block; width: 1px; margin-right: -1px");
  }

  // See if "".split is the broken IE version, if so, provide an
  // alternative way to split lines.
  var splitLines = "\n\nb".split(/\n/).length != 3 ? function(string) {
    var pos = 0, result = [], l = string.length;
    while (pos <= l) {
      var nl = string.indexOf("\n", pos);
      if (nl == -1) nl = string.length;
      var line = string.slice(pos, string.charAt(nl - 1) == "\r" ? nl - 1 : nl);
      var rt = line.indexOf("\r");
      if (rt != -1) {
        result.push(line.slice(0, rt));
        pos += rt + 1;
      } else {
        result.push(line);
        pos = nl + 1;
      }
    }
    return result;
  } : function(string){return string.split(/\r\n?|\n/);};
  CodeMirror.splitLines = splitLines;

  var hasSelection = window.getSelection ? function(te) {
    try { return te.selectionStart != te.selectionEnd; }
    catch(e) { return false; }
  } : function(te) {
    try {var range = te.ownerDocument.selection.createRange();}
    catch(e) {}
    if (!range || range.parentElement() != te) return false;
    return range.compareEndPoints("StartToEnd", range) != 0;
  };

  var hasCopyEvent = (function() {
    var e = elt("div");
    if ("oncopy" in e) return true;
    e.setAttribute("oncopy", "return;");
    return typeof e.oncopy == 'function';
  })();

  // KEY NAMING

  var keyNames = {3: "Enter", 8: "Backspace", 9: "Tab", 13: "Enter", 16: "Shift", 17: "Ctrl", 18: "Alt",
                  19: "Pause", 20: "CapsLock", 27: "Esc", 32: "Space", 33: "PageUp", 34: "PageDown", 35: "End",
                  36: "Home", 37: "Left", 38: "Up", 39: "Right", 40: "Down", 44: "PrintScrn", 45: "Insert",
                  46: "Delete", 59: ";", 91: "Mod", 92: "Mod", 93: "Mod", 109: "-", 107: "=", 127: "Delete",
                  186: ";", 187: "=", 188: ",", 189: "-", 190: ".", 191: "/", 192: "`", 219: "[", 220: "\\",
                  221: "]", 222: "'", 63276: "PageUp", 63277: "PageDown", 63275: "End", 63273: "Home",
                  63234: "Left", 63232: "Up", 63235: "Right", 63233: "Down", 63302: "Insert", 63272: "Delete"};
  CodeMirror.keyNames = keyNames;
  (function() {
    // Number keys
    for (var i = 0; i < 10; i++) keyNames[i + 48] = String(i);
    // Alphabetic keys
    for (var i = 65; i <= 90; i++) keyNames[i] = String.fromCharCode(i);
    // Function keys
    for (var i = 1; i <= 12; i++) keyNames[i + 111] = keyNames[i + 63235] = "F" + i;
  })();

  // BIDI HELPERS

  function iterateBidiSections(order, from, to, f) {
    if (!order) return f(from, to, "ltr");
    for (var i = 0; i < order.length; ++i) {
      var part = order[i];
      if (part.from < to && part.to > from || from == to && part.to == from)
        f(Math.max(part.from, from), Math.min(part.to, to), part.level == 1 ? "rtl" : "ltr");
    }
  }

  function bidiLeft(part) { return part.level % 2 ? part.to : part.from; }
  function bidiRight(part) { return part.level % 2 ? part.from : part.to; }

  function lineLeft(line) { var order = getOrder(line); return order ? bidiLeft(order[0]) : 0; }
  function lineRight(line) {
    var order = getOrder(line);
    if (!order) return line.text.length;
    return bidiRight(lst(order));
  }

  function lineStart(cm, lineN) {
    var line = getLine(cm.doc, lineN);
    var visual = visualLine(cm.doc, line);
    if (visual != line) lineN = lineNo(visual);
    var order = getOrder(visual);
    var ch = !order ? 0 : order[0].level % 2 ? lineRight(visual) : lineLeft(visual);
    return Pos(lineN, ch);
  }
  function lineEnd(cm, lineN) {
    var merged, line;
    while (merged = collapsedSpanAtEnd(line = getLine(cm.doc, lineN)))
      lineN = merged.find().to.line;
    var order = getOrder(line);
    var ch = !order ? line.text.length : order[0].level % 2 ? lineLeft(line) : lineRight(line);
    return Pos(lineN, ch);
  }

  // This is somewhat involved. It is needed in order to move
  // 'visually' through bi-directional text -- i.e., pressing left
  // should make the cursor go left, even when in RTL text. The
  // tricky part is the 'jumps', where RTL and LTR text touch each
  // other. This often requires the cursor offset to move more than
  // one unit, in order to visually move one unit.
  function moveVisually(line, start, dir, byUnit) {
    var bidi = getOrder(line);
    if (!bidi) return moveLogically(line, start, dir, byUnit);
    var moveOneUnit = byUnit ? function(pos, dir) {
      do pos += dir;
      while (pos > 0 && isExtendingChar.test(line.text.charAt(pos)));
      return pos;
    } : function(pos, dir) { return pos + dir; };
    var linedir = bidi[0].level;
    for (var i = 0; i < bidi.length; ++i) {
      var part = bidi[i], sticky = part.level % 2 == linedir;
      if ((part.from < start && part.to > start) ||
          (sticky && (part.from == start || part.to == start))) break;
    }
    var target = moveOneUnit(start, part.level % 2 ? -dir : dir);

    while (target != null) {
      if (part.level % 2 == linedir) {
        if (target < part.from || target > part.to) {
          part = bidi[i += dir];
          target = part && (dir > 0 == part.level % 2 ? moveOneUnit(part.to, -1) : moveOneUnit(part.from, 1));
        } else break;
      } else {
        if (target == bidiLeft(part)) {
          part = bidi[--i];
          target = part && bidiRight(part);
        } else if (target == bidiRight(part)) {
          part = bidi[++i];
          target = part && bidiLeft(part);
        } else break;
      }
    }

    return target < 0 || target > line.text.length ? null : target;
  }

  function moveLogically(line, start, dir, byUnit) {
    var target = start + dir;
    if (byUnit) while (target > 0 && isExtendingChar.test(line.text.charAt(target))) target += dir;
    return target < 0 || target > line.text.length ? null : target;
  }

  // Bidirectional ordering algorithm
  // See http://unicode.org/reports/tr9/tr9-13.html for the algorithm
  // that this (partially) implements.

  // One-char codes used for character types:
  // L (L):   Left-to-Right
  // R (R):   Right-to-Left
  // r (AL):  Right-to-Left Arabic
  // 1 (EN):  European Number
  // + (ES):  European Number Separator
  // % (ET):  European Number Terminator
  // n (AN):  Arabic Number
  // , (CS):  Common Number Separator
  // m (NSM): Non-Spacing Mark
  // b (BN):  Boundary Neutral
  // s (B):   Paragraph Separator
  // t (S):   Segment Separator
  // w (WS):  Whitespace
  // N (ON):  Other Neutrals

  // Returns null if characters are ordered as they appear
  // (left-to-right), or an array of sections ({from, to, level}
  // objects) in the order in which they occur visually.
  var bidiOrdering = (function() {
    // Character types for codepoints 0 to 0xff
    var lowTypes = "bbbbbbbbbtstwsbbbbbbbbbbbbbbssstwNN%%%NNNNNN,N,N1111111111NNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNNNLLLLLLLLLLLLLLLLLLLLLLLLLLNNNNbbbbbbsbbbbbbbbbbbbbbbbbbbbbbbbbb,N%%%%NNNNLNNNNN%%11NLNNN1LNNNNNLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLLNLLLLLLLL";
    // Character types for codepoints 0x600 to 0x6ff
    var arabicTypes = "rrrrrrrrrrrr,rNNmmmmmmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmrrrrrrrnnnnnnnnnn%nnrrrmrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrmmmmmmmmmmmmmmmmmmmNmmmmrrrrrrrrrrrrrrrrrr";
    function charType(code) {
      if (code <= 0xff) return lowTypes.charAt(code);
      else if (0x590 <= code && code <= 0x5f4) return "R";
      else if (0x600 <= code && code <= 0x6ff) return arabicTypes.charAt(code - 0x600);
      else if (0x700 <= code && code <= 0x8ac) return "r";
      else return "L";
    }

    var bidiRE = /[\u0590-\u05f4\u0600-\u06ff\u0700-\u08ac]/;
    var isNeutral = /[stwN]/, isStrong = /[LRr]/, countsAsLeft = /[Lb1n]/, countsAsNum = /[1n]/;
    // Browsers seem to always treat the boundaries of block elements as being L.
    var outerType = "L";

    return function(str) {
      if (!bidiRE.test(str)) return false;
      var len = str.length, types = [];
      for (var i = 0, type; i < len; ++i)
        types.push(type = charType(str.charCodeAt(i)));

      // W1. Examine each non-spacing mark (NSM) in the level run, and
      // change the type of the NSM to the type of the previous
      // character. If the NSM is at the start of the level run, it will
      // get the type of sor.
      for (var i = 0, prev = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "m") types[i] = prev;
        else prev = type;
      }

      // W2. Search backwards from each instance of a European number
      // until the first strong type (R, L, AL, or sor) is found. If an
      // AL is found, change the type of the European number to Arabic
      // number.
      // W3. Change all ALs to R.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (type == "1" && cur == "r") types[i] = "n";
        else if (isStrong.test(type)) { cur = type; if (type == "r") types[i] = "R"; }
      }

      // W4. A single European separator between two European numbers
      // changes to a European number. A single common separator between
      // two numbers of the same type changes to that type.
      for (var i = 1, prev = types[0]; i < len - 1; ++i) {
        var type = types[i];
        if (type == "+" && prev == "1" && types[i+1] == "1") types[i] = "1";
        else if (type == "," && prev == types[i+1] &&
                 (prev == "1" || prev == "n")) types[i] = prev;
        prev = type;
      }

      // W5. A sequence of European terminators adjacent to European
      // numbers changes to all European numbers.
      // W6. Otherwise, separators and terminators change to Other
      // Neutral.
      for (var i = 0; i < len; ++i) {
        var type = types[i];
        if (type == ",") types[i] = "N";
        else if (type == "%") {
          for (var end = i + 1; end < len && types[end] == "%"; ++end) {}
          var replace = (i && types[i-1] == "!") || (end < len - 1 && types[end] == "1") ? "1" : "N";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // W7. Search backwards from each instance of a European number
      // until the first strong type (R, L, or sor) is found. If an L is
      // found, then change the type of the European number to L.
      for (var i = 0, cur = outerType; i < len; ++i) {
        var type = types[i];
        if (cur == "L" && type == "1") types[i] = "L";
        else if (isStrong.test(type)) cur = type;
      }

      // N1. A sequence of neutrals takes the direction of the
      // surrounding strong text if the text on both sides has the same
      // direction. European and Arabic numbers act as if they were R in
      // terms of their influence on neutrals. Start-of-level-run (sor)
      // and end-of-level-run (eor) are used at level run boundaries.
      // N2. Any remaining neutrals take the embedding direction.
      for (var i = 0; i < len; ++i) {
        if (isNeutral.test(types[i])) {
          for (var end = i + 1; end < len && isNeutral.test(types[end]); ++end) {}
          var before = (i ? types[i-1] : outerType) == "L";
          var after = (end < len - 1 ? types[end] : outerType) == "L";
          var replace = before || after ? "L" : "R";
          for (var j = i; j < end; ++j) types[j] = replace;
          i = end - 1;
        }
      }

      // Here we depart from the documented algorithm, in order to avoid
      // building up an actual levels array. Since there are only three
      // levels (0, 1, 2) in an implementation that doesn't take
      // explicit embedding into account, we can build up the order on
      // the fly, without following the level-based algorithm.
      var order = [], m;
      for (var i = 0; i < len;) {
        if (countsAsLeft.test(types[i])) {
          var start = i;
          for (++i; i < len && countsAsLeft.test(types[i]); ++i) {}
          order.push({from: start, to: i, level: 0});
        } else {
          var pos = i, at = order.length;
          for (++i; i < len && types[i] != "L"; ++i) {}
          for (var j = pos; j < i;) {
            if (countsAsNum.test(types[j])) {
              if (pos < j) order.splice(at, 0, {from: pos, to: j, level: 1});
              var nstart = j;
              for (++j; j < i && countsAsNum.test(types[j]); ++j) {}
              order.splice(at, 0, {from: nstart, to: j, level: 2});
              pos = j;
            } else ++j;
          }
          if (pos < i) order.splice(at, 0, {from: pos, to: i, level: 1});
        }
      }
      if (order[0].level == 1 && (m = str.match(/^\s+/))) {
        order[0].from = m[0].length;
        order.unshift({from: 0, to: m[0].length, level: 0});
      }
      if (lst(order).level == 1 && (m = str.match(/\s+$/))) {
        lst(order).to -= m[0].length;
        order.push({from: len - m[0].length, to: len, level: 0});
      }
      if (order[0].level != lst(order).level)
        order.push({from: len, to: len, level: order[0].level});

      return order;
    };
  })();

  // THE END

  CodeMirror.version = "3.12";

  return CodeMirror;
})();
// Open simple dialogs on top of an editor. Relies on dialog.css.

(function() {
  function dialogDiv(cm, template, bottom) {
    var wrap = cm.getWrapperElement();
    var dialog;
    dialog = wrap.appendChild(document.createElement("div"));
    if (bottom) {
      dialog.className = "CodeMirror-dialog CodeMirror-dialog-bottom";
    } else {
      dialog.className = "CodeMirror-dialog CodeMirror-dialog-top";
    }
    dialog.innerHTML = template;
    return dialog;
  }

  CodeMirror.defineExtension("openDialog", function(template, callback, options) {
    var dialog = dialogDiv(this, template, options && options.bottom);
    var closed = false, me = this;
    function close() {
      if (closed) return;
      closed = true;
      dialog.parentNode.removeChild(dialog);
    }
    var inp = dialog.getElementsByTagName("input")[0], button;
    if (inp) {
      CodeMirror.on(inp, "keydown", function(e) {
        if (options && options.onKeyDown && options.onKeyDown(e, inp.value, close)) { return; }
        if (e.keyCode == 13 || e.keyCode == 27) {
          CodeMirror.e_stop(e);
          close();
          me.focus();
          if (e.keyCode == 13) callback(inp.value);
        }
      });
      if (options && options.onKeyUp) {
        CodeMirror.on(inp, "keyup", function(e) {options.onKeyUp(e, inp.value, close);});
      }
      if (options && options.value) inp.value = options.value;
      inp.focus();
      CodeMirror.on(inp, "blur", close);
    } else if (button = dialog.getElementsByTagName("button")[0]) {
      CodeMirror.on(button, "click", function() {
        close();
        me.focus();
      });
      button.focus();
      CodeMirror.on(button, "blur", close);
    }
    return close;
  });

  CodeMirror.defineExtension("openConfirm", function(template, callbacks, options) {
    var dialog = dialogDiv(this, template, options && options.bottom);
    var buttons = dialog.getElementsByTagName("button");
    var closed = false, me = this, blurring = 1;
    function close() {
      if (closed) return;
      closed = true;
      dialog.parentNode.removeChild(dialog);
      me.focus();
    }
    buttons[0].focus();
    for (var i = 0; i < buttons.length; ++i) {
      var b = buttons[i];
      (function(callback) {
        CodeMirror.on(b, "click", function(e) {
          CodeMirror.e_preventDefault(e);
          close();
          if (callback) callback(me);
        });
      })(callbacks[i]);
      CodeMirror.on(b, "blur", function() {
        --blurring;
        setTimeout(function() { if (blurring <= 0) close(); }, 200);
      });
      CodeMirror.on(b, "focus", function() { ++blurring; });
    }
  });
})();
(function() {
  var DEFAULT_BRACKETS = "()[]{}''\"\"";
  var SPACE_CHAR_REGEX = /\s/;

  CodeMirror.defineOption("autoCloseBrackets", false, function(cm, val, old) {
    var wasOn = old && old != CodeMirror.Init;
    if (val && !wasOn)
      cm.addKeyMap(buildKeymap(typeof val == "string" ? val : DEFAULT_BRACKETS));
    else if (!val && wasOn)
      cm.removeKeyMap("autoCloseBrackets");
  });

  function buildKeymap(pairs) {
    var map = {
      name : "autoCloseBrackets",
      Backspace: function(cm) {
        if (cm.somethingSelected()) return CodeMirror.Pass;
        var cur = cm.getCursor(), line = cm.getLine(cur.line);
        if (cur.ch && cur.ch < line.length &&
          pairs.indexOf(line.slice(cur.ch - 1, cur.ch + 1)) % 2 == 0)
          cm.replaceRange("", CodeMirror.Pos(cur.line, cur.ch - 1), CodeMirror.Pos(cur.line, cur.ch + 1));
        else
          return CodeMirror.Pass;
      }
    };
    var closingBrackets = [];
    for (var i = 0; i < pairs.length; i += 2) (function(left, right) {
      if (left != right) closingBrackets.push(right);
      function surround(cm) {
        var selection = cm.getSelection();
        cm.replaceSelection(left + selection + right);
      }
      function maybeOverwrite(cm) {
        var cur = cm.getCursor(), ahead = cm.getRange(cur, CodeMirror.Pos(cur.line, cur.ch + 1));
        if (ahead != right || cm.somethingSelected()) return CodeMirror.Pass;
        else cm.execCommand("goCharRight");
      }
      map["'" + left + "'"] = function(cm) {
        if (left == "'" && cm.getTokenAt(cm.getCursor()).type == "comment")
          return CodeMirror.Pass;
        if (cm.somethingSelected()) return surround(cm);
        if (left == right && maybeOverwrite(cm) != CodeMirror.Pass) return;
        var cur = cm.getCursor(), ahead = CodeMirror.Pos(cur.line, cur.ch + 1);
        var line = cm.getLine(cur.line), nextChar = line.charAt(cur.ch);
        if (line.length == cur.ch || closingBrackets.indexOf(nextChar) >= 0 || SPACE_CHAR_REGEX.test(nextChar))
          cm.replaceSelection(left + right, {head: ahead, anchor: ahead});
        else
          return CodeMirror.Pass;
      };
      if (left != right) map["'" + right + "'"] = maybeOverwrite;
    })(pairs.charAt(i), pairs.charAt(i + 1));
    return map;
  }
})();
/**
 * Tag-closer extension for CodeMirror.
 *
 * This extension adds an "autoCloseTags" option that can be set to
 * either true to get the default behavior, or an object to further
 * configure its behavior.
 *
 * These are supported options:
 *
 * `whenClosing` (default true)
 *   Whether to autoclose when the '/' of a closing tag is typed.
 * `whenOpening` (default true)
 *   Whether to autoclose the tag when the final '>' of an opening
 *   tag is typed.
 * `dontCloseTags` (default is empty tags for HTML, none for XML)
 *   An array of tag names that should not be autoclosed.
 * `indentTags` (default is block tags for HTML, none for XML)
 *   An array of tag names that should, when opened, cause a
 *   blank line to be added inside the tag, and the blank line and
 *   closing line to be indented.
 *
 * See demos/closetag.html for a usage example.
 */

(function() {
  CodeMirror.defineOption("autoCloseTags", false, function(cm, val, old) {
    if (val && (old == CodeMirror.Init || !old)) {
      var map = {name: "autoCloseTags"};
      if (typeof val != "object" || val.whenClosing)
        map["'/'"] = function(cm) { return autoCloseTag(cm, '/'); };
      if (typeof val != "object" || val.whenOpening)
        map["'>'"] = function(cm) { return autoCloseTag(cm, '>'); };
      cm.addKeyMap(map);
    } else if (!val && (old != CodeMirror.Init && old)) {
      cm.removeKeyMap("autoCloseTags");
    }
  });

  var htmlDontClose = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param",
                       "source", "track", "wbr"];
  var htmlIndent = ["applet", "blockquote", "body", "button", "div", "dl", "fieldset", "form", "frameset", "h1", "h2", "h3", "h4",
                    "h5", "h6", "head", "html", "iframe", "layer", "legend", "object", "ol", "p", "select", "table", "ul"];

  function autoCloseTag(cm, ch) {
    var pos = cm.getCursor(), tok = cm.getTokenAt(pos);
    var inner = CodeMirror.innerMode(cm.getMode(), tok.state), state = inner.state;
    if (inner.mode.name != "xml") return CodeMirror.Pass;

    var opt = cm.getOption("autoCloseTags"), html = inner.mode.configuration == "html";
    var dontCloseTags = (typeof opt == "object" && opt.dontCloseTags) || (html && htmlDontClose);
    var indentTags = (typeof opt == "object" && opt.indentTags) || (html && htmlIndent);

    if (ch == ">" && state.tagName) {
      var tagName = state.tagName;
      if (tok.end > pos.ch) tagName = tagName.slice(0, tagName.length - tok.end + pos.ch);
      var lowerTagName = tagName.toLowerCase();
      // Don't process the '>' at the end of an end-tag or self-closing tag
      if (tok.type == "tag" && state.type == "closeTag" ||
          tok.string.indexOf("/") == (tok.string.length - 1) || // match something like <someTagName />
          dontCloseTags && indexOf(dontCloseTags, lowerTagName) > -1)
        return CodeMirror.Pass;

      var doIndent = indentTags && indexOf(indentTags, lowerTagName) > -1;
      var curPos = doIndent ? CodeMirror.Pos(pos.line + 1, 0) : CodeMirror.Pos(pos.line, pos.ch + 1);
      cm.replaceSelection(">" + (doIndent ? "\n\n" : "") + "</" + tagName + ">",
                          {head: curPos, anchor: curPos});
      if (doIndent) {
        cm.indentLine(pos.line + 1);
        cm.indentLine(pos.line + 2);
      }
      return;
    } else if (ch == "/" && tok.string == "<") {
      var tagName = state.context && state.context.tagName;
      if (tagName) cm.replaceSelection("/" + tagName + ">", "end");
      return;
    }
    return CodeMirror.Pass;
  }

  function indexOf(collection, elt) {
    if (collection.indexOf) return collection.indexOf(elt);
    for (var i = 0, e = collection.length; i < e; ++i)
      if (collection[i] == elt) return i;
    return -1;
  }
})();
(function() {
  var ie_lt8 = /MSIE \d/.test(navigator.userAgent) &&
    (document.documentMode == null || document.documentMode < 8);

  var Pos = CodeMirror.Pos;

  var matching = {"(": ")>", ")": "(<", "[": "]>", "]": "[<", "{": "}>", "}": "{<"};
  function findMatchingBracket(cm) {
    var maxScanLen = cm.state._matchBrackets.maxScanLineLength || 10000;

    var cur = cm.getCursor(), line = cm.getLineHandle(cur.line), pos = cur.ch - 1;
    var match = (pos >= 0 && matching[line.text.charAt(pos)]) || matching[line.text.charAt(++pos)];
    if (!match) return null;
    var forward = match.charAt(1) == ">", d = forward ? 1 : -1;
    var style = cm.getTokenAt(Pos(cur.line, pos + 1)).type;

    var stack = [line.text.charAt(pos)], re = /[(){}[\]]/;
    function scan(line, lineNo, start) {
      if (!line.text) return;
      var pos = forward ? 0 : line.text.length - 1, end = forward ? line.text.length : -1;
      if (line.text.length > maxScanLen) return null;
      var checkTokenStyles = line.text.length < 1000;
      if (start != null) pos = start + d;
      for (; pos != end; pos += d) {
        var ch = line.text.charAt(pos);
        if (re.test(ch) && (!checkTokenStyles || cm.getTokenAt(Pos(lineNo, pos + 1)).type == style)) {
          var match = matching[ch];
          if (match.charAt(1) == ">" == forward) stack.push(ch);
          else if (stack.pop() != match.charAt(0)) return {pos: pos, match: false};
          else if (!stack.length) return {pos: pos, match: true};
        }
      }
    }
    for (var i = cur.line, found, e = forward ? Math.min(i + 100, cm.lineCount()) : Math.max(-1, i - 100); i != e; i+=d) {
      if (i == cur.line) found = scan(line, i, pos);
      else found = scan(cm.getLineHandle(i), i);
      if (found) break;
    }
    return {from: Pos(cur.line, pos), to: found && Pos(i, found.pos), match: found && found.match};
  }

  function matchBrackets(cm, autoclear) {
    // Disable brace matching in long lines, since it'll cause hugely slow updates
    var maxHighlightLen = cm.state._matchBrackets.maxHighlightLineLength || 1000;
    var found = findMatchingBracket(cm);
    if (!found || cm.getLine(found.from.line).length > maxHighlightLen ||
       found.to && cm.getLine(found.to.line).length > maxHighlightLen)
      return;

    var style = found.match ? "CodeMirror-matchingbracket" : "CodeMirror-nonmatchingbracket";
    var one = cm.markText(found.from, Pos(found.from.line, found.from.ch + 1), {className: style});
    var two = found.to && cm.markText(found.to, Pos(found.to.line, found.to.ch + 1), {className: style});
    // Kludge to work around the IE bug from issue #1193, where text
    // input stops going to the textare whever this fires.
    if (ie_lt8 && cm.state.focused) cm.display.input.focus();
    var clear = function() {
      cm.operation(function() { one.clear(); two && two.clear(); });
    };
    if (autoclear) setTimeout(clear, 800);
    else return clear;
  }

  var currentlyHighlighted = null;
  function doMatchBrackets(cm) {
    cm.operation(function() {
      if (currentlyHighlighted) {currentlyHighlighted(); currentlyHighlighted = null;}
      if (!cm.somethingSelected()) currentlyHighlighted = matchBrackets(cm, false);
    });
  }

  CodeMirror.defineOption("matchBrackets", false, function(cm, val, old) {
    if (old && old != CodeMirror.Init)
      cm.off("cursorActivity", doMatchBrackets);
    if (val) {
      cm.state._matchBrackets = typeof val == "object" ? val : {};
      cm.on("cursorActivity", doMatchBrackets);
    }
  });

  CodeMirror.defineExtension("matchBrackets", function() {matchBrackets(this, true);});
  CodeMirror.defineExtension("findMatchingBracket", function(){return findMatchingBracket(this);});
})();
CodeMirror.newFoldFunction = function(rangeFinder, widget) {
  if (widget == null) widget = "\u2194";
  if (typeof widget == "string") {
    var text = document.createTextNode(widget);
    widget = document.createElement("span");
    widget.appendChild(text);
    widget.className = "CodeMirror-foldmarker";
  }

  return function(cm, pos) {
    if (typeof pos == "number") pos = CodeMirror.Pos(pos, 0);
    var range = rangeFinder(cm, pos);
    if (!range) return;

    var present = cm.findMarksAt(range.from), cleared = 0;
    for (var i = 0; i < present.length; ++i) {
      if (present[i].__isFold) {
        ++cleared;
        present[i].clear();
      }
    }
    if (cleared) return;

    var myWidget = widget.cloneNode(true);
    CodeMirror.on(myWidget, "mousedown", function() {myRange.clear();});
    var myRange = cm.markText(range.from, range.to, {
      replacedWith: myWidget,
      clearOnEnter: true,
      __isFold: true
    });
  };
};
CodeMirror.braceRangeFinder = function(cm, start) {
  var line = start.line, lineText = cm.getLine(line);
  var at = lineText.length, startChar, tokenType;
  for (; at > 0;) {
    var found = lineText.lastIndexOf("{", at);
    if (found < start.ch) break;
    tokenType = cm.getTokenAt(CodeMirror.Pos(line, found + 1)).type;
    if (!/^(comment|string)/.test(tokenType)) { startChar = found; break; }
    at = found - 1;
  }
  if (startChar == null || lineText.lastIndexOf("}") > startChar) return;
  var count = 1, lastLine = cm.lineCount(), end, endCh;
  outer: for (var i = line + 1; i < lastLine; ++i) {
    var text = cm.getLine(i), pos = 0;
    for (;;) {
      var nextOpen = text.indexOf("{", pos), nextClose = text.indexOf("}", pos);
      if (nextOpen < 0) nextOpen = text.length;
      if (nextClose < 0) nextClose = text.length;
      pos = Math.min(nextOpen, nextClose);
      if (pos == text.length) break;
      if (cm.getTokenAt(CodeMirror.Pos(i, pos + 1)).type == tokenType) {
        if (pos == nextOpen) ++count;
        else if (!--count) { end = i; endCh = pos; break outer; }
      }
      ++pos;
    }
  }
  if (end == null || end == line + 1) return;
  return {from: CodeMirror.Pos(line, startChar + 1),
          to: CodeMirror.Pos(end, endCh)};
};
CodeMirror.tagRangeFinder = (function() {
  var nameStartChar = "A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
  var nameChar = nameStartChar + "\-\:\.0-9\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
  var xmlTagStart = new RegExp("<(/?)([" + nameStartChar + "][" + nameChar + "]*)", "g");

  return function(cm, start) {
    var line = start.line, ch = start.ch, lineText = cm.getLine(line);

    function nextLine() {
      if (line >= cm.lastLine()) return;
      ch = 0;
      lineText = cm.getLine(++line);
      return true;
    }
    function toTagEnd() {
      for (;;) {
        var gt = lineText.indexOf(">", ch);
        if (gt == -1) { if (nextLine()) continue; else return; }
        var lastSlash = lineText.lastIndexOf("/", gt);
        var selfClose = lastSlash > -1 && /^\s*$/.test(lineText.slice(lastSlash + 1, gt));
        ch = gt + 1;
        return selfClose ? "selfClose" : "regular";
      }
    }
    function toNextTag() {
      for (;;) {
        xmlTagStart.lastIndex = ch;
        var found = xmlTagStart.exec(lineText);
        if (!found) { if (nextLine()) continue; else return; }
        ch = found.index + found[0].length;
        return found;
      }
    }

    var stack = [], startCh;
    for (;;) {
      var openTag = toNextTag(), end;
      if (!openTag || line != start.line || !(end = toTagEnd())) return;
      if (!openTag[1] && end != "selfClose") {
        stack.push(openTag[2]);
        startCh = ch;
        break;
      }
    }

    for (;;) {
      var next = toNextTag(), end, tagLine = line, tagCh = ch - (next ? next[0].length : 0);
      if (!next || !(end = toTagEnd())) return;
      if (end == "selfClose") continue;
      if (next[1]) { // closing tag
        for (var i = stack.length - 1; i >= 0; --i) if (stack[i] == next[2]) {
          stack.length = i;
          break;
        }
        if (!stack.length) return {
          from: CodeMirror.Pos(start.line, startCh),
          to: CodeMirror.Pos(tagLine, tagCh)
        };
      } else { // opening tag
        stack.push(next[2]);
      }
    }
  };
})();
(function () {
  function htmlHint(editor, htmlStructure, getToken) {
    var cur = editor.getCursor();
    var token = getToken(editor, cur);
    var keywords = [];
    var i = 0;
    var j = 0;
    var k = 0;
    var from = {line: cur.line, ch: cur.ch};
    var to = {line: cur.line, ch: cur.ch};
    var flagClean = true;

    var text = editor.getRange({line: 0, ch: 0}, cur);

    var open = text.lastIndexOf('<');
    var close = text.lastIndexOf('>');
    var tokenString = token.string.replace("<","");

    if(open > close) {
      var last = editor.getRange({line: cur.line, ch: cur.ch - 1}, cur);
      if(last == "<") {
        for(i = 0; i < htmlStructure.length; i++) {
          keywords.push(htmlStructure[i].tag);
        }
        from.ch = token.start + 1;
      } else {
        var counter = 0;
        var found = function(token, type, position) {
          counter++;
          if(counter > 50) return;
          if(token.type == type) {
            return token;
          } else {
            position.ch = token.start;
            var newToken = editor.getTokenAt(position);
            return found(newToken, type, position);
          }
        };

        var nodeToken = found(token, "tag", {line: cur.line, ch: cur.ch});
        var node = nodeToken.string.substring(1);

        if(token.type === null && token.string.trim() === "") {
          for(i = 0; i < htmlStructure.length; i++) {
            if(htmlStructure[i].tag == node) {
              for(j = 0; j < htmlStructure[i].attr.length; j++) {
                keywords.push(htmlStructure[i].attr[j].key + "=\"\" ");
              }

              for(k = 0; k < globalAttributes.length; k++) {
                keywords.push(globalAttributes[k].key + "=\"\" ");
              }
            }
          }
        } else if(token.type == "string") {
          tokenString = tokenString.substring(1, tokenString.length - 1);
          var attributeToken = found(token, "attribute", {line: cur.line, ch: cur.ch});
          var attribute = attributeToken.string;

          for(i = 0; i < htmlStructure.length; i++) {
            if(htmlStructure[i].tag == node) {
              for(j = 0; j < htmlStructure[i].attr.length; j++) {
                if(htmlStructure[i].attr[j].key == attribute) {
                  for(k = 0; k < htmlStructure[i].attr[j].values.length; k++) {
                    keywords.push(htmlStructure[i].attr[j].values[k]);
                  }
                }
              }

              for(j = 0; j < globalAttributes.length; j++) {
                if(globalAttributes[j].key == attribute) {
                  for(k = 0; k < globalAttributes[j].values.length; k++) {
                    keywords.push(globalAttributes[j].values[k]);
                  }
                }
              }
            }
          }
          from.ch = token.start + 1;
        } else if(token.type == "attribute") {
          for(i = 0; i < htmlStructure.length; i++) {
            if(htmlStructure[i].tag == node) {
              for(j = 0; j < htmlStructure[i].attr.length; j++) {
                keywords.push(htmlStructure[i].attr[j].key + "=\"\" ");
              }

              for(k = 0; k < globalAttributes.length; k++) {
                keywords.push(globalAttributes[k].key + "=\"\" ");
              }
            }
          }
          from.ch = token.start;
        } else if(token.type == "tag") {
          for(i = 0; i < htmlStructure.length; i++) {
            keywords.push(htmlStructure[i].tag);
          }

          from.ch = token.start + 1;
        }
      }
    } else {
      for(i = 0; i < htmlStructure.length; i++) {
        keywords.push("<" + htmlStructure[i].tag);
      }

      tokenString = ("<" + tokenString).trim();
      from.ch = token.start;
    }

    if(flagClean === true && tokenString.trim() === "") {
      flagClean = false;
    }

    if(flagClean) {
      keywords = cleanResults(tokenString, keywords);
    }

    return {list: keywords, from: from, to: to};
  }


  var cleanResults = function(text, keywords) {
    var results = [];
    var i = 0;

    for(i = 0; i < keywords.length; i++) {
      if(keywords[i].substring(0, text.length) == text) {
        results.push(keywords[i]);
      }
    }

    return results;
  };

  var htmlStructure = [
    {tag: '!DOCTYPE', attr: []},
    {tag: 'a', attr: [
      {key: 'href', values: ["#"]},
      {key: 'target', values: ["_blank","_self","_top","_parent"]},
      {key: 'ping', values: [""]},
      {key: 'media', values: ["#"]},
      {key: 'hreflang', values: ["en","es"]},
      {key: 'type', values: []}
    ]},
    {tag: 'abbr', attr: []},
    {tag: 'acronym', attr: []},
    {tag: 'address', attr: []},
    {tag: 'applet', attr: []},
    {tag: 'area', attr: [
      {key: 'alt', values: [""]},
      {key: 'coords', values: ["rect: left, top, right, bottom","circle: center-x, center-y, radius","poly: x1, y1, x2, y2, ..."]},
      {key: 'shape', values: ["default","rect","circle","poly"]},
      {key: 'href', values: ["#"]},
      {key: 'target', values: ["#"]},
      {key: 'ping', values: []},
      {key: 'media', values: []},
      {key: 'hreflang', values: []},
      {key: 'type', values: []}

    ]},
    {tag: 'article', attr: []},
    {tag: 'aside', attr: []},
    {tag: 'audio', attr: [
      {key: 'src', values: []},
      {key: 'crossorigin', values: ["anonymous","use-credentials"]},
      {key: 'preload', values: ["none","metadata","auto"]},
      {key: 'autoplay', values: ["","autoplay"]},
      {key: 'mediagroup', values: []},
      {key: 'loop', values: ["","loop"]},
      {key: 'controls', values: ["","controls"]}
    ]},
    {tag: 'b', attr: []},
    {tag: 'base', attr: [
      {key: 'href', values: ["#"]},
      {key: 'target', values: ["_blank","_self","_top","_parent"]}
    ]},
    {tag: 'basefont', attr: []},
    {tag: 'bdi', attr: []},
    {tag: 'bdo', attr: []},
    {tag: 'big', attr: []},
    {tag: 'blockquote', attr: [
      {key: 'cite', values: ["http://"]}
    ]},
    {tag: 'body', attr: []},
    {tag: 'br', attr: []},
    {tag: 'button', attr: [
      {key: 'autofocus', values: ["","autofocus"]},
      {key: 'disabled', values: ["","disabled"]},
      {key: 'form', values: []},
      {key: 'formaction', values: []},
      {key: 'formenctype', values: ["application/x-www-form-urlencoded","multipart/form-data","text/plain"]},
      {key: 'formmethod', values: ["get","post","put","delete"]},
      {key: 'formnovalidate', values: ["","novalidate"]},
      {key: 'formtarget', values: ["_blank","_self","_top","_parent"]},
      {key: 'name', values: []},
      {key: 'type', values: ["submit","reset","button"]},
      {key: 'value', values: []}
    ]},
    {tag: 'canvas', attr: [
      {key: 'width', values: []},
      {key: 'height', values: []}
    ]},
    {tag: 'caption', attr: []},
    {tag: 'center', attr: []},
    {tag: 'cite', attr: []},
    {tag: 'code', attr: []},
    {tag: 'col', attr: [
      {key: 'span', values: []}
    ]},
    {tag: 'colgroup', attr: [
      {key: 'span', values: []}
    ]},
    {tag: 'command', attr: [
      {key: 'type', values: ["command","checkbox","radio"]},
      {key: 'label', values: []},
      {key: 'icon', values: []},
      {key: 'disabled', values: ["","disabled"]},
      {key: 'checked', values: ["","checked"]},
      {key: 'radiogroup', values: []},
      {key: 'command', values: []},
      {key: 'title', values: []}
    ]},
    {tag: 'data', attr: [
      {key: 'value', values: []}
    ]},
    {tag: 'datagrid', attr: [
      {key: 'disabled', values: ["","disabled"]},
      {key: 'multiple', values: ["","multiple"]}
    ]},
    {tag: 'datalist', attr: [
      {key: 'data', values: []}
    ]},
    {tag: 'dd', attr: []},
    {tag: 'del', attr: [
      {key: 'cite', values: []},
      {key: 'datetime', values: []}
    ]},
    {tag: 'details', attr: [
      {key: 'open', values: ["","open"]}
    ]},
    {tag: 'dfn', attr: []},
    {tag: 'dir', attr: []},
    {tag: 'div', attr: [
      {key: 'id', values: []},
      {key: 'class', values: []},
      {key: 'style', values: []}
    ]},
    {tag: 'dl', attr: []},
    {tag: 'dt', attr: []},
    {tag: 'em', attr: []},
    {tag: 'embed', attr: [
      {key: 'src', values: []},
      {key: 'type', values: []},
      {key: 'width', values: []},
      {key: 'height', values: []}
    ]},
    {tag: 'eventsource', attr: [
      {key: 'src', values: []}
    ]},
    {tag: 'fieldset', attr: [
      {key: 'disabled', values: ["","disabled"]},
      {key: 'form', values: []},
      {key: 'name', values: []}
    ]},
    {tag: 'figcaption', attr: []},
    {tag: 'figure', attr: []},
    {tag: 'font', attr: []},
    {tag: 'footer', attr: []},
    {tag: 'form', attr: [
      {key: 'accept-charset', values: ["UNKNOWN","utf-8"]},
      {key: 'action', values: []},
      {key: 'autocomplete', values: ["on","off"]},
      {key: 'enctype', values: ["application/x-www-form-urlencoded","multipart/form-data","text/plain"]},
      {key: 'method', values: ["get","post","put","delete","dialog"]},
      {key: 'name', values: []},
      {key: 'novalidate', values: ["","novalidate"]},
      {key: 'target', values: ["_blank","_self","_top","_parent"]}
    ]},
    {tag: 'frame', attr: []},
    {tag: 'frameset', attr: []},
    {tag: 'h1', attr: []},
    {tag: 'h2', attr: []},
    {tag: 'h3', attr: []},
    {tag: 'h4', attr: []},
    {tag: 'h5', attr: []},
    {tag: 'h6', attr: []},
    {tag: 'head', attr: []},
    {tag: 'header', attr: []},
    {tag: 'hgroup', attr: []},
    {tag: 'hr', attr: []},
    {tag: 'html', attr: [
      {key: 'manifest', values: []}
    ]},
    {tag: 'i', attr: []},
    {tag: 'iframe', attr: [
      {key: 'src', values: []},
      {key: 'srcdoc', values: []},
      {key: 'name', values: []},
      {key: 'sandbox', values: ["allow-top-navigation","allow-same-origin","allow-forms","allow-scripts"]},
      {key: 'seamless', values: ["","seamless"]},
      {key: 'width', values: []},
      {key: 'height', values: []}
    ]},
    {tag: 'img', attr: [
      {key: 'alt', values: []},
      {key: 'src', values: []},
      {key: 'crossorigin', values: ["anonymous","use-credentials"]},
      {key: 'ismap', values: []},
      {key: 'usemap', values: []},
      {key: 'width', values: []},
      {key: 'height', values: []}
    ]},
    {tag: 'input', attr: [
      {key: 'accept', values: ["audio/*","video/*","image/*"]},
      {key: 'alt', values: []},
      {key: 'autocomplete', values: ["on","off"]},
      {key: 'autofocus', values: ["","autofocus"]},
      {key: 'checked', values: ["","checked"]},
      {key: 'disabled', values: ["","disabled"]},
      {key: 'dirname', values: []},
      {key: 'form', values: []},
      {key: 'formaction', values: []},
      {key: 'formenctype', values: ["application/x-www-form-urlencoded","multipart/form-data","text/plain"]},
      {key: 'formmethod', values: ["get","post","put","delete"]},
      {key: 'formnovalidate', values: ["","novalidate"]},
      {key: 'formtarget', values: ["_blank","_self","_top","_parent"]},
      {key: 'height', values: []},
      {key: 'list', values: []},
      {key: 'max', values: []},
      {key: 'maxlength', values: []},
      {key: 'min', values: []},
      {key: 'multiple', values: ["","multiple"]},
      {key: 'name', values: []},
      {key: 'pattern', values: []},
      {key: 'placeholder', values: []},
      {key: 'readonly', values: ["","readonly"]},
      {key: 'required', values: ["","required"]},
      {key: 'size', values: []},
      {key: 'src', values: []},
      {key: 'step', values: []},
      {key: 'type', values: [
        "hidden","text","search","tel","url","email","password","datetime","date","month","week","time","datetime-local",
        "number","range","color","checkbox","radio","file","submit","image","reset","button"
      ]},
      {key: 'value', values: []},
      {key: 'width', values: []}
    ]},
    {tag: 'ins', attr: [
      {key: 'cite', values: []},
      {key: 'datetime', values: []}
    ]},
    {tag: 'kbd', attr: []},
    {tag: 'keygen', attr: [
      {key: 'autofocus', values: ["","autofocus"]},
      {key: 'challenge', values: []},
      {key: 'disabled', values: ["","disabled"]},
      {key: 'form', values: []},
      {key: 'keytype', values: ["RSA"]},
      {key: 'name', values: []}
    ]},
    {tag: 'label', attr: [
      {key: 'for', values: []},
      {key: 'form', values: []}
    ]},
    {tag: 'legend', attr: []},
    {tag: 'li', attr: [
      {key: 'value', values: []}
    ]},
    {tag: 'link', attr: [
      {key: 'href', values: []},
      {key: 'hreflang', values: ["en","es"]},
      {key: 'media', values: [
        "all","screen","print","embossed","braille","handheld","print","projection","screen","tty","tv","speech","3d-glasses",
        "resolution [>][<][=] [X]dpi","resolution [>][<][=] [X]dpcm","device-aspect-ratio: 16/9","device-aspect-ratio: 4/3",
        "device-aspect-ratio: 32/18","device-aspect-ratio: 1280/720","device-aspect-ratio: 2560/1440","orientation:portrait",
        "orientation:landscape","device-height: [X]px","device-width: [X]px","-webkit-min-device-pixel-ratio: 2"
      ]},
      {key: 'type', values: []},
      {key: 'sizes', values: ["all","16x16","16x16 32x32","16x16 32x32 64x64"]}
    ]},
    {tag: 'map', attr: [
      {key: 'name', values: []}
    ]},
    {tag: 'mark', attr: []},
    {tag: 'menu', attr: [
      {key: 'type', values: ["list","context","toolbar"]},
      {key: 'label', values: []}
    ]},
    {tag: 'meta', attr: [
      {key: 'charset', attr: ["utf-8"]},
      {key: 'name', attr: ["viewport","application-name","author","description","generator","keywords"]},
      {key: 'content', attr: ["","width=device-width","initial-scale=1, maximum-scale=1, minimun-scale=1, user-scale=no"]},
      {key: 'http-equiv', attr: ["content-language","content-type","default-style","refresh"]}
    ]},
    {tag: 'meter', attr: [
      {key: 'value', values: []},
      {key: 'min', values: []},
      {key: 'low', values: []},
      {key: 'high', values: []},
      {key: 'max', values: []},
      {key: 'optimum', values: []}
    ]},
    {tag: 'nav', attr: []},
    {tag: 'noframes', attr: []},
    {tag: 'noscript', attr: []},
    {tag: 'object', attr: [
      {key: 'data', values: []},
      {key: 'type', values: []},
      {key: 'typemustmatch', values: ["","typemustmatch"]},
      {key: 'name', values: []},
      {key: 'usemap', values: []},
      {key: 'form', values: []},
      {key: 'width', values: []},
      {key: 'height', values: []}
    ]},
    {tag: 'ol', attr: [
      {key: 'reversed', values: ["", "reversed"]},
      {key: 'start', values: []},
      {key: 'type', values: ["1","a","A","i","I"]}
    ]},
    {tag: 'optgroup', attr: [
      {key: 'disabled', values: ["","disabled"]},
      {key: 'label', values: []}
    ]},
    {tag: 'option', attr: [
      {key: 'disabled', values: ["", "disabled"]},
      {key: 'label', values: []},
      {key: 'selected', values: ["", "selected"]},
      {key: 'value', values: []}
    ]},
    {tag: 'output', attr: [
      {key: 'for', values: []},
      {key: 'form', values: []},
      {key: 'name', values: []}
    ]},
    {tag: 'p', attr: []},
    {tag: 'param', attr: [
      {key: 'name', values: []},
      {key: 'value', values: []}
    ]},
    {tag: 'pre', attr: []},
    {tag: 'progress', attr: [
      {key: 'value', values: []},
      {key: 'max', values: []}
    ]},
    {tag: 'q', attr: [
      {key: 'cite', values: []}
    ]},
    {tag: 'rp', attr: []},
    {tag: 'rt', attr: []},
    {tag: 'ruby', attr: []},
    {tag: 's', attr: []},
    {tag: 'samp', attr: []},
    {tag: 'script', attr: [
      {key: 'type', values: ["text/javascript"]},
      {key: 'src', values: []},
      {key: 'async', values: ["","async"]},
      {key: 'defer', values: ["","defer"]},
      {key: 'charset', values: ["utf-8"]}
    ]},
    {tag: 'section', attr: []},
    {tag: 'select', attr: [
      {key: 'autofocus', values: ["", "autofocus"]},
      {key: 'disabled', values: ["", "disabled"]},
      {key: 'form', values: []},
      {key: 'multiple', values: ["", "multiple"]},
      {key: 'name', values: []},
      {key: 'size', values: []}
    ]},
    {tag: 'small', attr: []},
    {tag: 'source', attr: [
      {key: 'src', values: []},
      {key: 'type', values: []},
      {key: 'media', values: []}
    ]},
    {tag: 'span', attr: []},
    {tag: 'strike', attr: []},
    {tag: 'strong', attr: []},
    {tag: 'style', attr: [
      {key: 'type', values: ["text/css"]},
      {key: 'media', values: ["all","braille","print","projection","screen","speech"]},
      {key: 'scoped', values: []}
    ]},
    {tag: 'sub', attr: []},
    {tag: 'summary', attr: []},
    {tag: 'sup', attr: []},
    {tag: 'table', attr: [
      {key: 'border', values: []}
    ]},
    {tag: 'tbody', attr: []},
    {tag: 'td', attr: [
      {key: 'colspan', values: []},
      {key: 'rowspan', values: []},
      {key: 'headers', values: []}
    ]},
    {tag: 'textarea', attr: [
      {key: 'autofocus', values: ["","autofocus"]},
      {key: 'disabled', values: ["","disabled"]},
      {key: 'dirname', values: []},
      {key: 'form', values: []},
      {key: 'maxlength', values: []},
      {key: 'name', values: []},
      {key: 'placeholder', values: []},
      {key: 'readonly', values: ["","readonly"]},
      {key: 'required', values: ["","required"]},
      {key: 'rows', values: []},
      {key: 'cols', values: []},
      {key: 'wrap', values: ["soft","hard"]}
    ]},
    {tag: 'tfoot', attr: []},
    {tag: 'th', attr: [
      {key: 'colspan', values: []},
      {key: 'rowspan', values: []},
      {key: 'headers', values: []},
      {key: 'scope', values: ["row","col","rowgroup","colgroup"]}
    ]},
    {tag: 'thead', attr: []},
    {tag: 'time', attr: [
      {key: 'datetime', values: []}
    ]},
    {tag: 'title', attr: []},
    {tag: 'tr', attr: []},
    {tag: 'track', attr: [
      {key: 'kind', values: ["subtitles","captions","descriptions","chapters","metadata"]},
      {key: 'src', values: []},
      {key: 'srclang', values: ["en","es"]},
      {key: 'label', values: []},
      {key: 'default', values: []}
    ]},
    {tag: 'tt', attr: []},
    {tag: 'u', attr: []},
    {tag: 'ul', attr: []},
    {tag: 'var', attr: []},
    {tag: 'video', attr: [
      {key: "src", values: []},
      {key: "crossorigin", values: ["anonymous","use-credentials"]},
      {key: "poster", values: []},
      {key: "preload", values: ["auto","metadata","none"]},
      {key: "autoplay", values: ["","autoplay"]},
      {key: "mediagroup", values: ["movie"]},
      {key: "loop", values: ["","loop"]},
      {key: "muted", values: ["","muted"]},
      {key: "controls", values: ["","controls"]},
      {key: "width", values: []},
      {key: "height", values: []}
    ]},
    {tag: 'wbr', attr: []}
  ];

  var globalAttributes = [
    {key: "accesskey", values: ["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","0","1","2","3","4","5","6","7","8","9"]},
    {key: "class", values: []},
    {key: "contenteditable", values: ["true", "false"]},
    {key: "contextmenu", values: []},
    {key: "dir", values: ["ltr","rtl","auto"]},
    {key: "draggable", values: ["true","false","auto"]},
    {key: "dropzone", values: ["copy","move","link","string:","file:"]},
    {key: "hidden", values: ["hidden"]},
    {key: "id", values: []},
    {key: "inert", values: ["inert"]},
    {key: "itemid", values: []},
    {key: "itemprop", values: []},
    {key: "itemref", values: []},
    {key: "itemscope", values: ["itemscope"]},
    {key: "itemtype", values: []},
    {key: "lang", values: ["en","es"]},
    {key: "spellcheck", values: ["true","false"]},
    {key: "style", values: []},
    {key: "tabindex", values: ["1","2","3","4","5","6","7","8","9"]},
    {key: "title", values: []},
    {key: "translate", values: ["yes","no"]},
    {key: "onclick", values: []},
    {key: 'rel', values: ["stylesheet","alternate","author","bookmark","help","license","next","nofollow","noreferrer","prefetch","prev","search","tag"]}
  ];

  CodeMirror.htmlHint = function(editor) {
    if(String.prototype.trim == undefined) {
      String.prototype.trim=function(){return this.replace(/^\s+|\s+$/g, '');};
    }
    return htmlHint(editor, htmlStructure, function (e, cur) { return e.getTokenAt(cur); });
  };
})();
(function () {
  var Pos = CodeMirror.Pos;

  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, keywords, getToken, options) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    token.state = CodeMirror.innerMode(editor.getMode(), token.state).state;

    // If it's not a 'word-style' token, ignore the token.
    if (!/^[\w$_]*$/.test(token.string)) {
      token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                       type: token.string == "." ? "property" : null};
    }
    // If it is a property, find out what it is a property of.
    while (tprop.type == "property") {
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (tprop.string != ".") return;
      tprop = getToken(editor, Pos(cur.line, tprop.start));
      if (tprop.string == ')') {
        var level = 1;
        do {
          tprop = getToken(editor, Pos(cur.line, tprop.start));
          switch (tprop.string) {
          case ')': level++; break;
          case '(': level--; break;
          default: break;
          }
        } while (level > 0);
        tprop = getToken(editor, Pos(cur.line, tprop.start));
        if (tprop.type.indexOf("variable") === 0)
          tprop.type = "function";
        else return; // no clue
      }
      if (!context) var context = [];
      context.push(tprop);
    }
    return {list: getCompletions(token, context, keywords, options),
            from: Pos(cur.line, token.start),
            to: Pos(cur.line, token.end)};
  }

  CodeMirror.javascriptHint = function(editor, options) {
    return scriptHint(editor, javascriptKeywords,
                      function (e, cur) {return e.getTokenAt(cur);},
                      options);
  };

  function getCoffeeScriptToken(editor, cur) {
  // This getToken, it is for coffeescript, imitates the behavior of
  // getTokenAt method in javascript.js, that is, returning "property"
  // type and treat "." as indepenent token.
    var token = editor.getTokenAt(cur);
    if (cur.ch == token.start + 1 && token.string.charAt(0) == '.') {
      token.end = token.start;
      token.string = '.';
      token.type = "property";
    }
    else if (/^\.[\w$_]*$/.test(token.string)) {
      token.type = "property";
      token.start++;
      token.string = token.string.replace(/\./, '');
    }
    return token;
  }

  CodeMirror.coffeescriptHint = function(editor, options) {
    return scriptHint(editor, coffeescriptKeywords, getCoffeeScriptToken, options);
  };

  var stringProps = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
                     "toUpperCase toLowerCase split concat match replace search").split(" ");
  var arrayProps = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
                    "lastIndexOf every some filter forEach map reduce reduceRight ").split(" ");
  var funcProps = "prototype apply call bind".split(" ");
  var javascriptKeywords = ("break case catch continue debugger default delete do else false finally for function " +
                  "if in instanceof new null return switch throw true try typeof var void while with").split(" ");
  var coffeescriptKeywords = ("and break catch class continue delete do else extends false finally for " +
                  "if in instanceof isnt new no not null of off on or return switch then throw true try typeof until void while with yes").split(" ");

  function getCompletions(token, context, keywords, options) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) found.push(str);
    }
    function gatherCompletions(obj) {
      if (typeof obj == "string") forEach(stringProps, maybeAdd);
      else if (obj instanceof Array) forEach(arrayProps, maybeAdd);
      else if (obj instanceof Function) forEach(funcProps, maybeAdd);
      for (var name in obj) maybeAdd(name);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;
      if (obj.type.indexOf("variable") === 0) {
        if (options && options.additionalContext)
          base = options.additionalContext[obj.string];
        base = base || window[obj.string];
      } else if (obj.type == "string") {
        base = "";
      } else if (obj.type == "atom") {
        base = 1;
      } else if (obj.type == "function") {
        if (window.jQuery != null && (obj.string == '$' || obj.string == 'jQuery') &&
            (typeof window.jQuery == 'function'))
          base = window.jQuery();
        else if (window._ != null && (obj.string == '_') && (typeof window._ == 'function'))
          base = window._();
      }
      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    else {
      // If not, just look in the window object and any local scope
      // (reading into JS mode internals to get at the local and global variables)
      for (var v = token.state.localVars; v; v = v.next) maybeAdd(v.name);
      for (var v = token.state.globalVars; v; v = v.next) maybeAdd(v.name);
      gatherCompletions(window);
      forEach(keywords, maybeAdd);
    }
    return found;
  }
})();
(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, _keywords, getToken) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.

    if (!/^[\w$_]*$/.test(token.string)) {
        token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                         className: token.string == ":" ? "pig-type" : null};
    }

    if (!context) var context = [];
    context.push(tprop);

    var completionList = getCompletions(token, context);
    completionList = completionList.sort();
    //prevent autocomplete for last word, instead show dropdown with one word
    if(completionList.length == 1) {
      completionList.push(" ");
    }

    return {list: completionList,
            from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)};
  }

  CodeMirror.pigHint = function(editor) {
    return scriptHint(editor, pigKeywordsU, function (e, cur) {return e.getTokenAt(cur);});
  };

  var pigKeywords = "VOID IMPORT RETURNS DEFINE LOAD FILTER FOREACH ORDER CUBE DISTINCT COGROUP "
  + "JOIN CROSS UNION SPLIT INTO IF OTHERWISE ALL AS BY USING INNER OUTER ONSCHEMA PARALLEL "
  + "PARTITION GROUP AND OR NOT GENERATE FLATTEN ASC DESC IS STREAM THROUGH STORE MAPREDUCE "
  + "SHIP CACHE INPUT OUTPUT STDERROR STDIN STDOUT LIMIT SAMPLE LEFT RIGHT FULL EQ GT LT GTE LTE "
  + "NEQ MATCHES TRUE FALSE";
  var pigKeywordsU = pigKeywords.split(" ");
  var pigKeywordsL = pigKeywords.toLowerCase().split(" ");

  var pigTypes = "BOOLEAN INT LONG FLOAT DOUBLE CHARARRAY BYTEARRAY BAG TUPLE MAP";
  var pigTypesU = pigTypes.split(" ");
  var pigTypesL = pigTypes.toLowerCase().split(" ");

  var pigBuiltins = "ABS ACOS ARITY ASIN ATAN AVG BAGSIZE BINSTORAGE BLOOM BUILDBLOOM CBRT CEIL "
  + "CONCAT COR COS COSH COUNT COUNT_STAR COV CONSTANTSIZE CUBEDIMENSIONS DIFF DISTINCT DOUBLEABS "
  + "DOUBLEAVG DOUBLEBASE DOUBLEMAX DOUBLEMIN DOUBLEROUND DOUBLESUM EXP FLOOR FLOATABS FLOATAVG "
  + "FLOATMAX FLOATMIN FLOATROUND FLOATSUM GENERICINVOKER INDEXOF INTABS INTAVG INTMAX INTMIN "
  + "INTSUM INVOKEFORDOUBLE INVOKEFORFLOAT INVOKEFORINT INVOKEFORLONG INVOKEFORSTRING INVOKER "
  + "ISEMPTY JSONLOADER JSONMETADATA JSONSTORAGE LAST_INDEX_OF LCFIRST LOG LOG10 LOWER LONGABS "
  + "LONGAVG LONGMAX LONGMIN LONGSUM MAX MIN MAPSIZE MONITOREDUDF NONDETERMINISTIC OUTPUTSCHEMA  "
  + "PIGSTORAGE PIGSTREAMING RANDOM REGEX_EXTRACT REGEX_EXTRACT_ALL REPLACE ROUND SIN SINH SIZE "
  + "SQRT STRSPLIT SUBSTRING SUM STRINGCONCAT STRINGMAX STRINGMIN STRINGSIZE TAN TANH TOBAG "
  + "TOKENIZE TOMAP TOP TOTUPLE TRIM TEXTLOADER TUPLESIZE UCFIRST UPPER UTF8STORAGECONVERTER";
  var pigBuiltinsU = pigBuiltins.split(" ").join("() ").split(" ");
  var pigBuiltinsL = pigBuiltins.toLowerCase().split(" ").join("() ").split(" ");
  var pigBuiltinsC = ("BagSize BinStorage Bloom BuildBloom ConstantSize CubeDimensions DoubleAbs "
  + "DoubleAvg DoubleBase DoubleMax DoubleMin DoubleRound DoubleSum FloatAbs FloatAvg FloatMax "
  + "FloatMin FloatRound FloatSum GenericInvoker IntAbs IntAvg IntMax IntMin IntSum "
  + "InvokeForDouble InvokeForFloat InvokeForInt InvokeForLong InvokeForString Invoker "
  + "IsEmpty JsonLoader JsonMetadata JsonStorage LongAbs LongAvg LongMax LongMin LongSum MapSize "
  + "MonitoredUDF Nondeterministic OutputSchema PigStorage PigStreaming StringConcat StringMax "
  + "StringMin StringSize TextLoader TupleSize Utf8StorageConverter").split(" ").join("() ").split(" ");

  function getCompletions(token, context) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(obj) {
      if(obj == ":") {
        forEach(pigTypesL, maybeAdd);
      }
      else {
        forEach(pigBuiltinsU, maybeAdd);
        forEach(pigBuiltinsL, maybeAdd);
        forEach(pigBuiltinsC, maybeAdd);
        forEach(pigTypesU, maybeAdd);
        forEach(pigTypesL, maybeAdd);
        forEach(pigKeywordsU, maybeAdd);
        forEach(pigKeywordsL, maybeAdd);
      }
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;

      if (obj.type == "variable")
          base = obj.string;
      else if(obj.type == "variable-3")
          base = ":" + obj.string;

      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    return found;
  }
})();
(function () {
  function forEach(arr, f) {
    for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
  }

  function arrayContains(arr, item) {
    if (!Array.prototype.indexOf) {
      var i = arr.length;
      while (i--) {
        if (arr[i] === item) {
          return true;
        }
      }
      return false;
    }
    return arr.indexOf(item) != -1;
  }

  function scriptHint(editor, _keywords, getToken) {
    // Find the token at the cursor
    var cur = editor.getCursor(), token = getToken(editor, cur), tprop = token;
    // If it's not a 'word-style' token, ignore the token.

    if (!/^[\w$_]*$/.test(token.string)) {
        token = tprop = {start: cur.ch, end: cur.ch, string: "", state: token.state,
                         className: token.string == ":" ? "python-type" : null};
    }

    if (!context) var context = [];
    context.push(tprop);

    var completionList = getCompletions(token, context);
    completionList = completionList.sort();
    //prevent autocomplete for last word, instead show dropdown with one word
    if(completionList.length == 1) {
      completionList.push(" ");
    }

    return {list: completionList,
            from: CodeMirror.Pos(cur.line, token.start),
            to: CodeMirror.Pos(cur.line, token.end)};
  }

  CodeMirror.pythonHint = function(editor) {
    return scriptHint(editor, pythonKeywordsU, function (e, cur) {return e.getTokenAt(cur);});
  };

  var pythonKeywords = "and del from not while as elif global or with assert else if pass yield"
+ "break except import print class exec in raise continue finally is return def for lambda try";
  var pythonKeywordsL = pythonKeywords.split(" ");
  var pythonKeywordsU = pythonKeywords.toUpperCase().split(" ");

  var pythonBuiltins = "abs divmod input open staticmethod all enumerate int ord str "
+ "any eval isinstance pow sum basestring execfile issubclass print super"
+ "bin file iter property tuple bool filter len range type"
+ "bytearray float list raw_input unichr callable format locals reduce unicode"
+ "chr frozenset long reload vars classmethod getattr map repr xrange"
+ "cmp globals max reversed zip compile hasattr memoryview round __import__"
+ "complex hash min set apply delattr help next setattr buffer"
+ "dict hex object slice coerce dir id oct sorted intern ";
  var pythonBuiltinsL = pythonBuiltins.split(" ").join("() ").split(" ");
  var pythonBuiltinsU = pythonBuiltins.toUpperCase().split(" ").join("() ").split(" ");

  function getCompletions(token, context) {
    var found = [], start = token.string;
    function maybeAdd(str) {
      if (str.indexOf(start) == 0 && !arrayContains(found, str)) found.push(str);
    }

    function gatherCompletions(_obj) {
        forEach(pythonBuiltinsL, maybeAdd);
        forEach(pythonBuiltinsU, maybeAdd);
        forEach(pythonKeywordsL, maybeAdd);
        forEach(pythonKeywordsU, maybeAdd);
    }

    if (context) {
      // If this is a property, see if it belongs to some object we can
      // find in the current environment.
      var obj = context.pop(), base;

      if (obj.type == "variable")
          base = obj.string;
      else if(obj.type == "variable-3")
          base = ":" + obj.string;

      while (base != null && context.length)
        base = base[context.pop().string];
      if (base != null) gatherCompletions(base);
    }
    return found;
  }
})();
CodeMirror.showHint = function(cm, getHints, options) {
  if (!options) options = {};
  var startCh = cm.getCursor().ch, continued = false;
  var closeOn = options.closeCharacters || /[\s()\[\]{};:]/;

  function startHinting() {
    // We want a single cursor position.
    if (cm.somethingSelected()) return;

    if (options.async)
      getHints(cm, showHints, options);
    else
      return showHints(getHints(cm, options));
  }

  function getText(completion) {
    if (typeof completion == "string") return completion;
    else return completion.text;
  }

  function pickCompletion(cm, data, completion) {
    if (completion.hint) completion.hint(cm, data, completion);
    else cm.replaceRange(getText(completion), data.from, data.to);
  }

  function showHints(data) {
    if (!data || !data.list.length) return;
    var completions = data.list;
    // When there is only one completion, use it directly.
    if (!continued && options.completeSingle !== false && completions.length == 1) {
      pickCompletion(cm, data, completions[0]);
      CodeMirror.signal(data, "close");
      return true;
    }

    // Build the select widget
    var hints = document.createElement("ul"), selectedHint = 0;
    hints.className = "CodeMirror-hints";
    for (var i = 0; i < completions.length; ++i) {
      var elt = hints.appendChild(document.createElement("li")), completion = completions[i];
      var className = "CodeMirror-hint" + (i ? "" : " CodeMirror-hint-active");
      if (completion.className != null) className = completion.className + " " + className;
      elt.className = className;
      if (completion.render) completion.render(elt, data, completion);
      else elt.appendChild(document.createTextNode(completion.displayText || getText(completion)));
      elt.hintId = i;
    }
    var pos = cm.cursorCoords(options.alignWithWord !== false ? data.from : null);
    var left = pos.left, top = pos.bottom, below = true;
    hints.style.left = left + "px";
    hints.style.top = top + "px";
    document.body.appendChild(hints);
    CodeMirror.signal(data, "shown");

    // If we're at the edge of the screen, then we want the menu to appear on the left of the cursor.
    var winW = window.innerWidth || Math.max(document.body.offsetWidth, document.documentElement.offsetWidth);
    var winH = window.innerHeight || Math.max(document.body.offsetHeight, document.documentElement.offsetHeight);
    var box = hints.getBoundingClientRect();
    var overlapX = box.right - winW, overlapY = box.bottom - winH;
    if (overlapX > 0) {
      if (box.right - box.left > winW) {
        hints.style.width = (winW - 5) + "px";
        overlapX -= (box.right - box.left) - winW;
      }
      hints.style.left = (left = pos.left - overlapX) + "px";
    }
    if (overlapY > 0) {
      var height = box.bottom - box.top;
      if (box.top - (pos.bottom - pos.top) - height > 0) {
        overlapY = height + (pos.bottom - pos.top);
        below = false;
      } else if (height > winH) {
        hints.style.height = (winH - 5) + "px";
        overlapY -= height - winH;
      }
      hints.style.top = (top = pos.bottom - overlapY) + "px";
    }

    function changeActive(i) {
      i = Math.max(0, Math.min(i, completions.length - 1));
      if (selectedHint == i) return;
      var node = hints.childNodes[selectedHint];
      node.className = node.className.replace(" CodeMirror-hint-active", "");
      node = hints.childNodes[selectedHint = i];
      node.className += " CodeMirror-hint-active";
      if (node.offsetTop < hints.scrollTop)
        hints.scrollTop = node.offsetTop - 3;
      else if (node.offsetTop + node.offsetHeight > hints.scrollTop + hints.clientHeight)
        hints.scrollTop = node.offsetTop + node.offsetHeight - hints.clientHeight + 3;
      CodeMirror.signal(data, "select", completions[selectedHint], node);
    }

    function screenAmount() {
      return Math.floor(hints.clientHeight / hints.firstChild.offsetHeight) || 1;
    }

    var ourMap, baseMap = {
      Up: function() {changeActive(selectedHint - 1);},
      Down: function() {changeActive(selectedHint + 1);},
      PageUp: function() {changeActive(selectedHint - screenAmount());},
      PageDown: function() {changeActive(selectedHint + screenAmount());},
      Home: function() {changeActive(0);},
      End: function() {changeActive(completions.length - 1);},
      Enter: pick,
      Tab: pick,
      Esc: close
    };
    if (options.customKeys) {
      ourMap = {};
      for (var key in options.customKeys) if (options.customKeys.hasOwnProperty(key)) {
        var val = options.customKeys[key];
        if (baseMap.hasOwnProperty(val)) val = baseMap[val];
        ourMap[key] = val;
      }
    } else ourMap = baseMap;

    cm.addKeyMap(ourMap);
    cm.on("cursorActivity", cursorActivity);
    var closingOnBlur;
    function onBlur(){ closingOnBlur = setTimeout(close, 100); };
    function onFocus(){ clearTimeout(closingOnBlur); };
    cm.on("blur", onBlur);
    cm.on("focus", onFocus);
    var startScroll = cm.getScrollInfo();
    function onScroll() {
      var curScroll = cm.getScrollInfo(), editor = cm.getWrapperElement().getBoundingClientRect();
      var newTop = top + startScroll.top - curScroll.top, point = newTop;
      if (!below) point += hints.offsetHeight;
      if (point <= editor.top || point >= editor.bottom) return close();
      hints.style.top = newTop + "px";
      hints.style.left = (left + startScroll.left - curScroll.left) + "px";
    }
    cm.on("scroll", onScroll);
    CodeMirror.on(hints, "dblclick", function(e) {
      var t = e.target || e.srcElement;
      if (t.hintId != null) {selectedHint = t.hintId; pick();}
    });
    CodeMirror.on(hints, "click", function(e) {
      var t = e.target || e.srcElement;
      if (t.hintId != null) changeActive(t.hintId);
    });
    CodeMirror.on(hints, "mousedown", function() {
      setTimeout(function(){cm.focus();}, 20);
    });

    var done = false, once;
    function close(willContinue) {
      if (done) return;
      done = true;
      clearTimeout(once);
      hints.parentNode.removeChild(hints);
      cm.removeKeyMap(ourMap);
      cm.off("cursorActivity", cursorActivity);
      cm.off("blur", onBlur);
      cm.off("focus", onFocus);
      cm.off("scroll", onScroll);
      if (willContinue !== true) CodeMirror.signal(data, "close");
    }
    function pick() {
      pickCompletion(cm, data, completions[selectedHint]);
      close();
    }
    var once, lastPos = cm.getCursor(), lastLen = cm.getLine(lastPos.line).length;
    function cursorActivity() {
      clearTimeout(once);

      var pos = cm.getCursor(), line = cm.getLine(pos.line);
      if (pos.line != lastPos.line || line.length - pos.ch != lastLen - lastPos.ch ||
          pos.ch < startCh || cm.somethingSelected() ||
          (pos.ch && closeOn.test(line.charAt(pos.ch - 1))))
        close();
      else
        once = setTimeout(function(){close(true); continued = true; startHinting();}, 70);
    }
    CodeMirror.signal(data, "select", completions[0], hints.firstChild);
    return true;
  }

  return startHinting();
};
(function() {

    CodeMirror.xmlHints = [];

    CodeMirror.xmlHint = function(cm) {

        var cursor = cm.getCursor();

        if (cursor.ch > 0) {

            var text = cm.getRange(CodeMirror.Pos(0, 0), cursor);
            var typed = '';
            var simbol = '';
            for(var i = text.length - 1; i >= 0; i--) {
                if(text[i] == ' ' || text[i] == '<') {
                    simbol = text[i];
                    break;
                }
                else {
                    typed = text[i] + typed;
                }
            }

            text = text.slice(0, text.length - typed.length);

            var path = getActiveElement(text) + simbol;
            var hints = CodeMirror.xmlHints[path];

            if(typeof hints === 'undefined')
                hints = [''];
            else {
                hints = hints.slice(0);
                for (var i = hints.length - 1; i >= 0; i--) {
                    if(hints[i].indexOf(typed) != 0)
                        hints.splice(i, 1);
                }
            }

            return {
                list: hints,
                from: CodeMirror.Pos(cursor.line, cursor.ch - typed.length),
                to: cursor
            };
        }
    };

    var getActiveElement = function(text) {

        var element = '';

        if(text.length >= 0) {

            var regex = new RegExp('<([^!?][^\\s/>]*)[\\s\\S]*?>', 'g');

            var matches = [];
            var match;
            while ((match = regex.exec(text)) != null) {
                matches.push({
                    tag: match[1],
                    selfclose: (match[0].slice(match[0].length - 2) === '/>')
                });
            }

            for (var i = matches.length - 1, skip = 0; i >= 0; i--) {

                var item = matches[i];

                if (item.tag[0] == '/')
                {
                    skip++;
                }
                else if (item.selfclose == false)
                {
                    if (skip > 0)
                    {
                        skip--;
                    }
                    else
                    {
                        element = '<' + item.tag + '>' + element;
                    }
                }
            }

            element += getOpenTag(text);
        }

        return element;
    };

    var getOpenTag = function(text) {

        var open = text.lastIndexOf('<');
        var close = text.lastIndexOf('>');

        if (close < open)
        {
            text = text.slice(open);

            if(text != '<') {

                var space = text.indexOf(' ');
                if(space < 0)
                    space = text.indexOf('\t');
                if(space < 0)
                    space = text.indexOf('\n');

                if (space < 0)
                    space = text.length;

                return text.slice(0, space);
            }
        }

        return '';
    };

})();
CodeMirror.runMode = function(string, modespec, callback, options) {
  var mode = CodeMirror.getMode(CodeMirror.defaults, modespec);

  if (callback.nodeType == 1) {
    var tabSize = (options && options.tabSize) || CodeMirror.defaults.tabSize;
    var node = callback, col = 0;
    node.innerHTML = "";
    callback = function(text, style) {
      if (text == "\n") {
        node.appendChild(document.createElement("br"));
        col = 0;
        return;
      }
      var content = "";
      // replace tabs
      for (var pos = 0;;) {
        var idx = text.indexOf("\t", pos);
        if (idx == -1) {
          content += text.slice(pos);
          col += text.length - pos;
          break;
        } else {
          col += idx - pos;
          content += text.slice(pos, idx);
          var size = tabSize - col % tabSize;
          col += size;
          for (var i = 0; i < size; ++i) content += " ";
          pos = idx + 1;
        }
      }

      if (style) {
        var sp = node.appendChild(document.createElement("span"));
        sp.className = "cm-" + style.replace(/ +/g, " cm-");
        sp.appendChild(document.createTextNode(content));
      } else {
        node.appendChild(document.createTextNode(content));
      }
    };
  }

  var lines = CodeMirror.splitLines(string), state = CodeMirror.startState(mode);
  for (var i = 0, e = lines.length; i < e; ++i) {
    if (i) callback("\n");
    var stream = new CodeMirror.StringStream(lines[i]);
    while (!stream.eol()) {
      var style = mode.token(stream, state);
      callback(stream.current(), style, i, stream.start);
      stream.start = stream.pos;
    }
  }
};
// Highlighting text that matches the selection
//
// Defines an option highlightSelectionMatches, which, when enabled,
// will style strings that match the selection throughout the
// document.
//
// The option can be set to true to simply enable it, or to a
// {minChars, style} object to explicitly configure it. minChars is
// the minimum amount of characters that should be selected for the
// behavior to occur, and style is the token style to apply to the
// matches. This will be prefixed by "cm-" to create an actual CSS
// class name.

(function() {
  var DEFAULT_MIN_CHARS = 2;
  var DEFAULT_TOKEN_STYLE = "matchhighlight";

  function State(options) {
    this.minChars = typeof options == "object" && options.minChars || DEFAULT_MIN_CHARS;
    this.style = typeof options == "object" && options.style || DEFAULT_TOKEN_STYLE;
    this.overlay = null;
  }

  CodeMirror.defineOption("highlightSelectionMatches", false, function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      cm._matchHighlightState = new State(val);
      cm.on("cursorActivity", highlightMatches);
    } else if (!val && prev) {
      var over = cm._matchHighlightState.overlay;
      if (over) cm.removeOverlay(over);
      cm._matchHighlightState = null;
      cm.off("cursorActivity", highlightMatches);
    }
  });

  function highlightMatches(cm) {
    cm.operation(function() {
      var state = cm._matchHighlightState;
      if (state.overlay) {
        cm.removeOverlay(state.overlay);
        state.overlay = null;
      }

      if (!cm.somethingSelected()) return;
      var selection = cm.getSelection().replace(/^\s+|\s+$/g, "");
      if (selection.length < state.minChars) return;

      cm.addOverlay(state.overlay = makeOverlay(selection, state.style));
    });
  }

  function makeOverlay(query, style) {
    return {token: function(stream) {
      if (stream.match(query)) return style;
      stream.next();
      stream.skipTo(query.charAt(0)) || stream.skipToEnd();
    }};
  }
})();
// Define search commands. Depends on dialog.js or another
// implementation of the openDialog method.

// Replace works a little oddly -- it will do the replace on the next
// Ctrl-G (or whatever is bound to findNext) press. You prevent a
// replace by making sure the match is no longer selected when hitting
// Ctrl-G.

(function() {
  function searchOverlay(query) {
    if (typeof query == "string") return {token: function(stream) {
      if (stream.match(query)) return "searching";
      stream.next();
      stream.skipTo(query.charAt(0)) || stream.skipToEnd();
    }};
    return {token: function(stream) {
      if (stream.match(query)) return "searching";
      while (!stream.eol()) {
        stream.next();
        if (stream.match(query, false)) break;
      }
    }};
  }

  function SearchState() {
    this.posFrom = this.posTo = this.query = null;
    this.overlay = null;
  }
  function getSearchState(cm) {
    return cm._searchState || (cm._searchState = new SearchState());
  }
  function getSearchCursor(cm, query, pos) {
    // Heuristic: if the query string is all lowercase, do a case insensitive search.
    return cm.getSearchCursor(query, pos, typeof query == "string" && query == query.toLowerCase());
  }
  function dialog(cm, text, shortText, f) {
    if (cm.openDialog) cm.openDialog(text, f);
    else f(prompt(shortText, ""));
  }
  function confirmDialog(cm, text, shortText, fs) {
    if (cm.openConfirm) cm.openConfirm(text, fs);
    else if (confirm(shortText)) fs[0]();
  }
  function parseQuery(query) {
    var isRE = query.match(/^\/(.*)\/([a-z]*)$/);
    return isRE ? new RegExp(isRE[1], isRE[2].indexOf("i") == -1 ? "" : "i") : query;
  }
  var queryDialog =
    'Search: <input type="text" style="width: 10em"/> <span style="color: #888">(Use /re/ syntax for regexp search)</span>';
  function doSearch(cm, rev) {
    var state = getSearchState(cm);
    if (state.query) return findNext(cm, rev);
    dialog(cm, queryDialog, "Search for:", function(query) {
      cm.operation(function() {
        if (!query || state.query) return;
        state.query = parseQuery(query);
        cm.removeOverlay(state.overlay);
        state.overlay = searchOverlay(query);
        cm.addOverlay(state.overlay);
        state.posFrom = state.posTo = cm.getCursor();
        findNext(cm, rev);
      });
    });
  }
  function findNext(cm, rev) {cm.operation(function() {
    var state = getSearchState(cm);
    var cursor = getSearchCursor(cm, state.query, rev ? state.posFrom : state.posTo);
    if (!cursor.find(rev)) {
      cursor = getSearchCursor(cm, state.query, rev ? CodeMirror.Pos(cm.lastLine()) : CodeMirror.Pos(cm.firstLine(), 0));
      if (!cursor.find(rev)) return;
    }
    cm.setSelection(cursor.from(), cursor.to());
    state.posFrom = cursor.from(); state.posTo = cursor.to();
  });}
  function clearSearch(cm) {cm.operation(function() {
    var state = getSearchState(cm);
    if (!state.query) return;
    state.query = null;
    cm.removeOverlay(state.overlay);
  });}

  var replaceQueryDialog =
    'Replace: <input type="text" style="width: 10em"/> <span style="color: #888">(Use /re/ syntax for regexp search)</span>';
  var replacementQueryDialog = 'With: <input type="text" style="width: 10em"/>';
  var doReplaceConfirm = "Replace? <button>Yes</button> <button>No</button> <button>Stop</button>";
  function replace(cm, all) {
    dialog(cm, replaceQueryDialog, "Replace:", function(query) {
      if (!query) return;
      query = parseQuery(query);
      dialog(cm, replacementQueryDialog, "Replace with:", function(text) {
        if (all) {
          cm.operation(function() {
            for (var cursor = getSearchCursor(cm, query); cursor.findNext();) {
              if (typeof query != "string") {
                var match = cm.getRange(cursor.from(), cursor.to()).match(query);
                cursor.replace(text.replace(/\$(\d)/, function(_, i) {return match[i];}));
              } else cursor.replace(text);
            }
          });
        } else {
          clearSearch(cm);
          var cursor = getSearchCursor(cm, query, cm.getCursor());
          var advance = function() {
            var start = cursor.from(), match;
            if (!(match = cursor.findNext())) {
              cursor = getSearchCursor(cm, query);
              if (!(match = cursor.findNext()) ||
                  (start && cursor.from().line == start.line && cursor.from().ch == start.ch)) return;
            }
            cm.setSelection(cursor.from(), cursor.to());
            confirmDialog(cm, doReplaceConfirm, "Replace?",
                          [function() {doReplace(match);}, advance]);
          };
          var doReplace = function(match) {
            cursor.replace(typeof query == "string" ? text :
                           text.replace(/\$(\d)/, function(_, i) {return match[i];}));
            advance();
          };
          advance();
        }
      });
    });
  }

  CodeMirror.commands.find = function(cm) {clearSearch(cm); doSearch(cm);};
  CodeMirror.commands.findNext = doSearch;
  CodeMirror.commands.findPrev = function(cm) {doSearch(cm, true);};
  CodeMirror.commands.clearSearch = clearSearch;
  CodeMirror.commands.replace = replace;
  CodeMirror.commands.replaceAll = function(cm) {replace(cm, true);};
})();
(function(){
  var Pos = CodeMirror.Pos;

  function SearchCursor(doc, query, pos, caseFold) {
    this.atOccurrence = false; this.doc = doc;
    if (caseFold == null && typeof query == "string") caseFold = false;

    pos = pos ? doc.clipPos(pos) : Pos(0, 0);
    this.pos = {from: pos, to: pos};

    // The matches method is filled in based on the type of query.
    // It takes a position and a direction, and returns an object
    // describing the next occurrence of the query, or null if no
    // more matches were found.
    if (typeof query != "string") { // Regexp match
      if (!query.global) query = new RegExp(query.source, query.ignoreCase ? "ig" : "g");
      this.matches = function(reverse, pos) {
        if (reverse) {
          query.lastIndex = 0;
          var line = doc.getLine(pos.line).slice(0, pos.ch), cutOff = 0, match, start;
          for (;;) {
            query.lastIndex = cutOff;
            var newMatch = query.exec(line);
            if (!newMatch) break;
            match = newMatch;
            start = match.index;
            cutOff = match.index + 1;
          }
        } else {
          query.lastIndex = pos.ch;
          var line = doc.getLine(pos.line), match = query.exec(line),
          start = match && match.index;
        }
        if (match && match[0])
          return {from: Pos(pos.line, start),
                  to: Pos(pos.line, start + match[0].length),
                  match: match};
      };
    } else { // String query
      if (caseFold) query = query.toLowerCase();
      var fold = caseFold ? function(str){return str.toLowerCase();} : function(str){return str;};
      var target = query.split("\n");
      // Different methods for single-line and multi-line queries
      if (target.length == 1) {
        if (!query.length) {
          // Empty string would match anything and never progress, so
          // we define it to match nothing instead.
          this.matches = function() {};
        } else {
          this.matches = function(reverse, pos) {
            var line = fold(doc.getLine(pos.line)), len = query.length, match;
            if (reverse ? (pos.ch >= len && (match = line.lastIndexOf(query, pos.ch - len)) != -1)
                        : (match = line.indexOf(query, pos.ch)) != -1)
              return {from: Pos(pos.line, match),
                      to: Pos(pos.line, match + len)};
          };
        }
      } else {
        this.matches = function(reverse, pos) {
          var ln = pos.line, idx = (reverse ? target.length - 1 : 0), match = target[idx], line = fold(doc.getLine(ln));
          var offsetA = (reverse ? line.indexOf(match) + match.length : line.lastIndexOf(match));
          if (reverse ? offsetA >= pos.ch || offsetA != match.length
              : offsetA <= pos.ch || offsetA != line.length - match.length)
            return;
          for (;;) {
            if (reverse ? !ln : ln == doc.lineCount() - 1) return;
            line = fold(doc.getLine(ln += reverse ? -1 : 1));
            match = target[reverse ? --idx : ++idx];
            if (idx > 0 && idx < target.length - 1) {
              if (line != match) return;
              else continue;
            }
            var offsetB = (reverse ? line.lastIndexOf(match) : line.indexOf(match) + match.length);
            if (reverse ? offsetB != line.length - match.length : offsetB != match.length)
              return;
            var start = Pos(pos.line, offsetA), end = Pos(ln, offsetB);
            return {from: reverse ? end : start, to: reverse ? start : end};
          }
        };
      }
    }
  }

  SearchCursor.prototype = {
    findNext: function() {return this.find(false);},
    findPrevious: function() {return this.find(true);},

    find: function(reverse) {
      var self = this, pos = this.doc.clipPos(reverse ? this.pos.from : this.pos.to);
      function savePosAndFail(line) {
        var pos = Pos(line, 0);
        self.pos = {from: pos, to: pos};
        self.atOccurrence = false;
        return false;
      }

      for (;;) {
        if (this.pos = this.matches(reverse, pos)) {
          if (!this.pos.from || !this.pos.to) { console.log(this.matches, this.pos); }
          this.atOccurrence = true;
          return this.pos.match || true;
        }
        if (reverse) {
          if (!pos.line) return savePosAndFail(0);
          pos = Pos(pos.line-1, this.doc.getLine(pos.line-1).length);
        }
        else {
          var maxLine = this.doc.lineCount();
          if (pos.line == maxLine - 1) return savePosAndFail(maxLine);
          pos = Pos(pos.line + 1, 0);
        }
      }
    },

    from: function() {if (this.atOccurrence) return this.pos.from;},
    to: function() {if (this.atOccurrence) return this.pos.to;},

    replace: function(newText) {
      if (!this.atOccurrence) return;
      var lines = CodeMirror.splitLines(newText);
      this.doc.replaceRange(lines, this.pos.from, this.pos.to);
      this.pos.to = Pos(this.pos.from.line + lines.length - 1,
                        lines[lines.length - 1].length + (lines.length == 1 ? this.pos.from.ch : 0));
    }
  };

  CodeMirror.defineExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this.doc, query, pos, caseFold);
  });
  CodeMirror.defineDocExtension("getSearchCursor", function(query, pos, caseFold) {
    return new SearchCursor(this, query, pos, caseFold);
  });
})();
// Because sometimes you need to style the cursor's line.
//
// Adds an option 'styleActiveLine' which, when enabled, gives the
// active line's wrapping <div> the CSS class "CodeMirror-activeline",
// and gives its background <div> the class "CodeMirror-activeline-background".

(function() {
  "use strict";
  var WRAP_CLASS = "CodeMirror-activeline";
  var BACK_CLASS = "CodeMirror-activeline-background";

  CodeMirror.defineOption("styleActiveLine", false, function(cm, val, old) {
    var prev = old && old != CodeMirror.Init;
    if (val && !prev) {
      updateActiveLine(cm);
      cm.on("cursorActivity", updateActiveLine);
    } else if (!val && prev) {
      cm.off("cursorActivity", updateActiveLine);
      clearActiveLine(cm);
      delete cm._activeLine;
    }
  });

  function clearActiveLine(cm) {
    if ("_activeLine" in cm) {
      cm.removeLineClass(cm._activeLine, "wrap", WRAP_CLASS);
      cm.removeLineClass(cm._activeLine, "background", BACK_CLASS);
    }
  }

  function updateActiveLine(cm) {
    var line = cm.getLineHandle(cm.getCursor().line);
    if (cm._activeLine == line) return;
    clearActiveLine(cm);
    cm.addLineClass(line, "wrap", WRAP_CLASS);
    cm.addLineClass(line, "background", BACK_CLASS);
    cm._activeLine = line;
  }
})();
(function() {
  "use strict";

  var noOptions = {};
  var nonWS = /[^\s\u00a0]/;
  var Pos = CodeMirror.Pos;

  function firstNonWS(str) {
    var found = str.search(nonWS);
    return found == -1 ? 0 : found;
  }

  CodeMirror.commands.toggleComment = function(cm) {
    var from = cm.getCursor("start"), to = cm.getCursor("end");
    cm.uncomment(from, to) || cm.lineComment(from, to);
  };

  CodeMirror.defineExtension("lineComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = CodeMirror.innerMode(self.getMode(), self.getTokenAt(from).state).mode;
    var commentString = options.lineComment || mode.lineComment;
    if (!commentString) {
      if (options.blockCommentStart || mode.blockCommentStart) {
        options.fullLines = true;
        self.blockComment(from, to, options);
      }
      return;
    }
    var firstLine = self.getLine(from.line);
    if (firstLine == null) return;
    var end = Math.min(to.ch != 0 || to.line == from.line ? to.line + 1 : to.line, self.lastLine() + 1);
    var pad = options.padding == null ? " " : options.padding;
    var blankLines = options.commentBlankLines || from.line == to.line;

    self.operation(function() {
      if (options.indent) {
        var baseString = firstLine.slice(0, firstNonWS(firstLine));
        for (var i = from.line; i < end; ++i) {
          var line = self.getLine(i), cut = baseString.length;
          if (!blankLines && !nonWS.test(line)) continue;
          if (line.slice(0, cut) != baseString) cut = firstNonWS(line);
          self.replaceRange(baseString + commentString + pad, Pos(i, 0), Pos(i, cut));
        }
      } else {
        for (var i = from.line; i < end; ++i) {
          if (blankLines || nonWS.test(self.getLine(i)))
            self.replaceRange(commentString + pad, Pos(i, 0));
        }
      }
    });
  });

  CodeMirror.defineExtension("blockComment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = CodeMirror.innerMode(self.getMode(), self.getTokenAt(from).state).mode;
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) {
      if ((options.lineComment || mode.lineComment) && options.fullLines != false)
        self.lineComment(from, to, options);
      return;
    }

    var end = Math.min(to.line, self.lastLine());
    if (end != from.line && to.ch == 0 && nonWS.test(self.getLine(end))) --end;

    var pad = options.padding == null ? " " : options.padding;
    if (from.line > end) return;

    self.operation(function() {
      if (options.fullLines != false) {
        var lastLineHasText = nonWS.test(self.getLine(end));
        self.replaceRange(pad + endString, Pos(end));
        self.replaceRange(startString + pad, Pos(from.line, 0));
        var lead = options.blockCommentLead || mode.blockCommentLead;
        if (lead != null) for (var i = from.line + 1; i <= end; ++i)
          if (i != end || lastLineHasText)
            self.replaceRange(lead + pad, Pos(i, 0));
      } else {
        self.replaceRange(endString, to);
        self.replaceRange(startString, from);
      }
    });
  });

  CodeMirror.defineExtension("uncomment", function(from, to, options) {
    if (!options) options = noOptions;
    var self = this, mode = CodeMirror.innerMode(self.getMode(), self.getTokenAt(from).state).mode;
    var end = Math.min(to.line, self.lastLine()), start = Math.min(from.line, end);

    // Try finding line comments
    var lineString = options.lineComment || mode.lineComment, lines = [];
    var pad = options.padding == null ? " " : options.padding, didSomething;
    lineComment: {
      if (!lineString) break lineComment;
      for (var i = start; i <= end; ++i) {
        var line = self.getLine(i);
        var found = line.indexOf(lineString);
        if (found == -1 && (i != end || i == start) && nonWS.test(line)) break lineComment;
        if (i != start && found > -1 && nonWS.test(line.slice(0, found))) break lineComment;
        lines.push(line);
      }
      self.operation(function() {
        for (var i = start; i <= end; ++i) {
          var line = lines[i - start];
          var pos = line.indexOf(lineString), endPos = pos + lineString.length;
          if (pos < 0) continue;
          if (line.slice(endPos, endPos + pad.length) == pad) endPos += pad.length;
          didSomething = true;
          self.replaceRange("", Pos(i, pos), Pos(i, endPos));
        }
      });
      if (didSomething) return true;
    }

    // Try block comments
    var startString = options.blockCommentStart || mode.blockCommentStart;
    var endString = options.blockCommentEnd || mode.blockCommentEnd;
    if (!startString || !endString) return false;
    var lead = options.blockCommentLead || mode.blockCommentLead;
    var startLine = self.getLine(start), endLine = end == start ? startLine : self.getLine(end);
    var open = startLine.indexOf(startString), close = endLine.lastIndexOf(endString);
    if (close == -1 && start != end) {
      endLine = self.getLine(--end);
      close = endLine.lastIndexOf(endString);
    }
    if (open == -1 || close == -1) return false;

    self.operation(function() {
      self.replaceRange("", Pos(end, close - (pad && endLine.slice(close - pad.length, close) == pad ? pad.length : 0)),
                        Pos(end, close + endString.length));
      var openEnd = open + startString.length;
      if (pad && startLine.slice(openEnd, openEnd + pad.length) == pad) openEnd += pad.length;
      self.replaceRange("", Pos(start, open), Pos(start, openEnd));
      if (lead) for (var i = start + 1; i <= end; ++i) {
        var line = self.getLine(i), found = line.indexOf(lead);
        if (found == -1 || nonWS.test(line.slice(0, found))) continue;
        var foundEnd = found + lead.length;
        if (pad && line.slice(foundEnd, foundEnd + pad.length) == pad) foundEnd += pad.length;
        self.replaceRange("", Pos(i, found), Pos(i, foundEnd));
      }
    });
    return true;
  });
})();
(function() {

  CodeMirror.extendMode("css", {
    commentStart: "/*",
    commentEnd: "*/",
    newlineAfterToken: function(type, content) {
      return /^[;{}]$/.test(content);
    }
  });

  CodeMirror.extendMode("javascript", {
    commentStart: "/*",
    commentEnd: "*/",
    // FIXME semicolons inside of for
    newlineAfterToken: function(type, content, textAfter, state) {
      if (this.jsonMode) {
        return /^[\[,{]$/.test(content) || /^}/.test(textAfter);
      } else {
        if (content == ";" && state.lexical && state.lexical.type == ")") return false;
        return /^[;{}]$/.test(content) && !/^;/.test(textAfter);
      }
    }
  });

  CodeMirror.extendMode("xml", {
    commentStart: "<!--",
    commentEnd: "-->",
    newlineAfterToken: function(type, content, textAfter) {
      return type == "tag" && />$/.test(content) || /^</.test(textAfter);
    }
  });

  // Comment/uncomment the specified range
  CodeMirror.defineExtension("commentRange", function (isComment, from, to) {
    var cm = this, curMode = CodeMirror.innerMode(cm.getMode(), cm.getTokenAt(from).state).mode;
    cm.operation(function() {
      if (isComment) { // Comment range
        cm.replaceRange(curMode.commentEnd, to);
        cm.replaceRange(curMode.commentStart, from);
        if (from.line == to.line && from.ch == to.ch) // An empty comment inserted - put cursor inside
          cm.setCursor(from.line, from.ch + curMode.commentStart.length);
      } else { // Uncomment range
        var selText = cm.getRange(from, to);
        var startIndex = selText.indexOf(curMode.commentStart);
        var endIndex = selText.lastIndexOf(curMode.commentEnd);
        if (startIndex > -1 && endIndex > -1 && endIndex > startIndex) {
          // Take string till comment start
          selText = selText.substr(0, startIndex)
          // From comment start till comment end
            + selText.substring(startIndex + curMode.commentStart.length, endIndex)
          // From comment end till string end
            + selText.substr(endIndex + curMode.commentEnd.length);
        }
        cm.replaceRange(selText, from, to);
      }
    });
  });

  // Applies automatic mode-aware indentation to the specified range
  CodeMirror.defineExtension("autoIndentRange", function (from, to) {
    var cmInstance = this;
    this.operation(function () {
      for (var i = from.line; i <= to.line; i++) {
        cmInstance.indentLine(i, "smart");
      }
    });
  });

  // Applies automatic formatting to the specified range
  CodeMirror.defineExtension("autoFormatRange", function (from, to) {
    var cm = this;
    var outer = cm.getMode(), text = cm.getRange(from, to).split("\n");
    var state = CodeMirror.copyState(outer, cm.getTokenAt(from).state);
    var tabSize = cm.getOption("tabSize");

    var out = "", lines = 0, atSol = from.ch == 0;
    function newline() {
      out += "\n";
      atSol = true;
      ++lines;
    }

    for (var i = 0; i < text.length; ++i) {
      var stream = new CodeMirror.StringStream(text[i], tabSize);
      while (!stream.eol()) {
        var inner = CodeMirror.innerMode(outer, state);
        var style = outer.token(stream, state), cur = stream.current();
        stream.start = stream.pos;
        if (!atSol || /\S/.test(cur)) {
          out += cur;
          atSol = false;
        }
        if (!atSol && inner.mode.newlineAfterToken &&
            inner.mode.newlineAfterToken(style, cur, stream.string.slice(stream.pos) || text[i+1] || "", inner.state))
          newline();
      }
      if (!stream.pos && outer.blankLine) outer.blankLine(state);
      if (!atSol) newline();
    }

    cm.operation(function () {
      cm.replaceRange(out, from, to);
      for (var cur = from.line + 1, end = from.line + lines; cur <= end; ++cur)
        cm.indentLine(cur, "smart");
      cm.setSelection(from, cm.getCursor(false));
    });
  });
})();
CodeMirror.defineMode("clike", function(config, parserConfig) {
  var indentUnit = config.indentUnit,
      statementIndentUnit = parserConfig.statementIndentUnit || indentUnit,
      dontAlignCalls = parserConfig.dontAlignCalls,
      keywords = parserConfig.keywords || {},
      builtin = parserConfig.builtin || {},
      blockKeywords = parserConfig.blockKeywords || {},
      atoms = parserConfig.atoms || {},
      hooks = parserConfig.hooks || {},
      multiLineStrings = parserConfig.multiLineStrings;
  var isOperatorChar = /[+\-*&%=<>!?|\/]/;

  var curPunc;

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (hooks[ch]) {
      var result = hooks[ch](stream, state);
      if (result !== false) return result;
    }
    if (ch == '"' || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    if (/[\[\]{}\(\),;\:\.]/.test(ch)) {
      curPunc = ch;
      return null;
    }
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w\.]/);
      return "number";
    }
    if (ch == "/") {
      if (stream.eat("*")) {
        state.tokenize = tokenComment;
        return tokenComment(stream, state);
      }
      if (stream.eat("/")) {
        stream.skipToEnd();
        return "comment";
      }
    }
    if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return "operator";
    }
    stream.eatWhile(/[\w\$_]/);
    var cur = stream.current();
    if (keywords.propertyIsEnumerable(cur)) {
      if (blockKeywords.propertyIsEnumerable(cur)) curPunc = "newstatement";
      return "keyword";
    }
    if (builtin.propertyIsEnumerable(cur)) {
      if (blockKeywords.propertyIsEnumerable(cur)) curPunc = "newstatement";
      return "builtin";
    }
    if (atoms.propertyIsEnumerable(cur)) return "atom";
    return "variable";
  }

  function tokenString(quote) {
    return function(stream, state) {
      var escaped = false, next, end = false;
      while ((next = stream.next()) != null) {
        if (next == quote && !escaped) {end = true; break;}
        escaped = !escaped && next == "\\";
      }
      if (end || !(escaped || multiLineStrings))
        state.tokenize = null;
      return "string";
    };
  }

  function tokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return "comment";
  }

  function Context(indented, column, type, align, prev) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.align = align;
    this.prev = prev;
  }
  function pushContext(state, col, type) {
    var indent = state.indented;
    if (state.context && state.context.type == "statement")
      indent = state.context.indented;
    return state.context = new Context(indent, col, type, null, state.context);
  }
  function popContext(state) {
    var t = state.context.type;
    if (t == ")" || t == "]" || t == "}")
      state.indented = state.context.indented;
    return state.context = state.context.prev;
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: null,
        context: new Context((basecolumn || 0) - indentUnit, 0, "top", false),
        indented: 0,
        startOfLine: true
      };
    },

    token: function(stream, state) {
      var ctx = state.context;
      if (stream.sol()) {
        if (ctx.align == null) ctx.align = false;
        state.indented = stream.indentation();
        state.startOfLine = true;
      }
      if (stream.eatSpace()) return null;
      curPunc = null;
      var style = (state.tokenize || tokenBase)(stream, state);
      if (style == "comment" || style == "meta") return style;
      if (ctx.align == null) ctx.align = true;

      if ((curPunc == ";" || curPunc == ":" || curPunc == ",") && ctx.type == "statement") popContext(state);
      else if (curPunc == "{") pushContext(state, stream.column(), "}");
      else if (curPunc == "[") pushContext(state, stream.column(), "]");
      else if (curPunc == "(") pushContext(state, stream.column(), ")");
      else if (curPunc == "}") {
        while (ctx.type == "statement") ctx = popContext(state);
        if (ctx.type == "}") ctx = popContext(state);
        while (ctx.type == "statement") ctx = popContext(state);
      }
      else if (curPunc == ctx.type) popContext(state);
      else if (((ctx.type == "}" || ctx.type == "top") && curPunc != ';') || (ctx.type == "statement" && curPunc == "newstatement"))
        pushContext(state, stream.column(), "statement");
      state.startOfLine = false;
      return style;
    },

    indent: function(state, textAfter) {
      if (state.tokenize != tokenBase && state.tokenize != null) return CodeMirror.Pass;
      var ctx = state.context, firstChar = textAfter && textAfter.charAt(0);
      if (ctx.type == "statement" && firstChar == "}") ctx = ctx.prev;
      var closing = firstChar == ctx.type;
      if (ctx.type == "statement") return ctx.indented + (firstChar == "{" ? 0 : statementIndentUnit);
      else if (ctx.align && (!dontAlignCalls || ctx.type != ")")) return ctx.column + (closing ? 0 : 1);
      else if (ctx.type == ")" && !closing) return ctx.indented + statementIndentUnit;
      else return ctx.indented + (closing ? 0 : indentUnit);
    },

    electricChars: "{}",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    lineComment: "//"
  };
});

(function() {
  function words(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  var cKeywords = "auto if break int case long char register continue return default short do sizeof " +
    "double static else struct entry switch extern typedef float union for unsigned " +
    "goto while enum void const signed volatile";

  function cppHook(stream, state) {
    if (!state.startOfLine) return false;
    for (;;) {
      if (stream.skipTo("\\")) {
        stream.next();
        if (stream.eol()) {
          state.tokenize = cppHook;
          break;
        }
      } else {
        stream.skipToEnd();
        state.tokenize = null;
        break;
      }
    }
    return "meta";
  }

  // C#-style strings where "" escapes a quote.
  function tokenAtString(stream, state) {
    var next;
    while ((next = stream.next()) != null) {
      if (next == '"' && !stream.eat('"')) {
        state.tokenize = null;
        break;
      }
    }
    return "string";
  }

  function mimes(ms, mode) {
    for (var i = 0; i < ms.length; ++i) CodeMirror.defineMIME(ms[i], mode);
  }

  mimes(["text/x-csrc", "text/x-c", "text/x-chdr"], {
    name: "clike",
    keywords: words(cKeywords),
    blockKeywords: words("case do else for if switch while struct"),
    atoms: words("null"),
    hooks: {"#": cppHook}
  });
  mimes(["text/x-c++src", "text/x-c++hdr"], {
    name: "clike",
    keywords: words(cKeywords + " asm dynamic_cast namespace reinterpret_cast try bool explicit new " +
                    "static_cast typeid catch operator template typename class friend private " +
                    "this using const_cast inline public throw virtual delete mutable protected " +
                    "wchar_t"),
    blockKeywords: words("catch class do else finally for if struct switch try while"),
    atoms: words("true false null"),
    hooks: {"#": cppHook}
  });
  CodeMirror.defineMIME("text/x-java", {
    name: "clike",
    keywords: words("abstract assert boolean break byte case catch char class const continue default " +
                    "do double else enum extends final finally float for goto if implements import " +
                    "instanceof int interface long native new package private protected public " +
                    "return short static strictfp super switch synchronized this throw throws transient " +
                    "try void volatile while"),
    blockKeywords: words("catch class do else finally for if switch try while"),
    atoms: words("true false null"),
    hooks: {
      "@": function(stream) {
        stream.eatWhile(/[\w\$_]/);
        return "meta";
      }
    }
  });
  CodeMirror.defineMIME("text/x-csharp", {
    name: "clike",
    keywords: words("abstract as base break case catch checked class const continue" +
                    " default delegate do else enum event explicit extern finally fixed for" +
                    " foreach goto if implicit in interface internal is lock namespace new" +
                    " operator out override params private protected public readonly ref return sealed" +
                    " sizeof stackalloc static struct switch this throw try typeof unchecked" +
                    " unsafe using virtual void volatile while add alias ascending descending dynamic from get" +
                    " global group into join let orderby partial remove select set value var yield"),
    blockKeywords: words("catch class do else finally for foreach if struct switch try while"),
    builtin: words("Boolean Byte Char DateTime DateTimeOffset Decimal Double" +
                    " Guid Int16 Int32 Int64 Object SByte Single String TimeSpan UInt16 UInt32" +
                    " UInt64 bool byte char decimal double short int long object"  +
                    " sbyte float string ushort uint ulong"),
    atoms: words("true false null"),
    hooks: {
      "@": function(stream, state) {
        if (stream.eat('"')) {
          state.tokenize = tokenAtString;
          return tokenAtString(stream, state);
        }
        stream.eatWhile(/[\w\$_]/);
        return "meta";
      }
    }
  });
  CodeMirror.defineMIME("text/x-scala", {
    name: "clike",
    keywords: words(

      /* scala */
      "abstract case catch class def do else extends false final finally for forSome if " +
      "implicit import lazy match new null object override package private protected return " +
      "sealed super this throw trait try trye type val var while with yield _ : = => <- <: " +
      "<% >: # @ " +

      /* package scala */
      "assert assume require print println printf readLine readBoolean readByte readShort " +
      "readChar readInt readLong readFloat readDouble " +

      "AnyVal App Application Array BufferedIterator BigDecimal BigInt Char Console Either " +
      "Enumeration Equiv Error Exception Fractional Function IndexedSeq Integral Iterable " +
      "Iterator List Map Numeric Nil NotNull Option Ordered Ordering PartialFunction PartialOrdering " +
      "Product Proxy Range Responder Seq Serializable Set Specializable Stream StringBuilder " +
      "StringContext Symbol Throwable Traversable TraversableOnce Tuple Unit Vector :: #:: " +

      /* package java.lang */
      "Boolean Byte Character CharSequence Class ClassLoader Cloneable Comparable " +
      "Compiler Double Exception Float Integer Long Math Number Object Package Pair Process " +
      "Runtime Runnable SecurityManager Short StackTraceElement StrictMath String " +
      "StringBuffer System Thread ThreadGroup ThreadLocal Throwable Triple Void"


    ),
    blockKeywords: words("catch class do else finally for forSome if match switch try while"),
    atoms: words("true false null"),
    hooks: {
      "@": function(stream) {
        stream.eatWhile(/[\w\$_]/);
        return "meta";
      }
    }
  });
}());
CodeMirror.defineMode("css", function(config) {
  return CodeMirror.getMode(config, "text/css");
});

CodeMirror.defineMode("css-base", function(config, parserConfig) {
  "use strict";

  var indentUnit = config.indentUnit,
      hooks = parserConfig.hooks || {},
      atMediaTypes = parserConfig.atMediaTypes || {},
      atMediaFeatures = parserConfig.atMediaFeatures || {},
      propertyKeywords = parserConfig.propertyKeywords || {},
      colorKeywords = parserConfig.colorKeywords || {},
      valueKeywords = parserConfig.valueKeywords || {},
      allowNested = !!parserConfig.allowNested,
      type = null;

  function ret(style, tp) { type = tp; return style; }

  function tokenBase(stream, state) {
    var ch = stream.next();
    if (hooks[ch]) {
      // result[0] is style and result[1] is type
      var result = hooks[ch](stream, state);
      if (result !== false) return result;
    }
    if (ch == "@") {stream.eatWhile(/[\w\\\-]/); return ret("def", stream.current());}
    else if (ch == "=") ret(null, "compare");
    else if ((ch == "~" || ch == "|") && stream.eat("=")) return ret(null, "compare");
    else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenString(ch);
      return state.tokenize(stream, state);
    }
    else if (ch == "#") {
      stream.eatWhile(/[\w\\\-]/);
      return ret("atom", "hash");
    }
    else if (ch == "!") {
      stream.match(/^\s*\w*/);
      return ret("keyword", "important");
    }
    else if (/\d/.test(ch)) {
      stream.eatWhile(/[\w.%]/);
      return ret("number", "unit");
    }
    else if (ch === "-") {
      if (/\d/.test(stream.peek())) {
        stream.eatWhile(/[\w.%]/);
        return ret("number", "unit");
      } else if (stream.match(/^[^-]+-/)) {
        return ret("meta", "meta");
      }
    }
    else if (/[,+>*\/]/.test(ch)) {
      return ret(null, "select-op");
    }
    else if (ch == "." && stream.match(/^-?[_a-z][_a-z0-9-]*/i)) {
      return ret("qualifier", "qualifier");
    }
    else if (ch == ":") {
      return ret("operator", ch);
    }
    else if (/[;{}\[\]\(\)]/.test(ch)) {
      return ret(null, ch);
    }
    else if (ch == "u" && stream.match("rl(")) {
      stream.backUp(1);
      state.tokenize = tokenParenthesized;
      return ret("property", "variable");
    }
    else {
      stream.eatWhile(/[\w\\\-]/);
      return ret("property", "variable");
    }
  }

  function tokenString(quote, nonInclusive) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped)
          break;
        escaped = !escaped && ch == "\\";
      }
      if (!escaped) {
        if (nonInclusive) stream.backUp(1);
        state.tokenize = tokenBase;
      }
      return ret("string", "string");
    };
  }

  function tokenParenthesized(stream, state) {
    stream.next(); // Must be '('
    if (!stream.match(/\s*[\"\']/, false))
      state.tokenize = tokenString(")", true);
    else
      state.tokenize = tokenBase;
    return ret(null, "(");
  }

  return {
    startState: function(base) {
      return {tokenize: tokenBase,
              baseIndent: base || 0,
              stack: []};
    },

    token: function(stream, state) {

      // Use these terms when applicable (see http://www.xanthir.com/blog/b4E50)
      //
      // rule** or **ruleset:
      // A selector + braces combo, or an at-rule.
      //
      // declaration block:
      // A sequence of declarations.
      //
      // declaration:
      // A property + colon + value combo.
      //
      // property value:
      // The entire value of a property.
      //
      // component value:
      // A single piece of a property value. Like the 5px in
      // text-shadow: 0 0 5px blue;. Can also refer to things that are
      // multiple terms, like the 1-4 terms that make up the background-size
      // portion of the background shorthand.
      //
      // term:
      // The basic unit of author-facing CSS, like a single number (5),
      // dimension (5px), string ("foo"), or function. Officially defined
      //  by the CSS 2.1 grammar (look for the 'term' production)
      //
      //
      // simple selector:
      // A single atomic selector, like a type selector, an attr selector, a
      // class selector, etc.
      //
      // compound selector:
      // One or more simple selectors without a combinator. div.example is
      // compound, div > .example is not.
      //
      // complex selector:
      // One or more compound selectors chained with combinators.
      //
      // combinator:
      // The parts of selectors that express relationships. There are four
      // currently - the space (descendant combinator), the greater-than
      // bracket (child combinator), the plus sign (next sibling combinator),
      // and the tilda (following sibling combinator).
      //
      // sequence of selectors:
      // One or more of the named type of selector chained with commas.

      state.tokenize = state.tokenize || tokenBase;
      if (state.tokenize == tokenBase && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (style && typeof style != "string") style = ret(style[0], style[1]);

      // Changing style returned based on context
      var context = state.stack[state.stack.length-1];
      if (style == "variable") {
        if (type == "variable-definition") state.stack.push("propertyValue");
        return "variable-2";
      } else if (style == "property") {
        var word = stream.current().toLowerCase();
        if (context == "propertyValue") {
          if (valueKeywords.hasOwnProperty(word)) {
            style = "string-2";
          } else if (colorKeywords.hasOwnProperty(word)) {
            style = "keyword";
          } else {
            style = "variable-2";
          }
        } else if (context == "rule") {
          if (!propertyKeywords.hasOwnProperty(word)) {
            style += " error";
          }
        } else if (context == "block") {
          // if a value is present in both property, value, or color, the order
          // of preference is property -> color -> value
          if (propertyKeywords.hasOwnProperty(word)) {
            style = "property";
          } else if (colorKeywords.hasOwnProperty(word)) {
            style = "keyword";
          } else if (valueKeywords.hasOwnProperty(word)) {
            style = "string-2";
          } else {
            style = "tag";
          }
        } else if (!context || context == "@media{") {
          style = "tag";
        } else if (context == "@media") {
          if (atMediaTypes[stream.current()]) {
            style = "attribute"; // Known attribute
          } else if (/^(only|not)$/.test(word)) {
            style = "keyword";
          } else if (word == "and") {
            style = "error"; // "and" is only allowed in @mediaType
          } else if (atMediaFeatures.hasOwnProperty(word)) {
            style = "error"; // Known property, should be in @mediaType(
          } else {
            // Unknown, expecting keyword or attribute, assuming attribute
            style = "attribute error";
          }
        } else if (context == "@mediaType") {
          if (atMediaTypes.hasOwnProperty(word)) {
            style = "attribute";
          } else if (word == "and") {
            style = "operator";
          } else if (/^(only|not)$/.test(word)) {
            style = "error"; // Only allowed in @media
          } else {
            // Unknown attribute or property, but expecting property (preceded
            // by "and"). Should be in parentheses
            style = "error";
          }
        } else if (context == "@mediaType(") {
          if (propertyKeywords.hasOwnProperty(word)) {
            // do nothing, remains "property"
          } else if (atMediaTypes.hasOwnProperty(word)) {
            style = "error"; // Known property, should be in parentheses
          } else if (word == "and") {
            style = "operator";
          } else if (/^(only|not)$/.test(word)) {
            style = "error"; // Only allowed in @media
          } else {
            style += " error";
          }
        } else if (context == "@import") {
          style = "tag";
        } else {
          style = "error";
        }
      } else if (style == "atom") {
        if(!context || context == "@media{" || context == "block") {
          style = "builtin";
        } else if (context == "propertyValue") {
          if (!/^#([0-9a-fA-f]{3}|[0-9a-fA-f]{6})$/.test(stream.current())) {
            style += " error";
          }
        } else {
          style = "error";
        }
      } else if (context == "@media" && type == "{") {
        style = "error";
      }

      // Push/pop context stack
      if (type == "{") {
        if (context == "@media" || context == "@mediaType") {
          state.stack.pop();
          state.stack[state.stack.length-1] = "@media{";
        }
        else {
          var newContext = allowNested ? "block" : "rule";
          state.stack.push(newContext);
        }
      }
      else if (type == "}") {
        var lastState = state.stack[state.stack.length - 1];
        if (lastState == "interpolation") style = "operator";
        state.stack.pop();
        if (context == "propertyValue") state.stack.pop();
      }
      else if (type == "interpolation") state.stack.push("interpolation");
      else if (type == "@media") state.stack.push("@media");
      else if (type == "@import") state.stack.push("@import");
      else if (context == "@media" && /\b(keyword|attribute)\b/.test(style))
        state.stack.push("@mediaType");
      else if (context == "@mediaType" && stream.current() == ",") state.stack.pop();
      else if (context == "@mediaType" && type == "(") state.stack.push("@mediaType(");
      else if (context == "@mediaType(" && type == ")") state.stack.pop();
      else if ((context == "rule" || context == "block") && type == ":") state.stack.push("propertyValue");
      else if (context == "propertyValue" && type == ";") state.stack.pop();
      else if (context == "@import" && type == ";") state.stack.pop();
      return style;
    },

    indent: function(state, textAfter) {
      var n = state.stack.length;
      if (/^\}/.test(textAfter))
        n -= state.stack[state.stack.length-1] == "propertyValue" ? 2 : 1;
      return state.baseIndent + n * indentUnit;
    },

    electricChars: "}",
    blockCommentStart: "/*",
    blockCommentEnd: "*/"
  };
});

(function() {
  function keySet(array) {
    var keys = {};
    for (var i = 0; i < array.length; ++i) {
      keys[array[i]] = true;
    }
    return keys;
  }

  var atMediaTypes = keySet([
    "all", "aural", "braille", "handheld", "print", "projection", "screen",
    "tty", "tv", "embossed"
  ]);

  var atMediaFeatures = keySet([
    "width", "min-width", "max-width", "height", "min-height", "max-height",
    "device-width", "min-device-width", "max-device-width", "device-height",
    "min-device-height", "max-device-height", "aspect-ratio",
    "min-aspect-ratio", "max-aspect-ratio", "device-aspect-ratio",
    "min-device-aspect-ratio", "max-device-aspect-ratio", "color", "min-color",
    "max-color", "color-index", "min-color-index", "max-color-index",
    "monochrome", "min-monochrome", "max-monochrome", "resolution",
    "min-resolution", "max-resolution", "scan", "grid"
  ]);

  var propertyKeywords = keySet([
    "align-content", "align-items", "align-self", "alignment-adjust",
    "alignment-baseline", "anchor-point", "animation", "animation-delay",
    "animation-direction", "animation-duration", "animation-iteration-count",
    "animation-name", "animation-play-state", "animation-timing-function",
    "appearance", "azimuth", "backface-visibility", "background",
    "background-attachment", "background-clip", "background-color",
    "background-image", "background-origin", "background-position",
    "background-repeat", "background-size", "baseline-shift", "binding",
    "bleed", "bookmark-label", "bookmark-level", "bookmark-state",
    "bookmark-target", "border", "border-bottom", "border-bottom-color",
    "border-bottom-left-radius", "border-bottom-right-radius",
    "border-bottom-style", "border-bottom-width", "border-collapse",
    "border-color", "border-image", "border-image-outset",
    "border-image-repeat", "border-image-slice", "border-image-source",
    "border-image-width", "border-left", "border-left-color",
    "border-left-style", "border-left-width", "border-radius", "border-right",
    "border-right-color", "border-right-style", "border-right-width",
    "border-spacing", "border-style", "border-top", "border-top-color",
    "border-top-left-radius", "border-top-right-radius", "border-top-style",
    "border-top-width", "border-width", "bottom", "box-decoration-break",
    "box-shadow", "box-sizing", "break-after", "break-before", "break-inside",
    "caption-side", "clear", "clip", "color", "color-profile", "column-count",
    "column-fill", "column-gap", "column-rule", "column-rule-color",
    "column-rule-style", "column-rule-width", "column-span", "column-width",
    "columns", "content", "counter-increment", "counter-reset", "crop", "cue",
    "cue-after", "cue-before", "cursor", "direction", "display",
    "dominant-baseline", "drop-initial-after-adjust",
    "drop-initial-after-align", "drop-initial-before-adjust",
    "drop-initial-before-align", "drop-initial-size", "drop-initial-value",
    "elevation", "empty-cells", "fit", "fit-position", "flex", "flex-basis",
    "flex-direction", "flex-flow", "flex-grow", "flex-shrink", "flex-wrap",
    "float", "float-offset", "font", "font-feature-settings", "font-family",
    "font-kerning", "font-language-override", "font-size", "font-size-adjust",
    "font-stretch", "font-style", "font-synthesis", "font-variant",
    "font-variant-alternates", "font-variant-caps", "font-variant-east-asian",
    "font-variant-ligatures", "font-variant-numeric", "font-variant-position",
    "font-weight", "grid-cell", "grid-column", "grid-column-align",
    "grid-column-sizing", "grid-column-span", "grid-columns", "grid-flow",
    "grid-row", "grid-row-align", "grid-row-sizing", "grid-row-span",
    "grid-rows", "grid-template", "hanging-punctuation", "height", "hyphens",
    "icon", "image-orientation", "image-rendering", "image-resolution",
    "inline-box-align", "justify-content", "left", "letter-spacing",
    "line-break", "line-height", "line-stacking", "line-stacking-ruby",
    "line-stacking-shift", "line-stacking-strategy", "list-style",
    "list-style-image", "list-style-position", "list-style-type", "margin",
    "margin-bottom", "margin-left", "margin-right", "margin-top",
    "marker-offset", "marks", "marquee-direction", "marquee-loop",
    "marquee-play-count", "marquee-speed", "marquee-style", "max-height",
    "max-width", "min-height", "min-width", "move-to", "nav-down", "nav-index",
    "nav-left", "nav-right", "nav-up", "opacity", "order", "orphans", "outline",
    "outline-color", "outline-offset", "outline-style", "outline-width",
    "overflow", "overflow-style", "overflow-wrap", "overflow-x", "overflow-y",
    "padding", "padding-bottom", "padding-left", "padding-right", "padding-top",
    "page", "page-break-after", "page-break-before", "page-break-inside",
    "page-policy", "pause", "pause-after", "pause-before", "perspective",
    "perspective-origin", "pitch", "pitch-range", "play-during", "position",
    "presentation-level", "punctuation-trim", "quotes", "rendering-intent",
    "resize", "rest", "rest-after", "rest-before", "richness", "right",
    "rotation", "rotation-point", "ruby-align", "ruby-overhang",
    "ruby-position", "ruby-span", "size", "speak", "speak-as", "speak-header",
    "speak-numeral", "speak-punctuation", "speech-rate", "stress", "string-set",
    "tab-size", "table-layout", "target", "target-name", "target-new",
    "target-position", "text-align", "text-align-last", "text-decoration",
    "text-decoration-color", "text-decoration-line", "text-decoration-skip",
    "text-decoration-style", "text-emphasis", "text-emphasis-color",
    "text-emphasis-position", "text-emphasis-style", "text-height",
    "text-indent", "text-justify", "text-outline", "text-shadow",
    "text-space-collapse", "text-transform", "text-underline-position",
    "text-wrap", "top", "transform", "transform-origin", "transform-style",
    "transition", "transition-delay", "transition-duration",
    "transition-property", "transition-timing-function", "unicode-bidi",
    "vertical-align", "visibility", "voice-balance", "voice-duration",
    "voice-family", "voice-pitch", "voice-range", "voice-rate", "voice-stress",
    "voice-volume", "volume", "white-space", "widows", "width", "word-break",
    "word-spacing", "word-wrap", "z-index",
    // SVG-specific
    "clip-path", "clip-rule", "mask", "enable-background", "filter", "flood-color",
    "flood-opacity", "lighting-color", "stop-color", "stop-opacity", "pointer-events",
    "color-interpolation", "color-interpolation-filters", "color-profile",
    "color-rendering", "fill", "fill-opacity", "fill-rule", "image-rendering",
    "marker", "marker-end", "marker-mid", "marker-start", "shape-rendering", "stroke",
    "stroke-dasharray", "stroke-dashoffset", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-opacity", "stroke-width", "text-rendering",
    "baseline-shift", "dominant-baseline", "glyph-orientation-horizontal",
    "glyph-orientation-vertical", "kerning", "text-anchor", "writing-mode"
  ]);

  var colorKeywords = keySet([
    "aliceblue", "antiquewhite", "aqua", "aquamarine", "azure", "beige",
    "bisque", "black", "blanchedalmond", "blue", "blueviolet", "brown",
    "burlywood", "cadetblue", "chartreuse", "chocolate", "coral", "cornflowerblue",
    "cornsilk", "crimson", "cyan", "darkblue", "darkcyan", "darkgoldenrod",
    "darkgray", "darkgreen", "darkkhaki", "darkmagenta", "darkolivegreen",
    "darkorange", "darkorchid", "darkred", "darksalmon", "darkseagreen",
    "darkslateblue", "darkslategray", "darkturquoise", "darkviolet",
    "deeppink", "deepskyblue", "dimgray", "dodgerblue", "firebrick",
    "floralwhite", "forestgreen", "fuchsia", "gainsboro", "ghostwhite",
    "gold", "goldenrod", "gray", "green", "greenyellow", "honeydew",
    "hotpink", "indianred", "indigo", "ivory", "khaki", "lavender",
    "lavenderblush", "lawngreen", "lemonchiffon", "lightblue", "lightcoral",
    "lightcyan", "lightgoldenrodyellow", "lightgray", "lightgreen", "lightpink",
    "lightsalmon", "lightseagreen", "lightskyblue", "lightslategray",
    "lightsteelblue", "lightyellow", "lime", "limegreen", "linen", "magenta",
    "maroon", "mediumaquamarine", "mediumblue", "mediumorchid", "mediumpurple",
    "mediumseagreen", "mediumslateblue", "mediumspringgreen", "mediumturquoise",
    "mediumvioletred", "midnightblue", "mintcream", "mistyrose", "moccasin",
    "navajowhite", "navy", "oldlace", "olive", "olivedrab", "orange", "orangered",
    "orchid", "palegoldenrod", "palegreen", "paleturquoise", "palevioletred",
    "papayawhip", "peachpuff", "peru", "pink", "plum", "powderblue",
    "purple", "red", "rosybrown", "royalblue", "saddlebrown", "salmon",
    "sandybrown", "seagreen", "seashell", "sienna", "silver", "skyblue",
    "slateblue", "slategray", "snow", "springgreen", "steelblue", "tan",
    "teal", "thistle", "tomato", "turquoise", "violet", "wheat", "white",
    "whitesmoke", "yellow", "yellowgreen"
  ]);

  var valueKeywords = keySet([
    "above", "absolute", "activeborder", "activecaption", "afar",
    "after-white-space", "ahead", "alias", "all", "all-scroll", "alternate",
    "always", "amharic", "amharic-abegede", "antialiased", "appworkspace",
    "arabic-indic", "armenian", "asterisks", "auto", "avoid", "background",
    "backwards", "baseline", "below", "bidi-override", "binary", "bengali",
    "blink", "block", "block-axis", "bold", "bolder", "border", "border-box",
    "both", "bottom", "break-all", "break-word", "button", "button-bevel",
    "buttonface", "buttonhighlight", "buttonshadow", "buttontext", "cambodian",
    "capitalize", "caps-lock-indicator", "caption", "captiontext", "caret",
    "cell", "center", "checkbox", "circle", "cjk-earthly-branch",
    "cjk-heavenly-stem", "cjk-ideographic", "clear", "clip", "close-quote",
    "col-resize", "collapse", "compact", "condensed", "contain", "content",
    "content-box", "context-menu", "continuous", "copy", "cover", "crop",
    "cross", "crosshair", "currentcolor", "cursive", "dashed", "decimal",
    "decimal-leading-zero", "default", "default-button", "destination-atop",
    "destination-in", "destination-out", "destination-over", "devanagari",
    "disc", "discard", "document", "dot-dash", "dot-dot-dash", "dotted",
    "double", "down", "e-resize", "ease", "ease-in", "ease-in-out", "ease-out",
    "element", "ellipsis", "embed", "end", "ethiopic", "ethiopic-abegede",
    "ethiopic-abegede-am-et", "ethiopic-abegede-gez", "ethiopic-abegede-ti-er",
    "ethiopic-abegede-ti-et", "ethiopic-halehame-aa-er",
    "ethiopic-halehame-aa-et", "ethiopic-halehame-am-et",
    "ethiopic-halehame-gez", "ethiopic-halehame-om-et",
    "ethiopic-halehame-sid-et", "ethiopic-halehame-so-et",
    "ethiopic-halehame-ti-er", "ethiopic-halehame-ti-et",
    "ethiopic-halehame-tig", "ew-resize", "expanded", "extra-condensed",
    "extra-expanded", "fantasy", "fast", "fill", "fixed", "flat", "footnotes",
    "forwards", "from", "geometricPrecision", "georgian", "graytext", "groove",
    "gujarati", "gurmukhi", "hand", "hangul", "hangul-consonant", "hebrew",
    "help", "hidden", "hide", "higher", "highlight", "highlighttext",
    "hiragana", "hiragana-iroha", "horizontal", "hsl", "hsla", "icon", "ignore",
    "inactiveborder", "inactivecaption", "inactivecaptiontext", "infinite",
    "infobackground", "infotext", "inherit", "initial", "inline", "inline-axis",
    "inline-block", "inline-table", "inset", "inside", "intrinsic", "invert",
    "italic", "justify", "kannada", "katakana", "katakana-iroha", "khmer",
    "landscape", "lao", "large", "larger", "left", "level", "lighter",
    "line-through", "linear", "lines", "list-item", "listbox", "listitem",
    "local", "logical", "loud", "lower", "lower-alpha", "lower-armenian",
    "lower-greek", "lower-hexadecimal", "lower-latin", "lower-norwegian",
    "lower-roman", "lowercase", "ltr", "malayalam", "match",
    "media-controls-background", "media-current-time-display",
    "media-fullscreen-button", "media-mute-button", "media-play-button",
    "media-return-to-realtime-button", "media-rewind-button",
    "media-seek-back-button", "media-seek-forward-button", "media-slider",
    "media-sliderthumb", "media-time-remaining-display", "media-volume-slider",
    "media-volume-slider-container", "media-volume-sliderthumb", "medium",
    "menu", "menulist", "menulist-button", "menulist-text",
    "menulist-textfield", "menutext", "message-box", "middle", "min-intrinsic",
    "mix", "mongolian", "monospace", "move", "multiple", "myanmar", "n-resize",
    "narrower", "ne-resize", "nesw-resize", "no-close-quote", "no-drop",
    "no-open-quote", "no-repeat", "none", "normal", "not-allowed", "nowrap",
    "ns-resize", "nw-resize", "nwse-resize", "oblique", "octal", "open-quote",
    "optimizeLegibility", "optimizeSpeed", "oriya", "oromo", "outset",
    "outside", "overlay", "overline", "padding", "padding-box", "painted",
    "paused", "persian", "plus-darker", "plus-lighter", "pointer", "portrait",
    "pre", "pre-line", "pre-wrap", "preserve-3d", "progress", "push-button",
    "radio", "read-only", "read-write", "read-write-plaintext-only", "relative",
    "repeat", "repeat-x", "repeat-y", "reset", "reverse", "rgb", "rgba",
    "ridge", "right", "round", "row-resize", "rtl", "run-in", "running",
    "s-resize", "sans-serif", "scroll", "scrollbar", "se-resize", "searchfield",
    "searchfield-cancel-button", "searchfield-decoration",
    "searchfield-results-button", "searchfield-results-decoration",
    "semi-condensed", "semi-expanded", "separate", "serif", "show", "sidama",
    "single", "skip-white-space", "slide", "slider-horizontal",
    "slider-vertical", "sliderthumb-horizontal", "sliderthumb-vertical", "slow",
    "small", "small-caps", "small-caption", "smaller", "solid", "somali",
    "source-atop", "source-in", "source-out", "source-over", "space", "square",
    "square-button", "start", "static", "status-bar", "stretch", "stroke",
    "sub", "subpixel-antialiased", "super", "sw-resize", "table",
    "table-caption", "table-cell", "table-column", "table-column-group",
    "table-footer-group", "table-header-group", "table-row", "table-row-group",
    "telugu", "text", "text-bottom", "text-top", "textarea", "textfield", "thai",
    "thick", "thin", "threeddarkshadow", "threedface", "threedhighlight",
    "threedlightshadow", "threedshadow", "tibetan", "tigre", "tigrinya-er",
    "tigrinya-er-abegede", "tigrinya-et", "tigrinya-et-abegede", "to", "top",
    "transparent", "ultra-condensed", "ultra-expanded", "underline", "up",
    "upper-alpha", "upper-armenian", "upper-greek", "upper-hexadecimal",
    "upper-latin", "upper-norwegian", "upper-roman", "uppercase", "urdu", "url",
    "vertical", "vertical-text", "visible", "visibleFill", "visiblePainted",
    "visibleStroke", "visual", "w-resize", "wait", "wave", "wider",
    "window", "windowframe", "windowtext", "x-large", "x-small", "xor",
    "xx-large", "xx-small"
  ]);

  function tokenCComment(stream, state) {
    var maybeEnd = false, ch;
    while ((ch = stream.next()) != null) {
      if (maybeEnd && ch == "/") {
        state.tokenize = null;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ["comment", "comment"];
  }

  CodeMirror.defineMIME("text/css", {
    atMediaTypes: atMediaTypes,
    atMediaFeatures: atMediaFeatures,
    propertyKeywords: propertyKeywords,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    hooks: {
      "<": function(stream, state) {
        function tokenSGMLComment(stream, state) {
          var dashes = 0, ch;
          while ((ch = stream.next()) != null) {
            if (dashes >= 2 && ch == ">") {
              state.tokenize = null;
              break;
            }
            dashes = (ch == "-") ? dashes + 1 : 0;
          }
          return ["comment", "comment"];
        }
        if (stream.eat("!")) {
          state.tokenize = tokenSGMLComment;
          return tokenSGMLComment(stream, state);
        }
      },
      "/": function(stream, state) {
        if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        }
        return false;
      }
    },
    name: "css-base"
  });

  CodeMirror.defineMIME("text/x-scss", {
    atMediaTypes: atMediaTypes,
    atMediaFeatures: atMediaFeatures,
    propertyKeywords: propertyKeywords,
    colorKeywords: colorKeywords,
    valueKeywords: valueKeywords,
    allowNested: true,
    hooks: {
      "$": function(stream) {
        stream.match(/^[\w-]+/);
        if (stream.peek() == ":") {
          return ["variable", "variable-definition"];
        }
        return ["variable", "variable"];
      },
      "/": function(stream, state) {
        if (stream.eat("/")) {
          stream.skipToEnd();
          return ["comment", "comment"];
        } else if (stream.eat("*")) {
          state.tokenize = tokenCComment;
          return tokenCComment(stream, state);
        } else {
          return ["operator", "operator"];
        }
      },
      "#": function(stream) {
        if (stream.eat("{")) {
          return ["operator", "interpolation"];
        } else {
          stream.eatWhile(/[\w\\\-]/);
          return ["atom", "hash"];
        }
      }
    },
    name: "css-base"
  });
})();
CodeMirror.defineMode("diff", function() {

  var TOKEN_NAMES = {
    '+': 'positive',
    '-': 'negative',
    '@': 'meta'
  };

  return {
    token: function(stream) {
      var tw_pos = stream.string.search(/[\t ]+?$/);

      if (!stream.sol() || tw_pos === 0) {
        stream.skipToEnd();
        return ("error " + (
          TOKEN_NAMES[stream.string.charAt(0)] || '')).replace(/ $/, '');
      }

      var token_name = TOKEN_NAMES[stream.peek()] || stream.skipToEnd();

      if (tw_pos === -1) {
        stream.skipToEnd();
      } else {
        stream.pos = tw_pos;
      }

      return token_name;
    }
  };
});

CodeMirror.defineMIME("text/x-diff", "diff");
CodeMirror.defineMode("haskell", function() {

  function switchState(source, setState, f) {
    setState(f);
    return f(source, setState);
  }

  // These should all be Unicode extended, as per the Haskell 2010 report
  var smallRE = /[a-z_]/;
  var largeRE = /[A-Z]/;
  var digitRE = /[0-9]/;
  var hexitRE = /[0-9A-Fa-f]/;
  var octitRE = /[0-7]/;
  var idRE = /[a-z_A-Z0-9']/;
  var symbolRE = /[-!#$%&*+.\/<=>?@\\^|~:]/;
  var specialRE = /[(),;[\]`{}]/;
  var whiteCharRE = /[ \t\v\f]/; // newlines are handled in tokenizer

  function normal(source, setState) {
    if (source.eatWhile(whiteCharRE)) {
      return null;
    }

    var ch = source.next();
    if (specialRE.test(ch)) {
      if (ch == '{' && source.eat('-')) {
        var t = "comment";
        if (source.eat('#')) {
          t = "meta";
        }
        return switchState(source, setState, ncomment(t, 1));
      }
      return null;
    }

    if (ch == '\'') {
      if (source.eat('\\')) {
        source.next();  // should handle other escapes here
      }
      else {
        source.next();
      }
      if (source.eat('\'')) {
        return "string";
      }
      return "error";
    }

    if (ch == '"') {
      return switchState(source, setState, stringLiteral);
    }

    if (largeRE.test(ch)) {
      source.eatWhile(idRE);
      if (source.eat('.')) {
        return "qualifier";
      }
      return "variable-2";
    }

    if (smallRE.test(ch)) {
      source.eatWhile(idRE);
      return "variable";
    }

    if (digitRE.test(ch)) {
      if (ch == '0') {
        if (source.eat(/[xX]/)) {
          source.eatWhile(hexitRE); // should require at least 1
          return "integer";
        }
        if (source.eat(/[oO]/)) {
          source.eatWhile(octitRE); // should require at least 1
          return "number";
        }
      }
      source.eatWhile(digitRE);
      var t = "number";
      if (source.eat('.')) {
        t = "number";
        source.eatWhile(digitRE); // should require at least 1
      }
      if (source.eat(/[eE]/)) {
        t = "number";
        source.eat(/[-+]/);
        source.eatWhile(digitRE); // should require at least 1
      }
      return t;
    }

    if (symbolRE.test(ch)) {
      if (ch == '-' && source.eat(/-/)) {
        source.eatWhile(/-/);
        if (!source.eat(symbolRE)) {
          source.skipToEnd();
          return "comment";
        }
      }
      var t = "variable";
      if (ch == ':') {
        t = "variable-2";
      }
      source.eatWhile(symbolRE);
      return t;
    }

    return "error";
  }

  function ncomment(type, nest) {
    if (nest == 0) {
      return normal;
    }
    return function(source, setState) {
      var currNest = nest;
      while (!source.eol()) {
        var ch = source.next();
        if (ch == '{' && source.eat('-')) {
          ++currNest;
        }
        else if (ch == '-' && source.eat('}')) {
          --currNest;
          if (currNest == 0) {
            setState(normal);
            return type;
          }
        }
      }
      setState(ncomment(type, currNest));
      return type;
    };
  }

  function stringLiteral(source, setState) {
    while (!source.eol()) {
      var ch = source.next();
      if (ch == '"') {
        setState(normal);
        return "string";
      }
      if (ch == '\\') {
        if (source.eol() || source.eat(whiteCharRE)) {
          setState(stringGap);
          return "string";
        }
        if (source.eat('&')) {
        }
        else {
          source.next(); // should handle other escapes here
        }
      }
    }
    setState(normal);
    return "error";
  }

  function stringGap(source, setState) {
    if (source.eat('\\')) {
      return switchState(source, setState, stringLiteral);
    }
    source.next();
    setState(normal);
    return "error";
  }


  var wellKnownWords = (function() {
    var wkw = {};
    function setType(t) {
      return function () {
        for (var i = 0; i < arguments.length; i++)
          wkw[arguments[i]] = t;
      };
    }

    setType("keyword")(
      "case", "class", "data", "default", "deriving", "do", "else", "foreign",
      "if", "import", "in", "infix", "infixl", "infixr", "instance", "let",
      "module", "newtype", "of", "then", "type", "where", "_");

    setType("keyword")(
      "\.\.", ":", "::", "=", "\\", "\"", "<-", "->", "@", "~", "=>");

    setType("builtin")(
      "!!", "$!", "$", "&&", "+", "++", "-", ".", "/", "/=", "<", "<=", "=<<",
      "==", ">", ">=", ">>", ">>=", "^", "^^", "||", "*", "**");

    setType("builtin")(
      "Bool", "Bounded", "Char", "Double", "EQ", "Either", "Enum", "Eq",
      "False", "FilePath", "Float", "Floating", "Fractional", "Functor", "GT",
      "IO", "IOError", "Int", "Integer", "Integral", "Just", "LT", "Left",
      "Maybe", "Monad", "Nothing", "Num", "Ord", "Ordering", "Rational", "Read",
      "ReadS", "Real", "RealFloat", "RealFrac", "Right", "Show", "ShowS",
      "String", "True");

    setType("builtin")(
      "abs", "acos", "acosh", "all", "and", "any", "appendFile", "asTypeOf",
      "asin", "asinh", "atan", "atan2", "atanh", "break", "catch", "ceiling",
      "compare", "concat", "concatMap", "const", "cos", "cosh", "curry",
      "cycle", "decodeFloat", "div", "divMod", "drop", "dropWhile", "either",
      "elem", "encodeFloat", "enumFrom", "enumFromThen", "enumFromThenTo",
      "enumFromTo", "error", "even", "exp", "exponent", "fail", "filter",
      "flip", "floatDigits", "floatRadix", "floatRange", "floor", "fmap",
      "foldl", "foldl1", "foldr", "foldr1", "fromEnum", "fromInteger",
      "fromIntegral", "fromRational", "fst", "gcd", "getChar", "getContents",
      "getLine", "head", "id", "init", "interact", "ioError", "isDenormalized",
      "isIEEE", "isInfinite", "isNaN", "isNegativeZero", "iterate", "last",
      "lcm", "length", "lex", "lines", "log", "logBase", "lookup", "map",
      "mapM", "mapM_", "max", "maxBound", "maximum", "maybe", "min", "minBound",
      "minimum", "mod", "negate", "not", "notElem", "null", "odd", "or",
      "otherwise", "pi", "pred", "print", "product", "properFraction",
      "putChar", "putStr", "putStrLn", "quot", "quotRem", "read", "readFile",
      "readIO", "readList", "readLn", "readParen", "reads", "readsPrec",
      "realToFrac", "recip", "rem", "repeat", "replicate", "return", "reverse",
      "round", "scaleFloat", "scanl", "scanl1", "scanr", "scanr1", "seq",
      "sequence", "sequence_", "show", "showChar", "showList", "showParen",
      "showString", "shows", "showsPrec", "significand", "signum", "sin",
      "sinh", "snd", "span", "splitAt", "sqrt", "subtract", "succ", "sum",
      "tail", "take", "takeWhile", "tan", "tanh", "toEnum", "toInteger",
      "toRational", "truncate", "uncurry", "undefined", "unlines", "until",
      "unwords", "unzip", "unzip3", "userError", "words", "writeFile", "zip",
      "zip3", "zipWith", "zipWith3");

    return wkw;
  })();



  return {
    startState: function ()  { return { f: normal }; },
    copyState:  function (s) { return { f: s.f }; },

    token: function(stream, state) {
      var t = state.f(stream, function(s) { state.f = s; });
      var w = stream.current();
      return (w in wellKnownWords) ? wellKnownWords[w] : t;
    },

    blockCommentStart: "{-",
    blockCommentEnd: "-}",
    lineComment: "--"
  };

});

CodeMirror.defineMIME("text/x-haskell", "haskell");
CodeMirror.defineMode("htmlmixed", function(config, parserConfig) {
  var htmlMode = CodeMirror.getMode(config, {name: "xml", htmlMode: true});
  var cssMode = CodeMirror.getMode(config, "css");

  var scriptTypes = [], scriptTypesConf = parserConfig && parserConfig.scriptTypes;
  scriptTypes.push({matches: /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^$/i,
                    mode: CodeMirror.getMode(config, "javascript")});
  if (scriptTypesConf) for (var i = 0; i < scriptTypesConf.length; ++i) {
    var conf = scriptTypesConf[i];
    scriptTypes.push({matches: conf.matches, mode: conf.mode && CodeMirror.getMode(config, conf.mode)});
  }
  scriptTypes.push({matches: /./,
                    mode: CodeMirror.getMode(config, "text/plain")});

  function html(stream, state) {
    var tagName = state.htmlState.tagName;
    var style = htmlMode.token(stream, state.htmlState);
    if (tagName == "script" && /\btag\b/.test(style) && stream.current() == ">") {
      // Script block: mode to change to depends on type attribute
      var scriptType = stream.string.slice(Math.max(0, stream.pos - 100), stream.pos).match(/\btype\s*=\s*("[^"]+"|'[^']+'|\S+)[^<]*$/i);
      scriptType = scriptType ? scriptType[1] : "";
      if (scriptType && /[\"\']/.test(scriptType.charAt(0))) scriptType = scriptType.slice(1, scriptType.length - 1);
      for (var i = 0; i < scriptTypes.length; ++i) {
        var tp = scriptTypes[i];
        if (typeof tp.matches == "string" ? scriptType == tp.matches : tp.matches.test(scriptType)) {
          if (tp.mode) {
            state.token = script;
            state.localMode = tp.mode;
            state.localState = tp.mode.startState && tp.mode.startState(htmlMode.indent(state.htmlState, ""));
          }
          break;
        }
      }
    } else if (tagName == "style" && /\btag\b/.test(style) && stream.current() == ">") {
      state.token = css;
      state.localMode = cssMode;
      state.localState = cssMode.startState(htmlMode.indent(state.htmlState, ""));
    }
    return style;
  }
  function maybeBackup(stream, pat, style) {
    var cur = stream.current();
    var close = cur.search(pat), m;
    if (close > -1) stream.backUp(cur.length - close);
    else if (m = cur.match(/<\/?$/)) {
      stream.backUp(cur.length);
      if (!stream.match(pat, false)) stream.match(cur[0]);
    }
    return style;
  }
  function script(stream, state) {
    if (stream.match(/^<\/\s*script\s*>/i, false)) {
      state.token = html;
      state.localState = state.localMode = null;
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*script\s*>/,
                       state.localMode.token(stream, state.localState));
  }
  function css(stream, state) {
    if (stream.match(/^<\/\s*style\s*>/i, false)) {
      state.token = html;
      state.localState = state.localMode = null;
      return html(stream, state);
    }
    return maybeBackup(stream, /<\/\s*style\s*>/,
                       cssMode.token(stream, state.localState));
  }

  return {
    startState: function() {
      var state = htmlMode.startState();
      return {token: html, localMode: null, localState: null, htmlState: state};
    },

    copyState: function(state) {
      if (state.localState)
        var local = CodeMirror.copyState(state.localMode, state.localState);
      return {token: state.token, localMode: state.localMode, localState: local,
              htmlState: CodeMirror.copyState(htmlMode, state.htmlState)};
    },

    token: function(stream, state) {
      return state.token(stream, state);
    },

    indent: function(state, textAfter) {
      if (!state.localMode || /^\s*<\//.test(textAfter))
        return htmlMode.indent(state.htmlState, textAfter);
      else if (state.localMode.indent)
        return state.localMode.indent(state.localState, textAfter);
      else
        return CodeMirror.Pass;
    },

    electricChars: "/{}:",

    innerMode: function(state) {
      return {state: state.localState || state.htmlState, mode: state.localMode || htmlMode};
    }
  };
}, "xml", "javascript", "css");

CodeMirror.defineMIME("text/html", "htmlmixed");
// TODO actually recognize syntax of TypeScript constructs

CodeMirror.defineMode("javascript", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var jsonMode = parserConfig.json;
  var isTS = parserConfig.typescript;

  // Tokenizer

  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"};

    var jsKeywords = {
      "if": kw("if"), "while": A, "with": A, "else": B, "do": B, "try": B, "finally": B,
      "return": C, "break": C, "continue": C, "new": C, "delete": C, "throw": C,
      "var": kw("var"), "const": kw("var"), "let": kw("var"),
      "function": kw("function"), "catch": kw("catch"),
      "for": kw("for"), "switch": kw("switch"), "case": kw("case"), "default": kw("default"),
      "in": operator, "typeof": operator, "instanceof": operator,
      "true": atom, "false": atom, "null": atom, "undefined": atom, "NaN": atom, "Infinity": atom,
      "this": kw("this")
    };

    // Extend the 'normal' keywords with the TypeScript language extensions
    if (isTS) {
      var type = {type: "variable", style: "variable-3"};
      var tsKeywords = {
        // object-like things
        "interface": kw("interface"),
        "class": kw("class"),
        "extends": kw("extends"),
        "constructor": kw("constructor"),

        // scope modifiers
        "public": kw("public"),
        "private": kw("private"),
        "protected": kw("protected"),
        "static": kw("static"),

        "super": kw("super"),

        // types
        "string": type, "number": type, "bool": type, "any": type
      };

      for (var attr in tsKeywords) {
        jsKeywords[attr] = tsKeywords[attr];
      }
    }

    return jsKeywords;
  }();

  var isOperatorChar = /[+\-*&%=<>!?|~^]/;

  function chain(stream, state, f) {
    state.tokenize = f;
    return f(stream, state);
  }

  function nextUntilUnescaped(stream, end) {
    var escaped = false, next;
    while ((next = stream.next()) != null) {
      if (next == end && !escaped)
        return false;
      escaped = !escaped && next == "\\";
    }
    return escaped;
  }

  // Used as scratch variables to communicate multiple values without
  // consing up tons of objects.
  var type, content;
  function ret(tp, style, cont) {
    type = tp; content = cont;
    return style;
  }

  function jsTokenBase(stream, state) {
    var ch = stream.next();
    if (ch == '"' || ch == "'")
      return chain(stream, state, jsTokenString(ch));
    else if (/[\[\]{}\(\),;\:\.]/.test(ch))
      return ret(ch);
    else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-f]/i);
      return ret("number", "number");
    }
    else if (/\d/.test(ch) || ch == "-" && stream.eat(/\d/)) {
      stream.match(/^\d*(?:\.\d*)?(?:[eE][+\-]?\d+)?/);
      return ret("number", "number");
    }
    else if (ch == "/") {
      if (stream.eat("*")) {
        return chain(stream, state, jsTokenComment);
      }
      else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      }
      else if (state.lastType == "operator" || state.lastType == "keyword c" ||
               /^[\[{}\(,;:]$/.test(state.lastType)) {
        nextUntilUnescaped(stream, "/");
        stream.eatWhile(/[gimy]/); // 'y' is "sticky" option in Mozilla
        return ret("regexp", "string-2");
      }
      else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", null, stream.current());
      }
    }
    else if (ch == "#") {
      stream.skipToEnd();
      return ret("error", "error");
    }
    else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", null, stream.current());
    }
    else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return (known && state.lastType != ".") ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function jsTokenString(quote) {
    return function(stream, state) {
      if (!nextUntilUnescaped(stream, quote))
        state.tokenize = jsTokenBase;
      return ret("string", "string");
    };
  }

  function jsTokenComment(stream, state) {
    var maybeEnd = false, ch;
    while (ch = stream.next()) {
      if (ch == "/" && maybeEnd) {
        state.tokenize = jsTokenBase;
        break;
      }
      maybeEnd = (ch == "*");
    }
    return ret("comment", "comment");
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true, "this": true};

  function JSLexical(indented, column, type, align, prev, info) {
    this.indented = indented;
    this.column = column;
    this.type = type;
    this.prev = prev;
    this.info = info;
    if (align != null) this.align = align;
  }

  function inScope(state, varname) {
    for (var v = state.localVars; v; v = v.next)
      if (v.name == varname) return true;
  }

  function parseJS(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : jsonMode ? expression : statement;
      if (combinator(type, content)) {
        while(cc.length && cc[cc.length - 1].lex)
          cc.pop()();
        if (cx.marked) return cx.marked;
        if (type == "variable" && inScope(state, content)) return "variable-2";
        return style;
      }
    }
  }

  // Combinator utils

  var cx = {state: null, column: null, marked: null, cc: null};
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) cx.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }
  function register(varname) {
    function inList(list) {
      for (var v = list; v; v = v.next)
        if (v.name == varname) return true;
      return false;
    }
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      if (inList(state.localVars)) return;
      state.localVars = {name: varname, next: state.localVars};
    } else {
      if (inList(state.globalVars)) return;
      state.globalVars = {name: varname, next: state.globalVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
    cx.state.localVars = defaultVars;
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state;
      state.lexical = new JSLexical(state.indented, cx.stream.column(), type, null, state.lexical, info);
    };
    result.lex = true;
    return result;
  }
  function poplex() {
    var state = cx.state;
    if (state.lexical.prev) {
      if (state.lexical.type == ")")
        state.indented = state.lexical.indented;
      state.lexical = state.lexical.prev;
    }
  }
  poplex.lex = true;

  function expect(wanted) {
    return function(type) {
      if (type == wanted) return cont();
      else if (wanted == ";") return pass();
      else return cont(arguments.callee);
    };
  }

  function statement(type) {
    if (type == "var") return cont(pushlex("vardef"), vardef1, expect(";"), poplex);
    if (type == "keyword a") return cont(pushlex("form"), expression, statement, poplex);
    if (type == "keyword b") return cont(pushlex("form"), statement, poplex);
    if (type == "{") return cont(pushlex("}"), block, poplex);
    if (type == ";") return cont();
    if (type == "if") return cont(pushlex("form"), expression, statement, poplex, maybeelse(cx.state.indented));
    if (type == "function") return cont(functiondef);
    if (type == "for") return cont(pushlex("form"), expect("("), pushlex(")"), forspec1, expect(")"),
                                      poplex, statement, poplex);
    if (type == "variable") return cont(pushlex("stat"), maybelabel);
    if (type == "switch") return cont(pushlex("form"), expression, pushlex("}", "switch"), expect("{"),
                                         block, poplex, poplex);
    if (type == "case") return cont(expression, expect(":"));
    if (type == "default") return cont(expect(":"));
    if (type == "catch") return cont(pushlex("form"), pushcontext, expect("("), funarg, expect(")"),
                                        statement, poplex, popcontext);
    return pass(pushlex("stat"), expression, expect(";"), poplex);
  }
  function expression(type) {
    return expressionInner(type, maybeoperatorComma);
  }
  function expressionNoComma(type) {
    return expressionInner(type, maybeoperatorNoComma);
  }
  function expressionInner(type, maybeop) {
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeop);
    if (type == "function") return cont(functiondef);
    if (type == "keyword c") return cont(maybeexpression);
    if (type == "(") return cont(pushlex(")"), maybeexpression, expect(")"), poplex, maybeop);
    if (type == "operator") return cont(expression);
    if (type == "[") return cont(pushlex("]"), commasep(expressionNoComma, "]"), poplex, maybeop);
    if (type == "{") return cont(pushlex("}"), commasep(objprop, "}"), poplex, maybeop);
    return cont();
  }
  function maybeexpression(type) {
    if (type.match(/[;\}\)\],]/)) return pass();
    return pass(expression);
  }

  function maybeoperatorComma(type, value) {
    if (type == ",") return pass();
    return maybeoperatorNoComma(type, value, maybeoperatorComma);
  }
  function maybeoperatorNoComma(type, value, me) {
    if (!me) me = maybeoperatorNoComma;
    if (type == "operator") {
      if (/\+\+|--/.test(value)) return cont(me);
      if (value == "?") return cont(expression, expect(":"), expression);
      return cont(expression);
    }
    if (type == ";") return;
    if (type == "(") return cont(pushlex(")", "call"), commasep(expressionNoComma, ")"), poplex, me);
    if (type == ".") return cont(property, me);
    if (type == "[") return cont(pushlex("]"), expression, expect("]"), poplex, me);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperatorComma, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type, value) {
    if (type == "variable") {
      cx.marked = "property";
      if (value == "get" || value == "set") return cont(getterSetter);
    } else if (type == "number" || type == "string") {
      cx.marked = type + " property";
    }
    if (atomicTypes.hasOwnProperty(type)) return cont(expect(":"), expressionNoComma);
  }
  function getterSetter(type) {
    if (type == ":") return cont(expression);
    if (type != "variable") return cont(expect(":"), expression);
    cx.marked = "property";
    return cont(functiondef);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") {
        var lex = cx.state.lexical;
        if (lex.info == "call") lex.pos = (lex.pos || 0) + 1;
        return cont(what, proceed);
      }
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function(type) {
      if (type == end) return cont();
      else return pass(what, proceed);
    };
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function maybetype(type) {
    if (type == ":") return cont(typedef);
    return pass();
  }
  function typedef(type) {
    if (type == "variable"){cx.marked = "variable-3"; return cont();}
    return pass();
  }
  function vardef1(type, value) {
    if (type == "variable") {
      register(value);
      return isTS ? cont(maybetype, vardef2) : cont(vardef2);
    }
    return pass();
  }
  function vardef2(type, value) {
    if (value == "=") return cont(expressionNoComma, vardef2);
    if (type == ",") return cont(vardef1);
  }
  function maybeelse(indent) {
    return function(type, value) {
      if (type == "keyword b" && value == "else") {
        cx.state.lexical = new JSLexical(indent, 0, "form", null, cx.state.lexical);
        return cont(statement, poplex);
      }
      return pass();
    };
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef1, expect(";"), forspec2);
    if (type == ";") return cont(forspec2);
    if (type == "variable") return cont(formaybein);
    return pass(expression, expect(";"), forspec2);
  }
  function formaybein(_type, value) {
    if (value == "in") return cont(expression);
    return cont(maybeoperatorComma, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in") return cont(expression);
    return pass(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushlex(")"), pushcontext, commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type, value) {
    if (type == "variable") {register(value); return isTS ? cont(maybetype) : cont();}
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: jsTokenBase,
        lastType: null,
        cc: [],
        lexical: new JSLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: parserConfig.localVars,
        globalVars: parserConfig.globalVars,
        context: parserConfig.localVars && {vars: parserConfig.localVars},
        indented: 0
      };
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
      }
      if (state.tokenize != jsTokenComment && stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      state.lastType = type == "operator" && (content == "++" || content == "--") ? "incdec" : type;
      return parseJS(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize == jsTokenComment) return CodeMirror.Pass;
      if (state.tokenize != jsTokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical;
      if (lexical.type == "stat" && firstChar == "}") lexical = lexical.prev;
      var type = lexical.type, closing = firstChar == type;
      if (parserConfig.statementIndent != null) {
        if (type == ")" && lexical.prev && lexical.prev.type == "stat") lexical = lexical.prev;
        if (lexical.type == "stat") return lexical.indented + parserConfig.statementIndent;
      }

      if (type == "vardef") return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? 4 : 0);
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "form") return lexical.indented + indentUnit;
      else if (type == "stat")
        return lexical.indented + (state.lastType == "operator" || state.lastType == "," ? indentUnit : 0);
      else if (lexical.info == "switch" && !closing)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}",
    blockCommentStart: jsonMode ? null : "/*",
    blockCommentEnd: jsonMode ? null : "*/",
    lineComment: jsonMode ? null : "//",

    jsonMode: jsonMode
  };
});

CodeMirror.defineMIME("text/javascript", "javascript");
CodeMirror.defineMIME("text/ecmascript", "javascript");
CodeMirror.defineMIME("application/javascript", "javascript");
CodeMirror.defineMIME("application/ecmascript", "javascript");
CodeMirror.defineMIME("application/json", {name: "javascript", json: true});
CodeMirror.defineMIME("application/x-json", {name: "javascript", json: true});
CodeMirror.defineMIME("text/typescript", { name: "javascript", typescript: true });
CodeMirror.defineMIME("application/typescript", { name: "javascript", typescript: true });
// LUA mode. Ported to CodeMirror 2 from Franciszek Wawrzak's
// CodeMirror 1 mode.
// highlights keywords, strings, comments (no leveling supported! ("[==[")), tokens, basic indenting

CodeMirror.defineMode("lua", function(config, parserConfig) {
  var indentUnit = config.indentUnit;

  function prefixRE(words) {
    return new RegExp("^(?:" + words.join("|") + ")", "i");
  }
  function wordRE(words) {
    return new RegExp("^(?:" + words.join("|") + ")$", "i");
  }
  var specials = wordRE(parserConfig.specials || []);

  // long list of standard functions from lua manual
  var builtins = wordRE([
    "_G","_VERSION","assert","collectgarbage","dofile","error","getfenv","getmetatable","ipairs","load",
    "loadfile","loadstring","module","next","pairs","pcall","print","rawequal","rawget","rawset","require",
    "select","setfenv","setmetatable","tonumber","tostring","type","unpack","xpcall",

    "coroutine.create","coroutine.resume","coroutine.running","coroutine.status","coroutine.wrap","coroutine.yield",

    "debug.debug","debug.getfenv","debug.gethook","debug.getinfo","debug.getlocal","debug.getmetatable",
    "debug.getregistry","debug.getupvalue","debug.setfenv","debug.sethook","debug.setlocal","debug.setmetatable",
    "debug.setupvalue","debug.traceback",

    "close","flush","lines","read","seek","setvbuf","write",

    "io.close","io.flush","io.input","io.lines","io.open","io.output","io.popen","io.read","io.stderr","io.stdin",
    "io.stdout","io.tmpfile","io.type","io.write",

    "math.abs","math.acos","math.asin","math.atan","math.atan2","math.ceil","math.cos","math.cosh","math.deg",
    "math.exp","math.floor","math.fmod","math.frexp","math.huge","math.ldexp","math.log","math.log10","math.max",
    "math.min","math.modf","math.pi","math.pow","math.rad","math.random","math.randomseed","math.sin","math.sinh",
    "math.sqrt","math.tan","math.tanh",

    "os.clock","os.date","os.difftime","os.execute","os.exit","os.getenv","os.remove","os.rename","os.setlocale",
    "os.time","os.tmpname",

    "package.cpath","package.loaded","package.loaders","package.loadlib","package.path","package.preload",
    "package.seeall",

    "string.byte","string.char","string.dump","string.find","string.format","string.gmatch","string.gsub",
    "string.len","string.lower","string.match","string.rep","string.reverse","string.sub","string.upper",

    "table.concat","table.insert","table.maxn","table.remove","table.sort"
  ]);
  var keywords = wordRE(["and","break","elseif","false","nil","not","or","return",
                         "true","function", "end", "if", "then", "else", "do",
                         "while", "repeat", "until", "for", "in", "local" ]);

  var indentTokens = wordRE(["function", "if","repeat","do", "\\(", "{"]);
  var dedentTokens = wordRE(["end", "until", "\\)", "}"]);
  var dedentPartial = prefixRE(["end", "until", "\\)", "}", "else", "elseif"]);

  function readBracket(stream) {
    var level = 0;
    while (stream.eat("=")) ++level;
    stream.eat("[");
    return level;
  }

  function normal(stream, state) {
    var ch = stream.next();
    if (ch == "-" && stream.eat("-")) {
      if (stream.eat("[") && stream.eat("["))
        return (state.cur = bracketed(readBracket(stream), "comment"))(stream, state);
      stream.skipToEnd();
      return "comment";
    }
    if (ch == "\"" || ch == "'")
      return (state.cur = string(ch))(stream, state);
    if (ch == "[" && /[\[=]/.test(stream.peek()))
      return (state.cur = bracketed(readBracket(stream), "string"))(stream, state);
    if (/\d/.test(ch)) {
      stream.eatWhile(/[\w.%]/);
      return "number";
    }
    if (/[\w_]/.test(ch)) {
      stream.eatWhile(/[\w\\\-_.]/);
      return "variable";
    }
    return null;
  }

  function bracketed(level, style) {
    return function(stream, state) {
      var curlev = null, ch;
      while ((ch = stream.next()) != null) {
        if (curlev == null) {if (ch == "]") curlev = 0;}
        else if (ch == "=") ++curlev;
        else if (ch == "]" && curlev == level) { state.cur = normal; break; }
        else curlev = null;
      }
      return style;
    };
  }

  function string(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped) break;
        escaped = !escaped && ch == "\\";
      }
      if (!escaped) state.cur = normal;
      return "string";
    };
  }

  return {
    startState: function(basecol) {
      return {basecol: basecol || 0, indentDepth: 0, cur: normal};
    },

    token: function(stream, state) {
      if (stream.eatSpace()) return null;
      var style = state.cur(stream, state);
      var word = stream.current();
      if (style == "variable") {
        if (keywords.test(word)) style = "keyword";
        else if (builtins.test(word)) style = "builtin";
        else if (specials.test(word)) style = "variable-2";
      }
      if ((style != "comment") && (style != "string")){
        if (indentTokens.test(word)) ++state.indentDepth;
        else if (dedentTokens.test(word)) --state.indentDepth;
      }
      return style;
    },

    indent: function(state, textAfter) {
      var closing = dedentPartial.test(textAfter);
      return state.basecol + indentUnit * (state.indentDepth - (closing ? 1 : 0));
    },

    lineComment: "--",
    blockCommentStart: "--[[",
    blockCommentEnd: "]]"
  };
});

CodeMirror.defineMIME("text/x-lua", "lua");
(function() {
  function keywords(str) {
    var obj = {}, words = str.split(" ");
    for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
    return obj;
  }
  function heredoc(delim) {
    return function(stream, state) {
      if (stream.match(delim)) state.tokenize = null;
      else stream.skipToEnd();
      return "string";
    };
  }
  var phpConfig = {
    name: "clike",
    keywords: keywords("abstract and array as break case catch class clone const continue declare default " +
                       "do else elseif enddeclare endfor endforeach endif endswitch endwhile extends final " +
                       "for foreach function global goto if implements interface instanceof namespace " +
                       "new or private protected public static switch throw trait try use var while xor " +
                       "die echo empty exit eval include include_once isset list require require_once return " +
                       "print unset __halt_compiler self static parent"),
    blockKeywords: keywords("catch do else elseif for foreach if switch try while"),
    atoms: keywords("true false null TRUE FALSE NULL __CLASS__ __DIR__ __FILE__ __LINE__ __METHOD__ __FUNCTION__ __NAMESPACE__"),
    builtin: keywords("func_num_args func_get_arg func_get_args strlen strcmp strncmp strcasecmp strncasecmp each error_reporting define defined trigger_error user_error set_error_handler restore_error_handler get_declared_classes get_loaded_extensions extension_loaded get_extension_funcs debug_backtrace constant bin2hex sleep usleep time mktime gmmktime strftime gmstrftime strtotime date gmdate getdate localtime checkdate flush wordwrap htmlspecialchars htmlentities html_entity_decode md5 md5_file crc32 getimagesize image_type_to_mime_type phpinfo phpversion phpcredits strnatcmp strnatcasecmp substr_count strspn strcspn strtok strtoupper strtolower strpos strrpos strrev hebrev hebrevc nl2br basename dirname pathinfo stripslashes stripcslashes strstr stristr strrchr str_shuffle str_word_count strcoll substr substr_replace quotemeta ucfirst ucwords strtr addslashes addcslashes rtrim str_replace str_repeat count_chars chunk_split trim ltrim strip_tags similar_text explode implode setlocale localeconv parse_str str_pad chop strchr sprintf printf vprintf vsprintf sscanf fscanf parse_url urlencode urldecode rawurlencode rawurldecode readlink linkinfo link unlink exec system escapeshellcmd escapeshellarg passthru shell_exec proc_open proc_close rand srand getrandmax mt_rand mt_srand mt_getrandmax base64_decode base64_encode abs ceil floor round is_finite is_nan is_infinite bindec hexdec octdec decbin decoct dechex base_convert number_format fmod ip2long long2ip getenv putenv getopt microtime gettimeofday getrusage uniqid quoted_printable_decode set_time_limit get_cfg_var magic_quotes_runtime set_magic_quotes_runtime get_magic_quotes_gpc get_magic_quotes_runtime import_request_variables error_log serialize unserialize memory_get_usage var_dump var_export debug_zval_dump print_r highlight_file show_source highlight_string ini_get ini_get_all ini_set ini_alter ini_restore get_include_path set_include_path restore_include_path setcookie header headers_sent connection_aborted connection_status ignore_user_abort parse_ini_file is_uploaded_file move_uploaded_file intval floatval doubleval strval gettype settype is_null is_resource is_bool is_long is_float is_int is_integer is_double is_real is_numeric is_string is_array is_object is_scalar ereg ereg_replace eregi eregi_replace split spliti join sql_regcase dl pclose popen readfile rewind rmdir umask fclose feof fgetc fgets fgetss fread fopen fpassthru ftruncate fstat fseek ftell fflush fwrite fputs mkdir rename copy tempnam tmpfile file file_get_contents stream_select stream_context_create stream_context_set_params stream_context_set_option stream_context_get_options stream_filter_prepend stream_filter_append fgetcsv flock get_meta_tags stream_set_write_buffer set_file_buffer set_socket_blocking stream_set_blocking socket_set_blocking stream_get_meta_data stream_register_wrapper stream_wrapper_register stream_set_timeout socket_set_timeout socket_get_status realpath fnmatch fsockopen pfsockopen pack unpack get_browser crypt opendir closedir chdir getcwd rewinddir readdir dir glob fileatime filectime filegroup fileinode filemtime fileowner fileperms filesize filetype file_exists is_writable is_writeable is_readable is_executable is_file is_dir is_link stat lstat chown touch clearstatcache mail ob_start ob_flush ob_clean ob_end_flush ob_end_clean ob_get_flush ob_get_clean ob_get_length ob_get_level ob_get_status ob_get_contents ob_implicit_flush ob_list_handlers ksort krsort natsort natcasesort asort arsort sort rsort usort uasort uksort shuffle array_walk count end prev next reset current key min max in_array array_search extract compact array_fill range array_multisort array_push array_pop array_shift array_unshift array_splice array_slice array_merge array_merge_recursive array_keys array_values array_count_values array_reverse array_reduce array_pad array_flip array_change_key_case array_rand array_unique array_intersect array_intersect_assoc array_diff array_diff_assoc array_sum array_filter array_map array_chunk array_key_exists pos sizeof key_exists assert assert_options version_compare ftok str_rot13 aggregate session_name session_module_name session_save_path session_id session_regenerate_id session_decode session_register session_unregister session_is_registered session_encode session_start session_destroy session_unset session_set_save_handler session_cache_limiter session_cache_expire session_set_cookie_params session_get_cookie_params session_write_close preg_match preg_match_all preg_replace preg_replace_callback preg_split preg_quote preg_grep overload ctype_alnum ctype_alpha ctype_cntrl ctype_digit ctype_lower ctype_graph ctype_print ctype_punct ctype_space ctype_upper ctype_xdigit virtual apache_request_headers apache_note apache_lookup_uri apache_child_terminate apache_setenv apache_response_headers apache_get_version getallheaders mysql_connect mysql_pconnect mysql_close mysql_select_db mysql_create_db mysql_drop_db mysql_query mysql_unbuffered_query mysql_db_query mysql_list_dbs mysql_list_tables mysql_list_fields mysql_list_processes mysql_error mysql_errno mysql_affected_rows mysql_insert_id mysql_result mysql_num_rows mysql_num_fields mysql_fetch_row mysql_fetch_array mysql_fetch_assoc mysql_fetch_object mysql_data_seek mysql_fetch_lengths mysql_fetch_field mysql_field_seek mysql_free_result mysql_field_name mysql_field_table mysql_field_len mysql_field_type mysql_field_flags mysql_escape_string mysql_real_escape_string mysql_stat mysql_thread_id mysql_client_encoding mysql_get_client_info mysql_get_host_info mysql_get_proto_info mysql_get_server_info mysql_info mysql mysql_fieldname mysql_fieldtable mysql_fieldlen mysql_fieldtype mysql_fieldflags mysql_selectdb mysql_createdb mysql_dropdb mysql_freeresult mysql_numfields mysql_numrows mysql_listdbs mysql_listtables mysql_listfields mysql_db_name mysql_dbname mysql_tablename mysql_table_name pg_connect pg_pconnect pg_close pg_connection_status pg_connection_busy pg_connection_reset pg_host pg_dbname pg_port pg_tty pg_options pg_ping pg_query pg_send_query pg_cancel_query pg_fetch_result pg_fetch_row pg_fetch_assoc pg_fetch_array pg_fetch_object pg_fetch_all pg_affected_rows pg_get_result pg_result_seek pg_result_status pg_free_result pg_last_oid pg_num_rows pg_num_fields pg_field_name pg_field_num pg_field_size pg_field_type pg_field_prtlen pg_field_is_null pg_get_notify pg_get_pid pg_result_error pg_last_error pg_last_notice pg_put_line pg_end_copy pg_copy_to pg_copy_from pg_trace pg_untrace pg_lo_create pg_lo_unlink pg_lo_open pg_lo_close pg_lo_read pg_lo_write pg_lo_read_all pg_lo_import pg_lo_export pg_lo_seek pg_lo_tell pg_escape_string pg_escape_bytea pg_unescape_bytea pg_client_encoding pg_set_client_encoding pg_meta_data pg_convert pg_insert pg_update pg_delete pg_select pg_exec pg_getlastoid pg_cmdtuples pg_errormessage pg_numrows pg_numfields pg_fieldname pg_fieldsize pg_fieldtype pg_fieldnum pg_fieldprtlen pg_fieldisnull pg_freeresult pg_result pg_loreadall pg_locreate pg_lounlink pg_loopen pg_loclose pg_loread pg_lowrite pg_loimport pg_loexport echo print global static exit array empty eval isset unset die include require include_once require_once"),
    multiLineStrings: true,
    hooks: {
      "$": function(stream) {
        stream.eatWhile(/[\w\$_]/);
        return "variable-2";
      },
      "<": function(stream, state) {
        if (stream.match(/<</)) {
          stream.eatWhile(/[\w\.]/);
          state.tokenize = heredoc(stream.current().slice(3));
          return state.tokenize(stream, state);
        }
        return false;
      },
      "#": function(stream) {
        while (!stream.eol() && !stream.match("?>", false)) stream.next();
        return "comment";
      },
      "/": function(stream) {
        if (stream.eat("/")) {
          while (!stream.eol() && !stream.match("?>", false)) stream.next();
          return "comment";
        }
        return false;
      }
    }
  };

  CodeMirror.defineMode("php", function(config, parserConfig) {
    var htmlMode = CodeMirror.getMode(config, "text/html");
    var phpMode = CodeMirror.getMode(config, phpConfig);

    function dispatch(stream, state) {
      var isPHP = state.curMode == phpMode;
      if (stream.sol() && state.pending != '"') state.pending = null;
      if (!isPHP) {
        if (stream.match(/^<\?\w*/)) {
          state.curMode = phpMode;
          state.curState = state.php;
          return "meta";
        }
        if (state.pending == '"') {
          while (!stream.eol() && stream.next() != '"') {}
          var style = "string";
        } else if (state.pending && stream.pos < state.pending.end) {
          stream.pos = state.pending.end;
          var style = state.pending.style;
        } else {
          var style = htmlMode.token(stream, state.curState);
        }
        state.pending = null;
        var cur = stream.current(), openPHP = cur.search(/<\?/);
        if (openPHP != -1) {
          if (style == "string" && /\"$/.test(cur) && !/\?>/.test(cur)) state.pending = '"';
          else state.pending = {end: stream.pos, style: style};
          stream.backUp(cur.length - openPHP);
        }
        return style;
      } else if (isPHP && state.php.tokenize == null && stream.match("?>")) {
        state.curMode = htmlMode;
        state.curState = state.html;
        return "meta";
      } else {
        return phpMode.token(stream, state.curState);
      }
    }

    return {
      startState: function() {
        var html = CodeMirror.startState(htmlMode), php = CodeMirror.startState(phpMode);
        return {html: html,
                php: php,
                curMode: parserConfig.startOpen ? phpMode : htmlMode,
                curState: parserConfig.startOpen ? php : html,
                pending: null};
      },

      copyState: function(state) {
        var html = state.html, htmlNew = CodeMirror.copyState(htmlMode, html),
            php = state.php, phpNew = CodeMirror.copyState(phpMode, php), cur;
        if (state.curMode == htmlMode) cur = htmlNew;
        else cur = phpNew;
        return {html: htmlNew, php: phpNew, curMode: state.curMode, curState: cur,
                pending: state.pending};
      },

      token: dispatch,

      indent: function(state, textAfter) {
        if ((state.curMode != phpMode && /^\s*<\//.test(textAfter)) ||
            (state.curMode == phpMode && /^\?>/.test(textAfter)))
          return htmlMode.indent(state.html, textAfter);
        return state.curMode.indent(state.curState, textAfter);
      },

      electricChars: "/{}:",
      blockCommentStart: "/*",
      blockCommentEnd: "*/",
      lineComment: "//",

      innerMode: function(state) { return {state: state.curState, mode: state.curMode}; }
    };
  }, "htmlmixed", "clike");

  CodeMirror.defineMIME("application/x-httpd-php", "php");
  CodeMirror.defineMIME("application/x-httpd-php-open", {name: "php", startOpen: true});
  CodeMirror.defineMIME("text/x-php", phpConfig);
})();
CodeMirror.defineMode("python", function(conf, parserConf) {
    var ERRORCLASS = 'error';

    function wordRegexp(words) {
        return new RegExp("^((" + words.join(")|(") + "))\\b");
    }

    var singleOperators = parserConf.singleOperators || new RegExp("^[\\+\\-\\*/%&|\\^~<>!]");
    var singleDelimiters = parserConf.singleDelimiters || new RegExp('^[\\(\\)\\[\\]\\{\\}@,:`=;\\.]');
    var doubleOperators = parserConf.doubleOperators || new RegExp("^((==)|(!=)|(<=)|(>=)|(<>)|(<<)|(>>)|(//)|(\\*\\*))");
    var doubleDelimiters = parserConf.doubleDelimiters || new RegExp("^((\\+=)|(\\-=)|(\\*=)|(%=)|(/=)|(&=)|(\\|=)|(\\^=))");
    var tripleDelimiters = parserConf.tripleDelimiters || new RegExp("^((//=)|(>>=)|(<<=)|(\\*\\*=))");
    var identifiers = parserConf.identifiers|| new RegExp("^[_A-Za-z][_A-Za-z0-9]*");

    var wordOperators = wordRegexp(['and', 'or', 'not', 'is', 'in']);
    var commonkeywords = ['as', 'assert', 'break', 'class', 'continue',
                          'def', 'del', 'elif', 'else', 'except', 'finally',
                          'for', 'from', 'global', 'if', 'import',
                          'lambda', 'pass', 'raise', 'return',
                          'try', 'while', 'with', 'yield'];
    var commonBuiltins = ['abs', 'all', 'any', 'bin', 'bool', 'bytearray', 'callable', 'chr',
                          'classmethod', 'compile', 'complex', 'delattr', 'dict', 'dir', 'divmod',
                          'enumerate', 'eval', 'filter', 'float', 'format', 'frozenset',
                          'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex', 'id',
                          'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
                          'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next',
                          'object', 'oct', 'open', 'ord', 'pow', 'property', 'range',
                          'repr', 'reversed', 'round', 'set', 'setattr', 'slice',
                          'sorted', 'staticmethod', 'str', 'sum', 'super', 'tuple',
                          'type', 'vars', 'zip', '__import__', 'NotImplemented',
                          'Ellipsis', '__debug__'];
    var py2 = {'builtins': ['apply', 'basestring', 'buffer', 'cmp', 'coerce', 'execfile',
                            'file', 'intern', 'long', 'raw_input', 'reduce', 'reload',
                            'unichr', 'unicode', 'xrange', 'False', 'True', 'None'],
               'keywords': ['exec', 'print']};
    var py3 = {'builtins': ['ascii', 'bytes', 'exec', 'print'],
               'keywords': ['nonlocal', 'False', 'True', 'None']};

    if (!!parserConf.version && parseInt(parserConf.version, 10) === 3) {
        commonkeywords = commonkeywords.concat(py3.keywords);
        commonBuiltins = commonBuiltins.concat(py3.builtins);
        var stringPrefixes = new RegExp("^(([rb]|(br))?('{3}|\"{3}|['\"]))", "i");
    } else {
        commonkeywords = commonkeywords.concat(py2.keywords);
        commonBuiltins = commonBuiltins.concat(py2.builtins);
        var stringPrefixes = new RegExp("^(([rub]|(ur)|(br))?('{3}|\"{3}|['\"]))", "i");
    }
    var keywords = wordRegexp(commonkeywords);
    var builtins = wordRegexp(commonBuiltins);

    var indentInfo = null;

    // tokenizers
    function tokenBase(stream, state) {
        // Handle scope changes
        if (stream.sol()) {
            var scopeOffset = state.scopes[0].offset;
            if (stream.eatSpace()) {
                var lineOffset = stream.indentation();
                if (lineOffset > scopeOffset) {
                    indentInfo = 'indent';
                } else if (lineOffset < scopeOffset) {
                    indentInfo = 'dedent';
                }
                return null;
            } else {
                if (scopeOffset > 0) {
                    dedent(stream, state);
                }
            }
        }
        if (stream.eatSpace()) {
            return null;
        }

        var ch = stream.peek();

        // Handle Comments
        if (ch === '#') {
            stream.skipToEnd();
            return 'comment';
        }

        // Handle Number Literals
        if (stream.match(/^[0-9\.]/, false)) {
            var floatLiteral = false;
            // Floats
            if (stream.match(/^\d*\.\d+(e[\+\-]?\d+)?/i)) { floatLiteral = true; }
            if (stream.match(/^\d+\.\d*/)) { floatLiteral = true; }
            if (stream.match(/^\.\d+/)) { floatLiteral = true; }
            if (floatLiteral) {
                // Float literals may be "imaginary"
                stream.eat(/J/i);
                return 'number';
            }
            // Integers
            var intLiteral = false;
            // Hex
            if (stream.match(/^0x[0-9a-f]+/i)) { intLiteral = true; }
            // Binary
            if (stream.match(/^0b[01]+/i)) { intLiteral = true; }
            // Octal
            if (stream.match(/^0o[0-7]+/i)) { intLiteral = true; }
            // Decimal
            if (stream.match(/^[1-9]\d*(e[\+\-]?\d+)?/)) {
                // Decimal literals may be "imaginary"
                stream.eat(/J/i);
                // TODO - Can you have imaginary longs?
                intLiteral = true;
            }
            // Zero by itself with no other piece of number.
            if (stream.match(/^0(?![\dx])/i)) { intLiteral = true; }
            if (intLiteral) {
                // Integer literals may be "long"
                stream.eat(/L/i);
                return 'number';
            }
        }

        // Handle Strings
        if (stream.match(stringPrefixes)) {
            state.tokenize = tokenStringFactory(stream.current());
            return state.tokenize(stream, state);
        }

        // Handle operators and Delimiters
        if (stream.match(tripleDelimiters) || stream.match(doubleDelimiters)) {
            return null;
        }
        if (stream.match(doubleOperators)
            || stream.match(singleOperators)
            || stream.match(wordOperators)) {
            return 'operator';
        }
        if (stream.match(singleDelimiters)) {
            return null;
        }

        if (stream.match(keywords)) {
            return 'keyword';
        }

        if (stream.match(builtins)) {
            return 'builtin';
        }

        if (stream.match(identifiers)) {
            return 'variable';
        }

        // Handle non-detected items
        stream.next();
        return ERRORCLASS;
    }

    function tokenStringFactory(delimiter) {
        while ('rub'.indexOf(delimiter.charAt(0).toLowerCase()) >= 0) {
            delimiter = delimiter.substr(1);
        }
        var singleline = delimiter.length == 1;
        var OUTCLASS = 'string';

        function tokenString(stream, state) {
            while (!stream.eol()) {
                stream.eatWhile(/[^'"\\]/);
                if (stream.eat('\\')) {
                    stream.next();
                    if (singleline && stream.eol()) {
                        return OUTCLASS;
                    }
                } else if (stream.match(delimiter)) {
                    state.tokenize = tokenBase;
                    return OUTCLASS;
                } else {
                    stream.eat(/['"]/);
                }
            }
            if (singleline) {
                if (parserConf.singleLineStringErrors) {
                    return ERRORCLASS;
                } else {
                    state.tokenize = tokenBase;
                }
            }
            return OUTCLASS;
        }
        tokenString.isString = true;
        return tokenString;
    }

    function indent(stream, state, type) {
        type = type || 'py';
        var indentUnit = 0;
        if (type === 'py') {
            if (state.scopes[0].type !== 'py') {
                state.scopes[0].offset = stream.indentation();
                return;
            }
            for (var i = 0; i < state.scopes.length; ++i) {
                if (state.scopes[i].type === 'py') {
                    indentUnit = state.scopes[i].offset + conf.indentUnit;
                    break;
                }
            }
        } else {
            indentUnit = stream.column() + stream.current().length;
        }
        state.scopes.unshift({
            offset: indentUnit,
            type: type
        });
    }

    function dedent(stream, state, type) {
        type = type || 'py';
        if (state.scopes.length == 1) return;
        if (state.scopes[0].type === 'py') {
            var _indent = stream.indentation();
            var _indent_index = -1;
            for (var i = 0; i < state.scopes.length; ++i) {
                if (_indent === state.scopes[i].offset) {
                    _indent_index = i;
                    break;
                }
            }
            if (_indent_index === -1) {
                return true;
            }
            while (state.scopes[0].offset !== _indent) {
                state.scopes.shift();
            }
            return false;
        } else {
            if (type === 'py') {
                state.scopes[0].offset = stream.indentation();
                return false;
            } else {
                if (state.scopes[0].type != type) {
                    return true;
                }
                state.scopes.shift();
                return false;
            }
        }
    }

    function tokenLexer(stream, state) {
        indentInfo = null;
        var style = state.tokenize(stream, state);
        var current = stream.current();

        // Handle '.' connected identifiers
        if (current === '.') {
            style = stream.match(identifiers, false) ? null : ERRORCLASS;
            if (style === null && state.lastToken === 'meta') {
                // Apply 'meta' style to '.' connected identifiers when
                // appropriate.
                style = 'meta';
            }
            return style;
        }

        // Handle decorators
        if (current === '@') {
            return stream.match(identifiers, false) ? 'meta' : ERRORCLASS;
        }

        if ((style === 'variable' || style === 'builtin')
            && state.lastToken === 'meta') {
            style = 'meta';
        }

        // Handle scope changes.
        if (current === 'pass' || current === 'return') {
            state.dedent += 1;
        }
        if (current === 'lambda') state.lambda = true;
        if ((current === ':' && !state.lambda && state.scopes[0].type == 'py')
            || indentInfo === 'indent') {
            indent(stream, state);
        }
        var delimiter_index = '[({'.indexOf(current);
        if (delimiter_index !== -1) {
            indent(stream, state, '])}'.slice(delimiter_index, delimiter_index+1));
        }
        if (indentInfo === 'dedent') {
            if (dedent(stream, state)) {
                return ERRORCLASS;
            }
        }
        delimiter_index = '])}'.indexOf(current);
        if (delimiter_index !== -1) {
            if (dedent(stream, state, current)) {
                return ERRORCLASS;
            }
        }
        if (state.dedent > 0 && stream.eol() && state.scopes[0].type == 'py') {
            if (state.scopes.length > 1) state.scopes.shift();
            state.dedent -= 1;
        }

        return style;
    }

    var external = {
        startState: function(basecolumn) {
            return {
              tokenize: tokenBase,
              scopes: [{offset:basecolumn || 0, type:'py'}],
              lastToken: null,
              lambda: false,
              dedent: 0
          };
        },

        token: function(stream, state) {
            var style = tokenLexer(stream, state);

            state.lastToken = style;

            if (stream.eol() && stream.lambda) {
                state.lambda = false;
            }

            return style;
        },

        indent: function(state) {
            if (state.tokenize != tokenBase) {
                return state.tokenize.isString ? CodeMirror.Pass : 0;
            }

            return state.scopes[0].offset;
        },

        lineComment: "#"
    };
    return external;
});

CodeMirror.defineMIME("text/x-python", "python");
CodeMirror.defineMode('rst-base', function (config) {

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function format(string) {
        var args = Array.prototype.slice.call(arguments, 1);
        return string.replace(/{(\d+)}/g, function (match, n) {
            return typeof args[n] != 'undefined' ? args[n] : match;
        });
    }

    function AssertException(message) {
        this.message = message;
    }

    AssertException.prototype.toString = function () {
        return 'AssertException: ' + this.message;
    };

    function assert(expression, message) {
        if (!expression) throw new AssertException(message);
        return expression;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var mode_python = CodeMirror.getMode(config, 'python');
    var mode_stex = CodeMirror.getMode(config, 'stex');

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    var SEPA = "\\s+";
    var TAIL = "(?:\\s*|\\W|$)",
        rx_TAIL = new RegExp(format('^{0}', TAIL));

    var NAME = "(?:[^\\W\\d_](?:[\\w\\+\\.\\-:]*[^\\W_])?)",
        rx_NAME = new RegExp(format('^{0}', NAME));
    var NAME_WWS = "(?:[^\\W\\d_](?:[\\w\\s\\+\\.\\-:]*[^\\W_])?)";
    var REF_NAME = format('(?:{0}|`{1}`)', NAME, NAME_WWS);

    var TEXT1 = "(?:[^\\s\\|](?:[^\\|]*[^\\s\\|])?)";
    var TEXT2 = "(?:[^\\`]+)",
        rx_TEXT2 = new RegExp(format('^{0}', TEXT2));

    var rx_section = new RegExp(
        "^([!'#$%&\"()*+,-./:;<=>?@\\[\\\\\\]^_`{|}~])\\1{3,}\\s*$");
    var rx_explicit = new RegExp(
        format('^\\.\\.{0}', SEPA));
    var rx_link = new RegExp(
        format('^_{0}:{1}|^__:{1}', REF_NAME, TAIL));
    var rx_directive = new RegExp(
        format('^{0}::{1}', REF_NAME, TAIL));
    var rx_substitution = new RegExp(
        format('^\\|{0}\\|{1}{2}::{3}', TEXT1, SEPA, REF_NAME, TAIL));
    var rx_footnote = new RegExp(
        format('^\\[(?:\\d+|#{0}?|\\*)]{1}', REF_NAME, TAIL));
    var rx_citation = new RegExp(
        format('^\\[{0}\\]{1}', REF_NAME, TAIL));

    var rx_substitution_ref = new RegExp(
        format('^\\|{0}\\|', TEXT1));
    var rx_footnote_ref = new RegExp(
        format('^\\[(?:\\d+|#{0}?|\\*)]_', REF_NAME));
    var rx_citation_ref = new RegExp(
        format('^\\[{0}\\]_', REF_NAME));
    var rx_link_ref1 = new RegExp(
        format('^{0}__?', REF_NAME));
    var rx_link_ref2 = new RegExp(
        format('^`{0}`_', TEXT2));

    var rx_role_pre = new RegExp(
        format('^:{0}:`{1}`{2}', NAME, TEXT2, TAIL));
    var rx_role_suf = new RegExp(
        format('^`{1}`:{0}:{2}', NAME, TEXT2, TAIL));
    var rx_role = new RegExp(
        format('^:{0}:{1}', NAME, TAIL));

    var rx_directive_name = new RegExp(format('^{0}', REF_NAME));
    var rx_directive_tail = new RegExp(format('^::{0}', TAIL));
    var rx_substitution_text = new RegExp(format('^\\|{0}\\|', TEXT1));
    var rx_substitution_sepa = new RegExp(format('^{0}', SEPA));
    var rx_substitution_name = new RegExp(format('^{0}', REF_NAME));
    var rx_substitution_tail = new RegExp(format('^::{0}', TAIL));
    var rx_link_head = new RegExp("^_");
    var rx_link_name = new RegExp(format('^{0}|_', REF_NAME));
    var rx_link_tail = new RegExp(format('^:{0}', TAIL));

    var rx_verbatim = new RegExp('^::\\s*$');
    var rx_examples = new RegExp('^\\s+(?:>>>|In \\[\\d+\\]:)\\s');

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function to_normal(stream, state) {
        var token = null;

        if (stream.sol() && stream.match(rx_examples, false)) {
            change(state, to_mode, {
                mode: mode_python, local: mode_python.startState()
            });
        } else if (stream.sol() && stream.match(rx_explicit)) {
            change(state, to_explicit);
            token = 'meta';
        } else if (stream.sol() && stream.match(rx_section)) {
            change(state, to_normal);
            token = 'header';
        } else if (phase(state) == rx_role_pre ||
            stream.match(rx_role_pre, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_normal, context(rx_role_pre, 1));
                    assert(stream.match(/^:/));
                    token = 'meta';
                    break;
                case 1:
                    change(state, to_normal, context(rx_role_pre, 2));
                    assert(stream.match(rx_NAME));
                    token = 'keyword';

                    if (stream.current().match(/^(?:math|latex)/)) {
                        state.tmp = {
                            mode: mode_stex, local: mode_stex.startState()
                        };
                    }
                    break;
                case 2:
                    change(state, to_normal, context(rx_role_pre, 3));
                    assert(stream.match(/^:`/));
                    token = 'meta';
                    break;
                case 3:
                    if (state.tmp) {
                        if (stream.peek() == '`') {
                            change(state, to_normal, context(rx_role_pre, 4));
                            state.tmp = undefined;
                            break;
                        }

                        token = state.tmp.mode.token(stream, state.tmp.local);
                        break;
                    }

                    change(state, to_normal, context(rx_role_pre, 4));
                    assert(stream.match(rx_TEXT2));
                    token = 'string';
                    break;
                case 4:
                    change(state, to_normal, context(rx_role_pre, 5));
                    assert(stream.match(/^`/));
                    token = 'meta';
                    break;
                case 5:
                    change(state, to_normal, context(rx_role_pre, 6));
                    assert(stream.match(rx_TAIL));
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (phase(state) == rx_role_suf ||
            stream.match(rx_role_suf, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_normal, context(rx_role_suf, 1));
                    assert(stream.match(/^`/));
                    token = 'meta';
                    break;
                case 1:
                    change(state, to_normal, context(rx_role_suf, 2));
                    assert(stream.match(rx_TEXT2));
                    token = 'string';
                    break;
                case 2:
                    change(state, to_normal, context(rx_role_suf, 3));
                    assert(stream.match(/^`:/));
                    token = 'meta';
                    break;
                case 3:
                    change(state, to_normal, context(rx_role_suf, 4));
                    assert(stream.match(rx_NAME));
                    token = 'keyword';
                    break;
                case 4:
                    change(state, to_normal, context(rx_role_suf, 5));
                    assert(stream.match(/^:/));
                    token = 'meta';
                    break;
                case 5:
                    change(state, to_normal, context(rx_role_suf, 6));
                    assert(stream.match(rx_TAIL));
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (phase(state) == rx_role || stream.match(rx_role, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_normal, context(rx_role, 1));
                    assert(stream.match(/^:/));
                    token = 'meta';
                    break;
                case 1:
                    change(state, to_normal, context(rx_role, 2));
                    assert(stream.match(rx_NAME));
                    token = 'keyword';
                    break;
                case 2:
                    change(state, to_normal, context(rx_role, 3));
                    assert(stream.match(/^:/));
                    token = 'meta';
                    break;
                case 3:
                    change(state, to_normal, context(rx_role, 4));
                    assert(stream.match(rx_TAIL));
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (phase(state) == rx_substitution_ref ||
            stream.match(rx_substitution_ref, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_normal, context(rx_substitution_ref, 1));
                    assert(stream.match(rx_substitution_text));
                    token = 'variable-2';
                    break;
                case 1:
                    change(state, to_normal, context(rx_substitution_ref, 2));
                    if (stream.match(/^_?_?/)) token = 'link';
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (stream.match(rx_footnote_ref)) {
            change(state, to_normal);
            token = 'quote';
        } else if (stream.match(rx_citation_ref)) {
            change(state, to_normal);
            token = 'quote';
        } else if (stream.match(rx_link_ref1)) {
            change(state, to_normal);
            if (!stream.peek() || stream.peek().match(/^\W$/)) {
                token = 'link';
            }
        } else if (phase(state) == rx_link_ref2 ||
            stream.match(rx_link_ref2, false)) {

            switch (stage(state)) {
                case 0:
                    if (!stream.peek() || stream.peek().match(/^\W$/)) {
                        change(state, to_normal, context(rx_link_ref2, 1));
                    } else {
                        stream.match(rx_link_ref2);
                    }
                    break;
                case 1:
                    change(state, to_normal, context(rx_link_ref2, 2));
                    assert(stream.match(/^`/));
                    token = 'link';
                    break;
                case 2:
                    change(state, to_normal, context(rx_link_ref2, 3));
                    assert(stream.match(rx_TEXT2));
                    break;
                case 3:
                    change(state, to_normal, context(rx_link_ref2, 4));
                    assert(stream.match(/^`_/));
                    token = 'link';
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (stream.match(rx_verbatim)) {
            change(state, to_verbatim);
        }

        else {
            if (stream.next()) change(state, to_normal);
        }

        return token;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function to_explicit(stream, state) {
        var token = null;

        if (phase(state) == rx_substitution ||
            stream.match(rx_substitution, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_explicit, context(rx_substitution, 1));
                    assert(stream.match(rx_substitution_text));
                    token = 'variable-2';
                    break;
                case 1:
                    change(state, to_explicit, context(rx_substitution, 2));
                    assert(stream.match(rx_substitution_sepa));
                    break;
                case 2:
                    change(state, to_explicit, context(rx_substitution, 3));
                    assert(stream.match(rx_substitution_name));
                    token = 'keyword';
                    break;
                case 3:
                    change(state, to_explicit, context(rx_substitution, 4));
                    assert(stream.match(rx_substitution_tail));
                    token = 'meta';
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (phase(state) == rx_directive ||
            stream.match(rx_directive, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_explicit, context(rx_directive, 1));
                    assert(stream.match(rx_directive_name));
                    token = 'keyword';

                    if (stream.current().match(/^(?:math|latex)/))
                        state.tmp_stex = true;
                    else if (stream.current().match(/^python/))
                        state.tmp_py = true;
                    break;
                case 1:
                    change(state, to_explicit, context(rx_directive, 2));
                    assert(stream.match(rx_directive_tail));
                    token = 'meta';
                    break;
                default:
                    if (stream.match(/^latex\s*$/) || state.tmp_stex) {
                        state.tmp_stex = undefined;
                        change(state, to_mode, {
                            mode: mode_stex, local: mode_stex.startState()
                        });
                    } else if (stream.match(/^python\s*$/) || state.tmp_py) {
                        state.tmp_py = undefined;
                        change(state, to_mode, {
                            mode: mode_python, local: mode_python.startState()
                        });
                    }

                    else {
                        change(state, to_normal);
                        assert(stream.current() == '');
                    }
            }
        } else if (phase(state) == rx_link || stream.match(rx_link, false)) {

            switch (stage(state)) {
                case 0:
                    change(state, to_explicit, context(rx_link, 1));
                    assert(stream.match(rx_link_head));
                    assert(stream.match(rx_link_name));
                    token = 'link';
                    break;
                case 1:
                    change(state, to_explicit, context(rx_link, 2));
                    assert(stream.match(rx_link_tail));
                    token = 'meta';
                    break;
                default:
                    change(state, to_normal);
                    assert(stream.current() == '');
            }
        } else if (stream.match(rx_footnote)) {
            change(state, to_normal);
            token = 'quote';
        } else if (stream.match(rx_citation)) {
            change(state, to_normal);
            token = 'quote';
        }

        else {
            stream.eatSpace();
            if (stream.eol()) {
                change(state, to_normal);
            } else {
                stream.skipToEnd();
                change(state, to_comment);
                token = 'comment';
            }
        }

        return token;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function to_comment(stream, state) {
        return as_block(stream, state, 'comment');
    }

    function to_verbatim(stream, state) {
        return as_block(stream, state, 'meta');
    }

    function as_block(stream, state, token) {
        if (stream.eol() || stream.eatSpace()) {
            stream.skipToEnd();
            return token;
        } else {
            change(state, to_normal);
            return null;
        }
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function to_mode(stream, state) {

        if (state.ctx.mode && state.ctx.local) {

            if (stream.sol()) {
                if (!stream.eatSpace()) change(state, to_normal);
                return null;
            }

            try {
                return state.ctx.mode.token(stream, state.ctx.local);
            } catch (ex) {
                change(state, to_normal);
                return null;
            }
        }

        change(state, to_normal);
        return null;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    function context(phase, stage, mode, local) {
        return {phase: phase, stage: stage, mode: mode, local: local};
    }

    function change(state, tok, ctx) {
        state.tok = tok;
        state.ctx = ctx || {};
    }

    function stage(state) {
        return state.ctx.stage || 0;
    }

    function phase(state) {
        return state.ctx.phase;
    }

    ///////////////////////////////////////////////////////////////////////////
    ///////////////////////////////////////////////////////////////////////////

    return {
        startState: function () {
            return {tok: to_normal, ctx: context(undefined, 0)};
        },

        copyState: function (state) {
            return {tok: state.tok, ctx: state.ctx};
        },

        innerMode: function (state) {
            return {state: state.ctx.local, mode: state.ctx.mode};
        },

        token: function (stream, state) {
            return state.tok(stream, state);
        }
    };
}, 'python', 'stex');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

CodeMirror.defineMode('rst', function (config, options) {

    var rx_uri_protocol = "[Hh][Tt][Tt][Pp][Ss]?://";
    var rx_uri_domain = "(?:[\\d\\w.-]+)\\.(?:\\w{2,6})";
    var rx_uri_path = "(?:/[\\d\\w\\#\\%\\&\\-\\.\\,\\/\\:\\=\\?\\~]+)*";
    var rx_uri = new RegExp("^" +
        rx_uri_protocol + rx_uri_domain + rx_uri_path
    );

    var rx_strong = /^\*\*[^\*\s](?:[^\*]*[^\*\s])?\*\*(\s+|$)/;
    var rx_emphasis = /^[^\*]\*[^\*\s](?:[^\*]*[^\*\s])?\*(\s+|$)/;
    var rx_literal = /^``[^`\s](?:[^`]*[^`\s])``(\s+|$)/;

    var rx_number = /^(?:[\d]+(?:[\.,]\d+)*)/;
    var rx_positive = /^(?:\s\+[\d]+(?:[\.,]\d+)*)/;
    var rx_negative = /^(?:\s\-[\d]+(?:[\.,]\d+)*)/;

    var overlay = {
        token: function (stream) {

            if (stream.match(rx_uri)) return 'link';
            if (stream.match(rx_strong)) return 'strong';
            if (stream.match(rx_emphasis)) return 'em';
            if (stream.match(rx_literal)) return 'string-2';
            if (stream.match(rx_number)) return 'number';
            if (stream.match(rx_positive)) return 'positive';
            if (stream.match(rx_negative)) return 'negative';

            while (stream.next() != null) {
                if (stream.match(rx_uri, false)) break;
                if (stream.match(rx_strong, false)) break;
                if (stream.match(rx_emphasis, false)) break;
                if (stream.match(rx_literal, false)) break;
                if (stream.match(rx_number, false)) break;
                if (stream.match(rx_positive, false)) break;
                if (stream.match(rx_negative, false)) break;
            }

            return null;
        }
    };

    var mode = CodeMirror.getMode(
        config, options.backdrop || 'rst-base'
    );

    return CodeMirror.overlayMode(mode, overlay, true); // combine
}, 'python', 'stex');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

CodeMirror.defineMIME('text/x-rst', 'rst');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////
/**
 * Author: Koh Zi Han, based on implementation by Koh Zi Chun
 */
CodeMirror.defineMode("scheme", function () {
    var BUILTIN = "builtin", COMMENT = "comment", STRING = "string",
        ATOM = "atom", NUMBER = "number", BRACKET = "bracket";
    var INDENT_WORD_SKIP = 2;

    function makeKeywords(str) {
        var obj = {}, words = str.split(" ");
        for (var i = 0; i < words.length; ++i) obj[words[i]] = true;
        return obj;
    }

    var keywords = makeKeywords("λ case-lambda call/cc class define-class exit-handler field import inherit init-field interface let*-values let-values let/ec mixin opt-lambda override protect provide public rename require require-for-syntax syntax syntax-case syntax-error unit/sig unless when with-syntax and begin call-with-current-continuation call-with-input-file call-with-output-file case cond define define-syntax delay do dynamic-wind else for-each if lambda let let* let-syntax letrec letrec-syntax map or syntax-rules abs acos angle append apply asin assoc assq assv atan boolean? caar cadr call-with-input-file call-with-output-file call-with-values car cdddar cddddr cdr ceiling char->integer char-alphabetic? char-ci<=? char-ci<? char-ci=? char-ci>=? char-ci>? char-downcase char-lower-case? char-numeric? char-ready? char-upcase char-upper-case? char-whitespace? char<=? char<? char=? char>=? char>? char? close-input-port close-output-port complex? cons cos current-input-port current-output-port denominator display eof-object? eq? equal? eqv? eval even? exact->inexact exact? exp expt #f floor force gcd imag-part inexact->exact inexact? input-port? integer->char integer? interaction-environment lcm length list list->string list->vector list-ref list-tail list? load log magnitude make-polar make-rectangular make-string make-vector max member memq memv min modulo negative? newline not null-environment null? number->string number? numerator odd? open-input-file open-output-file output-port? pair? peek-char port? positive? procedure? quasiquote quote quotient rational? rationalize read read-char real-part real? remainder reverse round scheme-report-environment set! set-car! set-cdr! sin sqrt string string->list string->number string->symbol string-append string-ci<=? string-ci<? string-ci=? string-ci>=? string-ci>? string-copy string-fill! string-length string-ref string-set! string<=? string<? string=? string>=? string>? string? substring symbol->string symbol? #t tan transcript-off transcript-on truncate values vector vector->list vector-fill! vector-length vector-ref vector-set! with-input-from-file with-output-to-file write write-char zero?");
    var indentKeys = makeKeywords("define let letrec let* lambda");

    function stateStack(indent, type, prev) { // represents a state stack object
        this.indent = indent;
        this.type = type;
        this.prev = prev;
    }

    function pushStack(state, indent, type) {
        state.indentStack = new stateStack(indent, type, state.indentStack);
    }

    function popStack(state) {
        state.indentStack = state.indentStack.prev;
    }

    var binaryMatcher = new RegExp(/^(?:[-+]i|[-+][01]+#*(?:\/[01]+#*)?i|[-+]?[01]+#*(?:\/[01]+#*)?@[-+]?[01]+#*(?:\/[01]+#*)?|[-+]?[01]+#*(?:\/[01]+#*)?[-+](?:[01]+#*(?:\/[01]+#*)?)?i|[-+]?[01]+#*(?:\/[01]+#*)?)(?=[()\s;"]|$)/i);
    var octalMatcher = new RegExp(/^(?:[-+]i|[-+][0-7]+#*(?:\/[0-7]+#*)?i|[-+]?[0-7]+#*(?:\/[0-7]+#*)?@[-+]?[0-7]+#*(?:\/[0-7]+#*)?|[-+]?[0-7]+#*(?:\/[0-7]+#*)?[-+](?:[0-7]+#*(?:\/[0-7]+#*)?)?i|[-+]?[0-7]+#*(?:\/[0-7]+#*)?)(?=[()\s;"]|$)/i);
    var hexMatcher = new RegExp(/^(?:[-+]i|[-+][\da-f]+#*(?:\/[\da-f]+#*)?i|[-+]?[\da-f]+#*(?:\/[\da-f]+#*)?@[-+]?[\da-f]+#*(?:\/[\da-f]+#*)?|[-+]?[\da-f]+#*(?:\/[\da-f]+#*)?[-+](?:[\da-f]+#*(?:\/[\da-f]+#*)?)?i|[-+]?[\da-f]+#*(?:\/[\da-f]+#*)?)(?=[()\s;"]|$)/i);
    var decimalMatcher = new RegExp(/^(?:[-+]i|[-+](?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*)i|[-+]?(?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*)@[-+]?(?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*)|[-+]?(?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*)[-+](?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*)?i|(?:(?:(?:\d+#+\.?#*|\d+\.\d*#*|\.\d+#*|\d+)(?:[esfdl][-+]?\d+)?)|\d+#*\/\d+#*))(?=[()\s;"]|$)/i);

    function isBinaryNumber (stream) {
        return stream.match(binaryMatcher);
    }

    function isOctalNumber (stream) {
        return stream.match(octalMatcher);
    }

    function isDecimalNumber (stream, backup) {
        if (backup === true) {
            stream.backUp(1);
        }
        return stream.match(decimalMatcher);
    }

    function isHexNumber (stream) {
        return stream.match(hexMatcher);
    }

    return {
        startState: function () {
            return {
                indentStack: null,
                indentation: 0,
                mode: false,
                sExprComment: false
            };
        },

        token: function (stream, state) {
            if (state.indentStack == null && stream.sol()) {
                // update indentation, but only if indentStack is empty
                state.indentation = stream.indentation();
            }

            // skip spaces
            if (stream.eatSpace()) {
                return null;
            }
            var returnType = null;

            switch(state.mode){
                case "string": // multi-line string parsing mode
                    var next, escaped = false;
                    while ((next = stream.next()) != null) {
                        if (next == "\"" && !escaped) {

                            state.mode = false;
                            break;
                        }
                        escaped = !escaped && next == "\\";
                    }
                    returnType = STRING; // continue on in scheme-string mode
                    break;
                case "comment": // comment parsing mode
                    var next, maybeEnd = false;
                    while ((next = stream.next()) != null) {
                        if (next == "#" && maybeEnd) {

                            state.mode = false;
                            break;
                        }
                        maybeEnd = (next == "|");
                    }
                    returnType = COMMENT;
                    break;
                case "s-expr-comment": // s-expr commenting mode
                    state.mode = false;
                    if(stream.peek() == "(" || stream.peek() == "["){
                        // actually start scheme s-expr commenting mode
                        state.sExprComment = 0;
                    }else{
                        // if not we just comment the entire of the next token
                        stream.eatWhile(/[^/s]/); // eat non spaces
                        returnType = COMMENT;
                        break;
                    }
                default: // default parsing mode
                    var ch = stream.next();

                    if (ch == "\"") {
                        state.mode = "string";
                        returnType = STRING;

                    } else if (ch == "'") {
                        returnType = ATOM;
                    } else if (ch == '#') {
                        if (stream.eat("|")) {                    // Multi-line comment
                            state.mode = "comment"; // toggle to comment mode
                            returnType = COMMENT;
                        } else if (stream.eat(/[tf]/i)) {            // #t/#f (atom)
                            returnType = ATOM;
                        } else if (stream.eat(';')) {                // S-Expr comment
                            state.mode = "s-expr-comment";
                            returnType = COMMENT;
                        } else {
                            var numTest = null, hasExactness = false, hasRadix = true;
                            if (stream.eat(/[ei]/i)) {
                                hasExactness = true;
                            } else {
                                stream.backUp(1);       // must be radix specifier
                            }
                            if (stream.match(/^#b/i)) {
                                numTest = isBinaryNumber;
                            } else if (stream.match(/^#o/i)) {
                                numTest = isOctalNumber;
                            } else if (stream.match(/^#x/i)) {
                                numTest = isHexNumber;
                            } else if (stream.match(/^#d/i)) {
                                numTest = isDecimalNumber;
                            } else if (stream.match(/^[-+0-9.]/, false)) {
                                hasRadix = false;
                                numTest = isDecimalNumber;
                            // re-consume the intial # if all matches failed
                            } else if (!hasExactness) {
                                stream.eat('#');
                            }
                            if (numTest != null) {
                                if (hasRadix && !hasExactness) {
                                    // consume optional exactness after radix
                                    stream.match(/^#[ei]/i);
                                }
                                if (numTest(stream))
                                    returnType = NUMBER;
                            }
                        }
                    } else if (/^[-+0-9.]/.test(ch) && isDecimalNumber(stream, true)) { // match non-prefixed number, must be decimal
                        returnType = NUMBER;
                    } else if (ch == ";") { // comment
                        stream.skipToEnd(); // rest of the line is a comment
                        returnType = COMMENT;
                    } else if (ch == "(" || ch == "[") {
                      var keyWord = ''; var indentTemp = stream.column(), letter;
                        /**
                        Either
                        (indent-word ..
                        (non-indent-word ..
                        (;something else, bracket, etc.
                        */

                        while ((letter = stream.eat(/[^\s\(\[\;\)\]]/)) != null) {
                            keyWord += letter;
                        }

                        if (keyWord.length > 0 && indentKeys.propertyIsEnumerable(keyWord)) { // indent-word

                            pushStack(state, indentTemp + INDENT_WORD_SKIP, ch);
                        } else { // non-indent word
                            // we continue eating the spaces
                            stream.eatSpace();
                            if (stream.eol() || stream.peek() == ";") {
                                // nothing significant after
                                // we restart indentation 1 space after
                                pushStack(state, indentTemp + 1, ch);
                            } else {
                                pushStack(state, indentTemp + stream.current().length, ch); // else we match
                            }
                        }
                        stream.backUp(stream.current().length - 1); // undo all the eating

                        if(typeof state.sExprComment == "number") state.sExprComment++;

                        returnType = BRACKET;
                    } else if (ch == ")" || ch == "]") {
                        returnType = BRACKET;
                        if (state.indentStack != null && state.indentStack.type == (ch == ")" ? "(" : "[")) {
                            popStack(state);

                            if(typeof state.sExprComment == "number"){
                                if(--state.sExprComment == 0){
                                    returnType = COMMENT; // final closing bracket
                                    state.sExprComment = false; // turn off s-expr commenting mode
                                }
                            }
                        }
                    } else {
                        stream.eatWhile(/[\w\$_\-!$%&*+\.\/:<=>?@\^~]/);

                        if (keywords && keywords.propertyIsEnumerable(stream.current())) {
                            returnType = BUILTIN;
                        } else returnType = "variable";
                    }
            }
            return (typeof state.sExprComment == "number") ? COMMENT : returnType;
        },

        indent: function (state) {
            if (state.indentStack == null) return state.indentation;
            return state.indentStack.indent;
        },

        lineComment: ";;"
    };
});

CodeMirror.defineMIME("text/x-scheme", "scheme");
CodeMirror.defineMode('smalltalk', function(config) {

  var specialChars = /[+\-\/\\*~<>=@%|&?!.,:;^]/;
  var keywords = /true|false|nil|self|super|thisContext/;

  var Context = function(tokenizer, parent) {
    this.next = tokenizer;
    this.parent = parent;
  };

  var Token = function(name, context, eos) {
    this.name = name;
    this.context = context;
    this.eos = eos;
  };

  var State = function() {
    this.context = new Context(next, null);
    this.expectVariable = true;
    this.indentation = 0;
    this.userIndentationDelta = 0;
  };

  State.prototype.userIndent = function(indentation) {
    this.userIndentationDelta = indentation > 0 ? (indentation / config.indentUnit - this.indentation) : 0;
  };

  var next = function(stream, context, state) {
    var token = new Token(null, context, false);
    var aChar = stream.next();

    if (aChar === '"') {
      token = nextComment(stream, new Context(nextComment, context));

    } else if (aChar === '\'') {
      token = nextString(stream, new Context(nextString, context));

    } else if (aChar === '#') {
      stream.eatWhile(/[^ .\[\]()]/);
      token.name = 'string-2';

    } else if (aChar === '$') {
      if (stream.next() === '<') {
        stream.eatWhile(/[^ >]/);
        stream.next();
      }
      token.name = 'string-2';

    } else if (aChar === '|' && state.expectVariable) {
      token.context = new Context(nextTemporaries, context);

    } else if (/[\[\]{}()]/.test(aChar)) {
      token.name = 'bracket';
      token.eos = /[\[{(]/.test(aChar);

      if (aChar === '[') {
        state.indentation++;
      } else if (aChar === ']') {
        state.indentation = Math.max(0, state.indentation - 1);
      }

    } else if (specialChars.test(aChar)) {
      stream.eatWhile(specialChars);
      token.name = 'operator';
      token.eos = aChar !== ';'; // ; cascaded message expression

    } else if (/\d/.test(aChar)) {
      stream.eatWhile(/[\w\d]/);
      token.name = 'number';

    } else if (/[\w_]/.test(aChar)) {
      stream.eatWhile(/[\w\d_]/);
      token.name = state.expectVariable ? (keywords.test(stream.current()) ? 'keyword' : 'variable') : null;

    } else {
      token.eos = state.expectVariable;
    }

    return token;
  };

  var nextComment = function(stream, context) {
    stream.eatWhile(/[^"]/);
    return new Token('comment', stream.eat('"') ? context.parent : context, true);
  };

  var nextString = function(stream, context) {
    stream.eatWhile(/[^']/);
    return new Token('string', stream.eat('\'') ? context.parent : context, false);
  };

  var nextTemporaries = function(stream, context) {
    var token = new Token(null, context, false);
    var aChar = stream.next();

    if (aChar === '|') {
      token.context = context.parent;
      token.eos = true;

    } else {
      stream.eatWhile(/[^|]/);
      token.name = 'variable';
    }

    return token;
  };

  return {
    startState: function() {
      return new State;
    },

    token: function(stream, state) {
      state.userIndent(stream.indentation());

      if (stream.eatSpace()) {
        return null;
      }

      var token = state.context.next(stream, state.context, state);
      state.context = token.context;
      state.expectVariable = token.eos;

      return token.name;
    },

    blankLine: function(state) {
      state.userIndent(0);
    },

    indent: function(state, textAfter) {
      var i = state.context.next === next && textAfter && textAfter.charAt(0) === ']' ? -1 : state.userIndentationDelta;
      return (state.indentation + i) * config.indentUnit;
    },

    electricChars: ']'
  };

});

CodeMirror.defineMIME('text/x-stsrc', {name: 'smalltalk'});
CodeMirror.defineMode("sparql", function(config) {
  var indentUnit = config.indentUnit;
  var curPunc;

  function wordRegexp(words) {
    return new RegExp("^(?:" + words.join("|") + ")$", "i");
  }
  var ops = wordRegexp(["str", "lang", "langmatches", "datatype", "bound", "sameterm", "isiri", "isuri",
                        "isblank", "isliteral", "union", "a"]);
  var keywords = wordRegexp(["base", "prefix", "select", "distinct", "reduced", "construct", "describe",
                             "ask", "from", "named", "where", "order", "limit", "offset", "filter", "optional",
                             "graph", "by", "asc", "desc"]);
  var operatorChars = /[*+\-<>=&|]/;

  function tokenBase(stream, state) {
    var ch = stream.next();
    curPunc = null;
    if (ch == "$" || ch == "?") {
      stream.match(/^[\w\d]*/);
      return "variable-2";
    }
    else if (ch == "<" && !stream.match(/^[\s\u00a0=]/, false)) {
      stream.match(/^[^\s\u00a0>]*>?/);
      return "atom";
    }
    else if (ch == "\"" || ch == "'") {
      state.tokenize = tokenLiteral(ch);
      return state.tokenize(stream, state);
    }
    else if (/[{}\(\),\.;\[\]]/.test(ch)) {
      curPunc = ch;
      return null;
    }
    else if (ch == "#") {
      stream.skipToEnd();
      return "comment";
    }
    else if (operatorChars.test(ch)) {
      stream.eatWhile(operatorChars);
      return null;
    }
    else if (ch == ":") {
      stream.eatWhile(/[\w\d\._\-]/);
      return "atom";
    }
    else {
      stream.eatWhile(/[_\w\d]/);
      if (stream.eat(":")) {
        stream.eatWhile(/[\w\d_\-]/);
        return "atom";
      }
      var word = stream.current();
      if (ops.test(word))
        return null;
      else if (keywords.test(word))
        return "keyword";
      else
        return "variable";
    }
  }

  function tokenLiteral(quote) {
    return function(stream, state) {
      var escaped = false, ch;
      while ((ch = stream.next()) != null) {
        if (ch == quote && !escaped) {
          state.tokenize = tokenBase;
          break;
        }
        escaped = !escaped && ch == "\\";
      }
      return "string";
    };
  }

  function pushContext(state, type, col) {
    state.context = {prev: state.context, indent: state.indent, col: col, type: type};
  }
  function popContext(state) {
    state.indent = state.context.indent;
    state.context = state.context.prev;
  }

  return {
    startState: function() {
      return {tokenize: tokenBase,
              context: null,
              indent: 0,
              col: 0};
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (state.context && state.context.align == null) state.context.align = false;
        state.indent = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);

      if (style != "comment" && state.context && state.context.align == null && state.context.type != "pattern") {
        state.context.align = true;
      }

      if (curPunc == "(") pushContext(state, ")", stream.column());
      else if (curPunc == "[") pushContext(state, "]", stream.column());
      else if (curPunc == "{") pushContext(state, "}", stream.column());
      else if (/[\]\}\)]/.test(curPunc)) {
        while (state.context && state.context.type == "pattern") popContext(state);
        if (state.context && curPunc == state.context.type) popContext(state);
      }
      else if (curPunc == "." && state.context && state.context.type == "pattern") popContext(state);
      else if (/atom|string|variable/.test(style) && state.context) {
        if (/[\}\]]/.test(state.context.type))
          pushContext(state, "pattern", stream.column());
        else if (state.context.type == "pattern" && !state.context.align) {
          state.context.align = true;
          state.context.col = stream.column();
        }
      }

      return style;
    },

    indent: function(state, textAfter) {
      var firstChar = textAfter && textAfter.charAt(0);
      var context = state.context;
      if (/[\]\}]/.test(firstChar))
        while (context && context.type == "pattern") context = context.prev;

      var closing = context && firstChar == context.type;
      if (!context)
        return 0;
      else if (context.type == "pattern")
        return context.col;
      else if (context.align)
        return context.col + (closing ? 0 : 1);
      else
        return context.indent + (closing ? 0 : indentUnit);
    }
  };
});

CodeMirror.defineMIME("application/x-sparql-query", "sparql");
/*
 * Author: Constantin Jucovschi (c.jucovschi@jacobs-university.de)
 * Licence: MIT
 */

CodeMirror.defineMode("stex", function() {
    "use strict";

    function pushCommand(state, command) {
        state.cmdState.push(command);
    }

    function peekCommand(state) {
        if (state.cmdState.length > 0) {
            return state.cmdState[state.cmdState.length - 1];
        } else {
            return null;
        }
    }

    function popCommand(state) {
        var plug = state.cmdState.pop();
        if (plug) {
            plug.closeBracket();
        }
    }

    // returns the non-default plugin closest to the end of the list
    function getMostPowerful(state) {
        var context = state.cmdState;
        for (var i = context.length - 1; i >= 0; i--) {
            var plug = context[i];
            if (plug.name == "DEFAULT") {
                continue;
            }
            return plug;
        }
        return { styleIdentifier: function() { return null; } };
    }

    function addPluginPattern(pluginName, cmdStyle, styles) {
        return function () {
            this.name = pluginName;
            this.bracketNo = 0;
            this.style = cmdStyle;
            this.styles = styles;
            this.argument = null;   // \begin and \end have arguments that follow. These are stored in the plugin

            this.styleIdentifier = function() {
                return this.styles[this.bracketNo - 1] || null;
            };
            this.openBracket = function() {
                this.bracketNo++;
                return "bracket";
            };
            this.closeBracket = function() {};
        };
    }

    var plugins = {};

    plugins["importmodule"] = addPluginPattern("importmodule", "tag", ["string", "builtin"]);
    plugins["documentclass"] = addPluginPattern("documentclass", "tag", ["", "atom"]);
    plugins["usepackage"] = addPluginPattern("usepackage", "tag", ["atom"]);
    plugins["begin"] = addPluginPattern("begin", "tag", ["atom"]);
    plugins["end"] = addPluginPattern("end", "tag", ["atom"]);

    plugins["DEFAULT"] = function () {
        this.name = "DEFAULT";
        this.style = "tag";

        this.styleIdentifier = this.openBracket = this.closeBracket = function() {};
    };

    function setState(state, f) {
        state.f = f;
    }

    // called when in a normal (no environment) context
    function normal(source, state) {
        var plug;
        // Do we look like '\command' ?  If so, attempt to apply the plugin 'command'
        if (source.match(/^\\[a-zA-Z@]+/)) {
            var cmdName = source.current().slice(1);
            plug = plugins[cmdName] || plugins["DEFAULT"];
            plug = new plug();
            pushCommand(state, plug);
            setState(state, beginParams);
            return plug.style;
        }

        // escape characters
        if (source.match(/^\\[$&%#{}_]/)) {
          return "tag";
        }

        // white space control characters
        if (source.match(/^\\[,;!\/\\]/)) {
          return "tag";
        }

        // find if we're starting various math modes
        if (source.match("\\[")) {
            setState(state, function(source, state){ return inMathMode(source, state, "\\]"); });
            return "keyword";
        }
        if (source.match("$$")) {
            setState(state, function(source, state){ return inMathMode(source, state, "$$"); });
            return "keyword";
        }
        if (source.match("$")) {
            setState(state, function(source, state){ return inMathMode(source, state, "$"); });
            return "keyword";
        }

        var ch = source.next();
        if (ch == "%") {
            // special case: % at end of its own line; stay in same state
            if (!source.eol()) {
              setState(state, inCComment);
            }
            return "comment";
        }
        else if (ch == '}' || ch == ']') {
            plug = peekCommand(state);
            if (plug) {
                plug.closeBracket(ch);
                setState(state, beginParams);
            } else {
                return "error";
            }
            return "bracket";
        } else if (ch == '{' || ch == '[') {
            plug = plugins["DEFAULT"];
            plug = new plug();
            pushCommand(state, plug);
            return "bracket";
        }
        else if (/\d/.test(ch)) {
            source.eatWhile(/[\w.%]/);
            return "atom";
        }
        else {
            source.eatWhile(/[\w\-_]/);
            plug = getMostPowerful(state);
            if (plug.name == 'begin') {
                plug.argument = source.current();
            }
            return plug.styleIdentifier();
        }
    }

    function inCComment(source, state) {
        source.skipToEnd();
        setState(state, normal);
        return "comment";
    }

    function inMathMode(source, state, endModeSeq) {
        if (source.eatSpace()) {
            return null;
        }
        if (source.match(endModeSeq)) {
            setState(state, normal);
            return "keyword";
        }
        if (source.match(/^\\[a-zA-Z@]+/)) {
            return "tag";
        }
        if (source.match(/^[a-zA-Z]+/)) {
            return "variable-2";
        }
        // escape characters
        if (source.match(/^\\[$&%#{}_]/)) {
          return "tag";
        }
        // white space control characters
        if (source.match(/^\\[,;!\/]/)) {
          return "tag";
        }
        // special math-mode characters
        if (source.match(/^[\^_&]/)) {
          return "tag";
        }
        // non-special characters
        if (source.match(/^[+\-<>|=,\/@!*:;'"`~#?]/)) {
            return null;
        }
        if (source.match(/^(\d+\.\d*|\d*\.\d+|\d+)/)) {
          return "number";
        }
        var ch = source.next();
        if (ch == "{" || ch == "}" || ch == "[" || ch == "]" || ch == "(" || ch == ")") {
            return "bracket";
        }

        // eat comments here, because inCComment returns us to normal state!
        if (ch == "%") {
            if (!source.eol()) {
                source.skipToEnd();
            }
            return "comment";
        }
        return "error";
    }

    function beginParams(source, state) {
        var ch = source.peek(), lastPlug;
        if (ch == '{' || ch == '[') {
            lastPlug = peekCommand(state);
            lastPlug.openBracket(ch);
            source.eat(ch);
            setState(state, normal);
            return "bracket";
        }
        if (/[ \t\r]/.test(ch)) {
            source.eat(ch);
            return null;
        }
        setState(state, normal);
        popCommand(state);

        return normal(source, state);
    }

    return {
        startState: function() {
            return {
                cmdState: [],
                f: normal
            };
        },
        copyState: function(s) {
            return {
                cmdState: s.cmdState.slice(),
                f: s.f
            };
        },
        token: function(stream, state) {
            return state.f(stream, state);
        }
    };
});

CodeMirror.defineMIME("text/x-stex", "stex");
CodeMirror.defineMIME("text/x-latex", "stex");
CodeMirror.defineMode("xml", function(config, parserConfig) {
  var indentUnit = config.indentUnit;
  var multilineTagIndentFactor = parserConfig.multilineTagIndentFactor || 1;

  var Kludges = parserConfig.htmlMode ? {
    autoSelfClosers: {'area': true, 'base': true, 'br': true, 'col': true, 'command': true,
                      'embed': true, 'frame': true, 'hr': true, 'img': true, 'input': true,
                      'keygen': true, 'link': true, 'meta': true, 'param': true, 'source': true,
                      'track': true, 'wbr': true},
    implicitlyClosed: {'dd': true, 'li': true, 'optgroup': true, 'option': true, 'p': true,
                       'rp': true, 'rt': true, 'tbody': true, 'td': true, 'tfoot': true,
                       'th': true, 'tr': true},
    contextGrabbers: {
      'dd': {'dd': true, 'dt': true},
      'dt': {'dd': true, 'dt': true},
      'li': {'li': true},
      'option': {'option': true, 'optgroup': true},
      'optgroup': {'optgroup': true},
      'p': {'address': true, 'article': true, 'aside': true, 'blockquote': true, 'dir': true,
            'div': true, 'dl': true, 'fieldset': true, 'footer': true, 'form': true,
            'h1': true, 'h2': true, 'h3': true, 'h4': true, 'h5': true, 'h6': true,
            'header': true, 'hgroup': true, 'hr': true, 'menu': true, 'nav': true, 'ol': true,
            'p': true, 'pre': true, 'section': true, 'table': true, 'ul': true},
      'rp': {'rp': true, 'rt': true},
      'rt': {'rp': true, 'rt': true},
      'tbody': {'tbody': true, 'tfoot': true},
      'td': {'td': true, 'th': true},
      'tfoot': {'tbody': true},
      'th': {'td': true, 'th': true},
      'thead': {'tbody': true, 'tfoot': true},
      'tr': {'tr': true}
    },
    doNotIndent: {"pre": true},
    allowUnquoted: true,
    allowMissing: true
  } : {
    autoSelfClosers: {},
    implicitlyClosed: {},
    contextGrabbers: {},
    doNotIndent: {},
    allowUnquoted: false,
    allowMissing: false
  };
  var alignCDATA = parserConfig.alignCDATA;

  // Return variables for tokenizers
  var tagName, type;

  function inText(stream, state) {
    function chain(parser) {
      state.tokenize = parser;
      return parser(stream, state);
    }

    var ch = stream.next();
    if (ch == "<") {
      if (stream.eat("!")) {
        if (stream.eat("[")) {
          if (stream.match("CDATA[")) return chain(inBlock("atom", "]]>"));
          else return null;
        }
        else if (stream.match("--")) return chain(inBlock("comment", "-->"));
        else if (stream.match("DOCTYPE", true, true)) {
          stream.eatWhile(/[\w\._\-]/);
          return chain(doctype(1));
        }
        else return null;
      }
      else if (stream.eat("?")) {
        stream.eatWhile(/[\w\._\-]/);
        state.tokenize = inBlock("meta", "?>");
        return "meta";
      }
      else {
        var isClose = stream.eat("/");
        tagName = "";
        var c;
        while ((c = stream.eat(/[^\s\u00a0=<>\"\'\/?]/))) tagName += c;
        if (!tagName) return "error";
        type = isClose ? "closeTag" : "openTag";
        state.tokenize = inTag;
        return "tag";
      }
    }
    else if (ch == "&") {
      var ok;
      if (stream.eat("#")) {
        if (stream.eat("x")) {
          ok = stream.eatWhile(/[a-fA-F\d]/) && stream.eat(";");
        } else {
          ok = stream.eatWhile(/[\d]/) && stream.eat(";");
        }
      } else {
        ok = stream.eatWhile(/[\w\.\-:]/) && stream.eat(";");
      }
      return ok ? "atom" : "error";
    }
    else {
      stream.eatWhile(/[^&<]/);
      return null;
    }
  }

  function inTag(stream, state) {
    var ch = stream.next();
    if (ch == ">" || (ch == "/" && stream.eat(">"))) {
      state.tokenize = inText;
      type = ch == ">" ? "endTag" : "selfcloseTag";
      return "tag";
    }
    else if (ch == "=") {
      type = "equals";
      return null;
    }
    else if (/[\'\"]/.test(ch)) {
      state.tokenize = inAttribute(ch);
      return state.tokenize(stream, state);
    }
    else {
      stream.eatWhile(/[^\s\u00a0=<>\"\']/);
      return "word";
    }
  }

  function inAttribute(quote) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.next() == quote) {
          state.tokenize = inTag;
          break;
        }
      }
      return "string";
    };
  }

  function inBlock(style, terminator) {
    return function(stream, state) {
      while (!stream.eol()) {
        if (stream.match(terminator)) {
          state.tokenize = inText;
          break;
        }
        stream.next();
      }
      return style;
    };
  }
  function doctype(depth) {
    return function(stream, state) {
      var ch;
      while ((ch = stream.next()) != null) {
        if (ch == "<") {
          state.tokenize = doctype(depth + 1);
          return state.tokenize(stream, state);
        } else if (ch == ">") {
          if (depth == 1) {
            state.tokenize = inText;
            break;
          } else {
            state.tokenize = doctype(depth - 1);
            return state.tokenize(stream, state);
          }
        }
      }
      return "meta";
    };
  }

  var curState, curStream, setStyle;
  function pass() {
    for (var i = arguments.length - 1; i >= 0; i--) curState.cc.push(arguments[i]);
  }
  function cont() {
    pass.apply(null, arguments);
    return true;
  }

  function pushContext(tagName, startOfLine) {
    var noIndent = Kludges.doNotIndent.hasOwnProperty(tagName) || (curState.context && curState.context.noIndent);
    curState.context = {
      prev: curState.context,
      tagName: tagName,
      indent: curState.indented,
      startOfLine: startOfLine,
      noIndent: noIndent
    };
  }
  function popContext() {
    if (curState.context) curState.context = curState.context.prev;
  }

  function element(type) {
    if (type == "openTag") {
      curState.tagName = tagName;
      curState.tagStart = curStream.column();
      return cont(attributes, endtag(curState.startOfLine));
    } else if (type == "closeTag") {
      var err = false;
      if (curState.context) {
        if (curState.context.tagName != tagName) {
          if (Kludges.implicitlyClosed.hasOwnProperty(curState.context.tagName.toLowerCase())) {
            popContext();
          }
          err = !curState.context || curState.context.tagName != tagName;
        }
      } else {
        err = true;
      }
      if (err) setStyle = "error";
      return cont(endclosetag(err));
    }
    return cont();
  }
  function endtag(startOfLine) {
    return function(type) {
      var tagName = curState.tagName;
      curState.tagName = curState.tagStart = null;
      if (type == "selfcloseTag" ||
          (type == "endTag" && Kludges.autoSelfClosers.hasOwnProperty(tagName.toLowerCase()))) {
        maybePopContext(tagName.toLowerCase());
        return cont();
      }
      if (type == "endTag") {
        maybePopContext(tagName.toLowerCase());
        pushContext(tagName, startOfLine);
        return cont();
      }
      return cont();
    };
  }
  function endclosetag(err) {
    return function(type) {
      if (err) setStyle = "error";
      if (type == "endTag") { popContext(); return cont(); }
      setStyle = "error";
      return cont(arguments.callee);
    };
  }
  function maybePopContext(nextTagName) {
    var parentTagName;
    while (true) {
      if (!curState.context) {
        return;
      }
      parentTagName = curState.context.tagName.toLowerCase();
      if (!Kludges.contextGrabbers.hasOwnProperty(parentTagName) ||
          !Kludges.contextGrabbers[parentTagName].hasOwnProperty(nextTagName)) {
        return;
      }
      popContext();
    }
  }

  function attributes(type) {
    if (type == "word") {setStyle = "attribute"; return cont(attribute, attributes);}
    if (type == "endTag" || type == "selfcloseTag") return pass();
    setStyle = "error";
    return cont(attributes);
  }
  function attribute(type) {
    if (type == "equals") return cont(attvalue, attributes);
    if (!Kludges.allowMissing) setStyle = "error";
    else if (type == "word") setStyle = "attribute";
    return (type == "endTag" || type == "selfcloseTag") ? pass() : cont();
  }
  function attvalue(type) {
    if (type == "string") return cont(attvaluemaybe);
    if (type == "word" && Kludges.allowUnquoted) {setStyle = "string"; return cont();}
    setStyle = "error";
    return (type == "endTag" || type == "selfCloseTag") ? pass() : cont();
  }
  function attvaluemaybe(type) {
    if (type == "string") return cont(attvaluemaybe);
    else return pass();
  }

  return {
    startState: function() {
      return {tokenize: inText, cc: [], indented: 0, startOfLine: true, tagName: null, tagStart: null, context: null};
    },

    token: function(stream, state) {
      if (!state.tagName && stream.sol()) {
        state.startOfLine = true;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;

      setStyle = type = tagName = null;
      var style = state.tokenize(stream, state);
      state.type = type;
      if ((style || type) && style != "comment") {
        curState = state; curStream = stream;
        while (true) {
          var comb = state.cc.pop() || element;
          if (comb(type || style)) break;
        }
      }
      state.startOfLine = false;
      return setStyle || style;
    },

    indent: function(state, textAfter, fullLine) {
      var context = state.context;
      if ((state.tokenize != inTag && state.tokenize != inText) ||
          context && context.noIndent)
        return fullLine ? fullLine.match(/^(\s*)/)[0].length : 0;
      if (state.tagName) return state.tagStart + indentUnit * multilineTagIndentFactor;
      if (alignCDATA && /<!\[CDATA\[/.test(textAfter)) return 0;
      if (context && /^<\//.test(textAfter))
        context = context.prev;
      while (context && !context.startOfLine)
        context = context.prev;
      if (context) return context.indent + indentUnit;
      else return 0;
    },

    electricChars: "/",
    blockCommentStart: "<!--",
    blockCommentEnd: "-->",

    configuration: parserConfig.htmlMode ? "html" : "xml"
  };
});

CodeMirror.defineMIME("text/xml", "xml");
CodeMirror.defineMIME("application/xml", "xml");
if (!CodeMirror.mimeModes.hasOwnProperty("text/html"))
  CodeMirror.defineMIME("text/html", {name: "xml", htmlMode: true});
CodeMirror.defineMode("yaml", function() {

  var cons = ['true', 'false', 'on', 'off', 'yes', 'no'];
  var keywordRegex = new RegExp("\\b(("+cons.join(")|(")+"))$", 'i');

  return {
    token: function(stream, state) {
      var ch = stream.peek();
      var esc = state.escaped;
      state.escaped = false;
      /* comments */
      if (ch == "#" && (stream.pos == 0 || /\s/.test(stream.string.charAt(stream.pos - 1)))) {
        stream.skipToEnd(); return "comment";
      }
      if (state.literal && stream.indentation() > state.keyCol) {
        stream.skipToEnd(); return "string";
      } else if (state.literal) { state.literal = false; }
      if (stream.sol()) {
        state.keyCol = 0;
        state.pair = false;
        state.pairStart = false;
        /* document start */
        if(stream.match(/---/)) { return "def"; }
        /* document end */
        if (stream.match(/\.\.\./)) { return "def"; }
        /* array list item */
        if (stream.match(/\s*-\s+/)) { return 'meta'; }
      }
      /* pairs (associative arrays) -> key */
      if (!state.pair && stream.match(/^\s*([a-z0-9\._-])+(?=\s*:)/i)) {
        state.pair = true;
        state.keyCol = stream.indentation();
        return "atom";
      }
      if (state.pair && stream.match(/^:\s*/)) { state.pairStart = true; return 'meta'; }

      /* inline pairs/lists */
      if (stream.match(/^(\{|\}|\[|\])/)) {
        if (ch == '{')
          state.inlinePairs++;
        else if (ch == '}')
          state.inlinePairs--;
        else if (ch == '[')
          state.inlineList++;
        else
          state.inlineList--;
        return 'meta';
      }

      /* list seperator */
      if (state.inlineList > 0 && !esc && ch == ',') {
        stream.next();
        return 'meta';
      }
      /* pairs seperator */
      if (state.inlinePairs > 0 && !esc && ch == ',') {
        state.keyCol = 0;
        state.pair = false;
        state.pairStart = false;
        stream.next();
        return 'meta';
      }

      /* start of value of a pair */
      if (state.pairStart) {
        /* block literals */
        if (stream.match(/^\s*(\||\>)\s*/)) { state.literal = true; return 'meta'; };
        /* references */
        if (stream.match(/^\s*(\&|\*)[a-z0-9\._-]+\b/i)) { return 'variable-2'; }
        /* numbers */
        if (state.inlinePairs == 0 && stream.match(/^\s*-?[0-9\.\,]+\s?$/)) { return 'number'; }
        if (state.inlinePairs > 0 && stream.match(/^\s*-?[0-9\.\,]+\s?(?=(,|}))/)) { return 'number'; }
        /* keywords */
        if (stream.match(keywordRegex)) { return 'keyword'; }
      }

      /* nothing found, continue */
      state.pairStart = false;
      state.escaped = (ch == '\\');
      stream.next();
      return null;
    },
    startState: function() {
      return {
        pair: false,
        pairStart: false,
        keyCol: 0,
        inlinePairs: 0,
        inlineList: 0,
        literal: false,
        escaped: false
      };
    }
  };
});

CodeMirror.defineMIME("text/x-yaml", "yaml");
/**
 * Supported keybindings:
 *
 *   Motion:
 *   h, j, k, l
 *   gj, gk
 *   e, E, w, W, b, B, ge, gE
 *   f<character>, F<character>, t<character>, T<character>
 *   $, ^, 0, -, +, _
 *   gg, G
 *   %
 *   '<character>, `<character>
 *
 *   Operator:
 *   d, y, c
 *   dd, yy, cc
 *   g~, g~g~
 *   >, <, >>, <<
 *
 *   Operator-Motion:
 *   x, X, D, Y, C, ~
 *
 *   Action:
 *   a, i, s, A, I, S, o, O
 *   zz, z., z<CR>, zt, zb, z-
 *   J
 *   u, Ctrl-r
 *   m<character>
 *   r<character>
 *
 *   Modes:
 *   ESC - leave insert mode, visual mode, and clear input state.
 *   Ctrl-[, Ctrl-c - same as ESC.
 *
 * Registers: unamed, -, a-z, A-Z, 0-9
 *   (Does not respect the special case for number registers when delete
 *    operator is made with these commands: %, (, ),  , /, ?, n, N, {, } )
 *   TODO: Implement the remaining registers.
 * Marks: a-z, A-Z, and 0-9
 *   TODO: Implement the remaining special marks. They have more complex
 *       behavior.
 *
 * Code structure:
 *  1. Default keymap
 *  2. Variable declarations and short basic helpers
 *  3. Instance (External API) implementation
 *  4. Internal state tracking objects (input state, counter) implementation
 *     and instanstiation
 *  5. Key handler (the main command dispatcher) implementation
 *  6. Motion, operator, and action implementations
 *  7. Helper functions for the key handler, motions, operators, and actions
 *  8. Set up Vim to work as a keymap for CodeMirror.
 */

(function() {
  'use strict';

  var defaultKeymap = [
    // Key to key mapping. This goes first to make it possible to override
    // existing mappings.
    { keys: ['Left'], type: 'keyToKey', toKeys: ['h'] },
    { keys: ['Right'], type: 'keyToKey', toKeys: ['l'] },
    { keys: ['Up'], type: 'keyToKey', toKeys: ['k'] },
    { keys: ['Down'], type: 'keyToKey', toKeys: ['j'] },
    { keys: ['Space'], type: 'keyToKey', toKeys: ['l'] },
    { keys: ['Backspace'], type: 'keyToKey', toKeys: ['h'] },
    { keys: ['Ctrl-Space'], type: 'keyToKey', toKeys: ['W'] },
    { keys: ['Ctrl-Backspace'], type: 'keyToKey', toKeys: ['B'] },
    { keys: ['Shift-Space'], type: 'keyToKey', toKeys: ['w'] },
    { keys: ['Shift-Backspace'], type: 'keyToKey', toKeys: ['b'] },
    { keys: ['Ctrl-n'], type: 'keyToKey', toKeys: ['j'] },
    { keys: ['Ctrl-p'], type: 'keyToKey', toKeys: ['k'] },
    { keys: ['Ctrl-['], type: 'keyToKey', toKeys: ['Esc'] },
    { keys: ['Ctrl-c'], type: 'keyToKey', toKeys: ['Esc'] },
    { keys: ['s'], type: 'keyToKey', toKeys: ['c', 'l'] },
    { keys: ['S'], type: 'keyToKey', toKeys: ['c', 'c'] },
    { keys: ['Home'], type: 'keyToKey', toKeys: ['0'] },
    { keys: ['End'], type: 'keyToKey', toKeys: ['$'] },
    { keys: ['PageUp'], type: 'keyToKey', toKeys: ['Ctrl-b'] },
    { keys: ['PageDown'], type: 'keyToKey', toKeys: ['Ctrl-f'] },
    // Motions
    { keys: ['H'], type: 'motion',
        motion: 'moveToTopLine',
        motionArgs: { linewise: true }},
    { keys: ['M'], type: 'motion',
        motion: 'moveToMiddleLine',
        motionArgs: { linewise: true }},
    { keys: ['L'], type: 'motion',
        motion: 'moveToBottomLine',
        motionArgs: { linewise: true }},
    { keys: ['h'], type: 'motion',
        motion: 'moveByCharacters',
        motionArgs: { forward: false }},
    { keys: ['l'], type: 'motion',
        motion: 'moveByCharacters',
        motionArgs: { forward: true }},
    { keys: ['j'], type: 'motion',
        motion: 'moveByLines',
        motionArgs: { forward: true, linewise: true }},
    { keys: ['k'], type: 'motion',
        motion: 'moveByLines',
        motionArgs: { forward: false, linewise: true }},
    { keys: ['g','j'], type: 'motion',
        motion: 'moveByDisplayLines',
        motionArgs: { forward: true }},
    { keys: ['g','k'], type: 'motion',
        motion: 'moveByDisplayLines',
        motionArgs: { forward: false }},
    { keys: ['w'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: true, wordEnd: false }},
    { keys: ['W'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: true, wordEnd: false, bigWord: true }},
    { keys: ['e'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: true, wordEnd: true, inclusive: true }},
    { keys: ['E'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: true, wordEnd: true, bigWord: true,
            inclusive: true }},
    { keys: ['b'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: false, wordEnd: false }},
    { keys: ['B'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: false, wordEnd: false, bigWord: true }},
    { keys: ['g', 'e'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: false, wordEnd: true, inclusive: true }},
    { keys: ['g', 'E'], type: 'motion',
        motion: 'moveByWords',
        motionArgs: { forward: false, wordEnd: true, bigWord: true,
            inclusive: true }},
    { keys: ['{'], type: 'motion', motion: 'moveByParagraph',
        motionArgs: { forward: false }},
    { keys: ['}'], type: 'motion', motion: 'moveByParagraph',
        motionArgs: { forward: true }},
    { keys: ['Ctrl-f'], type: 'motion',
        motion: 'moveByPage', motionArgs: { forward: true }},
    { keys: ['Ctrl-b'], type: 'motion',
        motion: 'moveByPage', motionArgs: { forward: false }},
    { keys: ['Ctrl-d'], type: 'motion',
        motion: 'moveByScroll',
        motionArgs: { forward: true, explicitRepeat: true }},
    { keys: ['Ctrl-u'], type: 'motion',
        motion: 'moveByScroll',
        motionArgs: { forward: false, explicitRepeat: true }},
    { keys: ['g', 'g'], type: 'motion',
        motion: 'moveToLineOrEdgeOfDocument',
        motionArgs: { forward: false, explicitRepeat: true, linewise: true }},
    { keys: ['G'], type: 'motion',
        motion: 'moveToLineOrEdgeOfDocument',
        motionArgs: { forward: true, explicitRepeat: true, linewise: true }},
    { keys: ['0'], type: 'motion', motion: 'moveToStartOfLine' },
    { keys: ['^'], type: 'motion',
        motion: 'moveToFirstNonWhiteSpaceCharacter' },
    { keys: ['+'], type: 'motion',
        motion: 'moveByLines',
        motionArgs: { forward: true, toFirstChar:true }},
    { keys: ['-'], type: 'motion',
        motion: 'moveByLines',
        motionArgs: { forward: false, toFirstChar:true }},
    { keys: ['_'], type: 'motion',
        motion: 'moveByLines',
        motionArgs: { forward: true, toFirstChar:true, repeatOffset:-1 }},
    { keys: ['$'], type: 'motion',
        motion: 'moveToEol',
        motionArgs: { inclusive: true }},
    { keys: ['%'], type: 'motion',
        motion: 'moveToMatchedSymbol',
        motionArgs: { inclusive: true }},
    { keys: ['f', 'character'], type: 'motion',
        motion: 'moveToCharacter',
        motionArgs: { forward: true , inclusive: true }},
    { keys: ['F', 'character'], type: 'motion',
        motion: 'moveToCharacter',
        motionArgs: { forward: false }},
    { keys: ['t', 'character'], type: 'motion',
        motion: 'moveTillCharacter',
        motionArgs: { forward: true, inclusive: true }},
    { keys: ['T', 'character'], type: 'motion',
        motion: 'moveTillCharacter',
        motionArgs: { forward: false }},
    { keys: [';'], type: 'motion', motion: 'repeatLastCharacterSearch',
        motionArgs: { forward: true }},
    { keys: [','], type: 'motion', motion: 'repeatLastCharacterSearch',
        motionArgs: { forward: false }},
    { keys: ['\'', 'character'], type: 'motion', motion: 'goToMark' },
    { keys: ['`', 'character'], type: 'motion', motion: 'goToMark' },
    { keys: [']', '`',], type: 'motion', motion: 'jumpToMark', motionArgs: { forward: true } },
    { keys: ['[', '`',], type: 'motion', motion: 'jumpToMark', motionArgs: { forward: false } },
    { keys: [']', '\''], type: 'motion', motion: 'jumpToMark', motionArgs: { forward: true, linewise: true } },
    { keys: ['[', '\''], type: 'motion', motion: 'jumpToMark', motionArgs: { forward: false, linewise: true } },
    { keys: [']', 'character'], type: 'motion',
        motion: 'moveToSymbol',
        motionArgs: { forward: true}},
    { keys: ['[', 'character'], type: 'motion',
        motion: 'moveToSymbol',
        motionArgs: { forward: false}},
    { keys: ['|'], type: 'motion',
        motion: 'moveToColumn',
        motionArgs: { }},
    // Operators
    { keys: ['d'], type: 'operator', operator: 'delete' },
    { keys: ['y'], type: 'operator', operator: 'yank' },
    { keys: ['c'], type: 'operator', operator: 'change',
        operatorArgs: { enterInsertMode: true } },
    { keys: ['>'], type: 'operator', operator: 'indent',
        operatorArgs: { indentRight: true }},
    { keys: ['<'], type: 'operator', operator: 'indent',
        operatorArgs: { indentRight: false }},
    { keys: ['g', '~'], type: 'operator', operator: 'swapcase' },
    { keys: ['n'], type: 'motion', motion: 'findNext',
        motionArgs: { forward: true }},
    { keys: ['N'], type: 'motion', motion: 'findNext',
        motionArgs: { forward: false }},
    // Operator-Motion dual commands
    { keys: ['x'], type: 'operatorMotion', operator: 'delete',
        motion: 'moveByCharacters', motionArgs: { forward: true },
        operatorMotionArgs: { visualLine: false }},
    { keys: ['X'], type: 'operatorMotion', operator: 'delete',
        motion: 'moveByCharacters', motionArgs: { forward: false },
        operatorMotionArgs: { visualLine: true }},
    { keys: ['D'], type: 'operatorMotion', operator: 'delete',
      motion: 'moveToEol', motionArgs: { inclusive: true },
        operatorMotionArgs: { visualLine: true }},
    { keys: ['Y'], type: 'operatorMotion', operator: 'yank',
        motion: 'moveToEol', motionArgs: { inclusive: true },
        operatorMotionArgs: { visualLine: true }},
    { keys: ['C'], type: 'operatorMotion',
        operator: 'change', operatorArgs: { enterInsertMode: true },
        motion: 'moveToEol', motionArgs: { inclusive: true },
        operatorMotionArgs: { visualLine: true }},
    { keys: ['~'], type: 'operatorMotion', operator: 'swapcase',
        motion: 'moveByCharacters', motionArgs: { forward: true }},
    // Actions
    { keys: ['a'], type: 'action', action: 'enterInsertMode',
        actionArgs: { insertAt: 'charAfter' }},
    { keys: ['A'], type: 'action', action: 'enterInsertMode',
        actionArgs: { insertAt: 'eol' }},
    { keys: ['i'], type: 'action', action: 'enterInsertMode' },
    { keys: ['I'], type: 'action', action: 'enterInsertMode',
        motion: 'moveToFirstNonWhiteSpaceCharacter' },
    { keys: ['o'], type: 'action', action: 'newLineAndEnterInsertMode',
        actionArgs: { after: true }},
    { keys: ['O'], type: 'action', action: 'newLineAndEnterInsertMode',
        actionArgs: { after: false }},
    { keys: ['v'], type: 'action', action: 'toggleVisualMode' },
    { keys: ['V'], type: 'action', action: 'toggleVisualMode',
        actionArgs: { linewise: true }},
    { keys: ['J'], type: 'action', action: 'joinLines' },
    { keys: ['p'], type: 'action', action: 'paste',
        actionArgs: { after: true }},
    { keys: ['P'], type: 'action', action: 'paste',
        actionArgs: { after: false }},
    { keys: ['r', 'character'], type: 'action', action: 'replace' },
    { keys: ['u'], type: 'action', action: 'undo' },
    { keys: ['Ctrl-r'], type: 'action', action: 'redo' },
    { keys: ['m', 'character'], type: 'action', action: 'setMark' },
    { keys: ['\"', 'character'], type: 'action', action: 'setRegister' },
    { keys: ['z', 'z'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'center' }},
    { keys: ['z', '.'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'center' },
        motion: 'moveToFirstNonWhiteSpaceCharacter' },
    { keys: ['z', 't'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'top' }},
    { keys: ['z', 'Enter'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'top' },
        motion: 'moveToFirstNonWhiteSpaceCharacter' },
    { keys: ['z', '-'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'bottom' }},
    { keys: ['z', 'b'], type: 'action', action: 'scrollToCursor',
        actionArgs: { position: 'bottom' },
        motion: 'moveToFirstNonWhiteSpaceCharacter' },
    { keys: ['.'], type: 'action', action: 'repeatLastEdit' },
    { keys: ['Ctrl-a'], type: 'action', action: 'incrementNumberToken',
        actionArgs: {increase: true, backtrack: false}},
    { keys: ['Ctrl-x'], type: 'action', action: 'incrementNumberToken',
        actionArgs: {increase: false, backtrack: false}},
    // Text object motions
    { keys: ['a', 'character'], type: 'motion',
        motion: 'textObjectManipulation' },
    { keys: ['i', 'character'], type: 'motion',
        motion: 'textObjectManipulation',
        motionArgs: { textObjectInner: true }},
    // Search
    { keys: ['/'], type: 'search',
        searchArgs: { forward: true, querySrc: 'prompt' }},
    { keys: ['?'], type: 'search',
        searchArgs: { forward: false, querySrc: 'prompt' }},
    { keys: ['*'], type: 'search',
        searchArgs: { forward: true, querySrc: 'wordUnderCursor' }},
    { keys: ['#'], type: 'search',
        searchArgs: { forward: false, querySrc: 'wordUnderCursor' }},
    // Ex command
    { keys: [':'], type: 'ex' }
  ];

  var Vim = function() {
    var alphabetRegex = /[A-Za-z]/;
    var numberRegex = /[\d]/;
    var whiteSpaceRegex = /\s/;
    var wordRegexp = [(/\w/), (/[^\w\s]/)], bigWordRegexp = [(/\S/)];
    function makeKeyRange(start, size) {
      var keys = [];
      for (var i = start; i < start + size; i++) {
        keys.push(String.fromCharCode(i));
      }
      return keys;
    }
    var upperCaseAlphabet = makeKeyRange(65, 26);
    var lowerCaseAlphabet = makeKeyRange(97, 26);
    var numbers = makeKeyRange(48, 10);
    var SPECIAL_SYMBOLS = '~`!@#$%^&*()_-+=[{}]\\|/?.,<>:;\"\'';
    var specialSymbols = SPECIAL_SYMBOLS.split('');
    var specialKeys = ['Left', 'Right', 'Up', 'Down', 'Space', 'Backspace',
        'Esc', 'Home', 'End', 'PageUp', 'PageDown', 'Enter'];
    var validMarks = upperCaseAlphabet.concat(lowerCaseAlphabet).concat(
        numbers).concat(['<', '>']);
    var validRegisters = upperCaseAlphabet.concat(lowerCaseAlphabet).concat(
        numbers).concat('-\"'.split(''));

    function isAlphabet(k) {
      return alphabetRegex.test(k);
    }
    function isLine(cm, line) {
      return line >= cm.firstLine() && line <= cm.lastLine();
    }
    function isLowerCase(k) {
      return (/^[a-z]$/).test(k);
    }
    function isMatchableSymbol(k) {
      return '()[]{}'.indexOf(k) != -1;
    }
    function isNumber(k) {
      return numberRegex.test(k);
    }
    function isUpperCase(k) {
      return (/^[A-Z]$/).test(k);
    }
    function isAlphanumeric(k) {
      return (/^[\w]$/).test(k);
    }
    function isWhiteSpace(k) {
      return whiteSpaceRegex.test(k);
    }
    function isWhiteSpaceString(k) {
      return (/^\s*$/).test(k);
    }
    function inRangeInclusive(x, start, end) {
      return x >= start && x <= end;
    }
    function inArray(val, arr) {
      for (var i = 0; i < arr.length; i++) {
        if (arr[i] == val) {
          return true;
        }
      }
      return false;
    }

    // Global Vim state. Call getVimGlobalState to get and initialize.
    var vimGlobalState;
    function getVimGlobalState() {
      if (!vimGlobalState) {
        vimGlobalState = {
          // The current search query.
          searchQuery: null,
          // Whether we are searching backwards.
          searchIsReversed: false,
          // Recording latest f, t, F or T motion command.
          lastChararacterSearch: {increment:0, forward:true, selectedCharacter:''},
          registerController: new RegisterController({})
        };
      }
      return vimGlobalState;
    }
    function getVimState(cm) {
      if (!cm.vimState) {
        // Store instance state in the CodeMirror object.
        cm.vimState = {
          inputState: new InputState(),
          // When using jk for navigation, if you move from a longer line to a
          // shorter line, the cursor may clip to the end of the shorter line.
          // If j is pressed again and cursor goes to the next line, the
          // cursor should go back to its horizontal position on the longer
          // line if it can. This is to keep track of the horizontal position.
          lastHPos: -1,
          // Doing the same with screen-position for gj/gk
          lastHSPos: -1,
          // The last motion command run. Cleared if a non-motion command gets
          // executed in between.
          lastMotion: null,
          marks: {},
          visualMode: false,
          // If we are in visual line mode. No effect if visualMode is false.
          visualLine: false
        };
      }
      return cm.vimState;
    }

    var vimApi= {
      buildKeyMap: function() {
        // TODO: Convert keymap into dictionary format for fast lookup.
      },
      // Testing hook, though it might be useful to expose the register
      // controller anyways.
      getRegisterController: function() {
        return getVimGlobalState().registerController;
      },
      // Testing hook.
      clearVimGlobalState_: function() {
        vimGlobalState = null;
      },
      map: function(lhs, rhs) {
        // Add user defined key bindings.
        exCommandDispatcher.map(lhs, rhs);
      },
      defineEx: function(name, prefix, func){
        if (name.indexOf(prefix) === 0) {
          exCommands[name]=func;
          exCommandDispatcher.commandMap_[prefix]={name:name, shortName:prefix, type:'api'};
        }else throw new Error("(Vim.defineEx) \""+prefix+"\" is not a prefix of \""+name+"\", command not registered");
      },
      // Initializes vim state variable on the CodeMirror object. Should only be
      // called lazily by handleKey or for testing.
      maybeInitState: function(cm) {
        getVimState(cm);
      },
      // This is the outermost function called by CodeMirror, after keys have
      // been mapped to their Vim equivalents.
      handleKey: function(cm, key) {
        var command;
        var vim = getVimState(cm);
        if (key == 'Esc') {
          // Clear input state and get back to normal mode.
          vim.inputState = new InputState();
          if (vim.visualMode) {
            exitVisualMode(cm, vim);
          }
          return;
        }
        if (vim.visualMode &&
            cursorEqual(cm.getCursor('head'), cm.getCursor('anchor'))) {
          // The selection was cleared. Exit visual mode.
          exitVisualMode(cm, vim);
        }
        if (!vim.visualMode &&
            !cursorEqual(cm.getCursor('head'), cm.getCursor('anchor'))) {
          vim.visualMode = true;
          vim.visualLine = false;
        }
        if (key != '0' || (key == '0' && vim.inputState.getRepeat() === 0)) {
          // Have to special case 0 since it's both a motion and a number.
          command = commandDispatcher.matchCommand(key, defaultKeymap, vim);
        }
        if (!command) {
          if (isNumber(key)) {
            // Increment count unless count is 0 and key is 0.
            vim.inputState.pushRepeatDigit(key);
          }
          return;
        }
        if (command.type == 'keyToKey') {
          // TODO: prevent infinite recursion.
          for (var i = 0; i < command.toKeys.length; i++) {
            this.handleKey(cm, command.toKeys[i]);
          }
        } else {
          commandDispatcher.processCommand(cm, vim, command);
        }
      }
    };

    // Represents the current input state.
    function InputState() {
      this.prefixRepeat = [];
      this.motionRepeat = [];

      this.operator = null;
      this.operatorArgs = null;
      this.motion = null;
      this.motionArgs = null;
      this.keyBuffer = []; // For matching multi-key commands.
      this.registerName = null; // Defaults to the unamed register.
    }
    InputState.prototype.pushRepeatDigit = function(n) {
      if (!this.operator) {
        this.prefixRepeat = this.prefixRepeat.concat(n);
      } else {
        this.motionRepeat = this.motionRepeat.concat(n);
      }
    };
    InputState.prototype.getRepeat = function() {
      var repeat = 0;
      if (this.prefixRepeat.length > 0 || this.motionRepeat.length > 0) {
        repeat = 1;
        if (this.prefixRepeat.length > 0) {
          repeat *= parseInt(this.prefixRepeat.join(''), 10);
        }
        if (this.motionRepeat.length > 0) {
          repeat *= parseInt(this.motionRepeat.join(''), 10);
        }
      }
      return repeat;
    };

    /*
     * Register stores information about copy and paste registers.  Besides
     * text, a register must store whether it is linewise (i.e., when it is
     * pasted, should it insert itself into a new line, or should the text be
     * inserted at the cursor position.)
     */
    function Register(text, linewise) {
      this.clear();
      if (text) {
        this.set(text, linewise);
      }
    }
    Register.prototype = {
      set: function(text, linewise) {
        this.text = text;
        this.linewise = !!linewise;
      },
      append: function(text, linewise) {
        // if this register has ever been set to linewise, use linewise.
        if (linewise || this.linewise) {
          this.text += '\n' + text;
          this.linewise = true;
        } else {
          this.text += text;
        }
      },
      clear: function() {
        this.text = '';
        this.linewise = false;
      },
      toString: function() { return this.text; }
    };

    /*
     * vim registers allow you to keep many independent copy and paste buffers.
     * See http://usevim.com/2012/04/13/registers/ for an introduction.
     *
     * RegisterController keeps the state of all the registers.  An initial
     * state may be passed in.  The unnamed register '"' will always be
     * overridden.
     */
    function RegisterController(registers) {
      this.registers = registers;
      this.unamedRegister = registers['\"'] = new Register();
    }
    RegisterController.prototype = {
      pushText: function(registerName, operator, text, linewise) {
        // Lowercase and uppercase registers refer to the same register.
        // Uppercase just means append.
        var register = this.isValidRegister(registerName) ?
            this.getRegister(registerName) : null;
        // if no register/an invalid register was specified, things go to the
        // default registers
        if (!register) {
          switch (operator) {
            case 'yank':
              // The 0 register contains the text from the most recent yank.
              this.registers['0'] = new Register(text, linewise);
              break;
            case 'delete':
            case 'change':
              if (text.indexOf('\n') == -1) {
                // Delete less than 1 line. Update the small delete register.
                this.registers['-'] = new Register(text, linewise);
              } else {
                // Shift down the contents of the numbered registers and put the
                // deleted text into register 1.
                this.shiftNumericRegisters_();
                this.registers['1'] = new Register(text, linewise);
              }
              break;
          }
          // Make sure the unnamed register is set to what just happened
          this.unamedRegister.set(text, linewise);
          return;
        }

        // If we've gotten to this point, we've actually specified a register
        var append = isUpperCase(registerName);
        if (append) {
          register.append(text, linewise);
          // The unamed register always has the same value as the last used
          // register.
          this.unamedRegister.append(text, linewise);
        } else {
          register.set(text, linewise);
          this.unamedRegister.set(text, linewise);
        }
      },
      // Gets the register named @name.  If one of @name doesn't already exist,
      // create it.  If @name is invalid, return the unamedRegister.
      getRegister: function(name) {
        if (!this.isValidRegister(name)) {
          return this.unamedRegister;
        }
        name = name.toLowerCase();
        if (!this.registers[name]) {
          this.registers[name] = new Register();
        }
        return this.registers[name];
      },
      isValidRegister: function(name) {
        return name && inArray(name, validRegisters);
      },
      shiftNumericRegisters_: function() {
        for (var i = 9; i >= 2; i--) {
          this.registers[i] = this.getRegister('' + (i - 1));
        }
      }
    };

    var commandDispatcher = {
      matchCommand: function(key, keyMap, vim) {
        var inputState = vim.inputState;
        var keys = inputState.keyBuffer.concat(key);
        for (var i = 0; i < keyMap.length; i++) {
          var command = keyMap[i];
          if (matchKeysPartial(keys, command.keys)) {
            if (keys.length < command.keys.length) {
              // Matches part of a multi-key command. Buffer and wait for next
              // stroke.
              inputState.keyBuffer.push(key);
              return null;
            } else {
              if (inputState.operator && command.type == 'action') {
                // Ignore matched action commands after an operator. Operators
                // only operate on motions. This check is really for text
                // objects since aW, a[ etcs conflicts with a.
                continue;
              }
              // Matches whole comand. Return the command.
              if (command.keys[keys.length - 1] == 'character') {
                inputState.selectedCharacter = keys[keys.length - 1];
                if(inputState.selectedCharacter.length>1){
                  switch(inputState.selectedCharacter){
                    case "Enter":
                      inputState.selectedCharacter='\n';
                      break;
                    case "Space":
                      inputState.selectedCharacter=' ';
                      break;
                    default:
                      continue;
                  }
                }
              }
              inputState.keyBuffer = [];
              return command;
            }
          }
        }
        // Clear the buffer since there are no partial matches.
        inputState.keyBuffer = [];
        return null;
      },
      processCommand: function(cm, vim, command) {
        vim.inputState.repeatOverride = command.repeatOverride;
        switch (command.type) {
          case 'motion':
            this.processMotion(cm, vim, command);
            break;
          case 'operator':
            this.processOperator(cm, vim, command);
            break;
          case 'operatorMotion':
            this.processOperatorMotion(cm, vim, command);
            break;
          case 'action':
            this.processAction(cm, vim, command);
            break;
          case 'search':
            this.processSearch(cm, vim, command);
            break;
          case 'ex':
          case 'keyToEx':
            this.processEx(cm, vim, command);
            break;
          default:
            break;
        }
      },
      processMotion: function(cm, vim, command) {
        vim.inputState.motion = command.motion;
        vim.inputState.motionArgs = copyArgs(command.motionArgs);
        this.evalInput(cm, vim);
      },
      processOperator: function(cm, vim, command) {
        var inputState = vim.inputState;
        if (inputState.operator) {
          if (inputState.operator == command.operator) {
            // Typing an operator twice like 'dd' makes the operator operate
            // linewise
            inputState.motion = 'expandToLine';
            inputState.motionArgs = { linewise: true };
            this.evalInput(cm, vim);
            return;
          } else {
            // 2 different operators in a row doesn't make sense.
            vim.inputState = new InputState();
          }
        }
        inputState.operator = command.operator;
        inputState.operatorArgs = copyArgs(command.operatorArgs);
        if (vim.visualMode) {
          // Operating on a selection in visual mode. We don't need a motion.
          this.evalInput(cm, vim);
        }
      },
      processOperatorMotion: function(cm, vim, command) {
        var visualMode = vim.visualMode;
        var operatorMotionArgs = copyArgs(command.operatorMotionArgs);
        if (operatorMotionArgs) {
          // Operator motions may have special behavior in visual mode.
          if (visualMode && operatorMotionArgs.visualLine) {
            vim.visualLine = true;
          }
        }
        this.processOperator(cm, vim, command);
        if (!visualMode) {
          this.processMotion(cm, vim, command);
        }
      },
      processAction: function(cm, vim, command) {
        var inputState = vim.inputState;
        var repeat = inputState.getRepeat();
        var repeatIsExplicit = !!repeat;
        var actionArgs = copyArgs(command.actionArgs) || {};
        if (inputState.selectedCharacter) {
          actionArgs.selectedCharacter = inputState.selectedCharacter;
        }
        // Actions may or may not have motions and operators. Do these first.
        if (command.operator) {
          this.processOperator(cm, vim, command);
        }
        if (command.motion) {
          this.processMotion(cm, vim, command);
        }
        if (command.motion || command.operator) {
          this.evalInput(cm, vim);
        }
        actionArgs.repeat = repeat || 1;
        actionArgs.repeatIsExplicit = repeatIsExplicit;
        actionArgs.registerName = inputState.registerName;
        vim.inputState = new InputState();
        vim.lastMotion = null,
        actions[command.action](cm, actionArgs, vim);
      },
      processSearch: function(cm, vim, command) {
        if (!cm.getSearchCursor) {
          // Search depends on SearchCursor.
          return;
        }
        var forward = command.searchArgs.forward;
        getSearchState(cm).setReversed(!forward);
        var promptPrefix = (forward) ? '/' : '?';
        var originalQuery = getSearchState(cm).getQuery();
        var originalScrollPos = cm.getScrollInfo();
        function handleQuery(query, ignoreCase, smartCase) {
          try {
            updateSearchQuery(cm, query, ignoreCase, smartCase);
          } catch (e) {
            showConfirm(cm, 'Invalid regex: ' + regexPart);
            return;
          }
          commandDispatcher.processMotion(cm, vim, {
            type: 'motion',
            motion: 'findNext',
            motionArgs: { forward: true }
          });
        }
        function onPromptClose(query) {
          cm.scrollTo(originalScrollPos.left, originalScrollPos.top);
          handleQuery(query, true /** ignoreCase */, true /** smartCase */);
        }
        function onPromptKeyUp(e, query) {
          var parsedQuery;
          try {
            parsedQuery = updateSearchQuery(cm, query,
                true /** ignoreCase */, true /** smartCase */)
          } catch (e) {
            // Swallow bad regexes for incremental search.
          }
          if (parsedQuery) {
            cm.scrollIntoView(findNext(cm, !forward, parsedQuery), 30);
          } else {
            clearSearchHighlight(cm);
            cm.scrollTo(originalScrollPos.left, originalScrollPos.top);
          }
        }
        function onPromptKeyDown(e, query, close) {
          var keyName = CodeMirror.keyName(e);
          if (keyName == 'Esc' || keyName == 'Ctrl-C' || keyName == 'Ctrl-[') {
            updateSearchQuery(cm, originalQuery);
            clearSearchHighlight(cm);
            cm.scrollTo(originalScrollPos.left, originalScrollPos.top);

            CodeMirror.e_stop(e);
            close();
            cm.focus();
          }
        }
        switch (command.searchArgs.querySrc) {
          case 'prompt':
            showPrompt(cm, {
                onClose: onPromptClose,
                prefix: promptPrefix,
                desc: searchPromptDesc,
                onKeyUp: onPromptKeyUp,
                onKeyDown: onPromptKeyDown
            });
            break;
          case 'wordUnderCursor':
            var word = expandWordUnderCursor(cm, false /** inclusive */,
                true /** forward */, false /** bigWord */,
                true /** noSymbol */);
            var isKeyword = true;
            if (!word) {
              word = expandWordUnderCursor(cm, false /** inclusive */,
                  true /** forward */, false /** bigWord */,
                  false /** noSymbol */);
              isKeyword = false;
            }
            if (!word) {
              return;
            }
            var query = cm.getLine(word.start.line).substring(word.start.ch,
                word.end.ch + 1);
            if (isKeyword) {
              query = '\\b' + query + '\\b';
            } else {
              query = escapeRegex(query);
            }
            cm.setCursor(word.start);
            handleQuery(query, true /** ignoreCase */, false /** smartCase */);
            break;
        }
      },
      processEx: function(cm, vim, command) {
        function onPromptClose(input) {
          exCommandDispatcher.processCommand(cm, input);
        }
        function onPromptKeyDown(e, input, close) {
          var keyName = CodeMirror.keyName(e);
          if (keyName == 'Esc' || keyName == 'Ctrl-C' || keyName == 'Ctrl-[') {
            CodeMirror.e_stop(e);
            close();
            cm.focus();
          }
        }
        if (command.type == 'keyToEx') {
          // Handle user defined Ex to Ex mappings
          exCommandDispatcher.processCommand(cm, command.exArgs.input);
        } else {
          if (vim.visualMode) {
            showPrompt(cm, { onClose: onPromptClose, prefix: ':', value: '\'<,\'>',
                onKeyDown: onPromptKeyDown});
          } else {
            showPrompt(cm, { onClose: onPromptClose, prefix: ':',
                onKeyDown: onPromptKeyDown});
          }
        }
      },
      evalInput: function(cm, vim) {
        // If the motion comand is set, execute both the operator and motion.
        // Otherwise return.
        var inputState = vim.inputState;
        var motion = inputState.motion;
        var motionArgs = inputState.motionArgs || {};
        var operator = inputState.operator;
        var operatorArgs = inputState.operatorArgs || {};
        var registerName = inputState.registerName;
        var selectionEnd = cm.getCursor('head');
        var selectionStart = cm.getCursor('anchor');
        // The difference between cur and selection cursors are that cur is
        // being operated on and ignores that there is a selection.
        var curStart = copyCursor(selectionEnd);
        var curOriginal = copyCursor(curStart);
        var curEnd;
        var repeat;
        if (operator) {
          this.recordLastEdit(cm, vim, inputState);
        }
        if (inputState.repeatOverride !== undefined) {
          // If repeatOverride is specified, that takes precedence over the
          // input state's repeat. Used by Ex mode and can be user defined.
          repeat = inputState.repeatOverride;
        } else {
          repeat = inputState.getRepeat();
        }
        if (repeat > 0 && motionArgs.explicitRepeat) {
          motionArgs.repeatIsExplicit = true;
        } else if (motionArgs.noRepeat ||
            (!motionArgs.explicitRepeat && repeat === 0)) {
          repeat = 1;
          motionArgs.repeatIsExplicit = false;
        }
        if (inputState.selectedCharacter) {
          // If there is a character input, stick it in all of the arg arrays.
          motionArgs.selectedCharacter = operatorArgs.selectedCharacter =
              inputState.selectedCharacter;
        }
        motionArgs.repeat = repeat;
        vim.inputState = new InputState();
        if (motion) {
          var motionResult = motions[motion](cm, motionArgs, vim);
          vim.lastMotion = motions[motion];
          if (!motionResult) {
            return;
          }
          if (motionResult instanceof Array) {
            curStart = motionResult[0];
            curEnd = motionResult[1];
          } else {
            curEnd = motionResult;
          }
          // TODO: Handle null returns from motion commands better.
          if (!curEnd) {
            curEnd = { ch: curStart.ch, line: curStart.line };
          }
          if (vim.visualMode) {
            // Check if the selection crossed over itself. Will need to shift
            // the start point if that happened.
            if (cursorIsBefore(selectionStart, selectionEnd) &&
                (cursorEqual(selectionStart, curEnd) ||
                    cursorIsBefore(curEnd, selectionStart))) {
              // The end of the selection has moved from after the start to
              // before the start. We will shift the start right by 1.
              selectionStart.ch += 1;
            } else if (cursorIsBefore(selectionEnd, selectionStart) &&
                (cursorEqual(selectionStart, curEnd) ||
                    cursorIsBefore(selectionStart, curEnd))) {
              // The opposite happened. We will shift the start left by 1.
              selectionStart.ch -= 1;
            }
            selectionEnd = curEnd;
            if (vim.visualLine) {
              if (cursorIsBefore(selectionStart, selectionEnd)) {
                selectionStart.ch = 0;
                selectionEnd.ch = lineLength(cm, selectionEnd.line);
              } else {
                selectionEnd.ch = 0;
                selectionStart.ch = lineLength(cm, selectionStart.line);
              }
            }
            cm.setSelection(selectionStart, selectionEnd);
            updateMark(cm, vim, '<',
                cursorIsBefore(selectionStart, selectionEnd) ? selectionStart
                    : selectionEnd);
            updateMark(cm, vim, '>',
                cursorIsBefore(selectionStart, selectionEnd) ? selectionEnd
                    : selectionStart);
          } else if (!operator) {
            curEnd = clipCursorToContent(cm, curEnd);
            cm.setCursor(curEnd.line, curEnd.ch);
          }
        }

        if (operator) {
          var inverted = false;
          vim.lastMotion = null;
          operatorArgs.repeat = repeat; // Indent in visual mode needs this.
          if (vim.visualMode) {
            curStart = selectionStart;
            curEnd = selectionEnd;
            motionArgs.inclusive = true;
          }
          // Swap start and end if motion was backward.
          if (cursorIsBefore(curEnd, curStart)) {
            var tmp = curStart;
            curStart = curEnd;
            curEnd = tmp;
            inverted = true;
          }
          if (motionArgs.inclusive && !(vim.visualMode && inverted)) {
            // Move the selection end one to the right to include the last
            // character.
            curEnd.ch++;
          }
          var linewise = motionArgs.linewise ||
              (vim.visualMode && vim.visualLine);
          if (linewise) {
            // Expand selection to entire line.
            expandSelectionToLine(cm, curStart, curEnd);
          } else if (motionArgs.forward) {
            // Clip to trailing newlines only if we the motion goes forward.
            clipToLine(cm, curStart, curEnd);
          }
          operatorArgs.registerName = registerName;
          // Keep track of linewise as it affects how paste and change behave.
          operatorArgs.linewise = linewise;
          operators[operator](cm, operatorArgs, vim, curStart,
              curEnd, curOriginal);
          if (vim.visualMode) {
            exitVisualMode(cm, vim);
          }
          if (operatorArgs.enterInsertMode) {
            actions.enterInsertMode(cm);
          }
        }
      },
      recordLastEdit: function(cm, vim, inputState) {
        vim.lastEdit = inputState;
      }
    };

    /**
     * typedef {Object{line:number,ch:number}} Cursor An object containing the
     *     position of the cursor.
     */
    // All of the functions below return Cursor objects.
    var motions = {
      moveToTopLine: function(cm, motionArgs) {
        var line = getUserVisibleLines(cm).top + motionArgs.repeat -1;
        return { line: line, ch: findFirstNonWhiteSpaceCharacter(cm.getLine(line)) };
      },
      moveToMiddleLine: function(cm) {
        var range = getUserVisibleLines(cm);
        var line = Math.floor((range.top + range.bottom) * 0.5);
        return { line: line, ch: findFirstNonWhiteSpaceCharacter(cm.getLine(line)) };
      },
      moveToBottomLine: function(cm, motionArgs) {
        var line = getUserVisibleLines(cm).bottom - motionArgs.repeat +1;
        return { line: line, ch: findFirstNonWhiteSpaceCharacter(cm.getLine(line)) };
      },
      expandToLine: function(cm, motionArgs) {
        // Expands forward to end of line, and then to next line if repeat is
        // >1. Does not handle backward motion!
        var cur = cm.getCursor();
        return { line: cur.line + motionArgs.repeat - 1, ch: Infinity };
      },
      findNext: function(cm, motionArgs, vim) {
        var state = getSearchState(cm);
        var query = state.getQuery();
        if (!query) {
          return;
        }
        var prev = !motionArgs.forward;
        // If search is initiated with ? instead of /, negate direction.
        prev = (state.isReversed()) ? !prev : prev;
        highlightSearchMatches(cm, query);
        return findNext(cm, prev/** prev */, query, motionArgs.repeat);
      },
      goToMark: function(cm, motionArgs, vim) {
        var mark = vim.marks[motionArgs.selectedCharacter];
        if (mark) {
          return mark.find();
        }
        return null;
      },
      jumpToMark: function(cm, motionArgs, vim) {
        var best = cm.getCursor(); 
        for (var i = 0; i < motionArgs.repeat; i++) {
          var cursor = best;
          for (var key in vim.marks) {
            if (!isLowerCase(key)) {
              continue;
            }
            var mark = vim.marks[key].find();
            var isWrongDirection = (motionArgs.forward) ?
              cursorIsBefore(mark, cursor) : cursorIsBefore(cursor, mark)

            if (isWrongDirection) {
              continue;
            }
            if (motionArgs.linewise && (mark.line == cursor.line)) {
              continue;
            }

            var equal = cursorEqual(cursor, best);
            var between = (motionArgs.forward) ? 
              cusrorIsBetween(cursor, mark, best) :
              cusrorIsBetween(best, mark, cursor);

            if (equal || between) {
              best = mark;
            }
          }
        }

        if (motionArgs.linewise) {
          // Vim places the cursor on the first non-whitespace character of
          // the line if there is one, else it places the cursor at the end
          // of the line, regardless of whether a mark was found.
          best.ch = findFirstNonWhiteSpaceCharacter(cm.getLine(best.line));
        }
        return best;
      },
      moveByCharacters: function(cm, motionArgs) {
        var cur = cm.getCursor();
        var repeat = motionArgs.repeat;
        var ch = motionArgs.forward ? cur.ch + repeat : cur.ch - repeat;
        return { line: cur.line, ch: ch };
      },
      moveByLines: function(cm, motionArgs, vim) {
        var cur = cm.getCursor();
        var endCh = cur.ch;
        // Depending what our last motion was, we may want to do different
        // things. If our last motion was moving vertically, we want to
        // preserve the HPos from our last horizontal move.  If our last motion
        // was going to the end of a line, moving vertically we should go to
        // the end of the line, etc.
        switch (vim.lastMotion) {
          case this.moveByLines:
          case this.moveByDisplayLines:
          case this.moveByScroll:
          case this.moveToColumn:
          case this.moveToEol:
            endCh = vim.lastHPos;
            break;
          default:
            vim.lastHPos = endCh;
        }
        var repeat = motionArgs.repeat+(motionArgs.repeatOffset||0);
        var line = motionArgs.forward ? cur.line + repeat : cur.line - repeat;
        if (line < cm.firstLine() || line > cm.lastLine() ) {
          return null;
        }
        if(motionArgs.toFirstChar){
          endCh=findFirstNonWhiteSpaceCharacter(cm.getLine(line));
          vim.lastHPos = endCh;
        }
        vim.lastHSPos = cm.charCoords({line:line, ch:endCh},"div").left;
        return { line: line, ch: endCh };
      },
      moveByDisplayLines: function(cm, motionArgs, vim) {
        var cur = cm.getCursor();
        switch (vim.lastMotion) {
          case this.moveByDisplayLines:
          case this.moveByScroll:
          case this.moveByLines:
          case this.moveToColumn:
          case this.moveToEol:
            break;
          default:
            vim.lastHSPos = cm.charCoords(cur,"div").left;
        }
        var repeat = motionArgs.repeat;
        var res=cm.findPosV(cur,(motionArgs.forward ? repeat : -repeat),"line",vim.lastHSPos);
        if (res.hitSide) {
          if (motionArgs.forward) {
            var lastCharCoords = cm.charCoords(res, 'div');
            var goalCoords = { top: lastCharCoords.top + 8, left: vim.lastHSPos };
            var res = cm.coordsChar(goalCoords, 'div');
          } else {
            var resCoords = cm.charCoords({ line: cm.firstLine(), ch: 0}, 'div');
            resCoords.left = vim.lastHSPos;
            res = cm.coordsChar(resCoords, 'div');
          }
        }
        vim.lastHPos = res.ch;
        return res;
      },
      moveByPage: function(cm, motionArgs) {
        // CodeMirror only exposes functions that move the cursor page down, so
        // doing this bad hack to move the cursor and move it back. evalInput
        // will move the cursor to where it should be in the end.
        var curStart = cm.getCursor();
        var repeat = motionArgs.repeat;
        cm.moveV((motionArgs.forward ? repeat : -repeat), 'page');
        var curEnd = cm.getCursor();
        cm.setCursor(curStart);
        return curEnd;
      },
      moveByParagraph: function(cm, motionArgs) {
        var line = cm.getCursor().line;
        var repeat = motionArgs.repeat;
        var inc = motionArgs.forward ? 1 : -1;
        for (var i = 0; i < repeat; i++) {
          if ((!motionArgs.forward && line === cm.firstLine() ) ||
              (motionArgs.forward && line == cm.lastLine())) {
            break;
          }
          line += inc;
          while (line !== cm.firstLine() && line != cm.lastLine() && cm.getLine(line)) {
            line += inc;
          }
        }
        return { line: line, ch: 0 };
      },
      moveByScroll: function(cm, motionArgs, vim) {
        var globalState = getVimGlobalState();
        var scrollbox = cm.getScrollInfo();
        var curEnd = null;
        var repeat = motionArgs.repeat;
        if (!repeat) {
          repeat = scrollbox.clientHeight / (2 * cm.defaultTextHeight());
        }
        var orig = cm.charCoords(cm.getCursor(), 'local');
        motionArgs.repeat = repeat;
        var curEnd = motions.moveByDisplayLines(cm, motionArgs, vim);
        if (!curEnd) {
          return null;
        }
        var dest = cm.charCoords(curEnd, 'local');
        cm.scrollTo(null, scrollbox.top + dest.top - orig.top);
        return curEnd;
      },
      moveByWords: function(cm, motionArgs) {
        return moveToWord(cm, motionArgs.repeat, !!motionArgs.forward,
            !!motionArgs.wordEnd, !!motionArgs.bigWord);
      },
      moveTillCharacter: function(cm, motionArgs) {
        var repeat = motionArgs.repeat;
        var curEnd = moveToCharacter(cm, repeat, motionArgs.forward,
            motionArgs.selectedCharacter);
        var increment = motionArgs.forward ? -1 : 1;
        recordLastCharacterSearch(increment, motionArgs);
        if(!curEnd)return cm.getCursor();
        curEnd.ch += increment;
        return curEnd;
      },
      moveToCharacter: function(cm, motionArgs) {
        var repeat = motionArgs.repeat;
        recordLastCharacterSearch(0, motionArgs);
        return moveToCharacter(cm, repeat, motionArgs.forward,
            motionArgs.selectedCharacter) || cm.getCursor();
      },
      moveToSymbol: function(cm, motionArgs) {
        var repeat = motionArgs.repeat;
        return findSymbol(cm, repeat, motionArgs.forward,
            motionArgs.selectedCharacter) || cm.getCursor();
      },
      moveToColumn: function(cm, motionArgs, vim) {
        var repeat = motionArgs.repeat;
        // repeat is equivalent to which column we want to move to!
        vim.lastHPos = repeat - 1;
        vim.lastHSPos = cm.charCoords(cm.getCursor(),"div").left;
        return moveToColumn(cm, repeat);
      },
      moveToEol: function(cm, motionArgs, vim) {
        var cur = cm.getCursor();
        vim.lastHPos = Infinity;
        var retval={ line: cur.line + motionArgs.repeat - 1, ch: Infinity }
        var end=cm.clipPos(retval);
        end.ch--;
        vim.lastHSPos = cm.charCoords(end,"div").left;
        return retval;
      },
      moveToFirstNonWhiteSpaceCharacter: function(cm) {
        // Go to the start of the line where the text begins, or the end for
        // whitespace-only lines
        var cursor = cm.getCursor();
        return { line: cursor.line,
            ch: findFirstNonWhiteSpaceCharacter(cm.getLine(cursor.line)) };
      },
      moveToMatchedSymbol: function(cm, motionArgs) {
        var cursor = cm.getCursor();
        var symbol = cm.getLine(cursor.line).charAt(cursor.ch);
        if (isMatchableSymbol(symbol)) {
          return findMatchedSymbol(cm, cm.getCursor(), motionArgs.symbol);
        } else {
          return cursor;
        }
      },
      moveToStartOfLine: function(cm) {
        var cursor = cm.getCursor();
        return { line: cursor.line, ch: 0 };
      },
      moveToLineOrEdgeOfDocument: function(cm, motionArgs) {
        var lineNum = motionArgs.forward ? cm.lastLine() : cm.firstLine();
        if (motionArgs.repeatIsExplicit) {
          lineNum = motionArgs.repeat - cm.getOption('firstLineNumber');
        }
        return { line: lineNum,
            ch: findFirstNonWhiteSpaceCharacter(cm.getLine(lineNum)) };
      },
      textObjectManipulation: function(cm, motionArgs) {
        var character = motionArgs.selectedCharacter;
        // Inclusive is the difference between a and i
        // TODO: Instead of using the additional text object map to perform text
        //     object operations, merge the map into the defaultKeyMap and use
        //     motionArgs to define behavior. Define separate entries for 'aw',
        //     'iw', 'a[', 'i[', etc.
        var inclusive = !motionArgs.textObjectInner;
        if (!textObjects[character]) {
          // No text object defined for this, don't move.
          return null;
        }
        var tmp = textObjects[character](cm, inclusive);
        var start = tmp.start;
        var end = tmp.end;
        return [start, end];
      },
      repeatLastCharacterSearch: function(cm, motionArgs) {
        var lastSearch = getVimGlobalState().lastChararacterSearch;
        var repeat = motionArgs.repeat;
        var forward = motionArgs.forward === lastSearch.forward;
        var increment = (lastSearch.increment ? 1 : 0) * (forward ? -1 : 1);
        cm.moveH(-increment, 'char');
        motionArgs.inclusive = forward ? true : false;
        var curEnd = moveToCharacter(cm, repeat, forward, lastSearch.selectedCharacter);
        if (!curEnd) {
          cm.moveH(increment, 'char')
          return cm.getCursor();
        }
        curEnd.ch += increment;
        return curEnd;
      }
    };

    var operators = {
      change: function(cm, operatorArgs, vim, curStart, curEnd) {
        getVimGlobalState().registerController.pushText(
            operatorArgs.registerName, 'change', cm.getRange(curStart, curEnd),
            operatorArgs.linewise);
        if (operatorArgs.linewise) {
          // Delete starting at the first nonwhitespace character of the first
          // line, instead of from the start of the first line. This way we get
          // an indent when we get into insert mode. This behavior isn't quite
          // correct because we should treat this as a completely new line, and
          // indent should be whatever codemirror thinks is the right indent.
          // But cm.indentLine doesn't seem work on empty lines.
          // TODO: Fix the above.
          curStart.ch =
              findFirstNonWhiteSpaceCharacter(cm.getLine(curStart.line));
          // Insert an additional newline so that insert mode can start there.
          // curEnd should be on the first character of the new line.
          cm.replaceRange('\n', curStart, curEnd);
        } else {
          cm.replaceRange('', curStart, curEnd);
        }
        cm.setCursor(curStart);
      },
      // delete is a javascript keyword.
      'delete': function(cm, operatorArgs, vim, curStart, curEnd) {
        getVimGlobalState().registerController.pushText(
            operatorArgs.registerName, 'delete', cm.getRange(curStart, curEnd),
            operatorArgs.linewise);
        cm.replaceRange('', curStart, curEnd);
        if (operatorArgs.linewise) {
          cm.setCursor(motions.moveToFirstNonWhiteSpaceCharacter(cm));
        } else {
          cm.setCursor(curStart);
        }
      },
      indent: function(cm, operatorArgs, vim, curStart, curEnd) {
        var startLine = curStart.line;
        var endLine = curEnd.line;
        // In visual mode, n> shifts the selection right n times, instead of
        // shifting n lines right once.
        var repeat = (vim.visualMode) ? operatorArgs.repeat : 1;
        if (operatorArgs.linewise) {
          // The only way to delete a newline is to delete until the start of
          // the next line, so in linewise mode evalInput will include the next
          // line. We don't want this in indent, so we go back a line.
          endLine--;
        }
        for (var i = startLine; i <= endLine; i++) {
          for (var j = 0; j < repeat; j++) {
            cm.indentLine(i, operatorArgs.indentRight);
          }
        }
        cm.setCursor(curStart);
        cm.setCursor(motions.moveToFirstNonWhiteSpaceCharacter(cm));
      },
      swapcase: function(cm, operatorArgs, vim, curStart, curEnd, curOriginal) {
        var toSwap = cm.getRange(curStart, curEnd);
        var swapped = '';
        for (var i = 0; i < toSwap.length; i++) {
          var character = toSwap.charAt(i);
          swapped += isUpperCase(character) ? character.toLowerCase() :
              character.toUpperCase();
        }
        cm.replaceRange(swapped, curStart, curEnd);
        cm.setCursor(curOriginal);
      },
      yank: function(cm, operatorArgs, vim, curStart, curEnd, curOriginal) {
        getVimGlobalState().registerController.pushText(
            operatorArgs.registerName, 'yank',
            cm.getRange(curStart, curEnd), operatorArgs.linewise);
        cm.setCursor(curOriginal);
      }
    };

    var actions = {
      scrollToCursor: function(cm, actionArgs) {
        var lineNum = cm.getCursor().line;
        var heightProp = window.getComputedStyle(cm.getScrollerElement()).
            getPropertyValue('height');
        var height = parseInt(heightProp);
        var y = cm.charCoords({line: lineNum, ch: 0}, "local").top;
        var halfHeight = parseInt(height) / 2;
        switch (actionArgs.position) {
          case 'center': y = y - (height / 2) + 10;
              break;
          case 'bottom': y = y - height;
              break;
          case 'top': break;
        }
        cm.scrollTo(null, y);
        // The calculations are slightly off, use scrollIntoView to nudge the
        // view into the right place.
        cm.scrollIntoView();
      },
      enterInsertMode: function(cm, actionArgs) {
        var insertAt = (actionArgs) ? actionArgs.insertAt : null;
        if (insertAt == 'eol') {
          var cursor = cm.getCursor();
          cursor = { line: cursor.line, ch: lineLength(cm, cursor.line) };
          cm.setCursor(cursor);
        } else if (insertAt == 'charAfter') {
          cm.setCursor(offsetCursor(cm.getCursor(), 0, 1));
        }
        cm.setOption('keyMap', 'vim-insert');
      },
      toggleVisualMode: function(cm, actionArgs, vim) {
        var repeat = actionArgs.repeat;
        var curStart = cm.getCursor();
        var curEnd;
        // TODO: The repeat should actually select number of characters/lines
        //     equal to the repeat times the size of the previous visual
        //     operation.
        if (!vim.visualMode) {
          vim.visualMode = true;
          vim.visualLine = !!actionArgs.linewise;
          if (vim.visualLine) {
            curStart.ch = 0;
            curEnd = clipCursorToContent(cm, {
              line: curStart.line + repeat - 1,
              ch: lineLength(cm, curStart.line)
            }, true /** includeLineBreak */);
          } else {
            curEnd = clipCursorToContent(cm, {
              line: curStart.line,
              ch: curStart.ch + repeat
            }, true /** includeLineBreak */);
          }
          // Make the initial selection.
          if (!actionArgs.repeatIsExplicit && !vim.visualLine) {
            // This is a strange case. Here the implicit repeat is 1. The
            // following commands lets the cursor hover over the 1 character
            // selection.
            cm.setCursor(curEnd);
            cm.setSelection(curEnd, curStart);
          } else {
            cm.setSelection(curStart, curEnd);
          }
        } else {
          curStart = cm.getCursor('anchor');
          curEnd = cm.getCursor('head');
          if (!vim.visualLine && actionArgs.linewise) {
            // Shift-V pressed in characterwise visual mode. Switch to linewise
            // visual mode instead of exiting visual mode.
            vim.visualLine = true;
            curStart.ch = cursorIsBefore(curStart, curEnd) ? 0 :
                lineLength(cm, curStart.line);
            curEnd.ch = cursorIsBefore(curStart, curEnd) ?
                lineLength(cm, curEnd.line) : 0;
            cm.setSelection(curStart, curEnd);
          } else if (vim.visualLine && !actionArgs.linewise) {
            // v pressed in linewise visual mode. Switch to characterwise visual
            // mode instead of exiting visual mode.
            vim.visualLine = false;
          } else {
            exitVisualMode(cm, vim);
          }
        }
        updateMark(cm, vim, '<', cursorIsBefore(curStart, curEnd) ? curStart
            : curEnd);
        updateMark(cm, vim, '>', cursorIsBefore(curStart, curEnd) ? curEnd
            : curStart);
      },
      joinLines: function(cm, actionArgs, vim) {
        var curStart, curEnd;
        if (vim.visualMode) {
          curStart = cm.getCursor('anchor');
          curEnd = cm.getCursor('head');
          curEnd.ch = lineLength(cm, curEnd.line) - 1;
        } else {
          // Repeat is the number of lines to join. Minimum 2 lines.
          var repeat = Math.max(actionArgs.repeat, 2);
          curStart = cm.getCursor();
          curEnd = clipCursorToContent(cm, { line: curStart.line + repeat - 1,
              ch: Infinity });
        }
        var finalCh = 0;
        cm.operation(function() {
          for (var i = curStart.line; i < curEnd.line; i++) {
            finalCh = lineLength(cm, curStart.line);
            var tmp = { line: curStart.line + 1,
                ch: lineLength(cm, curStart.line + 1) };
            var text = cm.getRange(curStart, tmp);
            text = text.replace(/\n\s*/g, ' ');
            cm.replaceRange(text, curStart, tmp);
          }
          var curFinalPos = { line: curStart.line, ch: finalCh };
          cm.setCursor(curFinalPos);
        });
      },
      newLineAndEnterInsertMode: function(cm, actionArgs) {
        var insertAt = cm.getCursor();
        if (insertAt.line === cm.firstLine() && !actionArgs.after) {
          // Special case for inserting newline before start of document.
          cm.replaceRange('\n', { line: cm.firstLine(), ch: 0 });
          cm.setCursor(cm.firstLine(), 0);
        } else {
          insertAt.line = (actionArgs.after) ? insertAt.line :
              insertAt.line - 1;
          insertAt.ch = lineLength(cm, insertAt.line);
          cm.setCursor(insertAt);
          var newlineFn = CodeMirror.commands.newlineAndIndentContinueComment ||
              CodeMirror.commands.newlineAndIndent;
          newlineFn(cm);
        }
        this.enterInsertMode(cm);
      },
      paste: function(cm, actionArgs, vim) {
        var cur = cm.getCursor();
        var register = getVimGlobalState().registerController.getRegister(
            actionArgs.registerName);
        if (!register.text) {
          return;
        }
        for (var text = '', i = 0; i < actionArgs.repeat; i++) {
          text += register.text;
        }
        var linewise = register.linewise;
        if (linewise) {
          if (actionArgs.after) {
            // Move the newline at the end to the start instead, and paste just
            // before the newline character of the line we are on right now.
            text = '\n' + text.slice(0, text.length - 1);
            cur.ch = lineLength(cm, cur.line);
          } else {
            cur.ch = 0;
          }
        } else {
          cur.ch += actionArgs.after ? 1 : 0;
        }
        cm.replaceRange(text, cur);
        // Now fine tune the cursor to where we want it.
        var curPosFinal;
        var idx;
        if (linewise && actionArgs.after) {
          curPosFinal = { line: cur.line + 1,
              ch: findFirstNonWhiteSpaceCharacter(cm.getLine(cur.line + 1)) };
        } else if (linewise && !actionArgs.after) {
          curPosFinal = { line: cur.line,
              ch: findFirstNonWhiteSpaceCharacter(cm.getLine(cur.line)) };
        } else if (!linewise && actionArgs.after) {
          idx = cm.indexFromPos(cur);
          curPosFinal = cm.posFromIndex(idx + text.length - 1);
        } else {
          idx = cm.indexFromPos(cur);
          curPosFinal = cm.posFromIndex(idx + text.length);
        }
        cm.setCursor(curPosFinal);
      },
      undo: function(cm, actionArgs) {
        repeatFn(cm, CodeMirror.commands.undo, actionArgs.repeat)();
      },
      redo: function(cm, actionArgs) {
        repeatFn(cm, CodeMirror.commands.redo, actionArgs.repeat)();
      },
      setRegister: function(cm, actionArgs, vim) {
        vim.inputState.registerName = actionArgs.selectedCharacter;
      },
      setMark: function(cm, actionArgs, vim) {
        var markName = actionArgs.selectedCharacter;
        updateMark(cm, vim, markName, cm.getCursor());
      },
      replace: function(cm, actionArgs, vim) {
        var replaceWith = actionArgs.selectedCharacter;
        var curStart = cm.getCursor();
        var replaceTo;
        var curEnd;
        if(vim.visualMode){
          curStart=cm.getCursor('start');
          curEnd=cm.getCursor('end');
          // workaround to catch the character under the cursor
          //  existing workaround doesn't cover actions
          curEnd=cm.clipPos({line: curEnd.line, ch: curEnd.ch+1});
        }else{
          var line = cm.getLine(curStart.line);
          replaceTo = curStart.ch + actionArgs.repeat;
          if (replaceTo > line.length) {
            replaceTo=line.length;
          }
          curEnd = { line: curStart.line, ch: replaceTo };
        }
        if(replaceWith=='\n'){
          if(!vim.visualMode) cm.replaceRange('', curStart, curEnd);
          // special case, where vim help says to replace by just one line-break
          (CodeMirror.commands.newlineAndIndentContinueComment || CodeMirror.commands.newlineAndIndent)(cm);
        }else {
          var replaceWithStr=cm.getRange(curStart, curEnd);
          //replace all characters in range by selected, but keep linebreaks
          replaceWithStr=replaceWithStr.replace(/[^\n]/g,replaceWith);
          cm.replaceRange(replaceWithStr, curStart, curEnd);
          if(vim.visualMode){
            cm.setCursor(curStart);
            exitVisualMode(cm,vim);
          }else{
            cm.setCursor(offsetCursor(curEnd, 0, -1));
          }
        }
      },
      incrementNumberToken: function(cm, actionArgs, vim) {
        var cur = cm.getCursor();
        var lineStr = cm.getLine(cur.line);
        var re = /-?\d+/g;
        var match;
        var start;
        var end;
        var numberStr;
        var token;
        while ((match = re.exec(lineStr)) !== null) {
          token = match[0];
          start = match.index;
          end = start + token.length;
          if(cur.ch < end)break;
        }
        if(!actionArgs.backtrack && (end <= cur.ch))return;
        if (token) {
          var increment = actionArgs.increase ? 1 : -1;
          var number = parseInt(token) + (increment * actionArgs.repeat);
          var from = {ch:start, line:cur.line};
          var to = {ch:end, line:cur.line};
          numberStr = number.toString();
          cm.replaceRange(numberStr, from, to);
        } else {
          return;
        }
        cm.setCursor({line: cur.line, ch: start + numberStr.length - 1});
      },
      repeatLastEdit: function(cm, actionArgs, vim) {
        // TODO: Make this repeat insert mode changes.
        var lastEdit = vim.lastEdit;
        if (lastEdit) {
          if (actionArgs.repeat && actionArgs.repeatIsExplicit) {
            vim.lastEdit.repeatOverride = actionArgs.repeat;
          }
          var currentInputState = vim.inputState;
          vim.inputState = vim.lastEdit;
          commandDispatcher.evalInput(cm, vim);
          vim.inputState = currentInputState;
        }
      }
    };

    var textObjects = {
      // TODO: lots of possible exceptions that can be thrown here. Try da(
      //     outside of a () block.
      // TODO: implement text objects for the reverse like }. Should just be
      //     an additional mapping after moving to the defaultKeyMap.
      'w': function(cm, inclusive) {
        return expandWordUnderCursor(cm, inclusive, true /** forward */,
            false /** bigWord */);
      },
      'W': function(cm, inclusive) {
        return expandWordUnderCursor(cm, inclusive,
            true /** forward */, true /** bigWord */);
      },
      '{': function(cm, inclusive) {
        return selectCompanionObject(cm, '}', inclusive);
      },
      '(': function(cm, inclusive) {
        return selectCompanionObject(cm, ')', inclusive);
      },
      '[': function(cm, inclusive) {
        return selectCompanionObject(cm, ']', inclusive);
      },
      '\'': function(cm, inclusive) {
        return findBeginningAndEnd(cm, "'", inclusive);
      },
      '\"': function(cm, inclusive) {
        return findBeginningAndEnd(cm, '"', inclusive);
      }
    };

    /*
     * Below are miscellaneous utility functions used by vim.js
     */

    /**
     * Clips cursor to ensure that line is within the buffer's range
     * If includeLineBreak is true, then allow cur.ch == lineLength.
     */
    function clipCursorToContent(cm, cur, includeLineBreak) {
      var line = Math.min(Math.max(cm.firstLine(), cur.line), cm.lastLine() );
      var maxCh = lineLength(cm, line) - 1;
      maxCh = (includeLineBreak) ? maxCh + 1 : maxCh;
      var ch = Math.min(Math.max(0, cur.ch), maxCh);
      return { line: line, ch: ch };
    }
    // Merge arguments in place, for overriding arguments.
    function mergeArgs(to, from) {
      for (var prop in from) {
        if (from.hasOwnProperty(prop)) {
          to[prop] = from[prop];
        }
      }
    }
    function copyArgs(args) {
      var ret = {};
      for (var prop in args) {
        if (args.hasOwnProperty(prop)) {
          ret[prop] = args[prop];
        }
      }
      return ret;
    }
    function offsetCursor(cur, offsetLine, offsetCh) {
      return { line: cur.line + offsetLine, ch: cur.ch + offsetCh };
    }
    function arrayEq(a1, a2) {
      if (a1.length != a2.length) {
        return false;
      }
      for (var i = 0; i < a1.length; i++) {
        if (a1[i] != a2[i]) {
          return false;
        }
      }
      return true;
    }
    function matchKeysPartial(pressed, mapped) {
      for (var i = 0; i < pressed.length; i++) {
        // 'character' means any character. For mark, register commads, etc.
        if (pressed[i] != mapped[i] && mapped[i] != 'character') {
          return false;
        }
      }
      return true;
    }
    function arrayIsSubsetFromBeginning(small, big) {
      for (var i = 0; i < small.length; i++) {
        if (small[i] != big[i]) {
          return false;
        }
      }
      return true;
    }
    function repeatFn(cm, fn, repeat) {
      return function() {
        for (var i = 0; i < repeat; i++) {
          fn(cm);
        }
      };
    }
    function copyCursor(cur) {
      return { line: cur.line, ch: cur.ch };
    }
    function cursorEqual(cur1, cur2) {
      return cur1.ch == cur2.ch && cur1.line == cur2.line;
    }
    function cursorIsBefore(cur1, cur2) {
      if (cur1.line < cur2.line) {
        return true;
      } else if (cur1.line == cur2.line && cur1.ch < cur2.ch) {
        return true;
      }
      return false;
    }
    function cusrorIsBetween(cur1, cur2, cur3) {
      // returns true if cur2 is between cur1 and cur3.
      var cur1before2 = cursorIsBefore(cur1, cur2);
      var cur2before3 = cursorIsBefore(cur2, cur3);
      return cur1before2 && cur2before3;
    }
    function lineLength(cm, lineNum) {
      return cm.getLine(lineNum).length;
    }
    function reverse(s){
      return s.split("").reverse().join("");
    }
    function trim(s) {
      if (s.trim) {
        return s.trim();
      } else {
        return s.replace(/^\s+|\s+$/g, '');
      }
    }
    function escapeRegex(s) {
      return s.replace(/([.?*+$\[\]\/\\(){}|\-])/g, "\\$1");
    }

    function exitVisualMode(cm, vim) {
      vim.visualMode = false;
      vim.visualLine = false;
      var selectionStart = cm.getCursor('anchor');
      var selectionEnd = cm.getCursor('head');
      if (!cursorEqual(selectionStart, selectionEnd)) {
        // Clear the selection and set the cursor only if the selection has not
        // already been cleared. Otherwise we risk moving the cursor somewhere
        // it's not supposed to be.
        cm.setCursor(clipCursorToContent(cm, selectionEnd));
      }
    }

    // Remove any trailing newlines from the selection. For
    // example, with the caret at the start of the last word on the line,
    // 'dw' should word, but not the newline, while 'w' should advance the
    // caret to the first character of the next line.
    function clipToLine(cm, curStart, curEnd) {
      var selection = cm.getRange(curStart, curEnd);
      var lines = selection.split('\n');
      if (lines.length > 1 && isWhiteSpaceString(lines.pop())) {
        curEnd.line--;
        curEnd.ch = lineLength(cm, curEnd.line);
      }
    }

    // Expand the selection to line ends.
    function expandSelectionToLine(cm, curStart, curEnd) {
      curStart.ch = 0;
      curEnd.ch = 0;
      curEnd.line++;
    }

    function findFirstNonWhiteSpaceCharacter(text) {
      if (!text) {
        return 0;
      }
      var firstNonWS = text.search(/\S/);
      return firstNonWS == -1 ? text.length : firstNonWS;
    }

    function expandWordUnderCursor(cm, inclusive, forward, bigWord, noSymbol) {
      var cur = cm.getCursor();
      var line = cm.getLine(cur.line);
      var idx = cur.ch;

      // Seek to first word or non-whitespace character, depending on if
      // noSymbol is true.
      var textAfterIdx = line.substring(idx);
      var firstMatchedChar;
      if (noSymbol) {
        firstMatchedChar = textAfterIdx.search(/\w/);
      } else {
        firstMatchedChar = textAfterIdx.search(/\S/);
      }
      if (firstMatchedChar == -1) {
        return null;
      }
      idx += firstMatchedChar;
      textAfterIdx = line.substring(idx);
      var textBeforeIdx = line.substring(0, idx);

      var matchRegex;
      // Greedy matchers for the "word" we are trying to expand.
      if (bigWord) {
        matchRegex = /^\S+/;
      } else {
        if ((/\w/).test(line.charAt(idx))) {
          matchRegex = /^\w+/;
        } else {
          matchRegex = /^[^\w\s]+/;
        }
      }

      var wordAfterRegex = matchRegex.exec(textAfterIdx);
      var wordStart = idx;
      var wordEnd = idx + wordAfterRegex[0].length - 1;
      // TODO: Find a better way to do this. It will be slow on very long lines.
      var wordBeforeRegex = matchRegex.exec(reverse(textBeforeIdx));
      if (wordBeforeRegex) {
        wordStart -= wordBeforeRegex[0].length;
      }

      if (inclusive) {
        wordEnd++;
      }

      return { start: { line: cur.line, ch: wordStart },
        end: { line: cur.line, ch: wordEnd }};
    }

    function recordLastCharacterSearch(increment, args) {
        var vimGlobalState = getVimGlobalState();
        vimGlobalState.lastChararacterSearch.increment = increment;
        vimGlobalState.lastChararacterSearch.forward = args.forward;
        vimGlobalState.lastChararacterSearch.selectedCharacter = args.selectedCharacter;
    }

    var symbolToMode = {
        '(': 'bracket', ')': 'bracket', '{': 'bracket', '}': 'bracket',
        '[': 'section', ']': 'section',
        '*': 'comment', '/': 'comment',
        'm': 'method', 'M': 'method',
        '#': 'preprocess'
    };
    var findSymbolModes = {
      bracket: {
        isComplete: function(state) {
          if (state.nextCh === state.symb) {
            state.depth++;
            if(state.depth >= 1)return true;
          } else if (state.nextCh === state.reverseSymb) {
            state.depth--;
          }
          return false;
        }
      },
      section: {
        init: function(state) {
          state.curMoveThrough = true;
          state.symb = (state.forward ? ']' : '[') === state.symb ? '{' : '}';
        },
        isComplete: function(state) {
          return state.index === 0 && state.nextCh === state.symb;
        }
      },
      comment: {
        isComplete: function(state) {
          var found = state.lastCh === '*' && state.nextCh === '/';
          state.lastCh = state.nextCh;
          return found;
        }
      },
      // TODO: The original Vim implementation only operates on level 1 and 2.
      // The current implementation doesn't check for code block level and 
      // therefore it operates on any levels.
      method: {
        init: function(state) {
          state.symb = (state.symb === 'm' ? '{' : '}');
          state.reverseSymb = state.symb === '{' ? '}' : '{';
        },
        isComplete: function(state) {
          if(state.nextCh === state.symb)return true;
          return false;
        }
      },
      preprocess: {
        init: function(state) {
          state.index = 0;
        },
        isComplete: function(state) {
          if (state.nextCh === '#') {
            var token = state.lineText.match(/#(\w+)/)[1];
            if (token === 'endif') {
              if (state.forward && state.depth === 0) {
                return true;
              }
              state.depth++;
            } else if (token === 'if') {
              if (!state.forward && state.depth === 0) {
                return true;
              }
              state.depth--;
            }
            if(token === 'else' && state.depth === 0)return true;
          }
          return false;
        }
      }
    };
    function findSymbol(cm, repeat, forward, symb) {
      var cur = cm.getCursor();
      var increment = forward ? 1 : -1;
      var endLine = forward ? cm.lineCount() : -1;
      var curCh = cur.ch;
      var line = cur.line;
      var lineText = cm.getLine(line);
      var state = {
        lineText: lineText,
        nextCh: lineText.charAt(curCh),
        lastCh: null,
        index: curCh,
        symb: symb,
        reverseSymb: (forward ?  { ')': '(', '}': '{' } : { '(': ')', '{': '}' })[symb],
        forward: forward,
        depth: 0,
        curMoveThrough: false      
      };
      var mode = symbolToMode[symb];
      if(!mode)return cur;
      var init = findSymbolModes[mode].init;
      var isComplete = findSymbolModes[mode].isComplete;
      if(init)init(state);
      while (line !== endLine && repeat) {
        state.index += increment;
        state.nextCh = state.lineText.charAt(state.index);
        if (!state.nextCh) {
          line += increment;
          state.lineText = cm.getLine(line) || '';
          if (increment > 0) {
            state.index = 0;
          } else {
            var lineLen = state.lineText.length;
            state.index = (lineLen > 0) ? (lineLen-1) : 0;
          }
          state.nextCh = state.lineText.charAt(state.index);
        }
        if (isComplete(state)) {
          cur.line = line;
          cur.ch = state.index;
          repeat--;
        }
      }
      if (state.nextCh || state.curMoveThrough) {
        return { line: line, ch: state.index };
      }
      return cur;
    }

    /*
     * Returns the boundaries of the next word. If the cursor in the middle of
     * the word, then returns the boundaries of the current word, starting at
     * the cursor. If the cursor is at the start/end of a word, and we are going
     * forward/backward, respectively, find the boundaries of the next word.
     *
     * @param {CodeMirror} cm CodeMirror object.
     * @param {Cursor} cur The cursor position.
     * @param {boolean} forward True to search forward. False to search
     *     backward.
     * @param {boolean} bigWord True if punctuation count as part of the word.
     *     False if only [a-zA-Z0-9] characters count as part of the word.
     * @return {Object{from:number, to:number, line: number}} The boundaries of
     *     the word, or null if there are no more words.
     */
    // TODO: Treat empty lines (with no whitespace) as words.
    function findWord(cm, cur, forward, bigWord) {
      var lineNum = cur.line;
      var pos = cur.ch;
      var line = cm.getLine(lineNum);
      var dir = forward ? 1 : -1;
      var regexps = bigWord ? bigWordRegexp : wordRegexp;

      while (true) {
        var stop = (dir > 0) ? line.length : -1;
        var wordStart = stop, wordEnd = stop;
        // Find bounds of next word.
        while (pos != stop) {
          var foundWord = false;
          for (var i = 0; i < regexps.length && !foundWord; ++i) {
            if (regexps[i].test(line.charAt(pos))) {
              wordStart = pos;
              // Advance to end of word.
              while (pos != stop && regexps[i].test(line.charAt(pos))) {
                pos += dir;
              }
              wordEnd = pos;
              foundWord = wordStart != wordEnd;
              if (wordStart == cur.ch && lineNum == cur.line &&
                  wordEnd == wordStart + dir) {
                // We started at the end of a word. Find the next one.
                continue;
              } else {
                return {
                  from: Math.min(wordStart, wordEnd + 1),
                  to: Math.max(wordStart, wordEnd),
                  line: lineNum };
              }
            }
          }
          if (!foundWord) {
            pos += dir;
          }
        }
        // Advance to next/prev line.
        lineNum += dir;
        if (!isLine(cm, lineNum)) {
          return null;
        }
        line = cm.getLine(lineNum);
        pos = (dir > 0) ? 0 : line.length;
      }
      // Should never get here.
      throw 'The impossible happened.';
    }

    /**
     * @param {CodeMirror} cm CodeMirror object.
     * @param {int} repeat Number of words to move past.
     * @param {boolean} forward True to search forward. False to search
     *     backward.
     * @param {boolean} wordEnd True to move to end of word. False to move to
     *     beginning of word.
     * @param {boolean} bigWord True if punctuation count as part of the word.
     *     False if only alphabet characters count as part of the word.
     * @return {Cursor} The position the cursor should move to.
     */
    function moveToWord(cm, repeat, forward, wordEnd, bigWord) {
      var cur = cm.getCursor();
      for (var i = 0; i < repeat; i++) {
        var startCh = cur.ch, startLine = cur.line, word;
        var movedToNextWord = false;
        while (!movedToNextWord) {
          // Search and advance.
          word = findWord(cm, cur, forward, bigWord);
          movedToNextWord = true;
          if (word) {
            // Move to the word we just found. If by moving to the word we end
            // up in the same spot, then move an extra character and search
            // again.
            cur.line = word.line;
            if (forward && wordEnd) {
              // 'e'
              cur.ch = word.to - 1;
            } else if (forward && !wordEnd) {
              // 'w'
              if (inRangeInclusive(cur.ch, word.from, word.to) &&
                  word.line == startLine) {
                // Still on the same word. Go to the next one.
                movedToNextWord = false;
                cur.ch = word.to - 1;
              } else {
                cur.ch = word.from;
              }
            } else if (!forward && wordEnd) {
              // 'ge'
              if (inRangeInclusive(cur.ch, word.from, word.to) &&
                  word.line == startLine) {
                // still on the same word. Go to the next one.
                movedToNextWord = false;
                cur.ch = word.from;
              } else {
                cur.ch = word.to;
              }
            } else if (!forward && !wordEnd) {
              // 'b'
              cur.ch = word.from;
            }
          } else {
            // No more words to be found. Move to the end.
            if (forward) {
              return { line: cur.line, ch: lineLength(cm, cur.line) };
            } else {
              return { line: cur.line, ch: 0 };
            }
          }
        }
      }
      return cur;
    }

    function moveToCharacter(cm, repeat, forward, character) {
      var cur = cm.getCursor();
      var start = cur.ch;
      var idx;
      for (var i = 0; i < repeat; i ++) {
        var line = cm.getLine(cur.line);
        idx = charIdxInLine(start, line, character, forward, true);
        if (idx == -1) {
          return null;
        }
        start = idx;
      }
      return { line: cm.getCursor().line, ch: idx };
    }

    function moveToColumn(cm, repeat) {
      // repeat is always >= 1, so repeat - 1 always corresponds
      // to the column we want to go to.
      var line = cm.getCursor().line;
      return clipCursorToContent(cm, { line: line, ch: repeat - 1 });
    }

    function updateMark(cm, vim, markName, pos) {
      if (!inArray(markName, validMarks)) {
        return;
      }
      if (vim.marks[markName]) {
        vim.marks[markName].clear();
      }
      vim.marks[markName] = cm.setBookmark(pos);
    }

    function charIdxInLine(start, line, character, forward, includeChar) {
      // Search for char in line.
      // motion_options: {forward, includeChar}
      // If includeChar = true, include it too.
      // If forward = true, search forward, else search backwards.
      // If char is not found on this line, do nothing
      var idx;
      if (forward) {
        idx = line.indexOf(character, start + 1);
        if (idx != -1 && !includeChar) {
          idx -= 1;
        }
      } else {
        idx = line.lastIndexOf(character, start - 1);
        if (idx != -1 && !includeChar) {
          idx += 1;
        }
      }
      return idx;
    }

    function findMatchedSymbol(cm, cur, symb) {
      var line = cur.line;
      symb = symb ? symb : cm.getLine(line).charAt(cur.ch);

      var reverseSymb = ({
        '(': ')', ')': '(',
        '[': ']', ']': '[',
        '{': '}', '}': '{'})[symb];

      // Couldn't find a matching symbol, abort
      if (!reverseSymb) {
        return cur;
      }

      // set our increment to move forward (+1) or backwards (-1)
      // depending on which bracket we're matching
      var increment = ({'(': 1, '{': 1, '[': 1})[symb] || -1;
      var endLine = increment === 1 ? cm.lineCount() : -1;
      var depth = 1, nextCh = symb, index = cur.ch, lineText = cm.getLine(line);
      // Simple search for closing paren--just count openings and closings till
      // we find our match
      // TODO: use info from CodeMirror to ignore closing brackets in comments
      // and quotes, etc.
      while (line !== endLine && depth > 0) {
        index += increment;
        nextCh = lineText.charAt(index);
        if (!nextCh) {
          line += increment;
          lineText = cm.getLine(line) || '';
          if (increment > 0) {
            index = 0;
          } else {
            var lineLen = lineText.length;
            index = (lineLen > 0) ? (lineLen-1) : 0;
          }
          nextCh = lineText.charAt(index);
        }
        if (nextCh === symb) {
          depth++;
        } else if (nextCh === reverseSymb) {
          depth--;
        }
      }

      if (nextCh) {
        return { line: line, ch: index };
      }
      return cur;
    }

    function selectCompanionObject(cm, revSymb, inclusive) {
      var cur = cm.getCursor();

      var end = findMatchedSymbol(cm, cur, revSymb);
      var start = findMatchedSymbol(cm, end);
      start.ch += inclusive ? 1 : 0;
      end.ch += inclusive ? 0 : 1;

      return { start: start, end: end };
    }

    function regexLastIndexOf(string, pattern, startIndex) {
      for (var i = !startIndex ? string.length : startIndex;
          i >= 0; --i) {
        if (pattern.test(string.charAt(i))) {
          return i;
        }
      }
      return -1;
    }

    // Takes in a symbol and a cursor and tries to simulate text objects that
    // have identical opening and closing symbols
    // TODO support across multiple lines
    function findBeginningAndEnd(cm, symb, inclusive) {
      var cur = cm.getCursor();
      var line = cm.getLine(cur.line);
      var chars = line.split('');
      var start, end, i, len;
      var firstIndex = chars.indexOf(symb);

      // the decision tree is to always look backwards for the beginning first,
      // but if the cursor is in front of the first instance of the symb,
      // then move the cursor forward
      if (cur.ch < firstIndex) {
        cur.ch = firstIndex;
        // Why is this line even here???
        // cm.setCursor(cur.line, firstIndex+1);
      }
      // otherwise if the cursor is currently on the closing symbol
      else if (firstIndex < cur.ch && chars[cur.ch] == symb) {
        end = cur.ch; // assign end to the current cursor
        --cur.ch; // make sure to look backwards
      }

      // if we're currently on the symbol, we've got a start
      if (chars[cur.ch] == symb && !end) {
        start = cur.ch + 1; // assign start to ahead of the cursor
      } else {
        // go backwards to find the start
        for (i = cur.ch; i > -1 && !start; i--) {
          if (chars[i] == symb) {
            start = i + 1;
          }
        }
      }

      // look forwards for the end symbol
      if (start && !end) {
        for (i = start, len = chars.length; i < len && !end; i++) {
          if (chars[i] == symb) {
            end = i;
          }
        }
      }

      // nothing found
      if (!start || !end) {
        return { start: cur, end: cur };
      }

      // include the symbols
      if (inclusive) {
        --start; ++end;
      }

      return {
        start: { line: cur.line, ch: start },
        end: { line: cur.line, ch: end }
      };
    }

    // Search functions
    function SearchState() {}
    SearchState.prototype = {
      getQuery: function() {
        return getVimGlobalState().query;
      },
      setQuery: function(query) {
        getVimGlobalState().query = query;
      },
      getOverlay: function() {
        return this.searchOverlay;
      },
      setOverlay: function(overlay) {
        this.searchOverlay = overlay;
      },
      isReversed: function() {
        return getVimGlobalState().isReversed;
      },
      setReversed: function(reversed) {
        getVimGlobalState().isReversed = reversed;
      }
    };
    function getSearchState(cm) {
      var vim = getVimState(cm);
      return vim.searchState_ || (vim.searchState_ = new SearchState());
    }
    function dialog(cm, template, shortText, onClose, options) {
      if (cm.openDialog) {
        cm.openDialog(template, onClose, { bottom: true, value: options.value,
            onKeyDown: options.onKeyDown, onKeyUp: options.onKeyUp });
      }
      else {
        callback(prompt(shortText, ""));
      }
    }
    function findUnescapedSlashes(str) {
      var escapeNextChar = false;
      var slashes = [];
      for (var i = 0; i < str.length; i++) {
        var c = str.charAt(i);
        if (!escapeNextChar && c == '/') {
          slashes.push(i);
        }
        escapeNextChar = (c == '\\');
      }
      return slashes;
    }
    /**
     * Extract the regular expression from the query and return a Regexp object.
     * Returns null if the query is blank.
     * If ignoreCase is passed in, the Regexp object will have the 'i' flag set.
     * If smartCase is passed in, and the query contains upper case letters,
     *   then ignoreCase is overridden, and the 'i' flag will not be set.
     * If the query contains the /i in the flag part of the regular expression,
     *   then both ignoreCase and smartCase are ignored, and 'i' will be passed
     *   through to the Regex object.
     */
    function parseQuery(cm, query, ignoreCase, smartCase) {
      // Check if the query is already a regex.
      if (query instanceof RegExp) { return query; }
      // First try to extract regex + flags from the input. If no flags found,
      // extract just the regex. IE does not accept flags directly defined in
      // the regex string in the form /regex/flags
      var slashes = findUnescapedSlashes(query);
      var regexPart;
      var forceIgnoreCase;
      if (!slashes.length) {
        // Query looks like 'regexp'
        regexPart = query;
      } else {
        // Query looks like 'regexp/...'
        regexPart = query.substring(0, slashes[0]);
        var flagsPart = query.substring(slashes[0]);
        forceIgnoreCase = (flagsPart.indexOf('i') != -1);
      }
      if (!regexPart) {
        return null;
      }
      if (smartCase) {
        ignoreCase = (/^[^A-Z]*$/).test(regexPart);
      }
      var regexp = new RegExp(regexPart,
          (ignoreCase || forceIgnoreCase) ? 'i' : undefined);
      return regexp;
    }
    function showConfirm(cm, text) {
      if (cm.openConfirm) {
        cm.openConfirm('<span style="color: red">' + text +
            '</span> <button type="button">OK</button>', function() {},
            {bottom: true});
      } else {
        alert(text);
      }
    }
    function makePrompt(prefix, desc) {
      var raw = '';
      if (prefix) {
        raw += '<span style="font-family: monospace">' + prefix + '</span>';
      }
      raw += '<input type="text"/> ' +
          '<span style="color: #888">';
      if (desc) {
        raw += '<span style="color: #888">';
        raw += desc;
        raw += '</span>';
      }
      return raw;
    }
    var searchPromptDesc = '(Javascript regexp)';
    function showPrompt(cm, options) {
      var shortText = (options.prefix || '') + ' ' + (options.desc || '');
      var prompt = makePrompt(options.prefix, options.desc);
      dialog(cm, prompt, shortText, options.onClose, options);
    }
    function regexEqual(r1, r2) {
      if (r1 instanceof RegExp && r2 instanceof RegExp) {
          var props = ["global", "multiline", "ignoreCase", "source"];
          for (var i = 0; i < props.length; i++) {
              var prop = props[i];
              if (r1[prop] !== r2[prop]) {
                  return(false);
              }
          }
          return(true);
      }
      return(false);
    }
    // Returns true if the query is valid.
    function updateSearchQuery(cm, rawQuery, ignoreCase, smartCase) {
      if (!rawQuery) {
        return;
      }
      var state = getSearchState(cm);
      var query = parseQuery(cm, rawQuery, !!ignoreCase, !!smartCase);
      if (!query) {
        return;
      }
      highlightSearchMatches(cm, query);
      if (regexEqual(query, state.getQuery())) {
        return query;
      }
      state.setQuery(query);
      return query;
    }
    function searchOverlay(query) {
      if (query.source.charAt(0) == '^') {
        var matchSol = true;
      }
      return {
        token: function(stream) {
          if (matchSol && !stream.sol()) {
            stream.skipToEnd();
            return;
          }
          var match = stream.match(query, false);
          if (match) {
            if (match[0].length == 0) {
              // Matched empty string, skip to next.
              stream.next();
              return;
            }
            if (!stream.sol()) {
              // Backtrack 1 to match \b
              stream.backUp(1);
              if (!query.exec(stream.next() + match[0])) {
                stream.next();
                return null;
              }
            }
            stream.match(query);
            return "searching";
          }
          while (!stream.eol()) {
            stream.next();
            if (stream.match(query, false)) break;
          }
        },
        query: query
      };
    }
    function highlightSearchMatches(cm, query) {
      var overlay = getSearchState(cm).getOverlay();
      if (!overlay || query != overlay.query) {
        if (overlay) {
          cm.removeOverlay(overlay);
        }
        overlay = searchOverlay(query);
        cm.addOverlay(overlay);
        getSearchState(cm).setOverlay(overlay);
      }
    }
    function findNext(cm, prev, query, repeat) {
      if (repeat === undefined) { repeat = 1; }
      return cm.operation(function() {
        var pos = cm.getCursor();
        if (!prev) {
          pos.ch += 1;
        }
        var cursor = cm.getSearchCursor(query, pos);
        for (var i = 0; i < repeat; i++) {
          if (!cursor.find(prev)) {
            // SearchCursor may have returned null because it hit EOF, wrap
            // around and try again.
            cursor = cm.getSearchCursor(query,
                (prev) ? { line: cm.lastLine() } : {line: cm.firstLine(), ch: 0} );
            if (!cursor.find(prev)) {
              return;
            }
          }
        }
        return cursor.from();
      });}
    function clearSearchHighlight(cm) {
      cm.removeOverlay(getSearchState(cm).getOverlay());
      getSearchState(cm).setOverlay(null);
    }
    /**
     * Check if pos is in the specified range, INCLUSIVE.
     * Range can be specified with 1 or 2 arguments.
     * If the first range argument is an array, treat it as an array of line
     * numbers. Match pos against any of the lines.
     * If the first range argument is a number,
     *   if there is only 1 range argument, check if pos has the same line
     *       number
     *   if there are 2 range arguments, then check if pos is in between the two
     *       range arguments.
     */
    function isInRange(pos, start, end) {
      if (typeof pos != 'number') {
        // Assume it is a cursor position. Get the line number.
        pos = pos.line;
      }
      if (start instanceof Array) {
        return inArray(pos, start);
      } else {
        if (end) {
          return (pos >= start && pos <= end);
        } else {
          return pos == start;
        }
      }
    }
    function getUserVisibleLines(cm) {
      var scrollInfo = cm.getScrollInfo();
      var occludeTorleranceTop = 6;
      var occludeTorleranceBottom = 10;
      var from = cm.coordsChar({left:0, top: occludeTorleranceTop}, 'local');
      var bottomY = scrollInfo.clientHeight - occludeTorleranceBottom;
      var to = cm.coordsChar({left:0, top: bottomY}, 'local');
      return {top: from.line, bottom: to.line};
    }

    // Ex command handling
    // Care must be taken when adding to the default Ex command map. For any
    // pair of commands that have a shared prefix, at least one of their
    // shortNames must not match the prefix of the other command.
    var defaultExCommandMap = [
      { name: 'map', type: 'builtIn' },
      { name: 'write', shortName: 'w', type: 'builtIn' },
      { name: 'undo', shortName: 'u', type: 'builtIn' },
      { name: 'redo', shortName: 'red', type: 'builtIn' },
      { name: 'substitute', shortName: 's', type: 'builtIn'},
      { name: 'nohlsearch', shortName: 'noh', type: 'builtIn'},
      { name: 'delmarks', shortName: 'delm', type: 'builtin'}
    ];
    Vim.ExCommandDispatcher = function() {
      this.buildCommandMap_();
    };
    Vim.ExCommandDispatcher.prototype = {
      processCommand: function(cm, input) {
        var inputStream = new CodeMirror.StringStream(input);
        var params = {};
        params.input = input;
        try {
          this.parseInput_(cm, inputStream, params);
        } catch(e) {
          showConfirm(cm, e);
          return;
        }
        var commandName;
        if (!params.commandName) {
          // If only a line range is defined, move to the line.
          if (params.line !== undefined) {
            commandName = 'move';
          }
        } else {
          var command = this.matchCommand_(params.commandName);
          if (command) {
            commandName = command.name;
            this.parseCommandArgs_(inputStream, params, command);
            if (command.type == 'exToKey') {
              // Handle Ex to Key mapping.
              for (var i = 0; i < command.toKeys.length; i++) {
                vim.handleKey(cm, command.toKeys[i]);
              }
              return;
            } else if (command.type == 'exToEx') {
              // Handle Ex to Ex mapping.
              this.processCommand(cm, command.toInput);
              return;
            }
          }
        }
        if (!commandName) {
          showConfirm(cm, 'Not an editor command ":' + input + '"');
          return;
        }
        exCommands[commandName](cm, params);
      },
      parseInput_: function(cm, inputStream, result) {
        inputStream.eatWhile(':');
        // Parse range.
        if (inputStream.eat('%')) {
          result.line = cm.firstLine();
          result.lineEnd = cm.lastLine();
        } else {
          result.line = this.parseLineSpec_(cm, inputStream);
          if (result.line !== undefined && inputStream.eat(',')) {
            result.lineEnd = this.parseLineSpec_(cm, inputStream);
          }
        }

        // Parse command name.
        var commandMatch = inputStream.match(/^(\w+)/);
        if (commandMatch) {
          result.commandName = commandMatch[1];
        } else {
          result.commandName = inputStream.match(/.*/)[0];
        }

        return result;
      },
      parseLineSpec_: function(cm, inputStream) {
        var numberMatch = inputStream.match(/^(\d+)/);
        if (numberMatch) {
          return parseInt(numberMatch[1], 10) - 1;
        }
        switch (inputStream.next()) {
          case '.':
            return cm.getCursor().line;
          case '$':
            return cm.lastLine();
          case '\'':
            var mark = getVimState(cm).marks[inputStream.next()];
            if (mark && mark.find()) {
              return mark.find().line;
            } else {
              throw "Mark not set";
            }
            break;
          default:
            inputStream.backUp(1);
            return cm.getCursor().line;
        }
      },
      parseCommandArgs_: function(inputStream, params, command) {
        if (inputStream.eol()) {
          return;
        }
        params.argString = inputStream.match(/.*/)[0];
        // Parse command-line arguments
        var delim = command.argDelimiter || /\s+/;
        var args = trim(params.argString).split(delim);
        if (args.length && args[0]) {
          params.args = args;
        }
      },
      matchCommand_: function(commandName) {
        // Return the command in the command map that matches the shortest
        // prefix of the passed in command name. The match is guaranteed to be
        // unambiguous if the defaultExCommandMap's shortNames are set up
        // correctly. (see @code{defaultExCommandMap}).
        for (var i = commandName.length; i > 0; i--) {
          var prefix = commandName.substring(0, i);
          if (this.commandMap_[prefix]) {
            var command = this.commandMap_[prefix];
            if (command.name.indexOf(commandName) === 0) {
              return command;
            }
          }
        }
        return null;
      },
      buildCommandMap_: function() {
        this.commandMap_ = {};
        for (var i = 0; i < defaultExCommandMap.length; i++) {
          var command = defaultExCommandMap[i];
          var key = command.shortName || command.name;
          this.commandMap_[key] = command;
        }
      },
      map: function(lhs, rhs) {
        if (lhs != ':' && lhs.charAt(0) == ':') {
          var commandName = lhs.substring(1);
          if (rhs != ':' && rhs.charAt(0) == ':') {
            // Ex to Ex mapping
            this.commandMap_[commandName] = {
              name: commandName,
              type: 'exToEx',
              toInput: rhs.substring(1)
            };
          } else {
            // Ex to key mapping
            this.commandMap_[commandName] = {
              name: commandName,
              type: 'exToKey',
              toKeys: parseKeyString(rhs)
            };
          }
        } else {
          if (rhs != ':' && rhs.charAt(0) == ':') {
            // Key to Ex mapping.
            defaultKeymap.unshift({
              keys: parseKeyString(lhs),
              type: 'keyToEx',
              exArgs: { input: rhs.substring(1) }});
          } else {
            // Key to key mapping
            defaultKeymap.unshift({
              keys: parseKeyString(lhs),
              type: 'keyToKey',
              toKeys: parseKeyString(rhs)
            });
          }
        }
      }
    };

    // Converts a key string sequence of the form a<C-w>bd<Left> into Vim's
    // keymap representation.
    function parseKeyString(str) {
      var idx = 0;
      var keys = [];
      while (idx < str.length) {
        if (str.charAt(idx) != '<') {
          keys.push(str.charAt(idx));
          idx++;
          continue;
        }
        // Vim key notation here means desktop Vim key-notation.
        // See :help key-notation in desktop Vim.
        var vimKeyNotationStart = ++idx;
        while (str.charAt(idx++) != '>') {}
        var vimKeyNotation = str.substring(vimKeyNotationStart, idx - 1);
        var mod='';
        var match = (/^C-(.+)$/).exec(vimKeyNotation);
        if (match) {
          mod='Ctrl-';
          vimKeyNotation=match[1];
        }
        var key;
        switch (vimKeyNotation) {
          case 'BS':
            key = 'Backspace';
            break;
          case 'CR':
            key = 'Enter';
            break;
          case 'Del':
            key = 'Delete';
            break;
          default:
            key = vimKeyNotation;
            break;
        }
        keys.push(mod + key);
      }
      return keys;
    }

    var exCommands = {
      map: function(cm, params) {
        var mapArgs = params.args;
        if (!mapArgs || mapArgs.length < 2) {
          if (cm) {
            showConfirm(cm, 'Invalid mapping: ' + params.input);
          }
          return;
        }
        exCommandDispatcher.map(mapArgs[0], mapArgs[1], cm);
      },
      move: function(cm, params) {
        commandDispatcher.processCommand(cm, getVimState(cm), {
            type: 'motion',
            motion: 'moveToLineOrEdgeOfDocument',
            motionArgs: { forward: false, explicitRepeat: true,
              linewise: true },
            repeatOverride: params.line+1});
      },
      substitute: function(cm, params) {
        var argString = params.argString;
        var slashes = findUnescapedSlashes(argString);
        if (slashes[0] !== 0) {
          showConfirm(cm, 'Substitutions should be of the form ' +
              ':s/pattern/replace/');
          return;
        }
        var regexPart = argString.substring(slashes[0] + 1, slashes[1]);
        var replacePart = '';
        var flagsPart;
        var count;
        if (slashes[1]) {
          replacePart = argString.substring(slashes[1] + 1, slashes[2]);
        }
        if (slashes[2]) {
          // After the 3rd slash, we can have flags followed by a space followed
          // by count.
          var trailing = argString.substring(slashes[2] + 1).split(' ');
          flagsPart = trailing[0];
          count = parseInt(trailing[1]);
        }
        if (flagsPart) {
          regexPart = regexPart + '/' + flagsPart;
        }
        if (regexPart) {
          // If regex part is empty, then use the previous query. Otherwise use
          // the regex part as the new query.
          try {
            updateSearchQuery(cm, regexPart, true /** ignoreCase */,
              true /** smartCase */);
          } catch (e) {
            showConfirm(cm, 'Invalid regex: ' + regexPart);
            return;
          }
        }
        var state = getSearchState(cm);
        var query = state.getQuery();
        var lineStart = params.line || cm.firstLine();
        var lineEnd = params.lineEnd || lineStart;
        if (count) {
          lineStart = lineEnd;
          lineEnd = lineStart + count - 1;
        }
        var startPos = clipCursorToContent(cm, { line: lineStart, ch: 0 });
        function doReplace() {
          for (var cursor = cm.getSearchCursor(query, startPos);
               cursor.findNext() &&
                   isInRange(cursor.from(), lineStart, lineEnd);) {
            var text = cm.getRange(cursor.from(), cursor.to());
            var newText = text.replace(query, replacePart);
            cursor.replace(newText);
          }
          var vim = getVimState(cm);
          if (vim.visualMode) {
            exitVisualMode(cm, vim);
          }
        }
        cm.operation(doReplace);
      },
      redo: CodeMirror.commands.redo,
      undo: CodeMirror.commands.undo,
      write: function(cm) {
        if (CodeMirror.commands.save) {
          // If a save command is defined, call it.
          CodeMirror.commands.save(cm);
        } else {
          // Saves to text area if no save command is defined.
          cm.save();
        }
      },
      nohlsearch: function(cm) {
        clearSearchHighlight(cm);
      },
      delmarks: function(cm, params) {
        if (!params.argString || !params.argString.trim()) {
          showConfirm(cm, 'Argument required');
          return;
        }

        var state = getVimState(cm);
        var stream = new CodeMirror.StringStream(params.argString.trim());
        while (!stream.eol()) {
          stream.eatSpace();

          // Record the streams position at the beginning of the loop for use
          // in error messages.
          var count = stream.pos;

          if (!stream.match(/[a-zA-Z]/, false)) {
            showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
            return;
          }

          var sym = stream.next();
          // Check if this symbol is part of a range
          if (stream.match('-', true)) {
            // This symbol is part of a range.

            // The range must terminate at an alphabetic character.
            if (!stream.match(/[a-zA-Z]/, false)) {
              showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
              return;
            }

            var startMark = sym;
            var finishMark = stream.next();
            // The range must terminate at an alphabetic character which
            // shares the same case as the start of the range.
            if (isLowerCase(startMark) && isLowerCase(finishMark) ||
                isUpperCase(startMark) && isUpperCase(finishMark)) {
              var start = startMark.charCodeAt(0);
              var finish = finishMark.charCodeAt(0);
              if (start >= finish) {
                showConfirm(cm, 'Invalid argument: ' + params.argString.substring(count));
                return;
              }

              // Because marks are always ASCII values, and we have
              // determined that they are the same case, we can use
              // their char codes to iterate through the defined range.
              for (var j = 0; j <= finish - start; j++) {
                var mark = String.fromCharCode(start + j);
                delete state.marks[mark];
              }
            } else {
              showConfirm(cm, 'Invalid argument: ' + startMark + "-");
              return;
            }
          } else {
            // This symbol is a valid mark, and is not part of a range.
            delete state.marks[sym];
          }
        }
      }
    };

    var exCommandDispatcher = new Vim.ExCommandDispatcher();

    // Register Vim with CodeMirror
    function buildVimKeyMap() {
      /**
       * Handle the raw key event from CodeMirror. Translate the
       * Shift + key modifier to the resulting letter, while preserving other
       * modifers.
       */
      // TODO: Figure out a way to catch capslock.
      function handleKeyEvent_(cm, key, modifier) {
        if (isUpperCase(key)) {
          // Convert to lower case if shift is not the modifier since the key
          // we get from CodeMirror is always upper case.
          if (modifier == 'Shift') {
            modifier = null;
          }
          else {
            key = key.toLowerCase();
          }
        }
        if (modifier) {
          // Vim will parse modifier+key combination as a single key.
          key = modifier + '-' + key;
        }
        vim.handleKey(cm, key);
      }

      // Closure to bind CodeMirror, key, modifier.
      function keyMapper(key, modifier) {
        return function(cm) {
          handleKeyEvent_(cm, key, modifier);
        };
      }

      var modifiers = ['Shift', 'Ctrl'];
      var keyMap = {
        'nofallthrough': true,
        'style': 'fat-cursor'
      };
      function bindKeys(keys, modifier) {
        for (var i = 0; i < keys.length; i++) {
          var key = keys[i];
          if (!modifier && inArray(key, specialSymbols)) {
            // Wrap special symbols with '' because that's how CodeMirror binds
            // them.
            key = "'" + key + "'";
          }
          if (modifier) {
            keyMap[modifier + '-' + key] = keyMapper(keys[i], modifier);
          } else {
            keyMap[key] = keyMapper(keys[i]);
          }
        }
      }
      bindKeys(upperCaseAlphabet);
      bindKeys(upperCaseAlphabet, 'Shift');
      bindKeys(upperCaseAlphabet, 'Ctrl');
      bindKeys(specialSymbols);
      bindKeys(specialSymbols, 'Ctrl');
      bindKeys(numbers);
      bindKeys(numbers, 'Ctrl');
      bindKeys(specialKeys);
      bindKeys(specialKeys, 'Ctrl');
      return keyMap;
    }
    CodeMirror.keyMap.vim = buildVimKeyMap();

    function exitInsertMode(cm) {
      cm.setCursor(cm.getCursor().line, cm.getCursor().ch-1, true);
      cm.setOption('keyMap', 'vim');
    }

    CodeMirror.keyMap['vim-insert'] = {
      // TODO: override navigation keys so that Esc will cancel automatic
      // indentation from o, O, i_<CR>
      'Esc': exitInsertMode,
      'Ctrl-[': exitInsertMode,
      'Ctrl-C': exitInsertMode,
      'Ctrl-N': 'autocomplete',
      'Ctrl-P': 'autocomplete',
      'Enter': function(cm) {
        var fn = CodeMirror.commands.newlineAndIndentContinueComment ||
            CodeMirror.commands.newlineAndIndent;
        fn(cm);
      },
      fallthrough: ['default']
    };

    return vimApi;
  };
  // Initialize Vim and make it available as an API.
  var vim = Vim();
  CodeMirror.Vim = vim;
}
)();
