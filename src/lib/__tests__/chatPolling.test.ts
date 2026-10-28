import assert from 'node:assert/strict';
import {test} from 'node:test';
import {chatPollInterval} from '../chatPolling';
test('chat backs off idle and empty conversations while keeping new replies responsive',()=>{
 const now=Date.parse('2026-10-28T12:00:00Z');
 assert.equal(chatPollInterval([],now),60000);
 assert.equal(chatPollInterval([{created_at:'2026-10-28T11:59:30Z'}],now),5000);
 assert.equal(chatPollInterval([{created_at:'2026-10-28T11:58:00Z'}],now),15000);
 assert.equal(chatPollInterval([{created_at:'2026-10-28T11:00:00Z'}],now),60000);
 assert.equal(chatPollInterval([{created_at:'bad'},{created_at:'2027-01-01'}],now),60000);
});
