/* ================================================================
   Zero-dependency syntax highlighter
   
   Tokenizes source code lines for visual highlighting.
   Supports: JavaScript/TypeScript, JSON, HTML, CSS, Python, Markdown
   ================================================================ */

export type TokenType =
  | 'keyword'
  | 'string'
  | 'comment'
  | 'number'
  | 'builtin'
  | 'type'
  | 'tag'
  | 'attribute'
  | 'property'
  | 'operator'
  | 'punctuation'
  | 'default'

export interface Token {
  type: TokenType
  text: string
}

/** Maps token types to Tailwind color classes */
export const TOKEN_COLORS: Record<TokenType, string> = {
  keyword: 'text-purple-600',
  string: 'text-red-700',
  comment: 'text-emerald-600',
  number: 'text-amber-700',
  builtin: 'text-blue-700',
  type: 'text-teal-600',
  tag: 'text-red-500',
  attribute: 'text-violet-600',
  property: 'text-sky-700',
  operator: 'text-foreground/70',
  punctuation: 'text-foreground/50',
  default: '',
}

/* ================================================================
   Language detection
   ================================================================ */

const EXT_LANG: Record<string, string> = {
  ts: 'typescript', tsx: 'typescript',
  js: 'javascript', jsx: 'javascript',
  json: 'json',
  html: 'html', htm: 'html',
  css: 'css', scss: 'css',
  py: 'python',
  md: 'markdown',
  yaml: 'yaml', yml: 'yaml',
  sh: 'shell', bash: 'shell',
  sql: 'sql',
  xml: 'html',
  go: 'go',
  rs: 'rust',
  java: 'java',
  c: 'c', cpp: 'c', h: 'c', hpp: 'c',
}

const LANG_DISPLAY: Record<string, string> = {
  typescript: 'TypeScript',
  javascript: 'JavaScript',
  json: 'JSON',
  html: 'HTML',
  css: 'CSS',
  python: 'Python',
  markdown: 'Markdown',
  yaml: 'YAML',
  shell: 'Shell',
  sql: 'SQL',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  c: 'C/C++',
  plaintext: 'Plain Text',
}

export function detectLanguage(filename: string): string {
  const dot = filename.lastIndexOf('.')
  if (dot === -1) return 'plaintext'
  const ext = filename.slice(dot + 1).toLowerCase()
  return EXT_LANG[ext] ?? 'plaintext'
}

export function getLanguageDisplayName(lang: string): string {
  return LANG_DISPLAY[lang] ?? lang
}

/* ================================================================
   Grammar rules per language
   Each rule: [regex, tokenType]
   Rules are tried in order; first match wins.
   ================================================================ */

type GrammarRule = [RegExp, TokenType]

const JS_KEYWORDS = 'abstract|async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|finally|for|from|function|if|implements|import|in|instanceof|interface|let|new|of|package|private|protected|public|return|static|super|switch|throw|try|typeof|var|void|while|with|yield|as|type'
const JS_BUILTINS = 'true|false|null|undefined|NaN|Infinity|console|window|document|this|self|globalThis|Promise|Array|Object|String|Number|Boolean|Map|Set|Error|RegExp|Date|Math|JSON|parseInt|parseFloat|setTimeout|setInterval|fetch|require|module|exports'

