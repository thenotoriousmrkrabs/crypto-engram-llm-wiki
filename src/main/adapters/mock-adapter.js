import { StaticSourceAdapter } from './source-item.js';
import { mockSourceItems } from './mock-data.js';

export class MockAdapter extends StaticSourceAdapter {
  constructor({ items = mockSourceItems } = {}) {
    super({ source: 'mock', items });
  }
}
