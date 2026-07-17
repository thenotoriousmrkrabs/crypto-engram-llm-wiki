import { StaticSourceAdapter } from './source-item.js';

export class OpenNewsMCPAdapter extends StaticSourceAdapter {
  constructor({ items = [] } = {}) {
    super({ source: 'opennews', items });
  }
}
