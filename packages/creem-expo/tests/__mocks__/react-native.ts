import React from 'react';

export const Text = (props: any) => React.createElement('span', props);
export const View = (props: any) => React.createElement('div', props);
export const AppState = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  currentState: 'active',
};
export const Platform = { OS: 'ios', select: (obj: any) => obj.ios };
