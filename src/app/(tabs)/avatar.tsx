import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Astronaut } from '@/components/Astronaut';
import { PrimaryButton, SecondaryButton } from '@/components/Buttons';
import { Icon } from '@/components/Icon';
import { Segmented } from '@/components/Inputs';
import { CoinsPill } from '@/components/Pills';
import { ItemArt, PetArt, Surface, WindowView, floorSpec, wallSpec } from '@/components/ShopArt';
import { Txt } from '@/components/Txt';
import { buyItem, equipItem, getAstronaut, getLeaderboard, getLogs, getShop, isEquipped, isOwned } from '@/data/api';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { formatCoins } from '@/data/format';
import { boltColors } from '@/data/shopArt';
import { useData } from '@/data/store';
import type { ShopCategory, ShopItem } from '@/data/types';
import { C, X, tokens } from '@/theme/tokens';

type Tab = 'helmet' | 'suit' | 'room' | 'pets';
const TABS: { value: Tab; label: string }[] = [
  { value: 'helmet', label: 'Helmet' },
  { value: 'suit', label: 'Suit' },
  { value: 'room', label: 'Room' },
  { value: 'pets', label: 'Pets' },
];
const ROOM_ROWS: { cat: ShopCategory; title: string }[] = [
  { cat: 'window', title: 'Window view' },
  { cat: 'wall', title: 'Wall' },
  { cat: 'floor', title: 'Floor' },
];

/** Mini room with Bolt, the equipped window/wall/floor and pet. */
function Stage() {
  const { me, logs } = useData(() => ({ me: getAstronaut(), logs: getLogs().length }));
  const eq = me.avatar.equipped;
  return (
    <View style={styles.stage}>
      <View style={StyleSheet.absoluteFill}>
        <Surface spec={wallSpec(eq.room.wall)} width={420} height={230} />
      </View>
      <View style={styles.window}>
        <WindowView id={eq.room.window} width={110} height={80} />
      </View>
      <View style={styles.floor}>
        <Surface spec={floorSpec(eq.room.floor)} width={420} height={58} />
      </View>
      <View style={styles.floorEdge} />
      <View style={styles.bolt}>
        <Astronaut state="idle" scale={1.214} colors={boltColors(eq)} />
      </View>
      {eq.pet ? (
        <View style={styles.pet}>
          <PetArt id={eq.pet} size={48} />
        </View>
      ) : null}
      <View style={styles.name}>
        <Txt heading weight="700" size={tokens.ext.fontSize.nameplate}>
          {me.avatar.name}
        </Txt>
        <Txt size={tokens.font.size.caption} color={C.muted}>
          Level {me.avatar.level} · {logs} logs
        </Txt>
      </View>
    </View>
  );
}

