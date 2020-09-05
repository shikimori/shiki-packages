import { Node } from '../base';
import { nodeInputRule } from '../commands';
import { ShikiView } from '../node_views';
import { pasteRule } from '../commands';

import {
  SHIKI_BBCODE_LINK_REGEXP,
  SHIKI_BBCODE_LINK_FULL_REGEXP,
  SHIKI_BBCODE_IMAGE_REGEXP
} from '../markdown/tokenizer/processors/shiki_inline';

import {
  parseShikiBasicMeta,
  parseImageMeta
} from '../markdown/tokenizer/bbcode_helpers';

export default class ShikiInline extends Node {
  get name() {
    return 'shiki_inline';
  }

  get schema() {
    return {
      attrs: {
        id: {},
        type: {},
        bbcode: {},
        openBbcode: { default: null },
        closeBbcode: { default: null },
        meta: { default: {} },
        text: { default: null },
        isLoading: { default: true },
        isNotFound: { default: false },
        isError: { default: false },
        isPasted: { default: false }
      },
      inline: true,
      content: 'inline*',
      group: 'inline',
      draggable: true,
      selectable: true,
      parseDOM: [{
        tag: '.b-shiki_editor-node',
        getAttrs: node => ({
          ...JSON.parse(node.getAttribute('data-attrs')),
          isPasted: true
        })
      }],
      toDOM: node => {
        if (node.attrs.text) {
          return [
            'span',
            {
              class: 'b-shiki_editor-node',
              'data-attrs': JSON.stringify(node.attrs)
            },
            ['span', node.attrs.openBbcode],
            ['span', 0],
            ['span', node.attrs.closeBbcode]
          ];
        } else {
          return [
            'span',
            {
              class: 'b-shiki_editor-node',
              'data-attrs': JSON.stringify(node.attrs)
            },
            node.attrs.bbcode
          ];
        }
      }
    };
  }

  view(options) {
    return new ShikiView(options);
  }

  inputRules({ type }) {
    return [
      nodeInputRule(SHIKI_BBCODE_LINK_REGEXP, type, ([bbcode, type, id]) => (
        parseShikiBasicMeta(bbcode, type, id)
      )),
      nodeInputRule(SHIKI_BBCODE_IMAGE_REGEXP, type, ([bbcode, type, id, other]) => (
        parseShikiBasicMeta(bbcode, type, id, parseImageMeta(other))
      ))
    ];
  }

  pasteRules({ type }) {
    return [
      pasteRule(SHIKI_BBCODE_LINK_FULL_REGEXP, type, ([bbcode, type, id, text]) => (
        {
          ...parseShikiBasicMeta(bbcode, type, id),
          text,
          isPasted: true
        }
      )),
      pasteRule(SHIKI_BBCODE_LINK_REGEXP, type, ([bbcode, type, id]) => (
        {
          ...parseShikiBasicMeta(bbcode, type, id),
          isPasted: true
        }
      )),
      pasteRule(SHIKI_BBCODE_IMAGE_REGEXP, type, ([bbcode, type, id, other]) => (
        parseShikiBasicMeta(bbcode, type, id, parseImageMeta(other))
      ))
    ];
  }

  get markdownParserToken() {
    return {
      contentNode: this.name,
      getAttrs: token => token.serializeAttributes()
    };
  }

  markdownSerialize(state, node) {
    state.write(node.attrs.bbcode);
  }
}
