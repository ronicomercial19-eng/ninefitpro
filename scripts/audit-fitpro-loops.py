"""Reproducible function-to-source inventory from a read-only pg_proc snapshot.

Usage: python scripts/audit-fitpro-loops.py FUNCTIONS_JSON DEPENDENCIES_JSON
No connection credentials; no data or schema mutations. Text matches are candidates,
not proof of execution or ownership. Includes definitions even when a caller is absent.
"""
import json
import re
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
functions = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
dependencies = json.loads(Path(sys.argv[2]).read_text(encoding='utf-8'))
sources = []
for folder in ('src', 'supabase/functions'):
    for path in (root / folder).rglob('*'):
        if path.suffix in ('.ts', '.tsx') and path.name != 'types.ts':
            sources.append((path.relative_to(root).as_posix(), path.read_text(encoding='utf-8')))

lines = ['# Macro 01 — inventário de funções', '',
         'Snapshot de catálogo em 05/10/2026, após a migração Macro 01.', '',
         'Correspondências em código/SQL são candidatas. Comentários e wrappers exigem revisão; ausência no repositório não prova ausência em parceiros externos.', '',
         '| Assinatura | SECURITY DEFINER | Anon / autenticado | Referências no repositório | Chamadores SQL candidatos |',
         '|---|---|---|---|---|']
for function in sorted(functions, key=lambda row: row['signature']):
    signature = function['signature']
    name = signature.split('(')[0]
    matches = []
    for path, text in sources:
        for number, line in enumerate(text.splitlines(), 1):
            if re.search(r'\b' + re.escape(name) + r'\b', line):
                matches.append(f'`{path}:{number}`')
    callers = sorted({row['caller'] for row in dependencies if row['target'] == signature})
    lines.append(f"| `{signature}` | {function['security_definer']} | {function['anon_execute']} / {function['authenticated_execute']} | " + '<br>'.join(matches or ['Nenhuma referência localizada']) + ' | ' + '<br>'.join(f'`{c}`' for c in callers or ['Nenhum candidato localizado']) + ' |')
target = root / 'docs/macro01/function-inventory.md'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text('\n'.join(lines) + '\n', encoding='utf-8')
print(f'Inventário gerado: {len(functions)} assinaturas, {len(sources)} arquivos de fonte pesquisados.')
