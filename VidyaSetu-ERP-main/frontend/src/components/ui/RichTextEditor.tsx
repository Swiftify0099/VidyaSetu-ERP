import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  Bold, Italic, Strikethrough, List, ListOrdered,
  Quote, Heading1, Heading2, Heading3, Undo, Redo, Code,
  Minus, Eraser, Type, Code2,
} from 'lucide-react';
import { useEffect } from 'react';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  minHeight?: string;
}

export default function RichTextEditor({ value, onChange, minHeight }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync value if updated externally (e.g. template applied)
  useEffect(() => {
    if (!editor) return;
    if (editor.isFocused) return;

    const currentHTML = editor.getHTML();
    const normalizedValue = value || '';
    const isEmptyValue = !normalizedValue || normalizedValue.trim() === '';
    const isEmptyCurrent = !currentHTML || currentHTML === '<p></p>' || currentHTML.trim() === '';

    if (isEmptyValue && isEmptyCurrent) {
      return;
    }

    if (currentHTML !== normalizedValue) {
      editor.commands.setContent(normalizedValue);
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.editorContainer}>
      <div className={styles.toolbar}>
        {/* Formatting Group */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('bold') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="Bold text"
          >
            <Bold size={13} />
            <span>Bold</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('italic') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="Italic text"
          >
            <Italic size={13} />
            <span>Italic</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('strike') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            title="Strikethrough text"
          >
            <Strikethrough size={13} />
            <span>Strike</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('code') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleCode().run()}
            title="Inline Code"
          >
            <Code size={13} />
            <span>Code</span>
          </button>
        </div>

        <div className={styles.toolDivider} />

        {/* Headings Group */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('paragraph') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().setParagraph().run()}
            title="Normal Paragraph"
          >
            <Type size={13} />
            <span>Normal</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('heading', { level: 1 }) ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="Heading 1"
          >
            <Heading1 size={13} />
            <span>H1</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('heading', { level: 2 }) ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="Heading 2"
          >
            <Heading2 size={13} />
            <span>H2</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('heading', { level: 3 }) ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            title="Heading 3"
          >
            <Heading3 size={13} />
            <span>H3</span>
          </button>
        </div>

        <div className={styles.toolDivider} />

        {/* Lists & Structure Group */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('bulletList') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="Bullet List"
          >
            <List size={13} />
            <span>Bullet List</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('orderedList') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="Numbered List"
          >
            <ListOrdered size={13} />
            <span>Numbered</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('blockquote') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            title="Blockquote"
          >
            <Quote size={13} />
            <span>Quote</span>
          </button>

          <button
            type="button"
            className={`${styles.toolBtn} ${editor.isActive('codeBlock') ? styles.toolBtnActive : ''}`}
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            title="Code Block"
          >
            <Code2 size={13} />
            <span>Code Block</span>
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
          >
            <Minus size={13} />
            <span>Divider</span>
          </button>
        </div>

        <div className={styles.toolDivider} />

        {/* Utilities Group */}
        <div className={styles.toolGroup}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            title="Clear All Formatting"
          >
            <Eraser size={13} />
            <span>Clear Format</span>
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo size={13} />
            <span>Undo</span>
          </button>

          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo size={13} />
            <span>Redo</span>
          </button>
        </div>
      </div>

      <div className={styles.editorContent} style={{ minHeight: minHeight || '160px' }}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
