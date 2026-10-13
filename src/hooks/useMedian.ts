import { useEffect, useState } from 'react';
import Median from 'median-js-bridge';

export const useMedian = () => {
  const [isReady, setIsReady] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [platform, setPlatform] = useState<'web' | 'android' | 'ios'>('web');

  useEffect(() => {
    const nativeApp = Median.isNativeApp();
    setIsNativeApp(nativeApp);

    Median.onReady(async () => {
      setIsReady(true);
      try {
        const currentPlatform = await Median.getPlatform();
        setPlatform(currentPlatform);
      } catch (error) {
        console.log('Platform detection error:', error);
      }
    });
  }, []);

  const showAlert = (message: string) => {
    window.alert(message);
  };

  const openUrl = (url: string) => {
    if (isNativeApp && isReady) {
      window.location.href = url;
    } else {
      window.open(url, '_blank');
    }
  };

  return {
    isReady,
    isNativeApp,
    platform,
    showAlert,
    openUrl,
    Median,
  };
};
