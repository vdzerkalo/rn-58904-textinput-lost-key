/**
 * Reproducer for https://github.com/react/react-native/issues/58904
 * [iOS][Fabric] TextInput drops a keystroke right after the first character typed into an empty field.
 *
 * Every row is an uncontrolled, empty TextInput (defaultValue only) with fontSize + lineHeight + color. Tap a field and
 * type two digits quickly as one burst, e.g. "2" then "8" (on the simulator: the Mac keyboard). The row compares the
 * keys `onKeyPress` reported with the characters that landed in the field. A lost key still fires `onKeyPress`, but
 * never reaches the field.
 *
 * @format
 */

import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const FIELDS = 6;

type Typed = { keys: string[]; times: number[]; text: string };
const EMPTY: Typed = { keys: [], times: [], text: '' };

function App() {
  const [round, setRound] = useState(0);
  const [typed, setTyped] = useState<Typed[]>(() => Array(FIELDS).fill(EMPTY));

  const update = (index: number, change: (t: Typed) => Typed) =>
    setTyped(prev => prev.map((t, i) => (i === index ? change(t) : t)));

  const used = typed.filter(t => t.keys.length > 0);
  const lost = used.filter(t => t.keys.length > t.text.length).length;

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="always"
        >
          <Text style={styles.title}>
            #58904: a key typed right after the first one is lost
          </Text>
          <Text style={styles.body}>
            Tap a field and type two digits quickly as one burst (e.g. 2 then
            8). Then the next field.
          </Text>

          {typed.map((t, i) => {
            const isLost = t.keys.length > t.text.length;
            return (
              <View key={`${round}-${i}`} style={styles.row}>
                <TextInput
                  defaultValue=""
                  keyboardType="number-pad"
                  placeholder={`Field ${i + 1}`}
                  style={styles.input}
                  onKeyPress={e => {
                    const { key } = e.nativeEvent;
                    if (key !== 'Backspace') {
                      const now = Date.now();
                      update(i, p => ({
                        ...p,
                        keys: [...p.keys, key],
                        times: [...p.times, now],
                      }));
                    }
                  }}
                  onChangeText={text => update(i, p => ({ ...p, text }))}
                />
                <Text style={[styles.result, isLost && styles.lost]}>
                  {t.keys.length === 0
                    ? ''
                    : `pressed "${t.keys.join('')}" → "${t.text}"${
                        isLost ? ' LOST' : ''
                      }` +
                      (t.times.length > 1
                        ? `\n2nd key ${Math.round(
                            t.times[1] - t.times[0],
                          )} ms after 1st`
                        : '')}
                </Text>
              </View>
            );
          })}

          <Text style={styles.summary}>
            Fields typed into: {used.length} · lost a key: {lost}
          </Text>
          <Pressable
            onPress={() => {
              setTyped(Array(FIELDS).fill(EMPTY));
              setRound(r => r + 1);
            }}
            style={styles.button}
          >
            <Text style={styles.buttonText}>New empty fields</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f2f2f7' },
  content: { padding: 16, gap: 10 },
  title: { fontSize: 18, fontWeight: '600', color: '#1c1c1e' },
  body: { fontSize: 15, color: '#3a3a3c' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  // The field under test: fontSize + lineHeight + color, as in the report.
  input: {
    width: 120,
    fontSize: 24,
    lineHeight: 30,
    color: '#1c1c1e',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  result: { flex: 1, fontSize: 14, color: '#1c1c1e' },
  lost: { color: '#c62828', fontWeight: '600' },
  summary: { fontSize: 16, fontWeight: '600', color: '#1c1c1e', marginTop: 4 },
  button: { alignSelf: 'flex-start', paddingVertical: 8 },
  buttonText: { fontSize: 16, color: '#0a63d6' },
});

export default App;
