import { useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { ArvistProvider, type ArvistClientConfig } from '@arvist/react';
// The stylesheet for the /ui components: plain CSS, scoped under
// `.arvist-root`. Required once, anywhere in the tree that renders them.
import '@arvist/react/styles.css';
import { createMockBackend, type MockBackend } from './mock/backend';
import { QualityStationBoard } from './quality-station-board';

// Same credentials/proxy approach as arvist-sdk-sample: set VITE_ARVIST_TOKEN
// (see .env) to point this demo at the real staging server instead of the
// built-in mock. The vite dev server proxies /v1/api and /socket.io to the
// real host and attaches the Cloudflare Access headers itself, since
// browsers can't set custom headers on a WebSocket upgrade.
const LIVE_TOKEN = import.meta.env.VITE_ARVIST_TOKEN as string | undefined;
const LIVE_STATION = (import.meta.env.VITE_ARVIST_STATION as string | undefined) || 'Mobile';

/**
 * This is where the SDK gets set up, before handing off to the actual page.
 *
 * Two things worth knowing, in plain terms:
 *
 * 1. `config` is only built once, using `useMemo`. This matters because
 *    `ArvistProvider` throws away its connection and opens a brand new one
 *    every time `config` changes. If we made a new `config` object on every
 *    render (e.g. by writing the object directly in the JSX below), the app
 *    would disconnect and reconnect constantly for no reason.
 * 2. Without a `VITE_ARVIST_TOKEN`, this demo has no real Arvist server
 *    behind it. `config.fetch` and `realtime.transport` point at a fake
 *    ("mock") backend instead, copied from the SDK's own example, that
 *    answers with the same kind of data a real server would. With a token
 *    set, it behaves like the sample app instead: real `baseUrl`/`token`,
 *    and a real socket.io connection through the dev server's proxy.
 */
export function App() {
  const backend = useMemo<MockBackend | undefined>(() => (LIVE_TOKEN ? undefined : createMockBackend()), []);

  const config = useMemo<ArvistClientConfig>(
    () =>
      LIVE_TOKEN
        ? { baseUrl: window.location.origin, token: LIVE_TOKEN, siteId: 1 }
        : { baseUrl: 'https://mock.arvist.local', siteId: 1, fetch: backend!.fetch, retries: 0 },
    [backend],
  );

  const realtime = useMemo(
    () => (LIVE_TOKEN ? { io, url: window.location.origin } : { transport: backend!.transport }),
    [backend],
  );

  // Some warehouses close out a shipment from another system entirely,
  // without anyone clicking "complete" on this screen. Turning this on tells
  // the SDK that's happening, so a missing item gets noted but doesn't block
  // completion. Leave it off and a missing item blocks completion instead.
  const [autoCompleted, setAutoCompleted] = useState(false);

  return (
    <ArvistProvider
      config={config}
      realtime={realtime}
      autoCompleted={autoCompleted}
      // You can rename any built-in label without copying/forking a
      // component: just override its text here.
      copy={{ actions: { remove_item: 'Pulled from tote' } }}
    >
      <QualityStationBoard
        backend={backend}
        stationName={LIVE_TOKEN ? LIVE_STATION : undefined}
        autoCompleted={autoCompleted}
        onAutoCompletedChange={setAutoCompleted}
      />
    </ArvistProvider>
  );
}
