// Source Control's file editor's Monaco (web/editor/monaco.js): VS Code's own editor with all its editing features, for
// the files a chat's ⌘-click opens and ⌘N's new ones (web/file-editor.js). Its languages' own tokenizers stay out: VS
// Code's TextMate grammars (web/tm) colour the code, as in Source Control's diff. Each language keeps its configuration
// (comments, brackets, what ↩ indents), and JSON its language service (problems, formatting). TypeScript's, CSS's and
// HTML's services stay out: without the project around a file they'd only report its imports missing.
import * as monaco from 'monaco-editor/editor/editor.api.js';
import 'monaco-editor/internal/common/workers.js';
import { jsonDefaults } from 'monaco-editor/languages/features/json/register.js';
import { Marked } from 'monaco-editor/base/common/marked/marked.js';
import purify from 'monaco-editor/base/browser/dompurify/dompurify.js';
import { conf as bat } from 'monaco-editor/languages/definitions/bat/bat.js';
import { conf as clojure } from 'monaco-editor/languages/definitions/clojure/clojure.js';
import { conf as coffee } from 'monaco-editor/languages/definitions/coffee/coffee.js';
import { conf as cpp } from 'monaco-editor/languages/definitions/cpp/cpp.js';
import { conf as csharp } from 'monaco-editor/languages/definitions/csharp/csharp.js';
import { conf as css } from 'monaco-editor/languages/definitions/css/css.js';
import { conf as dart } from 'monaco-editor/languages/definitions/dart/dart.js';
import { conf as dockerfile } from 'monaco-editor/languages/definitions/dockerfile/dockerfile.js';
import { conf as fsharp } from 'monaco-editor/languages/definitions/fsharp/fsharp.js';
import { conf as go } from 'monaco-editor/languages/definitions/go/go.js';
import { conf as handlebars } from 'monaco-editor/languages/definitions/handlebars/handlebars.js';
import { conf as html } from 'monaco-editor/languages/definitions/html/html.js';
import { conf as ini } from 'monaco-editor/languages/definitions/ini/ini.js';
import { conf as java } from 'monaco-editor/languages/definitions/java/java.js';
import { conf as javascript } from 'monaco-editor/languages/definitions/javascript/javascript.js';
import { conf as julia } from 'monaco-editor/languages/definitions/julia/julia.js';
import { conf as less } from 'monaco-editor/languages/definitions/less/less.js';
import { conf as lua } from 'monaco-editor/languages/definitions/lua/lua.js';
import { conf as markdown } from 'monaco-editor/languages/definitions/markdown/markdown.js';
import { conf as objc } from 'monaco-editor/languages/definitions/objective-c/objective-c.js';
import { conf as perl } from 'monaco-editor/languages/definitions/perl/perl.js';
import { conf as php } from 'monaco-editor/languages/definitions/php/php.js';
import { conf as powershell } from 'monaco-editor/languages/definitions/powershell/powershell.js';
import { conf as pug } from 'monaco-editor/languages/definitions/pug/pug.js';
import { conf as python } from 'monaco-editor/languages/definitions/python/python.js';
import { conf as r } from 'monaco-editor/languages/definitions/r/r.js';
import { conf as razor } from 'monaco-editor/languages/definitions/razor/razor.js';
import { conf as rst } from 'monaco-editor/languages/definitions/restructuredtext/restructuredtext.js';
import { conf as ruby } from 'monaco-editor/languages/definitions/ruby/ruby.js';
import { conf as rust } from 'monaco-editor/languages/definitions/rust/rust.js';
import { conf as scss } from 'monaco-editor/languages/definitions/scss/scss.js';
import { conf as shell } from 'monaco-editor/languages/definitions/shell/shell.js';
import { conf as sql } from 'monaco-editor/languages/definitions/sql/sql.js';
import { conf as swift } from 'monaco-editor/languages/definitions/swift/swift.js';
import { conf as typescript } from 'monaco-editor/languages/definitions/typescript/typescript.js';
import { conf as vb } from 'monaco-editor/languages/definitions/vb/vb.js';
import { conf as xml } from 'monaco-editor/languages/definitions/xml/xml.js';
import { conf as yaml } from 'monaco-editor/languages/definitions/yaml/yaml.js';

// Each TextMate grammar's language configuration: Monaco's for that language, or one with the same comments.
const conf = {
  'source.batchfile': bat, 'source.clojure': clojure, 'source.coffee': coffee, 'source.c': cpp, 'source.hlsl': cpp,
  'source.shaderlab': cpp, 'source.cs': csharp, 'source.css': css, 'source.dart': dart, 'source.dockerfile': dockerfile,
  'source.fsharp': fsharp, 'source.go': go, 'text.html.handlebars': handlebars, 'text.html.basic': html,
  'text.html.derivative': html, 'source.ini': ini, 'source.java': java, 'source.groovy': java, 'source.js': javascript,
  'source.js.jsx': javascript, 'source.julia': julia, 'source.css.less': less, 'source.lua': lua,
  'text.html.markdown': markdown, 'source.objc': objc, 'source.perl': perl, 'source.php': php, 'text.html.php': php,
  'source.powershell': powershell, 'text.pug': pug, 'source.python': python, 'source.r': r, 'source.razor': razor,
  'source.rst': rst, 'source.ruby': ruby, 'source.rust': rust, 'source.css.scss': scss, 'source.shell': shell,
  'source.makefile': shell, 'source.env': shell, 'source.ignore': shell, 'source.yaml': yaml, 'source.sql': sql,
  'source.swift': swift, 'source.ts': typescript, 'source.tsx': typescript, 'source.prisma': typescript,
  'source.asp.vb.net': vb, 'text.xml': xml, 'text.xml.xsl': xml,
};

window.monaco = monaco;
window.MonacoExtras = { conf, jsonDefaults, Marked, purify };
