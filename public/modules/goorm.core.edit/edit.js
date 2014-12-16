/**
 * Copyright Sung-tae Ryu, goormDev Team. All rights reserved.
 * Code licensed under the AGPL v3 License:
 * http://www.goorm.io/intro/License
 * email : contact@goorm.io
 *       : sungtae.ryu@goorm.io
 * project_name : goormIDE
 * version: 2.0.0
 **/

goorm.core.edit = function(parent) {
    this.parent = parent;
    this.target = null;
    this.editor = null;
    this.find_and_replace = null;
    this.filepath = null;
    this.filename = null;
    this.filetype = null;
    this.string_props = null;
    this.array_props = null;
    this.func_props = null;
    this.keywords = null;
    this.collaboration = null;
    this.theme = "default"; //"default", "neat", "elegant", "night", "cobalt"
    this.theme_cursor_highlight_color = "#e8f2ff !important;";
    this.mode = "htmlmixed";
    this.font_size = 11; // minimum size 
    this.default_font_size = 12; // default size
    this.indent_unit = 2;
    this.indent_with_tabs = true;
    this.show_line_numbers = true;
    this.undo_depth = 40;
    this.scroll_top = 0;
    this.highlight_current_cursor_line = true;
    this.current_cursor_line = null; // for cursor line
    this.auto_close_brackets = true;

    //pcs
    this.str_selection = "";
    this.char_left = ""; // for Backspace
    this.char_right = ""; // for Del
    this.str_line = ""; // for Ctrl+D
    this.pressed_key = null;
    //pcs

    this.highlighted_line = null; // for debuging
    this.preference = null;
    this.context_menu = null;
    this.timestamp = null;
    this.fromCh = null;
    this.toCh = null;
    this.breakpoints = [];
    this.vim_mode = false;
    this.fold_func = null;

    this.history = null;
    this.history_ch = null;
    this.history_line = null;

    //auto-complete
    this.dictionary = null;
    //object explorer

    this.nowfont = 15;
    this.now_zoom = 1;
    //this.font_size_control=null;

    // error manager
    this.error_marker = [];
    this.init_change = false;
    this.editor_loaded = false; //jeongmin: for bookmark table in outline tab

    this.dark_themes = ['ambiance', 'blackboard', 'cobalt', 'erlang-dark', 'monokai', 'rubyblue', 'vibrant-ink', 'xq-dark', 'night'];
};

