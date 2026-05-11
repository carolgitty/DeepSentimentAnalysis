import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AppConfig, AppConfigService } from '../../services/app-config.service';

interface ApplicationDocument {
  title: string;
  fileName: string;
  description: string;
}

@Component({
  selector: 'app-config-settings',
  templateUrl: './config-settings.component.html',
  styleUrls: ['./config-settings.component.css']
})
export class ConfigSettingsComponent implements OnInit {
  config: AppConfig | null = null;
  loading = false;
  saving = false;
  message = '';
  error = '';
  docsLoading = false;
  selectedDoc: ApplicationDocument | null = null;
  selectedDocHtml = '';
  docError = '';

  readonly applicationDocs: ApplicationDocument[] = [
    { title: 'Documentation Index', fileName: 'README.md', description: 'Document list and source references' },
    { title: 'BRD', fileName: '01-BRD.md', description: 'Business requirements and scope' },
    { title: 'FRS', fileName: '02-FRS.md', description: 'Functional and non-functional requirements' },
    { title: 'UI/UX', fileName: '03-UI-UX.md', description: 'Screens, user flows, and interaction states' },
    { title: 'Architecture', fileName: '04-Architecture.md', description: 'Technical architecture and data flow' },
    { title: 'API Docs', fileName: '05-API-Docs.md', description: 'Backend REST and SDK integration contracts' },
    { title: 'WebSocket/Event Flow', fileName: '06-WebSocket-Event-Flow.md', description: 'Polling, iframe, and SDK callback flows' },
    { title: 'Security', fileName: '07-Security.md', description: 'Security controls, risks, and recommendations' },
    { title: 'Deployment', fileName: '08-Deployment.md', description: 'Build, config, deployment, and rollback' },
    { title: 'Reporting/Analytics', fileName: '09-Reporting-Analytics.md', description: 'Metrics and report behavior' },
    { title: 'Testing', fileName: '10-Testing.md', description: 'Test strategy and scenarios' }
  ];

  constructor(
    private appConfigService: AppConfigService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    void this.loadConfig();
    void this.openDocument(this.applicationDocs[0]);
  }

  async loadConfig(): Promise<void> {
    this.loading = true;
    this.message = '';
    this.error = '';

    try {
      this.config = this.appConfigService.cloneConfig(await this.appConfigService.getConfig());
    } catch (error) {
      console.error('Failed to load config:', error);
      this.error = 'Unable to load config.';
    } finally {
      this.loading = false;
    }
  }

  saveConfig(): void {
    if (!this.config) {
      return;
    }

    this.saving = true;
    this.message = '';
    this.error = '';

    try {
      this.appConfigService.saveOverride(this.config);
      this.message = 'Config saved for this browser. Reload the app to apply it everywhere.';
    } catch (error) {
      console.error('Failed to save config:', error);
      this.error = 'Unable to save config.';
    } finally {
      this.saving = false;
    }
  }

  async resetToFileConfig(): Promise<void> {
    this.appConfigService.clearOverride();
    this.config = this.appConfigService.cloneConfig(await this.appConfigService.getBaseConfig());
    this.message = 'Browser override cleared. Reload the app to use the file config everywhere.';
    this.error = '';
  }

  reloadApp(): void {
    window.location.reload();
  }

  async openDocument(doc: ApplicationDocument): Promise<void> {
    this.selectedDoc = doc;
    this.docsLoading = true;
    this.docError = '';
    this.selectedDocHtml = '';

    try {
      const markdown = await this.loadDocumentMarkdown(doc.fileName);

      this.selectedDocHtml = this.renderMarkdown(markdown || '');
    } catch (error) {
      console.error('Failed to load application document:', error);
      this.docError = `Unable to load ${doc.title}.`;
    } finally {
      this.docsLoading = false;
    }
  }

  getDocumentAssetUrl(doc: ApplicationDocument): string {
    return `assets/docs/application-docs/${doc.fileName}`;
  }

