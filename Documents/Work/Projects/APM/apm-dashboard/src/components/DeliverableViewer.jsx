import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

// Initialize mermaid with dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'base',
  themeVariables: {
    primaryColor: '#f0ebe3',
    primaryTextColor: '#1a1a1a',
    primaryBorderColor: '#1a1a1a',
    lineColor: '#7a7a7a',
    secondaryColor: '#e8e2d8',
    tertiaryColor: '#f5f0e8',
    fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    fontSize: '13px',
    noteBkgColor: '#e8e2d8',
    noteTextColor: '#1a1a1a',
    noteBorderColor: '#e8c832',
    actorBkg: '#1a1a1a',
    actorBorder: '#e8c832',
    actorTextColor: '#f0ebe3',
    stateBkg: '#f0ebe3',
    stateBorder: '#1a1a1a',
  },
  flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
  sequence: { useMaxWidth: true, actorMargin: 80 },
  stateDiagram: { useMaxWidth: true },
});

function MermaidDiagram({ chart }) {
  const ref = useRef(null);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
    mermaid.render(id, chart.trim())
      .then(({ svg }) => { setSvg(svg); setError(null); })
      .catch(err => { setError(err.message || 'Diagram render failed'); });
  }, [chart]);

  if (error) {
    return (
      <div style={{ margin: '16px 0', background: '#fffbeb', border: '1px solid #fbbf24', borderRadius: 8, padding: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Diagram could not render</div>
        <pre style={{ fontSize: 11, color: '#1a1a1a', whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace', background: '#fef3c7', padding: 10, borderRadius: 4, margin: 0 }}>{chart}</pre>
        <div style={{ color: '#dc2626', fontSize: '0.72em', marginTop: 6 }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ background: '#ffffff', border: '1px solid #d4cdc0', borderRadius: 10, padding: 20, margin: '16px 0', overflow: 'auto', textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}
         ref={ref} dangerouslySetInnerHTML={{ __html: svg }} />
  );
}

function YamlBlock({ code, title }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Syntax highlight YAML
  const highlighted = code
    .replace(/^(\s*)([\w.-]+)(:)/gm, '$1<span class="yaml-key">$2</span><span class="yaml-colon">$3</span>')
    .replace(/:\s+'([^']+)'/g, ': <span class="yaml-string">\'$1\'</span>')
    .replace(/:\s+"([^"]+)"/g, ': <span class="yaml-string">"$1"</span>')
    .replace(/:\s+(true|false)/g, ': <span class="yaml-bool">$1</span>')
    .replace(/:\s+(\d+)/g, ': <span class="yaml-number">$1</span>')
    .replace(/^(\s*-\s)/gm, '<span class="yaml-dash">$1</span>')
    .replace(/#(.+)$/gm, '<span class="yaml-comment">#$1</span>');

  return (
    <div className="yaml-block">
      <div className="yaml-header">
        <span className="yaml-title">{title || 'Schema (YAML)'}</span>
        <button className="yaml-copy" onClick={handleCopy}>
          {copied ? '✓ Copied' : 'Copy YAML'}
        </button>
      </div>
      <pre className="yaml-code" dangerouslySetInnerHTML={{ __html: highlighted }} />
    </div>
  );
}

// Extract special blocks (mermaid, yaml) BEFORE markdown processing
function extractSpecialBlocks(md) {
  const blocks = [];
  let counter = 0;
  let processed = md;

  // Extract mermaid blocks
  processed = processed.replace(/```mermaid\n([\s\S]*?)```/g, (_, chart) => {
    const id = `__BLOCK_${counter++}__`;
    blocks.push({ id, type: 'mermaid', content: chart.trim() });
    return id;
  });

  // Extract yaml blocks
  processed = processed.replace(/```ya?ml\n([\s\S]*?)```/g, (_, code) => {
    const id = `__BLOCK_${counter++}__`;
    blocks.push({ id, type: 'yaml', content: code.trim() });
    return id;
  });

  return { processed, blocks };
}

function renderMarkdown(md) {
  if (!md) return '';
  let html = md;

  // Code blocks (non-mermaid, non-yaml — those are already extracted)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="code-block"><code>$2</code></pre>');

  // Headings
  html = html.replace(/^#### (.+)$/gm, '<h5 class="md-h5">$1</h5>');
  html = html.replace(/^### (.+)$/gm, '<h4 class="md-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>');

  // Horizontal rules
  html = html.replace(/^---+$/gm, '<hr class="md-hr" />');

  // Bold and inline code
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

  // Blockquotes
  html = html.replace(/^> (.+)$/gm, '<blockquote class="md-quote">$1</blockquote>');

  // Tables
  html = html.replace(/((?:\|.+\|\n)+)/g, (match) => {
    const rows = match.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return match;
    const parseRow = (row) => row.split('|').slice(1, -1).map(c => c.trim());
    const headerCells = parseRow(rows[0]);
    const isSep = (row) => /^\|[\s-:|]+\|$/.test(row.trim());
    const dataRows = rows.filter((r, i) => i > 0 && !isSep(r));
    let table = '<div class="table-wrap"><table class="md-table">';
    table += '<thead><tr>' + headerCells.map(c => `<th>${c}</th>`).join('') + '</tr></thead>';
    table += '<tbody>';
    dataRows.forEach(row => {
      const cells = parseRow(row);
      table += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>';
    });
    table += '</tbody></table></div>';
    return table;
  });

  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/((?:<li>.+<\/li>\n?)+)/g, '<ul class="md-list">$1</ul>');
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

  // Paragraphs
  html = html.replace(/^(?!<[a-z/]|$)(.+)$/gm, '<p>$1</p>');
  html = html.replace(/\n{2,}/g, '\n');

  return html;
}

// Split content into parts: HTML chunks + mermaid/yaml blocks
function RenderedMarkdown({ content }) {
  // Step 1: Extract special blocks BEFORE markdown processing
  const { processed, blocks } = extractSpecialBlocks(content);

  // Step 2: Convert remaining markdown to HTML (special blocks are now __BLOCK_N__ placeholders)
  const html = renderMarkdown(processed);

  // Step 3: If no special blocks, render as plain HTML
  if (blocks.length === 0) {
    return <div className="md-content" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // Step 4: Split HTML on __BLOCK_N__ placeholders and interleave React components
  const parts = [];
  let remaining = html;
  let idx = 0;

  for (const block of blocks) {
    const pos = remaining.indexOf(block.id);
    if (pos === -1) continue;

    // HTML before this block
    const before = remaining.slice(0, pos);
    if (before.trim()) {
      parts.push(<div key={`html-${idx++}`} dangerouslySetInnerHTML={{ __html: before }} />);
    }

    // The block itself
    if (block.type === 'mermaid') {
      parts.push(<MermaidDiagram key={`mermaid-${idx++}`} chart={block.content} />);
    } else if (block.type === 'yaml') {
      parts.push(<YamlBlock key={`yaml-${idx++}`} code={block.content} />);
    }

    remaining = remaining.slice(pos + block.id.length);
  }

  // Remaining HTML after last block
  if (remaining.trim()) {
    parts.push(<div key={`html-${idx++}`} dangerouslySetInnerHTML={{ __html: remaining }} />);
  }

  return <div className="md-content">{parts}</div>;
}

export default function DeliverableViewer({ content, type, title }) {
  if (!content) {
    return (
      <div className="empty-state">
        <h3>{title || 'Deliverable'}</h3>
        <p>Not generated yet. Select an APM and click "Generate Mapping" to create this deliverable.</p>
        <p style={{ fontSize: '0.8em', color: 'var(--text-muted)', marginTop: 8 }}>
          Or run: <code className="md-inline-code">/enable-apm {'<apm>'} --capabilities auth,capture</code>
        </p>
      </div>
    );
  }

  if (type === 'json') {
    const formatted = typeof content === 'string' ? content : JSON.stringify(content, null, 2);
    return (
      <div>
        <h3 className="md-h3" style={{ color: 'var(--accent)', marginBottom: 12 }}>{title}</h3>
        <pre className="json-viewer">{formatted}</pre>
      </div>
    );
  }

  if (type === 'markdown') {
    return (
      <div>
        <h3 className="md-h3" style={{ color: 'var(--accent)', marginBottom: 12 }}>{title}</h3>
        <RenderedMarkdown content={content} />
      </div>
    );
  }

  return (
    <div>
      <h3 className="md-h3" style={{ color: 'var(--accent)', marginBottom: 12 }}>{title}</h3>
      <pre style={{ fontFamily: 'monospace', fontSize: '0.8em', whiteSpace: 'pre-wrap' }}>{content}</pre>
    </div>
  );
}