const jsGrammar: GrammarRule[] = [
  [/^\/\/.*/, 'comment'],
  [/^\/\*[\s\S]*?\*\//, 'comment'],
  [/^"(?:[^"\\]|\\.)*"/, 'string'],
  [/^'(?:[^'\\]|\\.)*'/, 'string'],
  [/^`(?:[^`\\]|\\.)*`/, 'string'],
  [/^<\/?\w+/, 'tag'],
  [new RegExp(`^\\b(${JS_KEYWORDS})\\b`), 'keyword'],
  [new RegExp(`^\\b(${JS_BUILTINS})\\b`), 'builtin'],
  [/^\b[A-Z][a-zA-Z0-9]*\b/, 'type'],
  [/^\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, 'number'],
  [/^0x[0-9a-fA-F]+\b/, 'number'],
  [/^\w+(?=\s*:)/, 'property'],
  [/^===|^!==|^=>|^&&|^\|\||^[+\-*/%=<>!&|^~]+/, 'operator'],
  [/^[{}()\[\];,.:?@#]/, 'punctuation'],
]

const PY_KEYWORDS = 'and|as|assert|async|await|break|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield'
const PY_BUILTINS = 'True|False|None|print|len|range|int|str|float|list|dict|set|tuple|bool|type|super|self|cls|isinstance|hasattr|getattr|setattr|open|input|map|filter|zip|enumerate|sorted|reversed|any|all|min|max|sum|abs'

const pyGrammar: GrammarRule[] = [
  [/^#.*/, 'comment'],
  [/^"""[\s\S]*?"""/, 'string'],
  [/^'''[\s\S]*?'''/, 'string'],
  [/^"(?:[^"\\]|\\.)*"/, 'string'],
  [/^'(?:[^'\\]|\\.)*'/, 'string'],
  [/^f"(?:[^"\\]|\\.)*"/, 'string'],
  [/^f'(?:[^'\\]|\\.)*'/, 'string'],
  [new RegExp(`^\\b(${PY_KEYWORDS})\\b`), 'keyword'],
  [new RegExp(`^\\b(${PY_BUILTINS})\\b`), 'builtin'],
  [/^\b[A-Z][a-zA-Z0-9]*\b/, 'type'],
  [/^\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, 'number'],
  [/^0x[0-9a-fA-F]+\b/, 'number'],
  [/^\w+(?=\s*[=:])/, 'property'],
  [/^[+\-*/%=<>!&|^~@]+/, 'operator'],
  [/^[{}()\[\];,.:?]/, 'punctuation'],
]

const jsonGrammar: GrammarRule[] = [
  [/^"(?:[^"\\]|\\.)*"\s*(?=:)/, 'property'],
  [/^"(?:[^"\\]|\\.)*"/, 'string'],
  [/^\b(true|false|null)\b/, 'builtin'],
  [/^-?\b\d+\.?\d*(?:[eE][+-]?\d+)?\b/, 'number'],
  [/^[{}()\[\];,:]/, 'punctuation'],
]

const htmlGrammar: GrammarRule[] = [
  [/^<!--[\s\S]*?-->/, 'comment'],
  [/^<\/?\w+/, 'tag'],
  [/^\/>|^>/, 'tag'],
  [/^"(?:[^"\\]|\\.)*"/, 'string'],
  [/^'(?:[^'\\]|\\.)*'/, 'string'],
  [/^\w+(?==)/, 'attribute'],
  [/^[=]/, 'operator'],
  [/^[{}()\[\];,.:?]/, 'punctuation'],
]

const CSS_KEYWORDS = '@media|@import|@keyframes|@font-face|@charset|@supports|@layer|@property|@tailwind|@apply|@screen'

const cssGrammar: GrammarRule[] = [
  [/^\/\*[\s\S]*?\*\//, 'comment'],
  [/^\/\/.*/, 'comment'],
  [new RegExp(`^(${CSS_KEYWORDS})\\b`), 'keyword'],
  [/^"(?:[^"\\]|\\.)*"/, 'string'],
  [/^'(?:[^'\\]|\\.)*'/, 'string'],
  [/^#[0-9a-fA-F]{3,8}\b/, 'number'],
  [/^-?\b\d+\.?\d*(?:px|em|rem|%|vh|vw|deg|s|ms)?\b/, 'number'],
  [/^[.#][\w-]+/, 'tag'],
  [/^[\w-]+(?=\s*:)/, 'property'],
  [/^:[\w-]+/, 'builtin'],
  [/^[{}()\[\];,.:>~+*]/, 'punctuation'],
]

const mdGrammar: GrammarRule[] = [
  [/^#{1,6}\s.*/, 'keyword'],
  [/^```[\s\S]*?```/, 'string'],
  [/^`[^`]+`/, 'string'],
  [/^\*\*[^*]+\*\*/, 'builtin'],
  [/^\*[^*]+\*/, 'type'],
  [/^__[^_]+__/, 'builtin'],
  [/^_[^_]+_/, 'type'],
  [/^\[.*?\]\(.*?\)/, 'tag'],
  [/^>\s.*/, 'comment'],
  [/^[-*+]\s/, 'operator'],
  [/^\d+\.\s/, 'number'],
]

