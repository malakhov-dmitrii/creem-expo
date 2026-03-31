// Setup file for Jest client tests
// RNTL v12 auto-detects host components by rendering <View>/<Text>.
// With our lightweight react-native mock this detection fails.
// Pre-configure to skip auto-detection and include hidden elements
// (our mock elements lack RN accessibility props).

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { configureInternal } = require('@testing-library/react-native/build/config');

configureInternal({
  hostComponentNames: {
    text: 'span',
    textInput: 'input',
    switch: 'input',
    scrollView: 'div',
    modal: 'div',
    image: 'img',
  },
  defaultIncludeHiddenElements: true,
});
