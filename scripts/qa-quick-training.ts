import assert from 'node:assert/strict';
import { rankTrainingContent, safeContentUrl } from '../src/services/quickTrainingContentRules';
const raw = [
 {id:'ebook',type:'ebook',name:'Força para iniciantes',accessUrl:'https://example.com/book'},
 {id:'course',type:'infoproduto',name:'Curso de força',locked:true,accessUrl:'https://example.com/course'},
 {id:'advanced',type:'infoproduto',name:'Força avançada',level:'advanced'},
 {id:'machine',type:'infoproduto',name:'Força com máquinas',equipment:'academia'},
 {id:'protocol',type:'protocolo',name:'Mobilidade',accessUrl:'https://example.com/mobility'},
 {id:'exercise',type:'exercise',name:'Força'},
];
const result=rankTrainingContent(raw,'strength',['bodyweight'],'beginner');
assert.deepEqual(result.map(x=>x.id).sort(),['course','ebook']);
assert.equal(result.find(x=>x.id==='ebook')?.kind,'ebook');
assert.equal(result.find(x=>x.id==='course')?.url,null);
assert.equal(rankTrainingContent(raw,'mobility',['bodyweight'],'beginner')[0].kind,'protocol');
assert.equal(rankTrainingContent([raw[0],raw[0]],'strength',['gym'],'advanced').length,1);
assert.equal(safeContentUrl('javascript:alert(1)'),null);
assert.equal(safeContentUrl('https://example.com/book'),'https://example.com/book');
assert.equal(rankTrainingContent([{id:'bands',type:'protocolo',name:'Sessão',tags:['força'],equipment:['elásticos']}],'strength',['bodyweight'],'beginner').length,0);
assert.equal(rankTrainingContent([{id:'bands',type:'protocolo',name:'Sessão',tags:['força'],equipment:['elásticos']}],'strength',['bands'],'beginner').length,1);
for(const minutes of [15,30,45,60])for(const sets of [2,3])for(const rest of [30,60,90]){
 const count=Math.max(1,Math.min(10,Math.floor((minutes-3)*60/(sets*40+(sets-1)*rest+30))));
 const duration=3+Math.ceil(count*(sets*40+(sets-1)*rest+30)/60);
 assert.ok(duration<=minutes,`${duration} exceeds ${minutes}`);
}
console.log('Quick training rules: content segregation, locks, equipment, level, URL safety and time budgets passed.');
