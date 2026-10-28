import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { styled } from 'styled-components';
import { safeLink } from '../../assistant';

/**
 * The assistant's answer as Markdown, in the Design System's colours (like the maison plugin's): paragraphs, lists,
 * tables, code and quotes. No images; only http(s) links, opened in a new tab; raw HTML shows as text. A table wider
 * than the bubble scrolls inside it, so nothing else moves.
 */
const Body = styled.div`
  font-size: 1.4rem;
  line-height: 1.6;
  color: ${({ theme }) => theme.colors.neutral800};
  overflow-wrap: anywhere;

  & > :first-child { margin-top: 0; }
  & > :last-child { margin-bottom: 0; }
  p, ul, ol, blockquote, pre { margin: 0 0 0.8rem; }
  ul, ol { padding-left: 2rem; }
  li { margin: 0.2rem 0; }
  ul { list-style: disc; }
  ol { list-style: decimal; }
  strong { font-weight: 600; }
  a { color: ${({ theme }) => theme.colors.primary600}; }
  code {
    font-family: monospace;
    font-size: 1.3rem;
    background: ${({ theme }) => theme.colors.neutral150};
    border-radius: 4px;
    padding: 0.1rem 0.4rem;
  }
  pre {
    overflow-x: auto;
    background: ${({ theme }) => theme.colors.neutral150};
    border-radius: 4px;
    padding: 0.8rem;
  }
  pre code { background: none; padding: 0; }
  blockquote {
    border-left: 3px solid ${({ theme }) => theme.colors.neutral300};
    padding-left: 1rem;
    color: ${({ theme }) => theme.colors.neutral600};
  }
`;

const TableScroll = styled.div`
  overflow-x: auto;
  margin: 0 0 0.8rem;

  table { border-collapse: collapse; font-size: 1.3rem; }
  th, td {
    border: 1px solid ${({ theme }) => theme.colors.neutral200};
    padding: 0.4rem 0.8rem;
    text-align: left;
    vertical-align: top;
    min-width: 7rem;
    max-width: 22rem;
  }
  th { background: ${({ theme }) => theme.colors.neutral100}; font-weight: 600; white-space: nowrap; }
`;

export function MarkdownBody({ text }: { text: string }) {
  return (
    <Body>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={{
          img: () => null,
          a: ({ href, children }) => {
            const link = safeLink(href);
            return link ? (
              <a href={link} target="_blank" rel="noreferrer noopener">
                {children}
              </a>
            ) : (
              <>{children}</>
            );
          },
          table: ({ children }) => (
            <TableScroll>
              <table>{children}</table>
            </TableScroll>
          ),
        }}
      >
        {text}
      </Markdown>
    </Body>
  );
}
