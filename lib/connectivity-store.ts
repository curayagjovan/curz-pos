type Listener = () => void;

let isOnline = true;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function getIsOnline() {
  return isOnline;
}

export function getServerIsOnline() {
  return true;
}

export function subscribeConnectivity(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function markOnline() {
  if (!isOnline) {
    isOnline = true;
    notify();
  }
}

export function markOffline() {
  if (isOnline) {
    isOnline = false;
    notify();
  }
}
