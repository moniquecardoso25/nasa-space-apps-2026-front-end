import { Card } from './Card';
import { Header } from './Header';
import { Screen } from './Screen';
import { Txt } from './Txt';
import { C } from '@/theme/tokens';

/** Temporary screen used while a route is not built yet. */
export function Placeholder({ title, note, back = true }: { title: string; note?: string; back?: boolean }) {
  return (
    <Screen header={back ? <Header title={title} /> : null} padded tabBar={!back}>
      {!back ? (
        <Txt heading weight="700" size={22} style={{ marginTop: 16 }}>
          {title}
        </Txt>
      ) : null}
      <Card>
        <Txt color={C.muted}>{note ?? 'This screen is being built.'}</Txt>
      </Card>
    </Screen>
  );
}
