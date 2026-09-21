import { readFile } from 'node:fs/promises';

const studentsPage = await readFile('src/pages/StudentsPage.tsx', 'utf8');
const checks = [
  ['Painel consulta relacionamentos canônicos', studentsPage.includes("from('vw_current_relationships')")],
  ['Painel filtra papel profissional', studentsPage.includes("relationship_role', 'professional")],
  ['Detalhes continuam carregados pelos IDs autorizados', studentsPage.includes('.in(\'id\', athleteIds)')],
];

for (const [name, pass] of checks) console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`);
if (checks.some(([, pass]) => !pass)) process.exit(1);

