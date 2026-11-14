import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Chip, Heading, Label, Muted, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';

type Shop = 'Helmet' | 'Suit' | 'Room' | 'Pets';
const inventory: Record<Shop, string[]> = { Helmet: ['Classic · equipped', 'Nebula · 300', 'Solar · 450', 'Aurora · owned', 'Mars red · 600', 'Stealth · 800'], Suit: ['Standard · equipped', 'Flight blue · 250', 'Orange EVA · 500', 'Lilac · owned', 'Gold trim · 700', 'Night · 900'], Room: ['Earth day · equipped', 'Earth night · 200', 'Sunrise · 350', 'Aurora · 450', 'Lilac panels · equipped', 'Warm wood · 400'], Pets: ['Robo-cat · equipped', 'Mini drone · 350', 'Plant buddy · 200', 'Jelly-bot · 600'] };

export default function AvatarScreen() {
  const [section, setSection] = useState<Shop>('Helmet');
  const [coins, setCoins] = useState(1250);
  const [owned, setOwned] = useState<string[]>(['Aurora', 'Lilac', 'Classic', 'Standard', 'Earth day', 'Robo-cat']);
  const [notice, setNotice] = useState('');
  const buy = (item: string) => {
    const [name, priceText] = item.split(' · ');
    const price = Number(priceText);
    if (!Number.isFinite(price) || owned.includes(name)) return;
    if (price > coins) { setNotice('Complete health logs to earn more mission coins.'); return; }
    setCoins((value) => value - price); setOwned((value) => [...value, name]); setNotice(`${name} added to your collection.`);
  };
  return <Screen>
    <View style={styles.heading}><Heading eyebrow="Personalize your mission" title="Avatar & shop" subtitle="Your companion levels up as you check in and care for your health." /><View style={styles.coins}><Text style={{ color: C.gold }}>◉</Text><Text style={styles.coinText}>{coins.toLocaleString()}</Text></View></View>
    <Card style={styles.avatarCard}><View style={styles.window}><View style={styles.earth} /><Text style={styles.astronaut}>👩‍🚀</Text><View style={styles.robot}><Text>🤖</Text></View></View><Label>Bolt</Label><Muted>Level 4 · 54 logs · your companion</Muted><View style={styles.progress}><View style={styles.progressFill} /></View></Card>
    <View style={styles.tabs}>{(['Helmet', 'Suit', 'Room', 'Pets'] as Shop[]).map((value) => <Chip key={value} title={value} active={section === value} onPress={() => setSection(value)} />)}</View>
    <Card><Label>{section} collection</Label><View style={styles.grid}>{inventory[section].map((item) => { const name = item.split(' · ')[0]; const isOwned = owned.includes(name) || item.includes('equipped'); return <Pressable accessibilityRole="button" key={item} onPress={() => buy(item)} style={[styles.item, isOwned && styles.itemOwned]}><Text style={styles.itemGlyph}>{section === 'Pets' ? '🐾' : section === 'Room' ? '✦' : '◉'}</Text><Text style={styles.itemName}>{name}</Text><Text style={[styles.itemState, isOwned && { color: C.teal }]}>{isOwned ? 'Owned' : `◉ ${item.split(' · ')[1]}`}</Text></Pressable>; })}</View></Card>
    {notice ? <Muted style={{ color: C.teal }}>{notice}</Muted> : null}
    <Pressable accessibilityRole="button" onPress={() => router.push('/leaderboard')} style={styles.leader}><Text style={styles.trophy}>♜</Text><View style={{ flex: 1 }}><Text style={styles.leaderTitle}>Leaderboard</Text><Text style={styles.leaderSub}>#1 in daily logs · #2 in coins</Text></View><Text style={{ color: C.muted, fontSize: 20 }}>›</Text></Pressable>
    <Button title="Mission setup" secondary onPress={() => router.push('/onboarding')} />
    <Button title="Switch crew / sign out" secondary onPress={() => router.push('/login')} />
  </Screen>;
}

const styles = StyleSheet.create({ heading: { gap: 8 }, coins: { alignSelf: 'flex-start', flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: C.surface, borderRadius: 30, borderWidth: 1, borderColor: C.border, padding: 10 }, coinText: { color: C.text, fontWeight: '800' }, avatarCard: { alignItems: 'center' }, window: { width: '100%', height: 175, borderRadius: 17, backgroundColor: C.background, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' }, earth: { width: 290, height: 130, backgroundColor: '#2867C7', borderRadius: 160, position: 'absolute', bottom: -58, borderTopWidth: 5, borderColor: C.teal }, astronaut: { fontSize: 74 }, robot: { position: 'absolute', bottom: 13, right: 23, backgroundColor: C.elevated, padding: 8, borderRadius: 30 }, progress: { height: 7, width: '100%', backgroundColor: C.track, borderRadius: 8 }, progressFill: { height: 7, width: '68%', backgroundColor: C.teal, borderRadius: 8 }, tabs: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, item: { width: '31%', minHeight: 108, borderRadius: 14, borderWidth: 1, borderColor: C.border, backgroundColor: C.background, alignItems: 'center', justifyContent: 'center', gap: 5, padding: 7 }, itemOwned: { borderColor: C.teal }, itemGlyph: { color: C.purple, fontSize: 24 }, itemName: { color: C.text, fontSize: 11, fontWeight: '700', textAlign: 'center' }, itemState: { color: C.gold, fontSize: 10 }, leader: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 14, backgroundColor: C.surface, borderRadius: 15, borderColor: C.border, borderWidth: 1 }, trophy: { color: C.gold, fontSize: 23 }, leaderTitle: { color: C.text, fontWeight: '800' }, leaderSub: { color: C.muted, fontSize: 11, marginTop: 3 },
});