  private async loadDocumentMarkdown(fileName: string): Promise<string> {
    const relativeUrl = `assets/docs/application-docs/${fileName}`;
    const absoluteUrl = `/assets/docs/application-docs/${fileName}`;

    try {
      return await this.http.get(relativeUrl, { responseType: 'text' }).toPromise() || '';
    } catch (relativeError) {
      console.warn('Relative document URL failed, trying absolute URL.', relativeError);
      return await this.http.get(absoluteUrl, { responseType: 'text' }).toPromise() || '';
    }
  }

  private renderMarkdown(markdown: string): string {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const html: string[] = [];
    let inList = false;
    let inCode = false;
    let codeBuffer: string[] = [];

    const closeList = (): void => {
      if (inList) {
        html.push('</ul>');
        inList = false;
      }
    };

    const flushCode = (): void => {
      html.push(`<pre><code>${this.escapeHtml(codeBuffer.join('\n'))}</code></pre>`);
      codeBuffer = [];
    };

    for (let index = 0; index < lines.length; index++) {
      const rawLine = lines[index];
      const line = rawLine.trim();

      if (line.startsWith('```')) {
        if (inCode) {
          inCode = false;
          flushCode();
        } else {
          closeList();
          inCode = true;
          codeBuffer = [];
        }
        continue;
      }

      if (inCode) {
        codeBuffer.push(rawLine);
        continue;
      }

      if (!line) {
        closeList();
        continue;
      }

      if (this.isMarkdownTable(lines, index)) {
        closeList();
        const table = this.readMarkdownTable(lines, index);
        html.push(this.renderMarkdownTable(table.rows));
        index = table.endIndex;
        continue;
      }

      if (line.startsWith('# ')) {
        closeList();
        html.push(`<h1>${this.renderInlineMarkdown(line.slice(2))}</h1>`);
        continue;
      }

      if (line.startsWith('## ')) {
        closeList();
        html.push(`<h2>${this.renderInlineMarkdown(line.slice(3))}</h2>`);
        continue;
      }

      if (line.startsWith('### ')) {
        closeList();
        html.push(`<h3>${this.renderInlineMarkdown(line.slice(4))}</h3>`);
        continue;
      }

      if (line.startsWith('- ')) {
        if (!inList) {
          html.push('<ul>');
          inList = true;
        }
        html.push(`<li>${this.renderInlineMarkdown(line.slice(2))}</li>`);
        continue;
      }

      closeList();
      html.push(`<p>${this.renderInlineMarkdown(line)}</p>`);
    }

    closeList();
    if (inCode) {
      flushCode();
    }

    return html.join('');
  }

  private isMarkdownTable(lines: string[], index: number): boolean {
    const current = lines[index]?.trim() || '';
    const next = lines[index + 1]?.trim() || '';
    return current.startsWith('|') && current.endsWith('|') && /^\|[\s:-]+\|/.test(next);
  }

  private readMarkdownTable(lines: string[], startIndex: number): { rows: string[][]; endIndex: number } {
    const rows: string[][] = [];
    let index = startIndex;

    while (index < lines.length) {
      const line = lines[index].trim();
      if (!line.startsWith('|') || !line.endsWith('|')) {
        break;
      }

      if (!/^\|[\s:-]+\|$/.test(line)) {
        rows.push(line.slice(1, -1).split('|').map((cell) => cell.trim()));
      }

      index++;
    }

    return { rows, endIndex: index - 1 };
  }

  private renderMarkdownTable(rows: string[][]): string {
    if (!rows.length) {
      return '';
    }

    const [header, ...body] = rows;
    return `
      <div class="doc-table-wrap">
        <table>
          <thead>
            <tr>${header.map((cell) => `<th>${this.renderInlineMarkdown(cell)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${body.map((row) => `<tr>${row.map((cell) => `<td>${this.renderInlineMarkdown(cell)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  private renderInlineMarkdown(value: string): string {
    return this.escapeHtml(value)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  private escapeHtml(value: string): string {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
