import { StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, Card, Heading, Muted, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';

const people = [{ name: 'Ana (you)', logs: 54, coins: 1250 }, { name: 'Raj', logs: 47, coins: 1380 }, { name: 'Mika', logs: 41, coins: 980 }, { name: 'Leo', logs: 33, coins: 870 }, { name: 'Sam', logs: 28, coins: 790 }];

export default function LeaderboardScreen() {
  return <Screen><Heading title="Crew leaderboard" subtitle="Celebrate steady check-ins together. Health information stays private." /><Card style={styles.podium}>{people.slice(0, 3).map((person, index) => <View key={person.name} style={styles.person}><Text style={[styles.rank, index === 0 && { color: C.gold }]}>{index + 1}</Text><Text style={styles.personName}>{person.name}</Text><Muted>{person.logs} logs</Muted></View>)}</Card><Card>{people.slice(3).map((person, index) => <View key={person.name} style={styles.row}><Text style={styles.number}>{index + 4}</Text><Text style={styles.personName}>{person.name}</Text><Text style={styles.logs}>{person.logs} check-ins</Text></View>)}</Card><Card><Text style={styles.note}>◉  Coins are earned by logging mood, sleep, radiation, body, meals and exercise.</Text><Muted>Rankings are for encouragement and never show private journal entries or health readings.</Muted></Card><Button title="Back to avatar" secondary onPress={() => router.back()} /></Screen>;
}

const styles = StyleSheet.create({ podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', minHeight: 160, gap: 8 }, person: { flex: 1, alignItems: 'center', gap: 7, backgroundColor: C.elevated, borderRadius: 14, padding: 10, minHeight: 105, justifyContent: 'center' }, rank: { color: C.text, fontSize: 24, fontWeight: '900' }, personName: { color: C.text, fontWeight: '700', fontSize: 12 }, row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.border, gap: 12 }, number: { color: C.purple, fontWeight: '900', fontSize: 18, width: 25 }, logs: { marginLeft: 'auto', color: C.teal, fontSize: 12, fontWeight: '700' }, note: { color: C.gold, fontWeight: '700', lineHeight: 20 },
});
