// it is broken when working simultaneously with trailingNode and when
// editor contains only [tabs] content

// import { Plugin, PluginKey } from 'prosemirror-state';
//
// export default function trackFocus(editor) {
//   return new Plugin({
//     key: new PluginKey('track_focus'),
//     props: {
//       attributes: {
//         tabindex: 0
//       },
//       handleDOMEvents: {
//         focus: (view, event) => {
//           // provided by uEvent
//           editor.trigger('focus', {
//             event,
//             state: view.state,
//             view
//           });
//
//           const transaction = editor.state.tr
//             .setMeta('focused', true)
//             .setMeta('addToHistory', false);
//
//           editor.view.dispatch(transaction);
//         },
//         blur: (view, event) => {
//           // provided by uEvent
//           editor.trigger('blur', {
//             event,
//             state: view.state,
//             view
//           });
//
//           const transaction = editor.state.tr
//             .setMeta('focused', false)
//             .setMeta('addToHistory', false);
//
//           editor.view.dispatch(transaction);
//         }
//       }
//     }
//   });
// }
