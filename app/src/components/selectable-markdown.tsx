import { Platform, Text, ToastAndroid } from 'react-native';
import Markdown, {
  type ASTNode,
  type MarkdownProps,
  type RenderRules,
} from 'react-native-markdown-display';
import * as Clipboard from 'expo-clipboard';

type SelectableMarkdownProps = {
  children: string;
  style: NonNullable<MarkdownProps['style']>;
};

/** 将文本写入系统剪贴板，Android 同时给出简短提示。 */
export async function copyTextToClipboard(text: string): Promise<void> {
  const content = text.trim();
  if (!content) return;

  await Clipboard.setStringAsync(content);
  if (Platform.OS === 'android') {
    ToastAndroid.show('已复制到剪贴板', ToastAndroid.SHORT);
  }
}

function textBlock(
  node: ASTNode,
  children: React.ReactNode[],
  style: unknown,
  suffix = '\n',
) {
  return (
    <Text key={node.key} style={style as never}>
      {children}
      {suffix}
    </Text>
  );
}

function createSelectableRules(): RenderRules {
  return {
    // 所有区块都保持在同一个 Text 树内，系统才能跨段落框选。
    body: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} selectable style={styles.body}>
        {children}
      </Text>
    ),
    heading1: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading1),
    heading2: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading2),
    heading3: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading3),
    heading4: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading4),
    heading5: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading5),
    heading6: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.heading6),
    paragraph: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.paragraph),
    blockquote: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.blockquote),
    bullet_list: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.bullet_list}>{children}</Text>
    ),
    ordered_list: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.ordered_list}>{children}</Text>
    ),
    list_item: (node: ASTNode, children, parentNodes, styles) => {
      const orderedParent = parentNodes.find((parent) => parent.type === 'ordered_list');
      const prefix = orderedParent ? `${node.index + 1}. ` : '• ';
      return textBlock(node, [prefix, ...children], styles.list_item, '\n');
    },
    hr: (node: ASTNode) => <Text key={node.key}>{'\n'}</Text>,
    textgroup: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.textgroup}>
        {children}
      </Text>
    ),
    text: (node: ASTNode, _children, _parentNodes, styles, inheritedStyles = {}) => (
      <Text
        key={node.key}
        style={[inheritedStyles, styles.text]}
      >
        {node.content}
      </Text>
    ),
    code_inline: (node: ASTNode, _children, _parentNodes, styles, inheritedStyles = {}) => (
      <Text key={node.key} style={[inheritedStyles, styles.code_inline]}>
        {node.content}
      </Text>
    ),
    code_block: (node: ASTNode, _children, _parentNodes, styles, inheritedStyles = {}) => (
      <Text key={node.key} style={[inheritedStyles, styles.code_block]}>
        {node.content.endsWith('\n') ? node.content.slice(0, -1) : node.content}
      </Text>
    ),
    fence: (node: ASTNode, _children, _parentNodes, styles, inheritedStyles = {}) => (
      <Text key={node.key} style={[inheritedStyles, styles.fence]}>
        {node.content.endsWith('\n') ? node.content.slice(0, -1) : node.content}
      </Text>
    ),
    hardbreak: (node: ASTNode) => <Text key={node.key}>{'\n'}</Text>,
    softbreak: (node: ASTNode) => <Text key={node.key}>{'\n'}</Text>,
    table: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.table),
    thead: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.thead, '\n'),
    tbody: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.tbody}>{children}</Text>
    ),
    tr: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.tr, '\n'),
    th: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.th}>{children}{'\t'}</Text>
    ),
    td: (node: ASTNode, children, _parentNodes, styles) => (
      <Text key={node.key} style={styles.td}>{children}{'\t'}</Text>
    ),
    blocklink: (node: ASTNode, children, _parentNodes, styles) => textBlock(node, children, styles.blocklink),
    image: (node: ASTNode) => <Text key={node.key}>{node.attributes.alt || '[图片]'}</Text>,
  };
}

/**
 * Markdown 文本使用单一原生 Text 树，支持跨段落框选与复制。
 */
export function SelectableMarkdown({ children, style }: SelectableMarkdownProps) {
  return (
    <Markdown style={style} rules={createSelectableRules()}>
      {children}
    </Markdown>
  );
}
