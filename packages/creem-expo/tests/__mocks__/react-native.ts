import React from 'react';

export const Text = (props: any) => React.createElement('span', props);
export const View = (props: any) => React.createElement('div', props);
export const TouchableOpacity = (props: any) => React.createElement('div', { ...props, role: 'button' });
export const ActivityIndicator = (props: any) => React.createElement('div', { ...props, testID: 'activity-indicator' });
export const Modal = (props: any) => (props.visible ? React.createElement('div', props) : null);
export const ScrollView = (props: any) => React.createElement('div', props);
export const AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active',
};
export const Platform = { OS: 'ios', select: (obj: any) => obj.ios };
export const StyleSheet = {
  create: (styles: any) => styles,
  flatten: (style: any) => (Array.isArray(style) ? Object.assign({}, ...style) : style ?? {}),
};
