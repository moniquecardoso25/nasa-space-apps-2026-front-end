import { StyleSheet, View } from 'react-native';
import { C } from '@/constants/cosmo';

export function BoltMascot() {
  return <View style={styles.bolt}>
    <View style={styles.antenna}><View style={styles.antennaDot} /></View>
    <View style={styles.head}><View style={styles.visor}><View style={styles.eye} /><View style={styles.eye} /></View></View>
    <View style={styles.neck} /><View style={styles.body}><View style={styles.panel}><View style={styles.panelDot} /><View style={styles.panelDotGold} /></View></View>
    <View style={styles.armLeft} /><View style={styles.armRight} /><View style={styles.legLeft} /><View style={styles.legRight} /><View style={styles.footLeft} /><View style={styles.footRight} />
  </View>;
}

const styles = StyleSheet.create({
  bolt: { width: 76, height: 154, alignItems: 'center' },
  antenna: { position: 'absolute', top: 0, width: 3, height: 18, backgroundColor: C.purple, alignItems: 'center' }, antennaDot: { width: 7, height: 7, borderRadius: 4, marginTop: -3, backgroundColor: C.teal },
  head: { position: 'absolute', top: 12, width: 66, height: 65, borderRadius: 36, backgroundColor: '#E6E4FF', borderWidth: 2, borderColor: '#B7B0F1', alignItems: 'center', justifyContent: 'center' },
  visor: { width: 48, height: 34, borderRadius: 20, backgroundColor: '#171642', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 11 }, eye: { width: 8, height: 8, borderRadius: 5, backgroundColor: C.teal },
  neck: { position: 'absolute', top: 70, width: 22, height: 12, backgroundColor: '#D2CFF4' }, body: { position: 'absolute', top: 78, width: 56, height: 64, borderRadius: 19, backgroundColor: '#E6E4FF', alignItems: 'center', justifyContent: 'center' },
  panel: { width: 33, height: 20, borderRadius: 5, backgroundColor: '#171642', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 }, panelDot: { width: 8, height: 8, borderRadius: 5, backgroundColor: C.purple }, panelDotGold: { width: 8, height: 8, borderRadius: 5, backgroundColor: C.gold },
  armLeft: { position: 'absolute', top: 84, left: 3, width: 18, height: 57, borderRadius: 12, backgroundColor: '#BBB5EF', transform: [{ rotate: '7deg' }] }, armRight: { position: 'absolute', top: 84, right: 3, width: 18, height: 57, borderRadius: 12, backgroundColor: '#BBB5EF', transform: [{ rotate: '-7deg' }] },
  legLeft: { position: 'absolute', top: 134, left: 24, width: 12, height: 17, backgroundColor: '#D4D1F7' }, legRight: { position: 'absolute', top: 134, right: 24, width: 12, height: 17, backgroundColor: '#D4D1F7' }, footLeft: { position: 'absolute', bottom: 0, left: 8, width: 35, height: 17, borderRadius: 11, backgroundColor: '#BDB8EF' }, footRight: { position: 'absolute', bottom: 0, right: 8, width: 35, height: 17, borderRadius: 11, backgroundColor: '#BDB8EF' },
});
