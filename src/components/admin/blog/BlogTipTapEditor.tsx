'use client';

import { useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  BookOpen,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
} from 'lucide-react';
import { StoryEmbed } from '@/components/admin/blog/storyEmbedExtension';
import { StoryEmbedPicker } from '@/components/admin/blog/StoryEmbedPicker';

export function BlogTipTapEditor({
  content,
  onChange,
  placeholder = 'Write your post…',
  blogSlug,
}: {
  content: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Used when inserting images via upload */
  blogSlug: string;
}) {
  const [storyEmbedOpen, setStoryEmbedOpen] = useState(false);

  const editor = useEditor({
    /** Next.js: avoid SSR/hydration mismatch (TipTap renders after mount). */
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({ openOnClick: false, autolink: true }),
      Image.configure({ allowBase64: false }),
      StoryEmbed,
      Placeholder.configure({ placeholder }),
    ],
    content,
    editorProps: {
      attributes: {
        class:
          'blog-html-body prose prose-slate max-w-none min-h-[320px] focus:outline-none px-3 py-2',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[320px] animate-pulse rounded-xl border border-slate-200 bg-slate-50" />
    );
  }

  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const fd = new FormData();
      fd.append('file', file);
      fd.append('assetKind', 'blog_inline');
      fd.append('blogSlug', blogSlug);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = (await res.json()) as { fileUrl?: string; error?: string };
      if (!res.ok || !data.fileUrl) {
        console.error(data.error);
        return;
      }
      editor.chain().focus().setImage({ src: data.fileUrl }).run();
    };
    input.click();
  };

  const setLink = () => {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Link URL', prev || 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  };

  const btn =
    'rounded-lg border border-slate-200 bg-white p-2 text-slate-700 hover:bg-slate-50 disabled:opacity-40';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <StoryEmbedPicker
        open={storyEmbedOpen}
        onClose={() => setStoryEmbedOpen(false)}
        onInsert={(attrs) => {
          editor.chain().focus().setStoryEmbed(attrs).run();
        }}
      />
      <div className="flex flex-wrap gap-1 border-b border-slate-100 bg-slate-50/80 px-2 py-2">
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleBold().run()}
          disabled={!editor.can().chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
        >
          <Heading3 className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={setLink}>
          <LinkIcon className="h-4 w-4" />
        </button>
        <button type="button" className={btn} onClick={() => void addImage()}>
          <ImageIcon className="h-4 w-4" />
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => setStoryEmbedOpen(true)}
          title="Embed story"
        >
          <BookOpen className="h-4 w-4" />
        </button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
