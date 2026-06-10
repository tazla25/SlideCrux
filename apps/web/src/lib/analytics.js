export function trackEvent(eventName, eventData = {}) {
  if (typeof window.umami !== 'undefined') {
    window.umami.track(eventName, eventData);
  }
}
