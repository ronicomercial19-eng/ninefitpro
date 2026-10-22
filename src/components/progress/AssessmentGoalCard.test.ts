import test from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AssessmentGoalCard } from './AssessmentGoalCard';
import type { HubGoal } from '@/services/assessmentHubService';

test('meta legada sem intervalo não é declarada alcançada',()=>{
  const goal:HubGoal={id:'test',titulo:'Teste',exercicio:null,metrica:'peso',unidade:'kg',valor_inicial:25,valor_atual:25,valor_meta:25,prazo:null,status:'ativa'};
  const html=renderToStaticMarkup(createElement(AssessmentGoalCard,{goal,rows:[],onReassessment:()=>{}}));
  assert.match(html,/Meta precisa de revisão/);
  assert.doesNotMatch(html,/Meta alcançada/);
  assert.match(html,/Métrica cadastrada/);
});
