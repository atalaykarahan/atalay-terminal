#!/usr/bin/env python3
"""Source Control's look, taken from the VS Code on this Mac (and its extensions), into Resources/web:

  codicon.ttf         VS Code's icon font
  git-icons.js        the Material Icon Theme's file icons, for the file types repos usually hold
  tm/textmate.js      vscode-textmate and vscode-oniguruma (with its wasm), VS Code's own syntax highlighter
  tm/theme.js         the colour theme's token colours (the user's theme, GitHub Dark Default)
  tm/languages.js     file names and extensions -> grammar scopes
  tm/grammars/*.js    the grammars of the languages repos usually hold (an extension's over the built-in one)

Run it again after a VS Code update: tools/vscode-assets.py
"""
import base64, glob, json, os, re, shutil, struct

APP = '/Applications/Visual Studio Code.app/Contents/Resources/app'
USER_EXT = os.path.expanduser('~/.vscode/extensions')
SETTINGS = os.path.expanduser('~/Library/Application Support/Code/User/settings.json')
WEB = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'Resources', 'web')
TM = os.path.join(WEB, 'tm')

# The grammars shipped: what repos usually hold (C++ and friends are half a megabyte each and left out).
SCOPES = [
    'source.ts', 'source.tsx', 'source.js', 'source.js.jsx', 'source.css', 'source.css.scss', 'source.css.less',
    'source.json', 'source.json.comments', 'source.json.lines', 'text.html.markdown', 'text.html.basic', 'text.html.derivative',
    'source.swift', 'source.python', 'source.shell', 'source.yaml', 'source.sql', 'source.dockerfile', 'source.makefile',
    'text.xml', 'source.ini', 'source.ruby', 'source.rust', 'source.go', 'source.java', 'source.c', 'source.objc',
    'source.prisma', 'source.env', 'source.diff', 'git-commit', 'text.git-commit', 'source.ignore', 'source.batchfile',
    'source.powershell', 'source.lua', 'source.dart', 'source.cs', 'source.php', 'text.html.php', 'source.perl',
    'source.groovy', 'source.r', 'source.julia', 'source.clojure', 'source.coffee', 'source.fsharp', 'source.vb',
    'text.pug', 'source.hlsl', 'source.shaderlab', 'source.handlebars', 'text.html.handlebars', 'source.razor',
]


def read_json(path):
    text = open(path, encoding='utf-8').read()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        # JSON with comments and trailing commas (settings, some grammars)
        text = re.sub(r'(?m)^\s*//.*$', '', text)
        text = re.sub(r',(\s*[}\]])', r'\1', text)
        return json.loads(text)


def extensions():
    """Every extension's folder and manifest: the built-in ones first, the user's after (an extension wins)."""
    out = []
    for root in (os.path.join(APP, 'extensions'), USER_EXT):
        for pj in sorted(glob.glob(os.path.join(root, '*', 'package.json'))):
            try:
                out.append((os.path.dirname(pj), read_json(pj)))
            except Exception:
                pass
    return out


def asar_files(archive, wanted):
    """Files of an asar archive whose path holds one of `wanted`: path -> bytes."""
    f = open(archive, 'rb')
    head = f.read(16)
    header_size = struct.unpack('<I', head[4:8])[0]
    json_size = struct.unpack('<I', head[12:16])[0]
    header = json.loads(f.read(json_size))
    base = 8 + header_size
    out = {}

    def walk(node, path):
        for name, entry in node.get('files', {}).items():
            p = f'{path}/{name}'
            if 'files' in entry:
                walk(entry, p)
            elif any(w in p for w in wanted):
                if entry.get('unpacked'):
                    out[p] = open(archive + '.unpacked' + p, 'rb').read()
                else:
                    f.seek(base + int(entry['offset']))
                    out[p] = f.read(entry['size'])

    walk(header, '')
    return out


def codicons():
    shutil.copy(os.path.join(APP, 'out', 'media', 'codicon.ttf'), os.path.join(WEB, 'codicon.ttf'))


