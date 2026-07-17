import { StaticSourceAdapter } from './source-item.js';

export class OpenTwitterMCPAdapter extends StaticSourceAdapter {
  constructor({ items = [] } = {}) {
    super({ source: 'x_watchlist', items });
  }
}
