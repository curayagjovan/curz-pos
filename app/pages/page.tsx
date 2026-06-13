"use client";

import { useSyncExternalStore } from "react";
import {
  IonApp,
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
} from "@ionic/react";

function subscribe() {
  return () => {};
}

export default function PagesRoute() {
  const isClient = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );

  if (!isClient) {
    return (
      <div className="hello-world-shell">
        <h1>Hello World</h1>
        <p>Loading Ionic UI...</p>
      </div>
    );
  }

  return (
    <IonApp>
      <IonPage>
        <IonHeader translucent>
          <IonToolbar>
            <IonTitle>Hello World</IonTitle>
          </IonToolbar>
        </IonHeader>

        <IonContent fullscreen className="hello-world-content">
          <div className="hello-world-shell">
            <h1>Hello World</h1>
            <p>Fresh Ionic frontend is ready.</p>
          </div>
        </IonContent>
      </IonPage>
    </IonApp>
  );
}
