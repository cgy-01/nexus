import { StyleSheet, View, Text, Platform } from 'react-native';

const FONT = Platform.select({ ios: 'system-ui', default: 'normal' });

/**
 * Lightweight Markdown renderer — handles:
 * - **bold**, *italic*
 * - - bullet / * bullet lists
 * - paragraphs via \n\n
 * - `inline code` and ```code blocks```
 */

interface Token {
  type: 'text' | 'bold' | 'italic' | 'code';
  content: string;
}

/** Split a single line into styled tokens */
function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  let current = '';

  while (i < line.length) {
    // Inline code
    if (line[i] === '`') {
      const end = line.indexOf('`', i + 1);
      if (end !== -1) {
        if (current) tokens.push({ type: 'text', content: current });
        tokens.push({ type: 'code', content: line.slice(i + 1, end) });
        current = '';
        i = end + 1;
        continue;
      }
    }

    // Bold **...**
    if (line[i] === '*' && line[i + 1] === '*') {
      const end = line.indexOf('**', i + 2);
      if (end !== -1) {
        if (current) tokens.push({ type: 'text', content: current });
        tokens.push({ type: 'bold', content: line.slice(i + 2, end) });
        current = '';
        i = end + 2;
        continue;
      }
    }

    current += line[i];
    i++;
  }

  if (current) tokens.push({ type: 'text', content: current });

  return tokens;
}

/** Render a single line with inline formatting */
function InlineLine({ text }: { text: string }) {
  const tokens = tokenize(text);
  return (
    <Text style={styles.body}>
      {tokens.map((t, i) => {
        switch (t.type) {
          case 'bold':
            return <Text key={i} style={styles.bold}>{t.content}</Text>;
          case 'code':
            return <Text key={i} style={styles.inlineCode}>{t.content}</Text>;
          default:
            return <Text key={i}>{t.content}</Text>;
        }
      })}
    </Text>
  );
}

/** Detect list type */
function listPrefix(line: string): { kind: 'bullet' | 'ordered' | null; indent: number } {
  const match = line.match(/^(\s*)([-*]\s+|\d+\.\s+)/);
  if (!match) return { kind: null, indent: 0 };
  const indent = match[1].length;
  const marker = match[2];
  if (marker.startsWith('-') || marker.startsWith('*'))
    return { kind: 'bullet', indent };
  return { kind: 'ordered', indent };
}

interface Block {
  type: 'paragraph' | 'bullet' | 'ordered' | 'code';
  lines: string[];
}

/** Group lines into blocks */
function groupBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (codeLines.length) blocks.push({ type: 'code', lines: codeLines });
      i++; // skip closing ```
      continue;
    }

    // Empty line → skip
    if (!line.trim()) {
      i++;
      continue;
    }

    // List
    const prefix = listPrefix(line);
    if (prefix.kind) {
      const listLines: string[] = [];
      while (i < lines.length) {
        const lp = listPrefix(lines[i]);
        if (lp.kind === prefix.kind) {
          listLines.push(lines[i].replace(/^\s*[-*\d+\.]\s+/, ''));
          i++;
        } else if (!lines[i].trim()) {
          i++;
        } else {
          break;
        }
      }
      blocks.push({ type: prefix.kind, lines: listLines });
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() && !lines[i].trim().startsWith('```') && !listPrefix(lines[i]).kind) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) blocks.push({ type: 'paragraph', lines: paraLines });
  }

  return blocks;
}

export default function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');
  const blocks = groupBlocks(lines);

  return (
    <View>
      {blocks.map((block, bi) => {
        switch (block.type) {
          case 'paragraph':
            return (
              <Text key={bi} style={styles.paragraph}>
                {block.lines.map((l, li) => (
                  <Text key={li}>
                    {li > 0 && '\n'}
                    <InlineLine text={l} />
                  </Text>
                ))}
              </Text>
            );

          case 'bullet':
            return (
              <View key={bi} style={styles.list}>
                {block.lines.map((l, li) => (
                  <View key={li} style={styles.listItem}>
                    <Text style={styles.bullet}>•</Text>
                    <InlineLine text={l} />
                  </View>
                ))}
              </View>
            );

          case 'ordered':
            return (
              <View key={bi} style={styles.list}>
                {block.lines.map((l, li) => (
                  <View key={li} style={styles.listItem}>
                    <Text style={styles.bullet}>{li + 1}.</Text>
                    <InlineLine text={l} />
                  </View>
                ))}
              </View>
            );

          case 'code':
            return (
              <View key={bi} style={styles.codeBlock}>
                <Text style={styles.codeText}>{block.lines.join('\n')}</Text>
              </View>
            );
        }
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 16, lineHeight: 26, color: '#000000', fontFamily: FONT },
  paragraph: { marginBottom: 8 },
  bold: { fontWeight: '700' },
  inlineCode: { backgroundColor: '#f0f0f0', paddingHorizontal: 4, borderRadius: 4, fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }), fontSize: 15 },
  list: { marginBottom: 8 },
  listItem: { flexDirection: 'row', marginBottom: 2 },
  bullet: { fontSize: 16, lineHeight: 26, color: '#000000', marginRight: 8, fontFamily: FONT },
  codeBlock: { backgroundColor: '#f5f5f5', padding: 12, borderRadius: 8, marginVertical: 8 },
  codeText: { fontSize: 14, lineHeight: 22, fontFamily: Platform.select({ ios: 'ui-monospace', default: 'monospace' }), color: '#333333' },
});