const GRAMMARS: Record<string, GrammarRule[]> = {
  typescript: jsGrammar,
  javascript: jsGrammar,
  json: jsonGrammar,
  html: htmlGrammar,
  css: cssGrammar,
  python: pyGrammar,
  markdown: mdGrammar,
  yaml: jsonGrammar,   // close enough for basic highlighting
  shell: pyGrammar,    // # comments, similar structure
  sql: jsGrammar,      // acceptable fallback
  go: jsGrammar,
  rust: jsGrammar,
  java: jsGrammar,
  c: jsGrammar,
}

/* ================================================================
   Multi-line context tracking
   Scans entire content to find block comment boundaries
   ================================================================ */

export interface LineContext {
  inBlockComment: boolean
}

export function buildLineContexts(content: string): LineContext[] {
  const lines = content.split('\n')
  const contexts: LineContext[] = []
  let inBlock = false

  for (const line of lines) {
    // Check if line starts inside a block comment
    contexts.push({ inBlockComment: inBlock })

    // Scan the line for /* and */ to update state
    let i = 0
    while (i < line.length) {
      if (inBlock) {
        const closeIdx = line.indexOf('*/', i)
        if (closeIdx === -1) break
        inBlock = false
        i = closeIdx + 2
      } else {
        const openIdx = line.indexOf('/*', i)
        if (openIdx === -1) break
        const closeIdx = line.indexOf('*/', openIdx + 2)
        if (closeIdx === -1) {
          inBlock = true
          break
        }
        i = closeIdx + 2
      }
    }
  }

  return contexts
}

/* ================================================================
   Line tokenizer
   ================================================================ */

export function tokenizeLine(
  line: string,
  language: string,
  ctx?: LineContext
): Token[] {
  // If entire line is inside a block comment
  if (ctx?.inBlockComment) {
    const closeIdx = line.indexOf('*/')
    if (closeIdx === -1) {
      return [{ type: 'comment', text: line }]
    }
    // Part of line is comment, rest is code
    const tokens: Token[] = [{ type: 'comment', text: line.slice(0, closeIdx + 2) }]
    const rest = tokenizeCode(line.slice(closeIdx + 2), language)
    return tokens.concat(rest)
  }

  return tokenizeCode(line, language)
}

function tokenizeCode(line: string, language: string): Token[] {
  const grammar = GRAMMARS[language]
  if (!grammar) {
    return line.length > 0 ? [{ type: 'default', text: line }] : []
  }

  const tokens: Token[] = []
  let pos = 0

  while (pos < line.length) {
    // Skip whitespace as default
    if (line[pos] === ' ' || line[pos] === '\t') {
      let end = pos + 1
      while (end < line.length && (line[end] === ' ' || line[end] === '\t')) end++
      tokens.push({ type: 'default', text: line.slice(pos, end) })
      pos = end
      continue
    }

    let matched = false
    const remaining = line.slice(pos)

    for (const [pattern, tokenType] of grammar) {
      const m = remaining.match(pattern)
      if (m && m.index === 0 && m[0].length > 0) {
        tokens.push({ type: tokenType, text: m[0] })
        pos += m[0].length
        matched = true
        break
      }
    }

    if (!matched) {
      // Consume identifier or single char
      if (/\w/.test(line[pos])) {
        let end = pos + 1
        while (end < line.length && /\w/.test(line[end])) end++
        tokens.push({ type: 'default', text: line.slice(pos, end) })
        pos = end
      } else {
        tokens.push({ type: 'default', text: line[pos] })
        pos++
      }
    }
  }

  return tokens
}
