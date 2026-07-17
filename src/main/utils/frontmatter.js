export function formatFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of Object.entries(fields)) {
    lines.push(formatYamlField(key, value));
  }
  lines.push('---');
  return `${lines.join('\n')}\n`;
}

export function formatYamlField(key, value) {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return `${key}: []`;
    }
    return `${key}:\n${value.map((item) => `  - ${formatScalar(item)}`).join('\n')}`;
  }

  if (value && typeof value === 'object') {
    return `${key}: ${JSON.stringify(value)}`;
  }

  return `${key}: ${formatScalar(value)}`;
}

export function formatScalar(value) {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  const text = String(value);
  if (text === '') {
    return '';
  }
  if (text.includes('\n')) {
    return `|\n${text.split('\n').map((line) => `  ${line}`).join('\n')}`;
  }
  if (/^[A-Za-z0-9_./@+-]+$/.test(text)) {
    return text;
  }
  return JSON.stringify(text);
}

export function splitFrontmatter(markdown) {
  if (!markdown.startsWith('---\n')) {
    return { frontmatter: {}, body: markdown, rawFrontmatter: '' };
  }

  const end = markdown.indexOf('\n---', 4);
  if (end === -1) {
    return { frontmatter: {}, body: markdown, rawFrontmatter: '' };
  }

  const rawFrontmatter = markdown.slice(4, end);
  const body = markdown.slice(end + 4).replace(/^\n/, '');
  return {
    frontmatter: parseSimpleFrontmatter(rawFrontmatter),
    body,
    rawFrontmatter
  };
}

export function parseSimpleFrontmatter(rawFrontmatter) {
  const parsed = {};
  const lines = rawFrontmatter.split('\n');
  let currentArrayKey = null;

  for (const line of lines) {
    if (/^\s*-\s+/.test(line) && currentArrayKey) {
      if (!Array.isArray(parsed[currentArrayKey])) {
        parsed[currentArrayKey] = [];
      }
      parsed[currentArrayKey].push(parseScalar(line.replace(/^\s*-\s+/, '')));
      continue;
    }

    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) {
      currentArrayKey = null;
      continue;
    }

    const [, key, rawValue] = match;
    if (rawValue === '') {
      parsed[key] = '';
      currentArrayKey = key;
    } else if (rawValue === '[]') {
      parsed[key] = [];
      currentArrayKey = key;
    } else {
      parsed[key] = parseScalar(rawValue);
      currentArrayKey = null;
    }
  }

  return parsed;
}

function parseScalar(rawValue) {
  const value = rawValue.trim();
  if (value === '') {
    return '';
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(value)) {
    return Number(value);
  }
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    try {
      return JSON.parse(value);
    } catch {
      return value.slice(1, -1);
    }
  }
  return value;
}

export function replaceFrontmatter(markdown, updates) {
  const { frontmatter, body } = splitFrontmatter(markdown);
  return `${formatFrontmatter({ ...frontmatter, ...updates })}\n${body}`;
}