def file_icons():
    folder = sorted(glob.glob(os.path.join(USER_EXT, 'pkief.material-icon-theme-*')))[-1]
    d = read_json(os.path.join(folder, 'dist', 'material-icons.json'))
    exts = ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts', 'tsx', 'jsx', 'd.ts', 'spec.ts', 'test.ts', 'spec.js', 'test.js', 'json', 'jsonc',
            'css', 'scss', 'sass', 'less', 'html', 'htm', 'md', 'mdx', 'swift', 'go', 'py', 'sql', 'sh', 'zsh', 'bash', 'yml', 'yaml',
            'png', 'jpg', 'jpeg', 'gif', 'webp', 'ico', 'icns', 'bmp', 'svg', 'lock', 'toml', 'txt', 'env', 'xml', 'plist', 'rs',
            'java', 'kt', 'rb', 'php', 'c', 'cpp', 'cc', 'h', 'hpp', 'm', 'mm', 'vue', 'svelte', 'csv', 'log', 'ttf', 'otf', 'woff',
            'woff2', 'pdf', 'zip', 'gz', 'tgz', 'mov', 'mp4', 'webm', 'wav', 'mp3', 'graphql', 'gql', 'proto', 'ini', 'conf', 'cfg',
            'prisma', 'tf', 'dart', 'lua', 'r', 'cs', 'ex', 'exs', 'zig', 'dockerfile', 'dockerignore', 'gitignore', 'gitattributes',
            'gitkeep', 'editorconfig', 'http', 'patch', 'diff', 'ipynb', 'wasm', 'pem', 'key', 'crt', 'sqlite', 'db']
    names = ['readme.md', 'license', 'license.md', 'license.txt', 'changelog.md', 'dockerfile', 'docker-compose.yml',
             'docker-compose.yaml', 'compose.yml', 'compose.yaml', 'makefile', 'package.json', 'package-lock.json', 'yarn.lock',
             'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'bun.lockb', 'bun.lock', 'tsconfig.json', 'jsconfig.json', '.gitignore',
             '.gitattributes', '.gitmodules', '.npmrc', '.nvmrc', '.editorconfig', '.prettierrc', '.prettierrc.json',
             '.prettierignore', '.eslintrc', '.eslintrc.json', '.eslintrc.js', 'eslint.config.js', 'eslint.config.mjs',
             'vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'next.config.js', 'next.config.mjs', 'next.config.ts',
             'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.mjs', 'jest.config.js',
             'jest.config.ts', 'vitest.config.ts', 'go.mod', 'go.sum', 'requirements.txt', 'pyproject.toml', 'gemfile', 'procfile',
             'nginx.conf', 'turbo.json', 'drizzle.config.ts', 'agents.md', '.babelrc', 'webpack.config.js', '.env.local',
             '.env.example', '.env.development', '.env.production', '.dockerignore', 'vercel.json', 'netlify.toml',
             'favicon.ico', 'robots.txt', 'manifest.json']
    lang = {'js': 'javascript', 'ts': 'typescript', 'json': 'json', 'css': 'css', 'html': 'html', 'md': 'markdown', 'swift': 'swift',
            'go': 'go', 'py': 'python', 'sql': 'database', 'sh': 'console', 'yml': 'yaml', 'yaml': 'yaml', 'xml': 'xml',
            'txt': 'document', 'dockerfile': 'docker', 'makefile': 'settings', 'rb': 'ruby', 'rs': 'rust', 'java': 'java',
            'php': 'php', 'c': 'c', 'cpp': 'cpp', 'toml': 'toml', 'ini': 'settings', 'conf': 'settings', 'cfg': 'settings',
            'htm': 'html', 'jsonc': 'json', 'plist': 'xml', 'bash': 'console', 'zsh': 'console'}
    emap, nmap, icons = {}, {}, {'file'}
    for e in exts:
        if d['fileExtensions'].get(e):
            emap[e] = d['fileExtensions'][e]
    for e, n in lang.items():
        if e not in emap and n in d['iconDefinitions']:
            emap[e] = n
    for n in names:
        if d['fileNames'].get(n):
            nmap[n] = d['fileNames'][n]
    icons |= set(emap.values()) | set(nmap.values())
    svgs = {}
    for n in sorted(icons):
        s = open(os.path.normpath(os.path.join(folder, 'dist', d['iconDefinitions'][n]['iconPath'])), encoding='utf-8').read()
        s = re.sub(r'<\?xml[^>]*>', '', s)
        s = re.sub(r'<!--.*?-->', '', s, flags=re.S)
        svgs[n] = re.sub(r'\s+', ' ', s).strip().replace('> <', '><')
    lic = open(os.path.join(folder, 'LICENSE.txt'), encoding='utf-8').read().strip()
    with open(os.path.join(WEB, 'git-icons.js'), 'w', encoding='utf-8') as out:
        out.write("'use strict';\n\n// The file icons of the Material Icon Theme (the icon theme of the user's VS Code), for the file types repos usually\n"
                  "// hold: name -> svg, extension and file name -> icon, as VS Code matches them (file name first, then the longest\n"
                  "// extension). Made by tools/vscode-assets.py.\n/*\n" + lic + "\n*/\n"
                  "window.GitIcons = " + json.dumps({'svg': svgs, 'ext': emap, 'names': nmap}, separators=(',', ':'), ensure_ascii=False) + ";\n")


