import { StaticSourceAdapter } from './source-item.js';

export class XBookmarksAdapter extends StaticSourceAdapter {
  constructor({ items = [] } = {}) {
    super({ source: 'x_bookmarks', items });
  }
}
