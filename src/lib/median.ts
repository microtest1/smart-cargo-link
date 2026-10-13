// Detect if running in Median mobile app (Official Method)
export const isMedianApp = navigator.userAgent.indexOf('median') > -1;

if (isMedianApp) {
  console.log('Running inside a Median native app!');
} else {
  console.log('Running in a web browser.');
}
