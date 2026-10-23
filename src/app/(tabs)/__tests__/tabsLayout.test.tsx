import { render, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text, type TextProps } from 'react-native';

import { ThemeProvider } from '../../../theme/ThemeProvider';
import { fontScaleCaps } from '../../../theme/tokens';
import TabsLayout from '../_layout';

let capturedScreenOptions: Record<string, unknown> = {};

jest.mock('expo-router', () => {
  const ReactActual = jest.requireActual('react') as typeof import('react');
  const MockScreen = () => null;
  const MockTabs = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions: Record<string, unknown>;
  }) => {
    capturedScreenOptions = screenOptions;
    return ReactActual.createElement(ReactActual.Fragment, null, children);
  };
  MockTabs.Screen = MockScreen;
  return {
    Tabs: MockTabs,
  };
});

describe('TabsLayout (T-046e E2)', () => {
  beforeEach(() => {
    capturedScreenOptions = {};
  });

  it('provides a tabBarLabel function that caps font scale at fontScaleCaps.compact', async () => {
    render(
      <ThemeProvider>
        <TabsLayout />
      </ThemeProvider>,
    );

    await waitFor(() => {
      expect(typeof capturedScreenOptions.tabBarLabel).toBe('function');
    });
    const renderLabel = capturedScreenOptions.tabBarLabel as (props: {
      color: string;
      children: string;
    }) => React.ReactElement<TextProps>;

    const labelElement = renderLabel({ color: '#0F766E', children: 'Workspace' });
    expect(labelElement.type).toBe(Text);
    expect(labelElement.props.numberOfLines).toBe(1);
    expect(labelElement.props.maxFontSizeMultiplier).toBe(fontScaleCaps.compact);
    expect(labelElement.props.children).toBe('Workspace');

    const trackerElement = renderLabel({ color: '#4A5A59', children: 'Tracker' });
    expect(trackerElement.props.maxFontSizeMultiplier).toBe(fontScaleCaps.compact);
    expect(trackerElement.props.children).toBe('Tracker');

    const settingsElement = renderLabel({ color: '#4A5A59', children: 'Settings' });
    expect(settingsElement.props.maxFontSizeMultiplier).toBe(fontScaleCaps.compact);
    expect(settingsElement.props.children).toBe('Settings');
  });
});
