import {
  setAndroidReleaseFixes,
  withAndroidReleaseFixes,
} from '../../plugins/withAndroidReleaseFixes';

describe('withAndroidReleaseFixes plugin', () => {
  it('exports the config plugin and pure manifest transform function', () => {
    expect(typeof withAndroidReleaseFixes).toBe('function');
    expect(typeof setAndroidReleaseFixes).toBe('function');
  });

  it('sets usesCleartextTraffic and configChanges on a minimal manifest', () => {
    const manifest: any = {
      application: [
        {
          $: {},
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
                'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize',
              },
            },
          ],
        },
      ],
    };

    setAndroidReleaseFixes(manifest);

    expect(manifest.application[0].$['android:usesCleartextTraffic']).toBe('true');
    expect(manifest.application[0].activity[0].$['android:configChanges']).toBe(
      'keyboard|keyboardHidden|orientation|screenSize|fontScale|density'
    );
  });

  it('does not duplicate configChanges entries when run twice', () => {
    const manifest: any = {
      application: [
        {
          $: {},
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
                'android:configChanges': 'keyboard|keyboardHidden|orientation|screenSize',
              },
            },
          ],
        },
      ],
    };

    setAndroidReleaseFixes(manifest);
    setAndroidReleaseFixes(manifest);

    expect(manifest.application[0].$['android:usesCleartextTraffic']).toBe('true');
    expect(manifest.application[0].activity[0].$['android:configChanges']).toBe(
      'keyboard|keyboardHidden|orientation|screenSize|fontScale|density'
    );

    const changes = manifest.application[0].activity[0].$['android:configChanges'].split('|');
    const fontScaleCount = changes.filter((c: string) => c === 'fontScale').length;
    const densityCount = changes.filter((c: string) => c === 'density').length;

    expect(fontScaleCount).toBe(1);
    expect(densityCount).toBe(1);
  });

  it('handles activity with missing initial configChanges', () => {
    const manifest: any = {
      application: [
        {
          $: {},
          activity: [
            {
              $: {
                'android:name': '.MainActivity',
              },
            },
          ],
        },
      ],
    };

    setAndroidReleaseFixes(manifest);

    expect(manifest.application[0].$['android:usesCleartextTraffic']).toBe('true');
    expect(manifest.application[0].activity[0].$['android:configChanges']).toBe('fontScale|density');
  });
});
