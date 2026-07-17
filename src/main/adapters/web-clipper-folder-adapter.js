import { FolderMarkdownAdapter } from './folder-markdown-adapter.js';

export class WebClipperFolderAdapter extends FolderMarkdownAdapter {
  constructor({ vaultRoot }) {
    super({
      source: 'web_clipper',
      vaultRoot,
      rawDropRelativePath: '00_Inbox/Web_Clipper/_Raw_Drops'
    });
  }
}
