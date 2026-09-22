// Historical synthetic fixtures for compatibility tests only. Not served or deployed.
import { createClient, clone } from './model.mjs';

export function legacyDemoState() {
  const clients = [createClient('Noura Restaurant', 'restaurant', 'noura'), createClient('Atlas Trading', 'company', 'atlas'), createClient('Thread & Co.', 'store', 'thread')];
  for (const client of [clients[0], clients[2]]) {
    client.published = clone(client.draft);
    client.version = 1;
    client.dirty = false;
  }
  return { schema: 1, clients, activity: [{ title: 'Legacy test fixtures', detail: 'Synthetic examples for migration testing.' }] };
}
