import { useState } from 'react';
import { router } from 'expo-router';
import { Button, Card, Field, Heading, Muted, Screen } from '@/components/cosmo-ui';
import { C } from '@/constants/cosmo';
import { Text, View } from 'react-native';

export default function LoginScreen() {
  const [crewId, setCrewId] = useState('ORB3-ANA');
  const [pin, setPin] = useState('');
  return <Screen><View style={{ alignItems: 'center', gap: 8, paddingVertical: 34 }}><Text style={{ color: C.teal, fontSize: 52 }}>◉</Text><Heading title="CosmoMedic" subtitle="Health monitoring for space missions" /></View><Card><Field label="Crew ID" value={crewId} onChangeText={setCrewId} placeholder="ORB3-ANA" /><Field label="PIN" value={pin} onChangeText={setPin} placeholder="••••" /><Button title="Sign in" onPress={() => router.push('/onboarding')} /><Muted>Hackathon demo · use any crew ID and PIN.</Muted></Card></Screen>;
}
