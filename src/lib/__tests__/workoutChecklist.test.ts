import test from 'node:test';
import assert from 'node:assert/strict';
import { formatWorkoutDose } from '../workoutDose';
import { withTimeout } from '../withTimeout';
test('prescrição mantém unidade, lateralidade e isometria explícitas',()=>{
 assert.equal(formatWorkoutDose({reps:'6s'}),'6 s');
 assert.equal(formatWorkoutDose({reps:'12/lado'}),'12 por lado');
 assert.equal(formatWorkoutDose({reps:1,notes:'Isometria de ativação 6s + Bracing abdominal'}),'Isometria 6 s');
 assert.equal(formatWorkoutDose({reps:14,notes:'Rest-pause simples falha+15s'}),'14');
 assert.equal(formatWorkoutDose({}),'Dose a confirmar');
});
test('consulta pendente termina com erro recuperável; sucesso e erro originais são preservados',async()=>{
 assert.equal(await withTimeout(Promise.resolve(7),100),7);
 const failure=new Error('falha original');
 await assert.rejects(withTimeout(Promise.reject(failure),100),error=>error===failure);
 await assert.rejects(withTimeout(new Promise(()=>{}),5),/Tente novamente/);
});