function ItemCard({ item, onPress, wide }: { item: ShopItem; onPress: () => void; wide?: boolean }) {
  const { owned, equipped } = useData(() => ({ owned: isOwned(item.id), equipped: isEquipped(item.id) }), [item.id]);
  const room = ['window', 'wall', 'floor'].includes(item.category);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: equipped }}
      accessibilityLabel={`${item.name}, ${equipped ? 'equipped' : owned ? 'owned' : `${item.price} coins`}`}
      onPress={onPress}
      style={[styles.item, room ? styles.roomItem : wide ? styles.wideItem : styles.gridItem, equipped && styles.equipped]}>
      <ItemArt id={item.id} category={item.category} size={item.category === 'pet' ? 56 : 44} />
      <Txt weight="600" size={tokens.font.size.caption} numberOfLines={1}>
        {item.name}
      </Txt>
      {equipped ? (
        <Txt weight="700" size={tokens.font.size.caption} color={C.teal}>
          Equipped
        </Txt>
      ) : owned ? (
        <Txt weight="700" size={tokens.font.size.caption} color={C.muted}>
          Owned
        </Txt>
      ) : (
        <View style={styles.price}>
          <Icon name="coin" size={14} color={C.gold} />
          <Txt weight="700" size={tokens.font.size.caption}>
            {formatCoins(item.price)}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

/** Avatar & shop with tabs Helmet / Suit / Room / Pets (`?tab=`). */
export default function Avatar() {
  const insets = useSafeAreaInsets();
  const action = useAsyncAction();
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const tab: Tab = TABS.some((t) => t.value === params.tab) ? (params.tab as Tab) : 'helmet';
  const [pending, setPending] = useState<ShopItem | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const { me, items, rank } = useData(
    () => ({
      me: getAstronaut(),
      items: getShop(),
      rank: {
        logs: getLeaderboard('logs').find((r) => r.astronaut.id === getAstronaut().id)?.rank,
        coins: getLeaderboard('coins').find((r) => r.astronaut.id === getAstronaut().id)?.rank,
      },
    }),
    [],
  );

  const tap = (item: ShopItem) => {
    if (action.busy) return;
    setNotice(null);
    if (isOwned(item.id)) {
      void action.run(() => equipItem(item.id));
      return;
    }
    setPending(item);
  };
  const confirmBuy = async () => {
    if (!pending) return;
    const r = await buyItem(pending.id);
    if (r === 'ok') {
      await equipItem(pending.id);
      setNotice(`${pending.name} unlocked and equipped.`);
    } else if (r === 'no_coins') setNotice(`You need ${formatCoins(pending.price - me.avatar.coins)} more coins. Keep logging!`);
    setPending(null);
  };

  const byCat = (c: ShopCategory) => items.filter((i) => i.category === c);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 16 }}>
        <View style={styles.header}>
          <Txt heading weight="700" size={tokens.font.size.title} accessibilityRole="header">
            Avatar & shop
          </Txt>
          <CoinsPill amount={me.avatar.coins} />
        </View>
        <Stage />
        <View style={styles.main}>
          <Segmented items={TABS} selected={tab} onChange={(t) => router.setParams({ tab: t })} />
          {action.error ? <Txt color={C.danger} accessibilityLiveRegion="polite">{action.error}</Txt> : null}
          {notice ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Icon name="check" size={14} color={C.teal} strokeWidth={3} />
              <Txt size={tokens.font.size.caption} style={{ flex: 1 }}>
                {notice}
              </Txt>
            </View>
          ) : null}
          {tab === 'room' ? (
            ROOM_ROWS.map((row) => (
              <View key={row.cat} style={{ gap: 8 }}>
                <View style={styles.rowHead}>
                  <Txt weight="700" size={tokens.font.size.small}>
                    {row.title}
                  </Txt>
                  <Txt size={tokens.font.size.tiny} color={C.muted}>
                    {byCat(row.cat).length} options · scroll
                  </Txt>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 16 }} style={{ marginRight: -16 }}>
                  {byCat(row.cat).map((it) => (
                    <ItemCard key={it.id} item={it} onPress={() => tap(it)} />
                  ))}
                </ScrollView>
              </View>
            ))
          ) : (
            <View style={styles.grid}>
              {byCat(tab === 'pets' ? 'pet' : tab).map((it) => (
                <ItemCard key={it.id} item={it} wide={tab === 'pets'} onPress={() => tap(it)} />
              ))}
            </View>
          )}
          <Pressable accessibilityRole="link" onPress={() => router.push('/leaderboard')} style={styles.leader}>
            <View style={styles.trophy}>
              <Icon name="trophy" size={20} color={C.gold} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt weight="700" size={tokens.ext.fontSize.label}>
                Leaderboard
              </Txt>
              <Txt size={tokens.font.size.caption} color={C.muted}>
                #{rank.logs} in daily logs · #{rank.coins} in coins
              </Txt>
            </View>
            <Icon name="chevronRight" size={18} color={C.muted} />
          </Pressable>
        </View>
      </ScrollView>

      {pending ? (
        <View style={styles.overlay}>
          <Pressable accessibilityLabel="Cancel" style={StyleSheet.absoluteFill} onPress={() => setPending(null)} />
          <View style={styles.sheet} accessibilityViewIsModal>
            <View style={{ alignItems: 'center', gap: 8 }}>
              <ItemArt id={pending.id} category={pending.category} size={64} />
              <Txt heading weight="700" size={tokens.font.size.screenTitle}>
                Unlock {pending.name}?
              </Txt>
              <Txt size={tokens.font.size.small} color={C.muted} align="center">
                {me.avatar.coins >= pending.price
                  ? `Costs ${formatCoins(pending.price)} coins. You have ${formatCoins(me.avatar.coins)}.`
                  : `Costs ${formatCoins(pending.price)} coins. You have ${formatCoins(me.avatar.coins)}, keep logging to earn more.`}
              </Txt>
            </View>
            <PrimaryButton label={`Buy & equip · ${formatCoins(pending.price)}`} onPress={confirmBuy} disabled={me.avatar.coins < pending.price} />
            <SecondaryButton label="Not now" onPress={() => setPending(null)} />
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingHorizontal: 16, paddingBottom: 10 },
  stage: {
    height: 230,
    marginHorizontal: 16,
    borderRadius: tokens.ext.radius.panel,
    overflow: 'hidden',
    backgroundColor: C.bgScene,
    borderWidth: 1,
    borderColor: C.border,
  },
  window: {
    position: 'absolute',
    left: 150,
    top: 18,
    width: 120,
    height: 90,
    borderRadius: 20,
    borderWidth: 5,
    borderColor: C.track,
    overflow: 'hidden',
    backgroundColor: X.space,
  },
  floor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 58, overflow: 'hidden' },
  floorEdge: { position: 'absolute', left: 0, right: 0, bottom: 58, height: 2, backgroundColor: C.teal },
  bolt: { position: 'absolute', left: 46, top: 40 },
  pet: { position: 'absolute', left: 172, bottom: 18 },
  name: { position: 'absolute', left: 14, top: 14, gap: 2 },
  main: { gap: 12, paddingTop: 12, paddingHorizontal: 16 },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: tokens.radius.small, backgroundColor: X.tealChip },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  item: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: tokens.ext.radius.button,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  gridItem: { flexBasis: '30%', flexGrow: 1 },
  wideItem: { flexBasis: '45%', flexGrow: 1 },
  roomItem: { width: 92, paddingVertical: 8 },
  equipped: { borderWidth: 2, borderColor: C.teal },
  price: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  leader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 60,
    paddingHorizontal: 14,
    borderRadius: tokens.radius.card,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
  },
  trophy: { width: 40, height: 40, borderRadius: tokens.radius.small, backgroundColor: X.goldSoft, alignItems: 'center', justifyContent: 'center' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: X.shadowDeep, justifyContent: 'flex-end' },
  sheet: {
    gap: 12,
    margin: 12,
    padding: 18,
    borderRadius: tokens.radius.sheet,
    backgroundColor: C.surfaceSolid,
    borderWidth: 1,
    borderColor: C.border,
  },
});
