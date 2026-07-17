import { FolderMarkdownAdapter } from './folder-markdown-adapter.js';

export class ManualMarkdownAdapter extends FolderMarkdownAdapter {
  constructor({ vaultRoot }) {
    super({
      source: 'manual_md',
      vaultRoot,
      rawDropRelativePath: '00_Inbox/Manual_MD/_Raw_Drops'
    });
  }
}
