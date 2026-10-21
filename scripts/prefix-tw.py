"""One-off: add the tw: prefix to Tailwind classes in the prototype's hand-written files.
Handles className="…", every string literal inside className={…} / cn(…), and `fill` class
variables. Skips the region between bootstrap-sample:start and bootstrap-sample:end."""
import re, sys

SKIP_TOKENS = {"tw-page", "bs-scope"}
VAR_MAP = {
    "var(--color-zinc-900)": "var(--primary)",
    "var(--color-zinc-200)": "var(--border)",
    "var(--color-background)": "var(--background)",
    "var(--color-foreground)": "var(--foreground)",
    "var(--color-muted-foreground)": "var(--muted-foreground)",
    "var(--color-muted)": "var(--muted)",
}

def prefix_classes(text):
    out = []
    for tok in text.split(" "):
        if not tok or tok.startswith("tw:") or tok in SKIP_TOKENS:
            out.append(tok)
        else:
            out.append("tw:" + tok)
    return " ".join(out)

STR = re.compile(r'"([^"\n]*)"')

def prefix_strings(expr):
    return STR.sub(lambda m: '"' + prefix_classes(m.group(1)) + '"', expr)

def balanced(src, start):
    """Return index just past the brace/paren group starting at src[start]."""
    open_ch = src[start]; close_ch = {"{": "}", "(": ")"}[open_ch]; depth = 0; i = start
    while i < len(src):
        c = src[i]
        if c == '"':
            i = src.index('"', i + 1)
        elif c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                return i + 1
        i += 1
    raise ValueError("unbalanced")

def transform(src):
    res, i = [], 0
    while i < len(src):
        if src.startswith("{/* bootstrap-sample:start", i):
            j = src.index("bootstrap-sample:end", i)
            res.append(src[i:j]); i = j; continue
        if src.startswith('className="', i):
            j = src.index('"', i + 11)
            res.append('className="' + prefix_classes(src[i + 11:j]) + '"'); i = j + 1; continue
        if src.startswith("className={", i) or src.startswith("cn(", i):
            k = i + (10 if src[i] == "c" and src.startswith("className={", i) else 2)
            j = balanced(src, k)
            res.append(src[i:k] + prefix_strings(src[k:j])); i = j; continue
        m = re.match(r'(fill (?:=|===) )"([^"]*)"', src[i:])
        if m:
            res.append(m.group(1) + '"' + prefix_classes(m.group(2)) + '"'); i += m.end(); continue
        res.append(src[i]); i += 1
    out = "".join(res)
    for a, b in VAR_MAP.items():
        out = out.replace(a, b)
    return out

for path in sys.argv[1:]:
    src = open(path).read()
    open(path, "w").write(transform(src))
    print("prefixed", path)
