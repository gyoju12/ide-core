// Copyright (c) 2011, the Dart project authors.  Please see the AUTHORS file
// for details. All rights reserved. Use of this source code is governed by a
// BSD-style license that can be found in the LICENSE file.

CodeMirror.defineMode("dart", function(config, parserConfig) {
  var indentUnit = config.indentUnit;

  // Tokenizer
  //https://dart.googlecode.com/svn/branches/bleeding_edge/dart/language/grammar/Dart.g
  var keywords = function(){
    function kw(type) {return {type: type, style: "keyword"};}
    var A = kw("keyword a"), B = kw("keyword b"), C = kw("keyword c");
    var operator = kw("operator"), atom = {type: "atom", style: "atom"}, directive = atom;
    return {
      //keywords
      "break": C,
      "case": kw("case"),
      "catch": kw("catch"),
      "class" : kw("class"),
      "const": kw("const"),
      "continue": C,
      "default": kw("default"),
      "do": B,
      "else": B,
      "false": atom,
      "final": kw("final"),
      "finally": B,
      "for": kw("for"),
      "if": A,
      "in": operator,
      "new": C,
      "null": atom,
      "return": C,
      "super": kw("super"),
      "switch": kw("switch"),
      "this": kw("this"),
      "throw": C,
      "true": atom,
      "try": B,
      "var": kw("var"),
      "void" : kw("void"),
      "while": A,
      //pseudo-keywords
      "abstract" : kw("abstract"),
      "assert" : kw("assert"),
      "extends" : kw("extends"),
      "factory" : kw("factory"),
      "get" : kw("get"),
      "implements" : kw("implements"),
      "interface": kw("interface"),
      "is" : kw("is"),
      "native" : kw("native"),
      "negate" : kw("negate"),
      "operator" : kw("operator"),
      "set" : kw("set"),
      "static" : kw("static"),
      "typedef" : kw("typedef"),
      //directives
      "#import" : directive,
      "#library" : directive,
      "#native" : directive,
      "#resource" : directive,
      "#source" : directive
    };
  }();


  var isOperatorChar = /[+\-*&%=<>!?|^~]/;

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

  function getQuote(stream, ch) {
    if (ch == '"')
      return stream.match('"""', false) ? '"""' : '"';
    return stream.match("'''", false) ? "'''" : "'";
  }

  function pushStringState(state, isRaw, quoteSequence) {
    state.stringState = {
      previous: state.stringState,
      raw: isRaw,
      quote: quoteSequence,
      braceCount: 0
    };
    return state.stringState;
  }

  function popStringState(state) {
    state.stringState = state.stringState.previous;
  }

  function dartTokenBase(stream, state) {
    var ch = stream.peek();
    if (ch == '"' || ch == "'") {
      pushStringState(state, false, getQuote(stream, ch));
      if (state.tokenize == dartTokenStringInterp) {
        state.tokenize = dartTokenStartString;
        return ret("variable", "variable");
      }
      return chain(stream, state, dartTokenStartString);
    }
    else if (ch == '@') {
      if (state.tokenize == dartTokenStringInterp) {
        state.tokenize = dartTokenStartRawString;
        return ret("variable", "variable");
      }
      return chain(stream, state, dartTokenStartRawString);
    }
    stream.next();
    if (/[\[\]{}\(\),;\:\.]/.test(ch))
      return ret(ch);
    else if (ch == "0" && stream.eat(/x/i)) {
      stream.eatWhile(/[\da-fA-F]/i);
      return ret("number", "number");
    }
    else if (/\d/.test(ch)) {
      stream.match(/^\d*(?:\.\d*)?(?:e[+\-]?\d+)?/);
      return ret("number", "number");
    }
    else if (ch == "/") {
      if (stream.eat("*")) {
        state.commentDepth++;
        return chain(stream, state, dartTokenComment);
      }
      else if (stream.eat("/")) {
        stream.skipToEnd();
        return ret("comment", "comment");
      }
      else {
        stream.eatWhile(isOperatorChar);
        return ret("operator", null, stream.current());
      }
    }
    else if (isOperatorChar.test(ch)) {
      stream.eatWhile(isOperatorChar);
      return ret("operator", null, stream.current());
    }
    else {
      stream.eatWhile(/[\w\$_]/);
      var word = stream.current(), known = keywords.propertyIsEnumerable(word) && keywords[word];
      return known ? ret(known.type, known.style, word) :
                     ret("variable", "variable", word);
    }
  }

  function dartTokenStartRawString(stream, state) {
    stream.next(); // eat the @
    var ch = stream.peek();
    if (ch == '"' || ch == "'") {
      pushStringState(state, true, getQuote(stream, ch));
      return chain(stream, state, dartTokenStartString);
    }
    return ret("string", "string");
  }

  function dartTokenStartString(stream, state) {
    stream.match(state.stringState.quote, true);
    return chain(stream, state, dartTokenString);
  }

  function dartTokenString(stream, state) {
    var ch;
    while (ch = stream.peek()) {
      if (stream.match(state.stringState.quote)) {
        popStringState(state);
        if (state.stringState)
          state.tokenize = dartTokenStringInterp;
        else
          state.tokenize = dartTokenBase;
        break;
      }
      else if (ch == '\\') {
        stream.next();
      }
      else if (!state.stringState.raw && ch == '$') {
        state.tokenize = dartTokenStartStringInterp;
        break;
      }
      stream.next();
    }
    return ret("string", "string");
  }

  function dartTokenStartStringInterp(stream, state) {
    var ch = stream.next(); // eat the $
    if (!(ch = stream.peek())) {
      state.tokenize = dartTokenString;
      //TODO(pquitslund): find a better CSS class
      return ret("variable", "variable");
    }
    else if (ch == '{') {
      var ch = stream.next(); // eat the {
      return chain(stream, state, dartTokenStringInterp);
    }
    stream.eatWhile(/[\w_]/);
    state.tokenize = dartTokenString;
    //TODO(pquitslund): find a better CSS class
    return ret("variable", "variable");
  }

  function dartTokenStringInterp(stream, state) {
    var ch;
    if (!(ch = stream.peek())) {
      //TODO(pquitslund): find a better CSS class
      return ret("variable", "variable");
    }
    else if (ch == '}') {
      stream.next(); // eat the }
      if (state.stringState.braceCount == 0) {
        state.tokenize = dartTokenString;
        //TODO(pquitslund): find a better CSS class
        return ret("variable", "variable");
      }
      state.stringState.braceCount--;
    }
    else if (ch == '{') {
      state.stringState.braceCount++;
    }
    return dartTokenBase(stream, state);
  }

  function dartTokenComment(stream, state) {
    var maybeEnd = false, maybeStart = false, ch;
    while (ch = stream.next()) {
      if (ch == "/") {
        if (maybeEnd) {
          state.commentDepth--;
          maybeStart = false;
          maybeEnd = false;
          if (state.commentDepth == 0) {
            if (state.stringState)
              state.tokenize = dartTokenStringInterp;
            else
              state.tokenize = dartTokenBase;
            break;
          }
        }
        else {
          maybeStart = true;
        }
      }
      else if (ch == "*") {
        if (maybeStart) {
          state.commentDepth++;
          maybeStart = false;
          maybeEnd = false;
        }
        else {
          maybeEnd = true;
        }
      }
    }
    return ret("comment", "comment");
  }

  // Parser

  var atomicTypes = {"atom": true, "number": true, "variable": true, "string": true, "regexp": true};

  function DartLexical(indented, column, type, align, prev, info) {
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

  function parseDart(state, style, type, content, stream) {
    var cc = state.cc;
    // Communicate our context to the combinators.
    // (Less wasteful than consing up a hundred closures on every call.)
    cx.state = state; cx.stream = stream; cx.marked = null, cx.cc = cc;

    if (!state.lexical.hasOwnProperty("align"))
      state.lexical.align = true;

    while(true) {
      var combinator = cc.length ? cc.pop() : statement;
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
    var state = cx.state;
    if (state.context) {
      cx.marked = "def";
      for (var v = state.localVars; v; v = v.next)
        if (v.name == varname) return;
      state.localVars = {name: varname, next: state.localVars};
    }
  }

  // Combinators

  var defaultVars = {name: "this", next: {name: "arguments"}};
  function pushcontext() {
    if (!cx.state.context) cx.state.localVars = defaultVars;
    cx.state.context = {prev: cx.state.context, vars: cx.state.localVars};
  }
  function popcontext() {
    cx.state.localVars = cx.state.context.vars;
    cx.state.context = cx.state.context.prev;
  }
  function pushlex(type, info) {
    var result = function() {
      var state = cx.state;
      state.lexical = new DartLexical(state.indented, cx.stream.column(), type, null, state.lexical, info);
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
    return function expecting(type) {
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
    if (atomicTypes.hasOwnProperty(type)) return cont(maybeoperator);
    if (type == "function") return cont(functiondef);
    if (type == "keyword c") return cont(expression);
    if (type == "(") return cont(pushlex(")"), expression, expect(")"), poplex, maybeoperator);
    if (type == "operator") return cont(expression);
    if (type == "[") return cont(pushlex("]"), commasep(expression, "]"), poplex, maybeoperator);
    if (type == "{") return cont(pushlex("}"), commasep(objprop, "}"), poplex, maybeoperator);
    return cont();
  }
  function maybeoperator(type, value) {
    if (type == "operator" && /\+\+|--/.test(value)) return cont(maybeoperator);
    if (type == "operator") return cont(expression);
    if (type == ";") return;
    if (type == "(") return cont(pushlex(")"), commasep(expression, ")"), poplex, maybeoperator);
    if (type == ".") return cont(property, maybeoperator);
    if (type == "[") return cont(pushlex("]"), expression, expect("]"), poplex, maybeoperator);
  }
  function maybelabel(type) {
    if (type == ":") return cont(poplex, statement);
    return pass(maybeoperator, expect(";"), poplex);
  }
  function property(type) {
    if (type == "variable") {cx.marked = "property"; return cont();}
  }
  function objprop(type) {
    if (type == "variable") cx.marked = "property";
    if (atomicTypes.hasOwnProperty(type)) return cont(expect(":"), expression);
  }
  function commasep(what, end) {
    function proceed(type) {
      if (type == ",") return cont(what, proceed);
      if (type == end) return cont();
      return cont(expect(end));
    }
    return function commaSeparated(type) {
      if (type == end) return cont();
      else return pass(what, proceed);
    };
  }
  function block(type) {
    if (type == "}") return cont();
    return pass(statement, block);
  }
  function vardef1(type, value) {
    if (type == "variable"){register(value); return cont(vardef2);}
    return cont();
  }
  function vardef2(type, value) {
    if (value == "=") return cont(expression, vardef2);
    if (type == ",") return cont(vardef1);
  }
  function forspec1(type) {
    if (type == "var") return cont(vardef1, forspec2);
    if (type == ";") return pass(forspec2);
    if (type == "variable") return cont(formaybein);
    return pass(forspec2);
  }
  function formaybein(type, value) {
    if (value == "in") return cont(expression);
    return cont(maybeoperator, forspec2);
  }
  function forspec2(type, value) {
    if (type == ";") return cont(forspec3);
    if (value == "in") return cont(expression);
    return cont(expression, expect(";"), forspec3);
  }
  function forspec3(type) {
    if (type != ")") cont(expression);
  }
  function functiondef(type, value) {
    if (type == "variable") {register(value); return cont(functiondef);}
    if (type == "(") return cont(pushlex(")"), pushcontext, commasep(funarg, ")"), poplex, statement, popcontext);
  }
  function funarg(type, value) {
    if (type == "variable") {register(value); return cont();}
  }

  // Interface

  return {
    startState: function(basecolumn) {
      return {
        tokenize: dartTokenBase,
        cc: [],
        lexical: new DartLexical((basecolumn || 0) - indentUnit, 0, "block", false),
        localVars: null,
        context: null,
        indented: 0,
        stringState: null,
        commentDepth: 0
      };
    },

    token: function(stream, state) {
      if (stream.sol()) {
        if (!state.lexical.hasOwnProperty("align"))
          state.lexical.align = false;
        state.indented = stream.indentation();
      }
      if (stream.eatSpace()) return null;
      var style = state.tokenize(stream, state);
      if (type == "comment") return style;
      return parseDart(state, style, type, content, stream);
    },

    indent: function(state, textAfter) {
      if (state.tokenize != dartTokenBase) return 0;
      var firstChar = textAfter && textAfter.charAt(0), lexical = state.lexical,
          type = lexical.type, closing = firstChar == type;
      if (type == "vardef") return lexical.indented + 4;
      else if (type == "form" && firstChar == "{") return lexical.indented;
      else if (type == "stat" || type == "form") return lexical.indented + indentUnit;
      else if (lexical.info == "switch" && !closing)
        return lexical.indented + (/^(?:case|default)\b/.test(textAfter) ? indentUnit : 2 * indentUnit);
      else if (lexical.align) return lexical.column + (closing ? 0 : 1);
      else return lexical.indented + (closing ? 0 : indentUnit);
    },

    electricChars: ":{}",
    blockCommentStart: "/*",
    blockCommentEnd: "*/",
    lineComment: "//"
  };
});

CodeMirror.defineMIME("text/dart", "dart");