goorm.core.edit.prototype = {
    init: function(target, title, filepath, options) {
        var self = this;

        this.preference = core.preference;

        this.parent = options.parent;
        this.target = target;
        this.title = title;
        this.options = options;
        this.timestamp = new Date().getTime();

        this.highlight_current_cursor_line = this.get_editor_preference('highlight_current_cursor_line');
        this.auto_close_brackets = this.get_editor_preference('auto_close_brackets');
        this.line_wrapping = this.get_editor_preference('line_wrapping');

        this.init_events();
        this.init_modules();

        this.set_dictionary();

        

        this.set_option(this.options);
    },

    init_events: function () {
        var self = this;

        var target = this.target;

        //add new ruler option for codemirror
        CodeMirror.defineOption("rulers", false, function() {

        });

        this.editor = CodeMirror.fromTextArea($(target).find(".code_editor")[0], {
            /* CODEMIRROR 3.x IMPLEMENT */
            gutters: ["exception_error", "breakpoint", "bookmark", "CodeMirror-linenumbers", "fold"],
            foldGutter: {
                gutter: "fold"
            },
            highlightSelectionMatches: false,
            styleActiveLine: self.highlight_current_cursor_line,
            autoCloseBrackets: self.auto_close_brackets,
            autoCloseTags: true,
            /* CODEMIRROR 3.x IMPLEMENTEND */
            lineNumbers: true,
            lineWrapping: self.line_wrapping,
            wordWrap: true,
            matchBrackets: true,
        });

        //unbind CodeMirror key & shaping searching area --heeje
        this.editor.setOption("extraKeys", {
            "Ctrl-G": function() {
                if (self.editor.getSelection() !== "") {
                    $("#find_query_inputbox").val(self.editor.getSelection());
                    if (true) return CodeMirror.PASS;
                }
            },
            "Cmd-G": function() {
                if (self.editor.getSelection() !== "") {
                    $("#find_query_inputbox").val(self.editor.getSelection());
                    if (true) return CodeMirror.PASS;
                }
            },
            "Ctrl-Shift-G": function() {
                if (self.editor.getSelection() !== "") {
                    $("#find_query_inputbox").val(self.editor.getSelection());
                    if (true) return CodeMirror.PASS;
                }
            },
            "Cmd-Shift-G": function() {
                if (self.editor.getSelection() !== "") {
                    $("#find_query_inputbox").val(self.editor.getSelection());
                    if (true) return CodeMirror.PASS;
                }
            }
        });

        

        $(target).mousedown(function(e) {
            // self.dictionary.hide();
            // find target editor
            // var window_manager = core.module.layout.workspace.window_manager;
            // var window_list = window_manager.window;
            // var window_target_idx = -1;
            // for (var i = 0; i < window_list.length; i++) {
            //     if (window_list[i].title == (self.filepath + self.filename)) {
            //         window_target_idx = i;
            //         break;
            //     }
            // }

            // Ryu : Why do this activate window?? window.panel did this already!
            // console.log("edit.js:mousedown");
            // window_manager.window[window_target_idx].activate();

            // Set Current Cursor to parent(panel.js) cursor for set_options
            //
            self.parent.cursor = self.editor.getCursor();

            self.context_menu.menu.hide();

            var window_manager = core.module.layout.workspace.window_manager;

            // jeongmin: remove searching highlight
            if (!core.dialog.find_and_replace.panel.hasClass('in') && !self.parent.searching) {// jeongmin: if doing find and replace, don't remove
                CodeMirror.commands.clearSearch(self.editor);
            }

            //console.log("this may be fucker");

            // e.stopPropagation();
            // e.preventDefault();
            // return false;
        });

        // set searching highlight when drag. Jeong-Min Im.
        $(target).mouseup(function() { // selected string's exist when mouse is up means dragged
            self.str_selection = self.editor.getSelection();
            if (self.str_selection.length > 0 && /^[a-zA-z0-9- ]*$/.test(self.str_selection)) { // except special character
                self.is_selection = true;

                var ranges = self.editor.listSelections();
                var cursor = self.editor.getCursor();
                // if cursor is on the last of the selected word, reverse search direction should be true.
                var reverse = ((ranges[0].to().line < cursor.line) || (ranges[0].to().line == cursor.line && ranges[0].to().ch <= cursor.ch)) ? true : false;

                CodeMirror.commands.find(self.editor, reverse, self.str_selection, true); // RegExp makes conflict with Original CodeMirror serach concept. Don't add RegExp
            }
        });

        $(target).keypress(function(e) {
            if (!(e.which == 115 && e.ctrlKey)) return true;
            self.save();
            e.preventDefault();
            return false;
        });

        $(core).on("on_preference_confirmed", function() {
            self.set_option();
        });

        $(core).on("on_global_preference_confirmed", function() {
            self.set_part_of_option();
        });

        $(target).on("dialogfocus", function(event, ui) {
            var windows = core.module.layout.workspace.window_manager.window;

            $(windows).each(function(index) {
                if (windows[index].editor !== null) {
                    windows[index].editor.editor.scrollTo(0, windows[index].editor.scroll_top);
                }
            });
        });
    },

    init_modules: function () {
        var self = this;

        var options = this.options;

         
        this.codemirror_events();
        

        

        this.dictionary = new goorm.core.edit.dictionary();

        

        this.font_manager = new goorm.core.edit.font_manager();
        this.font_manager.init(this);

        this.error_manager = new goorm.core.edit.error_manager();
        this.error_manager.init(this);

        this.history = (core.module.layout.history) ? core.module.layout.history : null;

        this.context_menu = new goorm.core.menu.context();
        this.context_menu.init("configs/menu/goorm.core.edit/edit.context.html", "edit.context", $(this.target)[0], this.title.replace('.', '_'), null, function() {});
    },

    get_editor_idx: function(total_path) {
        var window_manager = core.module.layout.workspace.window_manager;
        for (var i = 0; i < window_manager.window.length; i++) {
            if (window_manager.window[i].filepath + window_manager.window[i].filename == total_path) return i;
        }
        return -1;
    },

    focus: function() {
        this.editor.focus();
    },

    codemirror_events: function() {
        var self = this;
        var cm_editor = this.editor;

        var __target = $(self.target);

        cm_editor.on("focus", function(i, e) {
            core.status.focus_obj = self;

            var cur = self.editor.getCursor();
            var line = cur.line + 1;
            var ch = cur.ch;

            self.update_editor_status(line, ch);
        });

        cm_editor.on("mousedown", $.throttle(function(i, e) {
            self.parent.activate();
        }, 200));

        cm_editor.on("scroll", $.throttle(function(i, e) {
            var last_scroll_top = self.scroll_top;
            var scroll_top = cm_editor.getScrollInfo().top;
            var changed_scroll_top_val = last_scroll_top - scroll_top;
            var cursors = $('span.user_cursor');

            for (var j = 0; j < cursors.length; j++) {
                var user_cursor = $(cursors[j]);

                var target_id = $(user_cursor).attr('class').split(' ')[0].replace('user_cursor', 'user_name'); // user_cursor_[ID]
                var user_name = $('.' + target_id);

                var user_cursor_top = parseInt(user_cursor.css('top').split('px')[0], 10);
                var user_name_top = parseInt(user_name.css('top').split('px')[0], 10);

                user_cursor.css('top', (user_cursor_top + changed_scroll_top_val) + 'px');
                user_name.css('top', (user_name_top + changed_scroll_top_val) + 'px');

            }

            self.scroll_top = scroll_top;

            self.resize_rulers();

        }, 200));

        var linter_timer = $.debounce(function() {
            core.module.plugin_linter.lint(self.parent);
        }, 1000);

        

        cm_editor.on("change", function(i, e, a) {
            // i = CodeMirror object, e = change informations;
            if (self.editor.history_mode == "history") return;

            

            var window_manager = core.module.layout.workspace.window_manager;
            var my_idx = self.get_editor_idx(self.filepath + self.filename);
            if (self.init_change && my_idx != -1) {
                if (e.origin || self.special_pressed) { // jeongmin: no problem
                    window_manager.window[my_idx].set_modified();
                    window_manager.tab[my_idx].set_modified();
                } else { // jeongmin: change event is occurred before keydown, so wait for coming keydown event
                    $(core).one('undo_redo_pressed', function(e, data) { // data: undo or redo
                        window_manager.window[my_idx].set_modified(data);
                        window_manager.tab[my_idx].set_modified();
                    });
                }
            } else {
                self.init_change = true;
            }

            linter_timer();

            // jeongmin: remove searching highlight
            if (!core.dialog.find_and_replace.panel.hasClass('in') && !self.parent.searching) // jeongmin: if doing find and replace, don't remove
                CodeMirror.commands.clearSearch(self.editor);
        });

        cm_editor.on("cursorActivity", function() {
            if (self.editor.history_mode == "history") return;

            var cur = self.editor.getCursor();
            var line = cur.line + 1;
            var ch = cur.ch;

            self.history_ch = ch;
            self.history_line = line;

            self.update_editor_status(line, ch);

            

            if (self.editor.somethingSelected()) self.str_selection = self.editor.getSelection();
            self.str_line = self.editor.getLine(cur.line);
            self.char_left = self.editor.getRange({
                line: cur.line,
                ch: cur.ch - 1
            }, cur);
            self.char_right = self.editor.getRange(cur, {
                line: cur.line,
                ch: cur.ch + 1
            });
        });

        cm_editor.on("gutterClick", function(codemirror, linenumber, gutter, clickevent) {
            var markerHtml;
            var info = codemirror.lineInfo(linenumber);
            self.editor.refresh();
            switch (self.mode) {
                case "text/x-csrc":
                case "text/x-c++src":
                case "text/x-java":
                case "text/x-python":
                case "text/javascript":
                    //if breakpoint is needed, then add here

                    // if (gutter == "breakpoint" || gutter == "CodeMirror-linenumbers") {
                    if (gutter !== "fold") { // gutter click event --> breakpoint or fold
                        markerHtml = "&#x25cf";
                        cm_editor.setGutterMarker(linenumber, "breakpoint", (info.gutterMarkers && info.gutterMarkers.breakpoint) ? self.remove_marker(linenumber, "breakpoint") : self.make_marker(linenumber, "breakpoint", markerHtml));
                    }

                    self.font_manager.refresh();
                    // window.setTimeout(function(){},);
                    break;
                default:
                    break;
            }

            self.parent.activate();

        });

        var debounce = $.debounce(function() {
            // console.log("trigger", self.filepath + '/' + self.filename + self.options.index + '.window_loaded');
            $(core).trigger(self.filepath + '/' + self.filename + self.options.index + '.window_loaded', self.parent);
            debounce = function() {};
        }, 250);

        cm_editor.on('update', function() {
            // console.log("updated");
            $('.CodeMirror-activeline-background', self.target).attr('style', self.theme_cursor_highlight_color);
            $(self).trigger('editor_update');

            if (self.editor_loaded === true) {
                // console.log(2);
                debounce();
            }
        });

        //onKeyEvent - keydown. Jeong-Min Im.
        __target.on('keydown', function(e) {
            var only = !self.editor.somethingSelected();
            var comment_shortcut = $('[id="preference.shortcut.edit.comment_selected"]').attr('value'); // jeongmin: in case of custom shortcut
            var undo_shortcut = $('[id="preference.shortcut.edit.undo"]').attr('value'); // jeongmin: in case of custom shortcut
            var redo_shortcut = $('[id="preference.shortcut.edit.redo"]').attr('value'); // jeongmin: in case of custom shortcut
            var shortcut_manager = core.module.shortcut_manager;
            var key_string = shortcut_manager.make_shortcut_input(e); // key -> string (e.g. ctrl+s), because 'shortcuts' is string array

            if (e.keyCode == 8 && only) {
                self.pressed_key = "backspace";
            } else if (e.keyCode == 46 && only) {
                self.pressed_key = "del";
            } else if (e.keyCode == 68 && (e.ctrlKey || e.metaKey)) {
                self.pressed_key = "ctrl+d";
            } else {
                self.pressed_key = "other";
                if (only) self.str_selection = self.char_right;
                if (e.keyCode == 219) self.pressed_key = "{";
            }

            if (key_string == comment_shortcut) { // jeongmin: comment_shortcut must not be canceled at beforeChange even if it has special key
                self.special_pressed = true;
            } else if (key_string == undo_shortcut) { // jeongmin: used at beforeChange event
                //console.log("ctrl pressed");
                self.special_pressed = false;

                $(core).trigger('undo_redo_pressed', { // jeongmin: got at change event
                    undo: true,
                    redo: false
                });
            } else if (key_string == redo_shortcut) { // jeongmin: used at beforeChange event
                //console.log("ctrl pressed");
                self.special_pressed = false;

                $(core).trigger('undo_redo_pressed', { // jeongmin: got at change event
                    undo: false,
                    redo: true
                });
            } else {
                //console.log("press false");
                self.special_pressed = false;
            }
            
            if (e.keyIdentifier == "Enter") {
                self.toCh = self.editor.getCursor(false);
                self.fromCh = self.editor.getCursor(true);
                return false;
            }

            if (e.keyCode == 46) {
                e.stopPropagation();
                e.preventDefault();
                return false;
            }

            // jeongmin: if sublime theme is applied, 'Ctrl+K' is special shortcut..
            if (shortcut_manager.theme == 'sublime') {
                if (shortcut_manager.is_theme_key_pressed) { // special key was pressed -> prevent other key handlers. Special key will handle.
                    shortcut_manager.is_theme_key_pressed = false;

                    e.stopPropagation();
                    e.preventDefault();
                    return false;
                } else if ((e.ctrlKey || e.metaKey) && e.keyCode == 75) // special key is now pressed
                    shortcut_manager.is_theme_key_pressed = true;
            }

            // dont block ctrl + x,c,v
            if (((e.ctrlKey || e.metaKey) && (e.which === 88 || e.which === 67 || e.which === 86)) || e.which === 8) { // jeongmin: backspace(8) is done by codemirror. So no need to trigger again.
                //self.pressed_key = 'set_foldable'; // jeongmin: some texts are cut or pasted and these may have {}. So, check foldable.
                return;
            }

            var evt = $.Event('keydown');
            evt.which = e.which;
            evt.keyCode = e.keyCode;
            evt.ctrlKey = e.ctrlKey;
            evt.metaKey = e.metaKey;
            evt.altKey = e.altKey;
            evt.shiftKey = e.shiftKey;

            $(document).trigger(evt, [self.editor, self]); // jeongmin: manually triggered event

            ////// jeongmin: prevent occurring multiple events //////
            if (shortcut_manager.shortcuts.indexOf(key_string) > -1 || shortcut_manager.fixed_shortcut.indexOf(key_string) > -1) { // there is shortcut! So, manually triggered event will do something
                e.stopPropagation(); // and we don't have to propagate original key event
                e.preventDefault();
            }
        });

        //onKeyEvent - keyup. Jeong-Min Im.
        __target.on("keyup", function(e) {
            
        });

        // set searching hightlight when word is selected. Jeong-Min Im.
        cm_editor.on('dblclick', function() {
            if (self.editor.somethingSelected()) {
                self.str_selection = self.editor.getSelection();

                if (self.str_selection.length > 0 && /^[a-zA-z0-9- ]*$/.test(self.str_selection)) // except special character
                    CodeMirror.commands.find(self.editor, true, RegExp('\\b' + self.str_selection + '\\b'), true);
            }
        });
    },

    make_marker: function(linenumber, gutter, markerHtml) { //jeongmin: move these functions out from the codemirror_events for letting set_bookmark also use these
        var marker = document.createElement("div");
        marker.innerHTML = markerHtml;
        marker.className = gutter;
        marker.id = gutter + linenumber;
        $(marker).css("font-size", (this.nowfont) / 2);

        if (this.theme && this.theme !== "default" && this.dark_themes.indexOf(this.theme)) {
            $(marker).css('color', '#ffff66');
        }

        if (gutter == "breakpoint") {
            this.breakpoints.push(linenumber);
            this.breakpoints = jQuery.unique(this.breakpoints);
        }
        return marker;
    },

    remove_marker: function(linenumber, gutter) {
        if (gutter == "breakpoint") {
            var index = jQuery.inArray(linenumber, this.breakpoints);
            this.breakpoints.splice(index, 1);
            this.breakpoints = jQuery.unique(this.breakpoints);
        }
    },

    get_editor_preference: function(pref_name) {
        var preference_type = "preference.editor." + pref_name;
        var type = this.options[pref_name];

        if (type == "true") type = true;
        else if (type == "false") type = false;

        if (this.preference[preference_type] == "true") this.preference[preference_type] = true;
        else if (this.preference[preference_type] == "false") this.preference[preference_type] = false;

        return (type) ? type : ((this.preference[preference_type] !== undefined) ? this.preference[preference_type] : true);
    },

    highlight_line: function(line) {
        if (typeof(line) == "string") line = parseInt(line, 10);

        this.clear_highlight();
        this.highlighted_line = line;

        this.editor.addLineClass(line, "wrap", "highlight_line");
    },

    clear_highlight: function() {
        if (this.highlighted_line) {
            this.editor.removeLineClass(this.highlighted_line, "wrap", "highlight_line");
        }

        $(this.target).find(".CodeMirror-lines .highlight_line").removeClass("highlight_line");

        this.highlighted_line = null;
    },

    //set bookmark that is saved before. Jeong-Min Im.
    set_bookmark: function(bookmark_list, line) { // line: that we want to set bookmark
        var self = this;
        var gutter = "bookmark"; //bookmark gutter
        var cursor_line = (line) ? line - 1 : this.editor.getCursor().line; //get current cursor line

        if (!this.editor) return; //if there is no active editor, do nothing

        if (!bookmark_list) { //new bookmark
            bookmarker(this.editor, gutter, cursor_line);

            return (cursor_line + 1); //return linenumber
        } else { //old bookmark -> load bookmark that was saved before
            for (var saved_line in bookmark_list) { //set bookmarks in the list
                cursor_line = saved_line - 1;
                bookmarker(this.editor, gutter, cursor_line);
            }
        }

        //make bookmarker and toggle it. Jeong-Min Im.
        function bookmarker(cm, gutter, linenumber) {
            var line_handler = cm.getLineHandle(linenumber);
            var marker, marker_class;

            if (!(line_handler.gutterMarkers && line_handler.gutterMarkers.bookmark)) { //set
                marker = document.createElement("div");
                marker_class = "bookmark_icon";

                marker.className = marker_class;
                marker.style.zoom = self.font_manager.now_zoom;
                marker.id = gutter + linenumber;
            } else //clear
                $(line_handler.gutterMarkers[gutter]).remove();

            cm.setGutterMarker(linenumber, gutter, marker);
        }
    },

    set_default_font_size: function() {
        if (this.font_manager) {
            this.font_manager.refresh(this.default_font_size);
        }
    },

    set_cursor: function() {
        if (this.parent && this.parent.cursor) {
            var c = this.parent.cursor;

            this.editor.setCursor(c.line, c.ch);
        }
    },

    clear_rulers: function() {
        $(this.target).find(".CodeMirror-ruler").remove();
    },

    make_rulers: function() {
        var char_width = this.editor.defaultCharWidth();
        var tab_size = this.editor.options.tabSize;
        var tab_width = char_width * tab_size;
        var code_width = $(this.target).find(".CodeMirror-code").width();
        var left = this.editor.charCoords(CodeMirror.Pos(this.editor.firstLine(), 0), "div").left;

		
        for (var i = 0; i < code_width / tab_width; i++) {
            var elt = document.createElement("div");

            elt.className = "CodeMirror-ruler";
            elt.style.cssText = "left: " + (left + i * tab_width) + "px; top: -5px;";
            this.editor.display.lineSpace.insertBefore(elt, this.editor.display.cursorDiv);
        }
        this.resize_rulers();
    },

    refresh_rulers: function() {
        this.clear_rulers();
        this.make_rulers();
    },

    resize_rulers: function() {
        var code_height = $(this.target).find(".CodeMirror-code").height() + 3;
        var window_height = $(this.target).height() - 2;
        var ruler = $(this.target).find(".CodeMirror-ruler");

        if (code_height > window_height) {
            ruler.height(code_height);
        } else {
            ruler.height(window_height);
        }
    },

    set_option: function(options) {
        var self = this;
        var parse_boolean = function (str) {
            if (str === true || str === 'true') {
                return true;
            }
            else {
                return false;
            }
        };

        options = options || {};

        this.font_size = (options.font_size) ? options.font_size : parseInt(this.preference["preference.editor.font_size"], 10);
        this.line_spacing = (options.line_spacing) ? options.line_spacing : this.preference["preference.editor.line_spacing"];
        this.indent_unit = (options.indent_unit) ? options.indent_unit : parseInt(this.preference["preference.editor.indent_unit"], 10);
        this.indent_with_tabs = (options.indent_with_tabs) ? options.indent_with_tabs : this.preference["preference.editor.indent_with_tabs"];
        this.show_line_numbers = (options.show_line_numbers) ? parse_boolean(options.show_line_numbers) : parse_boolean(this.preference["preference.editor.show_line_numbers"]);
        this.undo_depth = (options.undo_depth) ? options.undo_depth : parseInt(this.preference["preference.editor.undo_depth"], 10);
        this.highlight_current_cursor_line = (options.highlight_current_cursor_line) ? options.highlight_current_cursor_line : this.preference["preference.editor.highlight_current_cursor_line"];
        this.theme = (options.theme) ? options.theme : this.preference["preference.editor.theme"];
        this.vim_mode = (options.vim_mode) ? options.vim_mode : false;
        this.line_wrapping = (options.line_wrapping) ? options.line_wrapping : this.preference["preference.editor.line_wrapping"];
        this.rulers = (options.rulers) ? options.rulers : this.preference["preference.editor.rulers"];
        this.scroll_top = (options.scroll_top) ? options.scroll_top : this.scroll_top; // jeongmin: if scroll_top is null, just maintain it. Don't set as 0.
        this.shortcut_theme = (options.shortcut_theme) ? options.shortcut_theme : this.preference["preference.shortcut.theme"]; // jeongmin: set codemirror keymap as theme
        this.readonly = (options.readonly) ? options.readonly : false;

        this.auto_close_brackets = self.get_editor_preference('auto_close_brackets');
        this.highlight_current_cursor_line = self.get_editor_preference('highlight_current_cursor_line');
        this.editor.setOption("styleActiveLine", this.highlight_current_cursor_line);
        this.editor.setOption('autoCloseBrackets', this.auto_close_brackets);
        this.editor.setOption("lineWrapping", this.line_wrapping); // jeongmin: even if these value are false, option must be set
        this.editor.setOption("lineNumbers", this.show_line_numbers);
        this.editor.setOption("indentWithTabs", this.indent_with_tabs);

        if (this.vim_mode) {
            this.editor.setOption("vimMode", true);

            this.add_vim_excommand("quit", "q", function() {
                var window_manager = core.module.layout.workspace.window_manager;
                if (window_manager.window[window_manager.active_window]) {
                    var active_window_title = window_manager.window[window_manager.active_window].title;
                    window_manager.close_by_title(active_window_title);
                }
            });
            CodeMirror.commands.save = function() {
                var window_manager = core.module.layout.workspace.window_manager;

                if (window_manager.active_window < 0) {
                    alert.show(core.module.localization.msg.alert_file_not_opened);
                } else if (window_manager.window[window_manager.active_window]) {
                    if (window_manager.window[window_manager.active_window].editor) {
                        window_manager.window[window_manager.active_window].editor.save();
                    }
                    
                }
            };

            this.add_vim_excommand("wquit", "wq", function() {
                var window_manager = core.module.layout.workspace.window_manager;
                if (window_manager.window[window_manager.active_window]) {
                    if (window_manager.window[window_manager.active_window].editor) {
                        window_manager.window[window_manager.active_window].editor.save("close");
                    }
                }
            });

        } else {
            this.editor.setOption("vimMode", false);
            this.editor.setOption("disableInput", false);
        }
        if (this.shortcut_theme) {
            this.editor.setOption("keyMap", this.shortcut_theme);
            core.module.shortcut_manager.select_theme(this.shortcut_theme);
        }
        if (this.indent_unit) {
            this.editor.setOption("indentUnit", this.indent_unit);
            this.editor.setOption("tabSize", this.indent_unit);
        }
        if (this.indent_with_tabs) {
            if (this.indent_with_tabs === "false") this.indent_with_tabs = false;
            this.editor.setOption("indentWithTabs", this.indent_with_tabs);
        }

        if (this.show_line_numbers) {
            ////// jeongmin: set line numbers inside of gutters //////
            var gutters = this.editor.options.gutters;
            if (gutters[gutters.length - 1] == "CodeMirror-linenumbers") {
                this.editor.options.gutters.splice(3, 0, this.editor.options.gutters.pop());
                $(".CodeMirror-gutter.fold").each(function() {
                    $(this).insertAfter($(this).next());
                });
            }
        }
        if (this.undo_depth && !isNaN(this.undo_depth)) {
            this.editor.setOption("undoDepth", this.undo_depth);
        }
        if (this.theme && this.theme !== "default") {
            $("<link>").attr("rel", "stylesheet").attr("type", "text/css").attr("href", "/lib/codemirror-4.0/theme/" + this.theme + ".css").appendTo("head");

            if (this.dark_themes.indexOf(this.theme) > -1) {
                this.theme_cursor_highlight_color = 'background-color:#eee8aa !important; opacity:0.1 !important';
                $('.CodeMirror-activeline-background').attr('style', this.theme_cursor_highlight_color);
                $('.CodeMirror-gutter-elt .breakpoint').css('color', '#ffff66')
            } else {
                this.theme_cursor_highlight_color = 'background-color:#e8f2ff !important; opacity:0.3 !important';
                $('.CodeMirror-activeline-background').attr('style', this.theme_cursor_highlight_color);
                $('.CodeMirror-gutter-elt .breakpoint').css('color', '#900')
            }

            this.editor.setOption("theme", this.theme);
        }
        if (this.theme == "default") {
            // $("<link>").attr("rel", "stylesheet").attr("type", "text/css").attr("href", "/lib/codemirror-4.0/lib/codemirror.css").appendTo("head");

            this.theme_cursor_highlight_color = 'background-color:#e8f2ff !important;';
            $('.CodeMirror-activeline-background').attr('style', this.theme_cursor_highlight_color);

            this.editor.setOption("theme", this.theme);
        }

        // if (this.line_wrapping) {


        // var line = (options.cursor) ? options.cursor.line : this.editor.getCursor();    // jeongmin: get line

        // this.editor.scrollIntoView(line);    // jeongmin: go to original cursor
        // this.scroll_top = this.editor.getScrollInfo().top;  // jeongmin: refresh scroll
        // }

        if (this.readonly) {
            if (this.readonly === "true") this.readonly = true;
            this.editor.setOption("readOnly", this.readonly);
        }

        var tmp_scroll_top = self.scroll_top;

        self.font_manager.refresh(self.font_size);
        // window.setTimeout(function() {
        var temp = $.debounce(function() {
            self.set_cursor();
            if (tmp_scroll_top !== 0) // jeongmin: no need to scroll
                self.editor.scrollTo(0, tmp_scroll_top);
        }, 1000);
        temp();

    },

    set_part_of_option: function() { // only change some part of options like line wrapping or rulers which should affect all editors.        
        this.line_wrapping = this.preference["preference.editor.line_wrapping"];
        this.rulers = this.preference["preference.editor.rulers"];

        this.editor.setOption("lineWrapping", this.line_wrapping);

        if (this.rulers) {
            this.refresh_rulers();
        } else {
            this.clear_rulers();
        }
    },

    

    load: function(filepath, filename, filetype, options, callback) {
        var self = this;

        options = options || {};
        var url = "/file/get_contents";
        
        this.filepath = filepath;
        this.filename = filename;
        this.filetype = filetype;

        var i = 0;

        var temp_path = "";

        // var check_special_characters = function(str) {
        //     str = str.replace(/([\~\!\@\#\$\%\^\&\*\=\+\|\:\;\?\"\<\>\(\)\[\]\{\}])/g, "\\$1");
        //     return str;
        // };
        
        
        temp_path = filepath + "/" + filename;
        
        var postdata = {
            path: temp_path,
            type: 'get_workspace_file'
        };

        var callback_wrapper = function(is_restore, restore_data) {
            return function(data) {
                self.editor_loaded = true; //jeongmin: for bookmark table in outline tab

                if (data) self.editor.setValue(data);
                else {
                    if (data === false) {
                        alert.show(core.module.localization.msg.alert_open_file_fail);
                        //alert.panel.one('hidden.bs.modal', function(e) {
                        core.module.layout.workspace.window_manager.close_by_index(self.parent.index, self.parent.index);
                        //});

                        

                    } else {
                        self.editor.setValue("");
                    }
                }


                

                self.editor.clearHistory();

                //self.set_foldable();

                //self.set_default_font_size();

                self.set_cursor();

                
                
                self.dictionary.init(self.target, self.editor, self.filetype);
                
                if (!is_restore) {
                    //var window_manager = core.module.layout.workspace.window_manager;
                    //window_manager.window[window_manager.active_window].set_saved();
                    self.parent.set_saved();

                    //window_manager.tab[window_manager.active_window].set_saved();
                    self.parent.tab.set_saved();
                } else {
                    try {
                        // window.setTimeout(function() {
                        var temp = $.debounce(function() {
                            self.editor.setValue(restore_data);
                        }, 1000);
                        temp();
                    } catch (e) {}
                }

                if (options.activated !== false) { // jeongmin: only if this window was activated
                    self.on_activated();
                }

                $(core).trigger("editor_loaded", {
                    filepath: filepath,
                    filename: filename
                }); //jeongmin: editor load event -> set bookmark that is saved before

                self.resize_gutter_height();

                
            };
        };

        var post_url = url + postdata.path.replace(/\:/g, '');
        core._socket.set_url(post_url, true);

        if (!options.restore) {
            core._socket.once(post_url, callback_wrapper(false, null));
            core._socket.emit(url, postdata);
        } else {
            var unsaved_data = '';
            for (i = 0; i < goorm.core.edit.prototype.unsaved_data.length; i++) {
                if (goorm.core.edit.prototype.unsaved_data[i].filename == self.filename && goorm.core.edit.prototype.unsaved_data[i].filepath == self.filepath) {
                    unsaved_data = goorm.core.edit.prototype.unsaved_data[i].data;
                    break;
                }
            }

            core._socket.once(post_url, callback_wrapper(true, unsaved_data));
            core._socket.emit(url, postdata);

        }
    },

    save: function(option, callback) {
        var self = this;
        var url = "/file/put_contents";
        var path = this.filepath + "/" + this.filename;
        var data = this.editor.getValue();
        var send_data = {
            path: path,
            data: data,
            filepath: this.filepath,
            filename: this.filename,
            project_path: path.split('/')[0]
        };

        var target_project_name = path.split("/")[0];
        var target_project_type;
        var tmpdata = core.workspace;

        var save_complete = false;

        // for close & save
        //
        var window_manager = core.module.layout.workspace.window_manager;
        var __window = self.parent;

        // to show state on Goorm IDE bottom
        $("#goorm_bottom").find(".breadcrumb #editor_saved").hide(); // 'Changes saved'
        $("#goorm_bottom").find(".breadcrumb #editor_saving").show(); // 'Saving...'

        var linter_timer = null;
        //$.post('file/check_valid_edit',send_data,function(res){
        core._socket.once("/file/check_valid_edit", function(res) {
            var localization_msg = core.module.localization.msg;

            function put_contents() {
                //$.post(url, send_data, function (data) {
                core._socket.once(url, function(data) {

                    

                    if (data.err_code !== 0) {
                        //fail
                        alert.show(localization_msg.alert_save_file_fail);
                        return false;
                    }

                    var date = new Date();
                    var time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds();


                    __window.set_saved();
                    __window.tab.set_saved();

                    $("#goorm_bottom").find(".breadcrumb #editor_saving").hide();
                    $("#goorm_bottom").find(".breadcrumb #editor_saved").show();

                    if (option == "close") {
                        __window.tab.close(); // jeongmin: tab should be closed before window close. Because tab accesses window.
                        __window.close();
                    }

                    linter_timer = $.debounce(function() {
                        core.module.plugin_linter.__lint(self.parent);
                    }, 500);
                    linter_timer();

                    //object explorer tab refresh when save file
                    var current_file_type = core.module.layout.workspace.window_manager.active_filename.split('.').pop();

                    //workspace project_path
                    //project_type project_type
                    var postdata = {};
                    postdata.workspace = self.filepath.split('/')[0];

                    var active_file = core.module.layout.workspace.window_manager.active_filename;
                    var workspace = active_file.split('/')[0];

                    //to change latest build status once it is true --heeje
                    if (tmpdata[send_data.project_path].is_latest_build) {
                        tmpdata[send_data.project_path].is_latest_build = false;
                        core.module.project.property.save_property(send_data.project_path, tmpdata[send_data.project_path]);
                    }

                    

                    if (option == "build" || option == 'merge' || option == 'logout') {
                        if (callback && typeof(callback) == 'function')
                            callback();
                    }

                    
                });
                core._socket.emit(url, send_data);
            }

            if (!res || !res.result) {
                alert.show(localization_msg.alert_save_file_fail);
                return false;
            } else if (res.exists == false) { // jeongmin: file is deleted
                confirmation.init({
                    message: localization_msg.confirmation_save_deleted_file,
                    yes_text: localization_msg.confirmation_yes,
                    no_text: localization_msg.confirmation_no,
                    title: localization_msg.confirmation_title,

                    yes: function() { // jeongmin: make new file
                        put_contents();
                    },
                    no: function() {} // jeongmin; don't save
                });

                confirmation.show();
            } else { // jeongmin: file exists
                put_contents();
            }
        });
        core._socket.emit("/file/check_valid_edit", send_data);
    },

    get_contents: function() {
        return this.editor.getValue();
    },

    set_dictionary: function() {
        this.string_props = ("charAt charCodeAt indexOf lastIndexOf substring substr slice trim trimLeft trimRight " +
            "toUpperCase toLowerCase split concat match replace search").split(" ");
        this.array_props = ("length concat join splice push pop shift unshift slice reverse sort indexOf " +
            "lastIndexOf every some filter for_each map reduce reduceRight ").split(" ");
        this.func_props = "prototype apply call bind".split(" ");
        this.keywords = ("break case catch continue debugger default delete do else false finally for function " +
            "if in instanceof new null return switch throw true try typeof var void while with").split(" ");
    },

    // do codemirror tern. Jeong-Min Im.
    set_tern: function() {
        var self = this;

        function getURL(url, c) {
            var xhr = new XMLHttpRequest();
            xhr.open("get", url, true);
            xhr.send();
            xhr.onreadystatechange = function() {
                if (xhr.readyState != 4) return;
                if (xhr.status < 400) return c(null, xhr.responseText);
                var e = new Error(xhr.responseText || "No response");
                e.status = xhr.status;
                c(e);
            };
        }

        var server;
        getURL("http://ternjs.net/defs/ecma5.json", function(err, code) {
            if (err) throw new Error("Request for ecma5.json: " + err);
            server = new CodeMirror.TernServer({
                defs: [JSON.parse(code)]
            });
            self.editor.setOption("extraKeys", {
                // "Ctrl-Space": function(cm) {
                //     server.complete(cm);
                // },
                "Ctrl-I": function(cm) {
                    server.showType(cm);
                },
                // "Alt-.": function(cm) {
                //     server.jumpToDef(cm);
                // },
                // "Alt-,": function(cm) {
                //     server.jumpBack(cm);
                // },
                "Ctrl-W": function(cm) {
                    server.rename(cm);
                },
                "Ctrl-.": function(cm) {
                    server.selectName(cm);
                }
            });
            self.editor.on("cursorActivity", function(cm) {
                server.updateArgHints(cm);
            });
        });
    },

    stop_event: function() {
        if (this.preventDefault) {
            this.preventDefault();
            this.stopPropagation();
        } else {
            this.return_value = false;
            this.cancel_bubble = true;
        }
    },

    add_stop: function(event) {
        if (!event.stop) event.stop = this.stop_event;
        return event;
    },

    for_each: function(arr, f) {
        for (var i = 0, e = arr.length; i < e; ++i) f(arr[i]);
    },

    set_mode: function(mode) {
        this.mode = mode;
        this.editor.setOption("mode", mode);
    },

    // toggle_fullscreen_editing: function () {
    //     var editor_div = $(this.target).find('.CodeMirror');

    //     if (!editor_div.hasClass('fullscreen')) {
    //         this.toggle_fullscreen_editing.beforeFullscreen = {
    //             height: editor_div.height(),
    //             width: editor_div.width()
    //         };

    //         editor_div.addClass('fullscreen');
    //         // editor_div.height('100%');
    //         // editor_div.width('100%');
    //         editor_div.css('height', '100%');
    //         editor_div.css('width', '100%');
    //         this.editor.refresh();
    //     } else {
    //         editor_div.removeClass('fullscreen');
    //         editor_div.height(this.toggle_fullscreen_editing.beforeFullscreen.height);
    //         editor_div.width(this.toggle_fullscreen_editing.beforeFullscreen.width);
    //         this.editor.refresh();
    //     }
    // },

    undo: function() {
        //console.log("mungmung");
        // this.editor.doc.undo(); // jeongmin: codemirror shortcut doesn't work properly!! So, manually undo.
        // this.editor.undo(); // jeongmin: just do codemirror undo
        if (this.editor.collaboration) {
            this.editor.collaboration.cmClient.undo();
        }
        else {
            this.editor.undo();
        }

        this.editor.focus();
    },

    redo: function() {
        // this.editor.doc.redo(); // jeongmin: codemirror shortcut doesn't work properly!! So, manually redo.
        // this.editor.redo(); // jeongmin: just do codemirror redo
        if (this.editor.collaboration) {
            this.editor.collaboration.cmClient.redo();
        }
        else {
            this.editor.redo();
        }

        this.editor.focus();
    },

    cut: function() {
        // this.copy();
        // this.editor.replaceSelection("");
    },

    copy: function() {
        var selection = this.editor.getSelection();
        localStorage.clipboard = selection;
    },

    paste: function() {
        this.editor.replaceSelection(localStorage.clipboard);
        this.editor.focus();
    },

    do_delete: function() {
        if (this.editor.getSelection() == "") {
            var cursor_line = this.editor.getCursor().line;
            var cursor_ch = this.editor.getCursor().ch;
            this.editor.setSelection(CodeMirror.Pos(cursor_line, cursor_ch - 1), CodeMirror.Pos(cursor_line, cursor_ch));
        }
        this.editor.replaceSelection("");
        this.editor.focus();
    },

    select_all: function() {
        this.editor.setSelection({
            "line": 0,
            "ch": 0
        }, {
            "line": this.editor.lineCount(),
            "ch": 0
        }, {scroll: false});
    },

    get_selected_range: function() {
        return {
            from: this.editor.getCursor(true),
            to: this.editor.getCursor(false)
        };
    },
    
    monitoring_lines: function(e) {
        var self = this;

        var is_line_deleted = false;
        var is_line_added = false;

        var start_line;
        var end_line;

        var target_line;
        var temp_line;


        if (e.text.length == 1 && e.text[0] === "") is_line_deleted = true;
        if (e.text.length == 2 && e.text[1] === "") is_line_added = true;

        if (is_line_deleted) {
            var delete_line;

            if ((e.to.line - e.from.line) === 0) { // 0 line deleted
                return;
            } else if ((e.to.line - e.from.line) == 1) { // 1 line deleted
                if (parseInt(self.highlighted_line, 10) - 1 == e.to.line) {
                    self.clear_highlight();
                }

                // breakpoints
                var target_line_position = self.breakpoints.indexOf(e.to.line);
                delete_line = 1;

                if (target_line_position != -1) {
                    self.breakpoints.splice(target_line_position, 1);
                }
            } else { // multi line deleted
                start_line = e.to.line - 1;
                end_line = e.from.line;
                delete_line = end_line - start_line;

                for (target_line = start_line; target_line > end_line; target_line--) {
                    //highlights
                    if (parseInt(self.highlighted_line, 10) - 1 == target_line) {
                        self.clear_highlight();
                    }

                    // breakpoints
                    var position = self.breakpoints.indexOf(target_line);
                    if (position != -1)
                        self.breakpoints.splice(position, 1);
                }
            }

            //highlight
            if (self.highlighted_line && parseInt(self.highlighted_line, 10) - 1 > e.to.line) {
                temp_line = self.highlighted_line;
                self.highlight_line((parseInt(temp_line, 10) - delete_line));
            }

            for (target_line = 0; target_line < self.breakpoints.length; target_line++) {
                if (self.breakpoints[target_line] >= e.to.line) self.breakpoints.splice(target_line, 1, (parseInt(self.breakpoints[target_line], 10) - delete_line));
            }

            this.reset_bookmarks(); //jeongmin: reset bookmarks when line is changed
        } else if (is_line_added) {


            if (e.from.ch > 0) start_line = e.to.line + 1;
            else start_line = e.to.line;

            //highlight
            if (self.highlighted_line && parseInt(self.highlighted_line, 10) - 1 >= start_line) {
                temp_line = self.highlighted_line;
                self.highlight_line((parseInt(temp_line, 10) + 1));
            }

            // breakpoints
            for (var i = 0; i < self.breakpoints.length; i++) {
                var line = self.breakpoints[i];

                if (line >= start_line) self.breakpoints.splice(i, 1, (parseInt(line, 10) + 1));
            }

            this.reset_bookmarks(); //jeongmin: reset bookmarks when line is changed
        }

        this.resize_gutter_height();
    },

    reset_breakpoints: function() {

    },

    //if line is changed, reset bookmarks. Jeong-Min Im.
    reset_bookmarks: function() {
        var edit_bookmark = core.module.bookmark; //get bookmark object

        if (edit_bookmark.list[this.target]) { //only when there is bookmark in the list
            var original_list = edit_bookmark.list[this.target]; //save for comment

            edit_bookmark.list[this.target] = {}; //initialize bookmark list

            for (var i = 0; i < this.editor.lineCount(); i++) { //search bookmarks
                var info = this.editor.lineInfo(i); //get line information

                if (info.gutterMarkers && info.gutterMarkers.bookmark) { //if bookmark is set
                    var original_line = parseInt($(info.gutterMarkers.bookmark).attr("id").split("bookmark").pop()),
                        comment = original_list[original_line + 1];

                    edit_bookmark.list[this.target][i + 1] = comment; //add bookmark to the window
                    $(info.gutterMarkers.bookmark).attr("id", "bookmark" + i); //update bookmark's id -> line and comment use this id for updating, so id should be updated every time
                }
            }

            ////// there are no bookmarks //////
            if (Object.keys(edit_bookmark.list[this.target]).length === 0)
                delete edit_bookmark.list[this.target];

            ////// reset others, too //////
            edit_bookmark.outline_tab();
            edit_bookmark.store_json();
        }
    },

    refresh: function() {
        var self = this;

        if (self.highlighted_line)
            this.highlight_line(self.highlighted_line);

        if (this.preference["preference.editor.rulers"] === "true" || this.preference["preference.editor.rulers"] === true) {
            this.refresh_rulers();
        } else {
            this.clear_rulers();
        }

        //editor cursor and effect sync
        this.editor.refresh();
        this.resize_gutter_height();

        
    },

    ////// control gutters bottom empty space. Jeong-Min Im. //////
    resize_gutter_height: function() {
        // console.log("resize_gutter_height() is called");

        // hidden by jeongmin: This prevents scrolling full height

        // if ($(this.target).find('.CodeMirror-vscrollbar').css('display') == 'block') // scroll means small window. Gutter height should not be 100% (100% == small window height..)
        // $(this.target).find('.CodeMirror-gutters.resize_height').removeClass('resize_height'); // resize_height: height 100%
        // else if ($(this.target).find('.CodeMirror-gutters.resize_height').length === 0) // add class only one time
        // $(this.target).find('.CodeMirror-gutters').addClass('resize_height'); // no scroll means big window. Gutter height should be 100% (showing full size)
    },

    on_activated: function() {
        var self = this;

        if (this.editor_loaded) {
            $(core).trigger("bookmark_table_refresh"); //jeongmin: refresh bookmark table in outline tab
        }
        
    },

    find_unsaved_file: function() {
        var docu = core.module.layout.workspace.window_manager.window;
        for (var i = 0; i < docu.length; i++) {
            if (!docu[i].is_saved) {
                return docu[i].filepath + docu[i].filename;
            }
        }
        return "";

    },


    save_unsaved_file_in_local: function() {
        var docu = core.module.layout.workspace.window_manager.window;
        var unsaved_data = [];
        for (var i = 0; i < docu.length; i++) {
            if (!docu[i].is_saved) {
                var path = docu[i].filepath + docu[i].filename;

                unsaved_data.push({
                    'path': path,
                    'filepath': docu[i].filepath,
                    'filename': docu[i].filename,
                    'filetype': docu[i].filetype,
                    'data': docu[i].editor.get_contents()
                });

            }
        }
        if (unsaved_data.length > 0)
            localStorage.unsaved_data = JSON.stringify(unsaved_data);


    },

    restore_unsaved_file_from_local: function() {
        var i, k;

        if (!localStorage.unsaved_data) return false;
        var unsaved_data = JSON.parse(localStorage.unsaved_data);
        if (!unsaved_data || unsaved_data.length === 0) return false;

        //1. already opened in workspace
        var docu = core.module.layout.workspace.window_manager.window;
        var delete_index = [];
        for (k = 0; k < unsaved_data.length; k++) {
            for (i = 0; i < docu.length; i++) {
                if (unsaved_data[k].path == docu[i].filepath + docu[i].filename) {

                    

                }
            }
        }
        delete_index.sort();
        for (i = delete_index.length - 1; i >= 0; i--) {
            unsaved_data.remove(delete_index[i]);
        }


        //2. should open new window
        goorm.core.edit.prototype.unsaved_data = unsaved_data;

        for (i = 0; i < unsaved_data.length; i++) {
            var filepath = unsaved_data[i].filepath;
            var filename = unsaved_data[i].filename;
            var filetype = unsaved_data[i].filetype;
            core.module.layout.workspace.window_manager.open(filepath, filename, filetype, undefined, {
                restore: true
            });
        }
        localStorage.unsaved_data = '';
    },

    set_readonly: function(nocursor) {
        if (nocursor) {
            this.editor.setOption("readOnly", "nocursor");
        } else {
            this.editor.setOption("readOnly", true);
        }

        this.readonly = true;

        this.parent.panel.siblings('.ui-dialog-titlebar').find('.panel_image').addClass('panel_readonly');
    },

    set_editable: function() {
        this.readonly = false;

        this.editor.setOption("readOnly", false);

        this.parent.panel.siblings('.ui-dialog-titlebar').find('.panel_image').removeClass('panel_readonly');
    },

    // resize_all: function(width, height) {
    //     this.refresh();

    //     var code_height = $(this.target).find(".CodeMirror-code").height() + 3;
    //     var window_height = $(this.target).height() - 2;


    //     if (code_height > window_height) {
    //         $(this.target).find(".CodeMirror-ruler").height(parseInt(code_height));
    //     } else {
    //         $(this.target).find(".CodeMirror-ruler").height(parseInt(window_height));
    //     }
    // },

    update_editor_status: function(line, ch) {
        var self = this;
        $('#editor_status span.line').html("Line: " + line);
        $('#editor_status span.coloumn').html("Col: " + ch);
        $("#goorm_bottom").find(".breadcrumb .zoom_percent").text(self.font_manager.font_percent + "%");
    },

    add_vim_excommand: function(name, prefix, func) {
        CodeMirror.Vim.defineEx(name, prefix, func);
    }
};