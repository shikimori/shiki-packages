import { chainCommands, exitCode } from 'prosemirror-commands';
import { Node } from '../base';

export default class HardBreak extends Node {
  get name() {
    return 'hard_break';
  }

  get schema() {
    return {
      attrs: {
        isPasted: { default: false }
      },
      inline: true,
      group: 'inline',
      selectable: false,
      parseDOM: [
        {
          tag: 'br',
          getAttrs: _node => ({ isPasted: true })
        }
      ],
      toDOM: () => ['br']
    };
  }

  commands({ type }) {
    return () => chainCommands(exitCode, (state, dispatch) => {
      dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    });
  }

  keys({ type }) {
    const command = chainCommands(exitCode, (state, dispatch) => {
      dispatch(state.tr.replaceSelectionWith(type.create()).scrollIntoView());
      return true;
    });

    return {
      // 'Mod-Enter': command,
      'Shift-Enter': command
    };
  }

  markdownSerialize(state, node) {
    state.write(node.attrs.isPasted ? '\n' : '[br]');
  }
}
