/**
 * VidyaSetu ERP — FormattedText / Rich Markdown Renderer
 * =======================================================
 * Safely parses and renders Markdown text (headings, bold, bullet points,
 * numbered lists, line breaks) into structured React components.
 */
import React from 'react';

interface FormattedTextProps {
  text: string;
  className?: string;
}

export function FormattedText({ text, className }: FormattedTextProps) {
  if (!text) return null;

  // Split into lines
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let listItems: React.ReactNode[] = [];
  let inList = false;

  const flushList = (keyPrefix: string) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`${keyPrefix}-ul`} style={{ margin: '8px 0', paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {listItems}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const parseInline = (rawLine: string): React.ReactNode => {
    // Replace **bold** with <strong>
    const parts = rawLine.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} style={{ background: 'rgba(0,0,0,0.06)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList(`empty-${index}`);
      elements.push(<div key={`space-${index}`} style={{ height: '8px' }} />);
      return;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList(`h3-${index}`);
      elements.push(
        <h4 key={`h3-${index}`} style={{ fontSize: '15px', fontWeight: '700', margin: '14px 0 6px 0', color: 'var(--color-primary, #4f46e5)' }}>
          {parseInline(trimmed.slice(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList(`h2-${index}`);
      elements.push(
        <h3 key={`h2-${index}`} style={{ fontSize: '17px', fontWeight: '700', margin: '16px 0 8px 0', color: 'var(--color-text-primary, #0f172a)' }}>
          {parseInline(trimmed.slice(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith('# ')) {
      flushList(`h1-${index}`);
      elements.push(
        <h2 key={`h1-${index}`} style={{ fontSize: '19px', fontWeight: '800', margin: '18px 0 10px 0', color: 'var(--color-text-primary, #0f172a)' }}>
          {parseInline(trimmed.slice(2))}
        </h2>
      );
      return;
    }

    // Bullet list (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      inList = true;
      listItems.push(
        <li key={`li-${index}`} style={{ lineHeight: '1.6' }}>
          {parseInline(trimmed.slice(2))}
        </li>
      );
      return;
    }

    // Numbered list (e.g. 1. , 2. )
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numberedMatch) {
      flushList(`num-${index}`);
      elements.push(
        <div key={`num-${index}`} style={{ display: 'flex', gap: '8px', margin: '4px 0', lineHeight: '1.6' }}>
          <span style={{ fontWeight: '700', color: '#4f46e5', minWidth: '20px' }}>{numberedMatch[1]}.</span>
          <div>{parseInline(numberedMatch[2])}</div>
        </div>
      );
      return;
    }

    // Default Paragraph
    flushList(`p-${index}`);
    elements.push(
      <p key={`p-${index}`} style={{ margin: '4px 0', lineHeight: '1.6' }}>
        {parseInline(trimmed)}
      </p>
    );
  });

  flushList('final');

  return <div className={className}>{elements}</div>;
}
