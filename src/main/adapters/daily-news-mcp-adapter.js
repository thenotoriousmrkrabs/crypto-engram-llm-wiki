import { StaticSourceAdapter } from './source-item.js';

export class DailyNewsMCPAdapter extends StaticSourceAdapter {
  constructor({ items = [] } = {}) {
    super({ source: 'daily_news', items });
  }
}
