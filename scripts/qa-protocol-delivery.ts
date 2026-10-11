import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAvailableTraining, trainingMedia, safeContentUrl, localDate } from '../src/lib/assignedProtocols.ts';
const base = { id:'assigned', student_id:'athlete', training_name:'Treinos & Técnicas', is_active:true, start_date:'2026-10-06' };
test('active existing HTML upload is available; old inactive upload is hidden', () => {
 assert.equal(isAvailableTraining(base,'2026-10-07'),true);
 assert.equal(isAvailableTraining({...base,is_active:false},'2026-10-07'),false);
 assert.equal(trainingMedia({...base,training_type:'html',html_file_url:'https://example.com/treino.html'}).kind,'html');
});
test('scheduled and expired content respect inclusive local dates', () => {
 assert.equal(isAvailableTraining(base,'2026-10-05'),false);
 assert.equal(isAvailableTraining({...base,end_date:'2026-10-07'},'2026-10-07'),true);
 assert.equal(isAvailableTraining({...base,end_date:'2026-10-07'},'2026-10-08'),false);
 assert.equal(localDate(new Date(2026,9,7,23,30)), '2026-10-07');
});
test('inline periodization and signed PDF are recognized without invented exercises', () => {
 assert.equal(trainingMedia({...base,training_type:'periodization',periodization_html:'<h1>Plano</h1>'}).html,'<h1>Plano</h1>');
 assert.equal(trainingMedia({...base,periodization_file_url:'https://example.com/plan.pdf?token=123'}).kind,'pdf');
 assert.equal(trainingMedia({...base,content_type:'model',training_data:{model_id:'real'}}).kind,'model');
});
test('content URLs reject executable and malformed schemes', () => {
 assert.equal(safeContentUrl('javascript:alert(1)'),null);
 assert.equal(safeContentUrl('data:text/html,unsafe'),null);
 assert.equal(safeContentUrl('/relative'),null);
 assert.equal(safeContentUrl('https://example.com/treino.html'),'https://example.com/treino.html');
});
