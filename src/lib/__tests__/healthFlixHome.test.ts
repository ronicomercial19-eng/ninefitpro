import test from 'node:test';
import assert from 'node:assert/strict';
import { contentId, normalizeHome, homeQuery, healthEmbedUrl, facetOptions } from '../healthFlixHome';
import { mergeHealthCatalog } from '../healthFlixCatalog';
test('home keeps provider order and teacher overrides, removing hidden workouts', () => {
  const remote = [{ id: 4020, title: 'Original', cover_hd_url: 'https://cdn.test/hd.jpg', cover_url: 'https://cdn.test/fallback.jpg', play: { content_id: 'catalog-4020' }, progress_percent: 42 }, { id: 4021, title: 'Hidden' }];
  const items = mergeHealthCatalog(remote, [{ id: 'local', external_id: '4020', name: 'Revisado', payload: { fitpro_override: true } }, { id: 'hidden', external_id: '4021', payload: { fitpro_hidden: true } }]);
  const home = normalizeHome({ hero: { label: 'Continuar de onde parou', cta: 'Continuar (42%)', item: remote[0] }, rows: [{ key: 'continue', title: 'Continuar', items: remote }, { key: 'beginner', title: 'Iniciante', items: [remote[0]] }] }, items);
  assert.deepEqual(home.rows.map(row => row.key), ['continue', 'beginner']);
  assert.equal(home.rows[0].items.length, 1);
  assert.equal(home.hero?.item.title, 'Revisado');
  assert.equal(home.hero?.cta, 'Continuar (42%)');
  assert.equal(home.hero?.item.progress_percent, 42);
  assert.equal(contentId(home.hero!.item), 'catalog-4020');
  assert.equal(home.hero?.item.thumbnail, 'https://cdn.test/hd.jpg');
  assert.equal(home.hero?.item.cover_url, 'https://cdn.test/fallback.jpg');
});
test('old list remains usable without home fields', () => {
  const items = mergeHealthCatalog([{id:'old', title:'Legacy', video_url:'https://example.test/video.mp4'}], []);
  assert.equal(contentId(items[0]), 'old');
  assert.deepEqual(normalizeHome(null, items), {hero:null,rows:[],facets:{}});
});
test('PDI query uses only declared compatible values, no invented defaults', () => {
  assert.equal(homeQuery(null).toString(), 'action=content&view=home');
  const query = homeQuery({ primary_goal:'Hipertrofia', training_level:'Avançado', session_duration:'30 min' });
  assert.equal(query.get('goal'), 'hipertrofia'); assert.equal(query.get('level'), 'avancado'); assert.equal(query.get('minutes'), '30');
  assert.equal(homeQuery({primary_goal:'performance',session_duration:'30-60'}).has('goal'),false);
  assert.equal(homeQuery({session_duration:'30-60'}).has('minutes'),false);
});
test('signed embed accepts only known HealthFlix origin and preserves token', () => {
  const url = new URL(healthEmbedUrl('https://healthflixnine.lovable.app/embed?ctx=signed','catalog-4020')!);
  assert.equal(url.searchParams.get('ctx'),'signed'); assert.equal(url.searchParams.get('content_id'),'catalog-4020');
  for(const raw of ['javascript:alert(1)','https://healthflixnine.lovable.app.evil.test/embed','http://healthflixnine.lovable.app/embed','https://evil.test/embed']) assert.equal(healthEmbedUrl(raw,'1'),null);
});
test('facets support counts and keyed lists without scanning workouts', () => {
  assert.deepEqual(facetOptions({modalities:{HIIT:8}},'modality'),[{value:'HIIT',count:8}]);
  assert.deepEqual(facetOptions({levels:[{key:'iniciante',count:3}]},'level'),[{value:'iniciante',count:3}]);
});