def textmate():
    os.makedirs(os.path.join(TM, 'grammars'), exist_ok=True)
    files = asar_files(os.path.join(APP, 'node_modules.asar'), ('/vscode-textmate/', '/vscode-oniguruma/'))
    pick = lambda end: next(v for k, v in files.items() if k.endswith(end)).decode('utf-8')
    wasm = next(v for k, v in files.items() if k.endswith('/vscode-oniguruma/release/onig.wasm'))
    with open(os.path.join(TM, 'textmate.js'), 'w', encoding='utf-8') as out:
        out.write("// vscode-textmate and vscode-oniguruma, VS Code's syntax highlighter (MIT, Microsoft; Oniguruma: BSD, K. Kosako),\n"
                  "// taken from the VS Code on this Mac by tools/vscode-assets.py. Their licences: tm/LICENSES.txt.\n")
        out.write(pick('/vscode-oniguruma/release/main.js') + '\n')
        out.write(pick('/vscode-textmate/release/main.js') + '\n')
        out.write('window.__onigWasm = "' + base64.b64encode(wasm).decode('ascii') + '";\n')
    with open(os.path.join(TM, 'LICENSES.txt'), 'w', encoding='utf-8') as out:
        for end in ('/vscode-textmate/LICENSE.md', '/vscode-oniguruma/LICENSE.txt', '/vscode-oniguruma/NOTICES.txt'):
            out.write(f'===== {end.strip("/")} =====\n' + pick(end) + '\n\n')
        out.write('===== the grammars =====\nFrom VS Code (MIT, Microsoft) and the extensions named in each grammar file, under their licences.\n')


def theme():
    settings = read_json(SETTINGS)
    label = settings.get('workbench.colorTheme', 'Dark Modern')
    for folder, manifest in extensions():
        for t in manifest.get('contributes', {}).get('themes', []):
            if t.get('label') == label or t.get('id') == label:
                d = read_json(os.path.normpath(os.path.join(folder, t['path'])))
                colors = d.get('colors', {})
                raw = {'name': label, 'settings': [{'settings': {'foreground': colors.get('editor.foreground', '#d4d4d4'),
                                                               'background': colors.get('editor.background', '#1e1e1e')}}]
                       + d.get('tokenColors', [])}
                with open(os.path.join(TM, 'theme.js'), 'w', encoding='utf-8') as out:
                    out.write(f"// The token colours of the user's VS Code theme ({label}), from {os.path.basename(folder)}.\n")
                    out.write('window.__tmTheme = ' + json.dumps(raw, separators=(',', ':')) + ';\n')
                return
    raise SystemExit(f'theme not found: {label}')


def load_grammar(path):
    if path.endswith(('.tmLanguage', '.plist')):
        import plistlib
        with open(path, 'rb') as f:
            return plistlib.load(f)
    return read_json(path)


def grammars():
    found, languages, names, labels = {}, {}, {}, {}
    for folder, manifest in extensions():
        c = manifest.get('contributes', {})
        for lang in c.get('languages', []):
            if lang.get('aliases'):
                labels[lang['id']] = lang['aliases'][0]
            for e in lang.get('extensions', []):
                languages[e.lower()] = lang['id']
            for n in lang.get('filenames', []):
                names[n.lower()] = lang['id']
        for g in c.get('grammars', []):
            path = os.path.normpath(os.path.join(folder, g['path']))
            if g.get('scopeName') and os.path.exists(path):
                found[g['scopeName']] = (path, g.get('language'), os.path.basename(folder))
    # The grammars wanted and the ones they include (YAML's versions, the languages in Markdown's code blocks, …), but no
    # giant ones.
    picked, todo, loaded = set(), [s for s in SCOPES if s in found], {}
    while todo:
        scope = todo.pop()
        if scope in picked:
            continue
        path = found[scope][0]
        if os.path.getsize(path) > 300_000:
            continue
        try:
            loaded[scope] = load_grammar(path)
        except Exception as e:
            print(f'skipped {scope}: {e}')
            continue
        picked.add(scope)
        for inc in set(re.findall(r'"include":\s*"([a-z][\w.-]*)', json.dumps(loaded[scope]))):
            if inc in found and inc not in picked:
                todo.append(inc)
    lang_scope = {}
    for scope in picked:
        lang = found[scope][1]
        if lang:
            lang_scope[lang] = scope
    for scope in sorted(picked):
        path, _, ext = found[scope]
        with open(os.path.join(TM, 'grammars', scope + '.js'), 'w', encoding='utf-8') as out:
            out.write(f'// {scope}, from {ext}. Made by tools/vscode-assets.py.\n')
            out.write(f'window.__tmGrammar({json.dumps(scope)}, {json.dumps(loaded[scope], separators=(",", ":"))});\n')
    ext_map = {e: lang_scope[l] for e, l in languages.items() if l in lang_scope}
    name_map = {n: lang_scope[l] for n, l in names.items() if l in lang_scope}
    with open(os.path.join(TM, 'languages.js'), 'w', encoding='utf-8') as out:
        out.write("// File extensions and names -> grammar scopes, as the extensions on this Mac declare them. Made by tools/vscode-assets.py.\n")
        scope_label = {scope: labels.get(lang, lang) for lang, scope in lang_scope.items()}
        out.write('window.__tmLanguages = ' + json.dumps({'ext': ext_map, 'names': name_map, 'scopes': sorted(picked), 'labels': scope_label}, separators=(',', ':')) + ';\n')
    print(f'{len(picked)} grammars, {len(ext_map)} extensions')


if __name__ == '__main__':
    codicons()
    file_icons()
    textmate()
    theme()
    grammars()
