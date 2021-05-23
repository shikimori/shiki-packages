import { Mark } from '../base';
import { serializeClassAttr, serializeDataAttr } from '../utils/div_helpers';
import { SwitcherView } from '../node_views';
import { nodeViewRenderer } from '../node_view';

export default class Span extends Mark {
  get name() {
    return 'span';
  }

  get schema() {
    return {
      rank: 5,
      attrs: {
        class: { default: null },
        data: { default: [] }
      },
      preventSuggestion: true,
      parseDOM: [{
        tag: 'span[data-span]',
        getAttrs: node => ({
          class: node.getAttribute('class'),
          data: node
            .getAttributeNames()
            .filter(name => (
              name !== 'data-span' && name.startsWith('data-')
            ))
            .map(attribute => [attribute, node.getAttribute(attribute)])
        })
      }],
      toDOM: node => {
        const attributes = {};

        if (node.attrs.class) {
          attributes.class = node.attrs.class;
        }
        node.attrs.data.forEach(data => attributes[data[0]] = data[1]); // eslint-disable-line

        return [
          'span',
          {
            'data-span': (
              `[span${serializeClassAttr(node)}${serializeDataAttr(node)}]`
            ),
            ...attributes
          },
          0
        ];
      }
    };
  }

  get view() {
    return nodeViewRenderer(null, props => {
      const isSwitcher = props.node.attrs.data?.some(([name, value]) => (
        name === 'data-dynamic' && value === 'switcher'
      ));

      if (isSwitcher) {
        return new SwitcherView(props);
      }
      return null;
    });
  }

  get markdownParserToken() {
    return {
      mark: this.name,
      getAttrs: token => token.serializeAttributes()
    };
  }

  get markdownSerializerToken() {
    return {
      open(_state, mark, _parent, _index) {
        const meta = `${serializeClassAttr(mark)}${serializeDataAttr(mark)}`;
        return `[span${meta}]`;
      },
      close: '[/span]',
      mixable: true,
      expelEnclosingWhitespace: true
    };
  }

}
