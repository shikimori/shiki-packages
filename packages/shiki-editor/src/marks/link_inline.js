// based on https://github.com/scrumpy/tiptap/blob/master/packages/tiptap-extensions/src/marks/LinkInline.js
import { Plugin } from 'prosemirror-state';
import { Mark } from '../base';
import { updateMark, removeMark, pasteRule } from '../commands';
import { getMarkAttrs, fixUrl } from '../utils';

export default class LinkInline extends Mark {
  get name() {
    return 'link_inline';
  }

  get defaultOptions() {
    return {
      openOnClick: true
    };
  }

  get schema() {
    return {
      attrs: {
        url: {},
        id: { default: null },
        type: { default: null },
        text: { default: null }
      },
      inclusive: false,
      parseDOM: [
        {
          tag: 'a[href]:not(.prosemirror-block)',
          getAttrs: node => ({
            url: node.getAttribute('href')
          })
        }
      ],
      toDOM: node => ['a', {
        href: fixUrl(node.attrs.url),
        class: 'b-link',
        rel: 'noopener noreferrer nofollow',
        target: '_blank'
      }, 0]
    };
  }

  commands({ type }) {
    return (_attrs, state) => {
      let marks = [];
      const { from, to } = state.selection;

      state.doc.nodesBetween(from, to, node => {
        marks = [...marks, ...node.marks];
      });

      const mark = marks.find(markItem => markItem.type.name === 'link_inline');

      if (mark && mark.attrs.url) {
        return removeMark(type);
      }
      const url = prompt(window.I18n.t('frontend.shiki_editor.prompt.link_url'));
      return url ?
        updateMark(type, { href: fixUrl(url) }) :
        () => {};
    };
  }

  pasteRules({ type }) {
    return [
      pasteRule(
        /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{2,256}\.[a-zA-Z]{2,}\b([-a-zA-Z0-9@:%_+.~#?&//=]*)/g, // eslint-disable-line
        type,
        url => ({ url })
      )
    ];
  }

  get plugins() {
    if (!this.options.openOnClick) {
      return [];
    }

    return [
      new Plugin({
        props: {
          handleClick: (view, pos, event) => {
            const { schema } = view.state;
            const attrs = getMarkAttrs(schema.marks.link_inline, view.state);

            if (attrs.url && event.target instanceof HTMLAnchorElement) {
              event.stopPropagation();
              window.open(attrs.url);
            }
          }
        }
      })
    ];
  }

  get markdownParserToken() {
    return {
      mark: 'link_inline',
      getAttrs: token => token.serializeAttributes()
    };
  }

  get markdownSerializerToken() {
    return {
      isSelfContaining(mark, node) {
        return mark.attrs.type && mark.attrs.id && node.text == mark.attrs.text;
      },
      open(_state, mark, _parent, _index) {
        return mark.attrs.type && mark.attrs.id ?
          `[${mark.attrs.type}=${mark.attrs.id}]` :
          `[url=${mark.attrs.url}]`;
      },
      close(_state, mark, _parent, _index) {
        return mark.attrs.type && mark.attrs.id ?
          `[/${mark.attrs.type}]` :
          '[/url]';
      }
    };
  }
}
