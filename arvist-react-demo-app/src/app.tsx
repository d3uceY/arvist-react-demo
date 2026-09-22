import { useMemo, useState } from 'react';
import { ArvistProvider, type ArvistClientConfig } from '@arvist/react';
// The stylesheet for the /ui components: plain CSS, scoped under
// `.arvist-root`. Required once, anywhere in the tree that renders them.
import '@arvist/react/styles.css';
import { createMockBackend } from './mock/backend';
import { QualityStationBoard } from './quality-station-board';

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
 * 2. This demo has no real Arvist server behind it. `config.fetch` and
 *    `realtime.transport` point at a fake ("mock") backend instead, copied
 *    from the SDK's own example, that answers with the same kind of data a
 *    real server would. In a real app you'd delete the mock and pass a real
 *    `baseUrl` and `token` here instead. Nothing else would need to change.
 */
export function App() {
  const backend = useMemo(() => createMockBackend(), []);

  const config = useMemo<ArvistClientConfig>(
    () => ({ baseUrl: 'https://mock.arvist.local', siteId: 1, fetch: backend.fetch, retries: 0 }),
    [backend],
  );

  const realtime = useMemo(() => ({ transport: backend.transport }), [backend]);

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
        autoCompleted={autoCompleted}
        onAutoCompletedChange={setAutoCompleted}
      />
    </ArvistProvider>
  );
}
