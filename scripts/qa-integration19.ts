import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { youtubeId, readYouTubeProgress } from '../src/services/libraryPlayback';
const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
test('YouTube progress uses actual API methods and ignores unavailable metadata', () => {
  let reads = 0;
  assert.deepEqual(readYouTubeProgress({ getCurrentTime: () => { reads++; return 35; }, getDuration: () => 120 }), { position: 35, duration: 120 });
  assert.equal(reads, 1);
  assert.equal(readYouTubeProgress({ getCurrentTime: () => 35, getDuration: () => 0 }), null);
  assert.equal(readYouTubeProgress({ getCurrentTime: () => NaN, getDuration: () => 120 }), null);
  assert.deepEqual(readYouTubeProgress({ getCurrentTime: () => 130, getDuration: () => 120 }), { position: 120, duration: 120 });
});
test('Only YouTube providers select the YouTube API; arbitrary links keep their provider', () => {
  assert.equal(youtubeId('https://youtu.be/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(youtubeId('https://player.vimeo.com/video/123?v=dQw4w9WgXcQ'), null);
  assert.equal(youtubeId('https://youtube.com.attacker.example/watch?v=dQw4w9WgXcQ'), null);
  assert.equal(youtubeId('javascript:alert(1)'), null);
});
test('Consolidation retains calendar, confirmed adherence, filters, playback and history guards together', () => {
  const week = read('../src/components/9fit/WeeklyTrainingView.tsx');
  assert.match(week, /p_week_start: weekStartISO/);
  assert.match(week, /row.status === 'completed'/);
  assert.match(week, /weeklyAdherence\([\s\S]*todayISO/);
  const daily = read('../src/components/9fit/DailyProtocol.tsx');
  assert.match(daily, /if \(readOnly \|\| task.completed\) return/);
  assert.match(daily, /onClick=\{\(\) => startTask\(task\)\}/);
  const catalog = read('../src/pages/9fit/HealthFlix.tsx');
  assert.match(catalog, /matchesCatalog/); assert.match(catalog, /TrackedLibraryVideo/);
  const protocol = read('../src/pages/9fit/Protocolo.tsx');
  assert.match(protocol, /AssignedProtocols/); assert.doesNotMatch(protocol, /fn_aplicar_nine_lima/);
  assert.match(read('../supabase/functions/ai-coach/index.ts'), /missingPhysiologyReply/);
});
