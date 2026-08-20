#!/usr/bin/env python3
"""
Move a file within the frontend src tree and rewrite every relative import
(in .js/.jsx files) that points at it, in both directions:
  - other files that import the moved file get their specifier updated
  - the moved file's own relative imports get re-based to its new location
Usage: move_and_relink.py <SRC_ROOT> <old_relpath> <new_relpath>
Paths are relative to SRC_ROOT (e.g. "components/Modal.jsx").
"""
import os
import re
import sys
import posixpath

SRC_ROOT, OLD_REL, NEW_REL = sys.argv[1], sys.argv[2], sys.argv[3]

old_abs = os.path.join(SRC_ROOT, OLD_REL)
new_abs = os.path.join(SRC_ROOT, NEW_REL)

IMPORT_RE = re.compile(r"""(from\s+|import\s*\(\s*)(['"])(\.[^'"]*)\2""")

def all_src_files():
    for dirpath, dirnames, filenames in os.walk(SRC_ROOT):
        if 'node_modules' in dirpath:
            continue
        for fn in filenames:
            if fn.endswith(('.js', '.jsx', '.ts', '.tsx')):
                yield os.path.join(dirpath, fn)

def rel_import_target(importer_file, spec):
    """Resolve a relative import spec from importer_file to an absolute src-relative path (no extension normalization beyond common ones)."""
    importer_dir = os.path.dirname(importer_file)
    target = os.path.normpath(os.path.join(importer_dir, spec))
    return target

def to_posix_relpath(from_dir, to_file_noext_variants):
    # to_file_noext_variants: absolute path candidates to try (with/without .jsx etc.) - just use the given new_abs
    rel = os.path.relpath(to_file_noext_variants, from_dir)
    rel = rel.replace(os.sep, '/')
    if not rel.startswith('.'):
        rel = './' + rel
    return rel

old_candidates = {old_abs}
base, ext = os.path.splitext(old_abs)
old_candidates.add(base)  # extensionless import specifier form

changed_files = []

for f in all_src_files():
    if f == old_abs:
        continue
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    new_content = content

    def repl(m):
        prefix, quote, spec = m.groups()
        if not spec.startswith('.'):
            return m.group(0)
        resolved = rel_import_target(f, spec)
        resolved_variants = {resolved, resolved + '.js', resolved + '.jsx'}
        if resolved in old_candidates or any(v == old_abs for v in resolved_variants):
            # rewrite to new location, preserving whether original had an extension
            had_ext = spec.endswith(('.js', '.jsx'))
            target = new_abs if had_ext else os.path.splitext(new_abs)[0]
            new_spec = to_posix_relpath(os.path.dirname(f), target)
            return f"{prefix}{quote}{new_spec}{quote}"
        return m.group(0)

    new_content = IMPORT_RE.sub(repl, content)
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        changed_files.append(f)

# Now move the file itself, and re-base ITS OWN relative imports
os.makedirs(os.path.dirname(new_abs), exist_ok=True)
with open(old_abs, encoding='utf-8') as fh:
    content = fh.read()

def repl_self(m):
    prefix, quote, spec = m.groups()
    if not spec.startswith('.'):
        return m.group(0)
    resolved = rel_import_target(old_abs, spec)
    had_ext = spec.endswith(('.js', '.jsx'))
    target = resolved if had_ext else resolved
    new_spec = to_posix_relpath(os.path.dirname(new_abs), target)
    return f"{prefix}{quote}{new_spec}{quote}"

new_self_content = IMPORT_RE.sub(repl_self, content)
with open(new_abs, 'w', encoding='utf-8') as fh:
    fh.write(new_self_content)
os.remove(old_abs)

print(f"Moved {OLD_REL} -> {NEW_REL}; updated {len(changed_files)} referencing file(s).")
