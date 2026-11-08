import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { useDialog } from '@/components/Dialog';
import { PremiumLocked } from '@/components/Paywall';
import { Button, Card, ErrorText, IconButton, Input, Loading, Row, Screen, Txt } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import {
  localDay,
  useBodyWeights,
  useDeleteWeight,
  useLogWeight,
  usePremium,
  useSetWeightGoal,
  useWeightGoal,
  type BodyWeight,
} from '@/hooks/queries';
import { useAuth } from '@/hooks/useAuth';
import { makeStyles, useTheme } from '@/hooks/useTheme';
import { dateLocale, t } from '@/i18n';
import { asUnit, formatWeight, parseWeightInput, type WeightUnit } from '@/lib/units';

/** Body weight for an input box, to 0.1 (kg is stored to 0.01, so lb would show e.g. 180.01). */
const inputValue = (kg: number, unit: WeightUnit) => formatWeight(kg, unit, false);

export default function WeightTab() {
  const { isPremium, loading } = usePremium();
  if (loading) return <Loading />;
  if (!isPremium) {
    return (
      <PremiumLocked
        reason="weight"
        icon="scale-outline"
        title={t('Reach your goal weight')}
        text={t('Log your weight, set a goal and follow your trend, with tips on how to get there.')}
      />
    );
  }
  return <WeightScreen />;
}

// ---------- Helpers ----------

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y!, m! - 1, d!);
}

function shortDate(day: string): string {
  return parseDay(day).toLocaleDateString(dateLocale(), { month: 'short', day: 'numeric' });
}

/** Weight change per week (kg) over the last 4 weeks of entries, by least squares. */
function weeklyRate(entries: BodyWeight[]): number | null {
  const last = entries.at(-1);
  if (!last) return null;
  const end = parseDay(last.logged_on).getTime();
  const recent = entries.filter((e) => end - parseDay(e.logged_on).getTime() <= 28 * DAY_MS);
  if (recent.length < 3) return null;
  const xs = recent.map((e) => (parseDay(e.logged_on).getTime() - end) / DAY_MS);
  if (Math.max(...xs) - Math.min(...xs) < 7) return null;
  const ys = recent.map((e) => e.weight_kg);
  const mx = xs.reduce((a, b) => a + b, 0) / xs.length;
  const my = ys.reduce((a, b) => a + b, 0) / ys.length;
  let num = 0;
  let den = 0;
  xs.forEach((x, i) => {
    num += (x - mx) * (ys[i]! - my);
    den += (x - mx) ** 2;
  });
  return den === 0 ? null : (num / den) * 7;
}

type Direction = 'lose' | 'gain' | 'maintain';

function signed(kg: number, unit: WeightUnit): string {
  const sign = kg > 0.05 ? '+' : kg < -0.05 ? '−' : '';
  return `${sign}${formatWeight(Math.abs(kg), unit)}`;
}

function tipsFor(direction: Direction | null): string[] {
  const general = [
    t('Weigh yourself in the morning, after the bathroom and before eating, so the numbers are comparable.'),
    t('Follow the weekly trend, not single days. Water can move your weight 1–2 kg from one day to the next.'),
  ];
  if (direction === 'lose') {
    return [
      t('Aim for a small deficit of about 300–500 kcal a day instead of crash dieting.'),
      t('Eat 1.6–2.2 g of protein per kg of body weight to keep your muscle while you lose fat.'),
      t('Keep lifting heavy. Strength training tells your body to hold on to muscle.'),
      t('Walk more. 8,000–10,000 steps a day burns calories without hurting recovery.'),
      ...general,
    ];
  }
  if (direction === 'gain') {
    return [
      t('Eat about 250–500 kcal a day above maintenance so most of what you gain is muscle.'),
      t('Eat 1.6–2.2 g of protein per kg of body weight, spread over 3–5 meals.'),
      t('Use progressive overload: add a little weight or one more rep each week.'),
      t('Sleep 7–9 hours. Muscle is built while you recover.'),
      ...general,
    ];
  }
  if (direction === 'maintain') {
    return [
      t('Eat around your maintenance calories and keep your protein high.'),
      t('Keep training consistently. You can still swap fat for muscle at the same weight.'),
      ...general,
    ];
  }
  return [t('Set a goal weight to get tips for losing, gaining or maintaining.'), ...general];
}

// ---------- Screen ----------

function WeightScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  const { profile } = useAuth();
  const unit = asUnit(profile?.weight_unit);
  const weights = useBodyWeights();
  const goal = useWeightGoal();
  const logWeight = useLogWeight();
  const setGoal = useSetWeightGoal();
  const deleteWeight = useDeleteWeight();
  const { confirm, dialog } = useDialog();

  const entries = useMemo(() => weights.data ?? [], [weights.data]);
  const goalKg = goal.data ?? null;
  const today = localDay();
  const todayEntry = entries.find((e) => e.logged_on === today);

  // Fields show the saved value until the person types (null = not edited).
  const [weightDraft, setWeightDraft] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const weightText = weightDraft ?? (todayEntry ? inputValue(todayEntry.weight_kg, unit) : '');
  const goalText = goalDraft ?? (goalKg != null ? inputValue(goalKg, unit) : '');

  const first = entries[0];
  const latest = entries.at(-1);
  const rate = useMemo(() => weeklyRate(entries), [entries]);

  const direction: Direction | null =
    goalKg == null || !latest ? null : goalKg < latest.weight_kg - 0.5 ? 'lose' : goalKg > latest.weight_kg + 0.5 ? 'gain' : 'maintain';

  const onLog = () => {
    const kg = parseWeightInput(weightText, unit);
    if (kg == null || kg < 20 || kg > 400) {
      setFormError(t('Enter a weight between {min} and {max}.', { min: formatWeight(20, unit), max: formatWeight(400, unit) }));
      return;
    }
    setFormError(null);
    logWeight.mutate({ weightKg: kg }, { onSuccess: () => setWeightDraft(null) });
  };

  const onSaveGoal = () => {
    if (!goalText.trim()) {
      setGoal.mutate(null, { onSuccess: () => setGoalDraft(null) });
      return;
    }
    const kg = parseWeightInput(goalText, unit);
    if (kg == null || kg < 20 || kg > 400) {
      setFormError(t('Enter a weight between {min} and {max}.', { min: formatWeight(20, unit), max: formatWeight(400, unit) }));
      return;
    }
    setFormError(null);
    setGoal.mutate(kg, { onSuccess: () => setGoalDraft(null) });
  };

  const onDelete = async (entry: BodyWeight) => {
    const ok = await confirm(
      t('Delete this entry?'),
      t('{weight} on {date}', { weight: formatWeight(entry.weight_kg, unit), date: shortDate(entry.logged_on) }),
      t('Delete'),
      true,
    );
    if (ok) deleteWeight.mutate(entry.id);
  };

  if (weights.isLoading || goal.isLoading) return <Loading />;

  // Progress from the first entry toward the goal.
  let progress: number | null = null;
  if (first && latest && goalKg != null && Math.abs(first.weight_kg - goalKg) > 0.05) {
    progress = Math.min(1, Math.max(0, (first.weight_kg - latest.weight_kg) / (first.weight_kg - goalKg)));
  }
  const reached = latest && goalKg != null && direction === 'maintain';

  // Pace and estimated arrival.
  const insights: string[] = [];
  if (rate != null && latest) {
    const pace = (Math.abs(rate) / latest.weight_kg) * 100;
    const perWeek = formatWeight(Math.abs(rate), unit);
    if (Math.abs(rate) < 0.05) {
      insights.push(t('Your weight has been steady over the last 4 weeks.'));
    } else if (rate < 0) {
      insights.push(t('You are losing about {amount} a week.', { amount: perWeek }));
    } else {
      insights.push(t('You are gaining about {amount} a week.', { amount: perWeek }));
    }
    if (direction === 'lose') {
      if (rate >= -0.05) insights.push(t('To lose weight, try eating about 300 kcal a day less and keep training.'));
      else if (pace > 1) insights.push(t('That is faster than the 0.5–1% of body weight a week that protects muscle. Consider eating a bit more.'));
      else insights.push(t('That is a healthy pace for losing fat while keeping muscle.'));
    } else if (direction === 'gain') {
      if (rate <= 0.05) insights.push(t('To gain weight, try eating about 300 kcal a day more and keep lifting.'));
      else if (pace > 0.5) insights.push(t('That is faster than the 0.25–0.5% of body weight a week that keeps fat gain low. Consider eating a bit less.'));
      else insights.push(t('That is a good pace for building muscle.'));
    }
    if (goalKg != null && direction !== 'maintain' && direction !== null) {
      const remaining = goalKg - latest.weight_kg;
      if (Math.sign(remaining) === Math.sign(rate) && Math.abs(rate) >= 0.05) {
        // Projected from the latest entry along the current trend.
        const weeksLeft = remaining / rate;
        const eta = new Date(parseDay(latest.logged_on).getTime() + weeksLeft * 7 * DAY_MS);
        if (weeksLeft < 3 * 52) {
          insights.push(t('At this pace you will reach your goal around {date}.', {
            date: eta.toLocaleDateString(dateLocale(), { month: 'long', day: 'numeric', year: 'numeric' }),
          }));
        }
      }
    }
  } else if (entries.length > 0) {
    insights.push(t('Log your weight a few times a week. After a week or two you will see your pace here.'));
  }

  return (
    <Screen scroll contentStyle={{ paddingTop: spacing.md, gap: spacing.lg }}>
      {dialog}

      {/* Summary */}
      <Card style={{ gap: spacing.md }}>
        <View>
          <Txt variant="label">{t('Current weight')}</Txt>
          <Txt style={styles.hero}>{latest ? formatWeight(latest.weight_kg, unit) : '–'}</Txt>
          {latest ? <Txt variant="small">{t('Last logged {date}', { date: shortDate(latest.logged_on) })}</Txt> : null}
        </View>
        <Row style={{ justifyContent: 'space-between' }}>
          <Stat label={t('Start')} value={first ? formatWeight(first.weight_kg, unit) : '–'} />
          <Stat label={t('Change')} value={first && latest ? signed(latest.weight_kg - first.weight_kg, unit) : '–'} />
          <Stat label={t('Goal')} value={goalKg != null ? formatWeight(goalKg, unit) : '–'} />
        </Row>
        {progress != null ? (
          <View style={{ gap: spacing.xs }}>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <Txt variant="small">
              {reached
                ? t('You reached your goal. Keep it up!')
                : latest && goalKg != null
                  ? t('{percent}% of the way · {amount} to go', {
                      percent: Math.round(progress * 100),
                      amount: formatWeight(Math.abs(goalKg - latest.weight_kg), unit),
                    })
                  : null}
            </Txt>
          </View>
        ) : null}
      </Card>

      {/* Log + goal */}
      <Card style={{ gap: spacing.md }}>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input
              label={todayEntry ? t("Today's weight ({unit})", { unit: t(unit) }) : t('Log today ({unit})', { unit: t(unit) })}
              value={weightText}
              onChangeText={setWeightDraft}
              keyboardType="decimal-pad"
              placeholder={latest ? inputValue(latest.weight_kg, unit) : '75'}
              onSubmitEditing={onLog}
              returnKeyType="done"
            />
          </View>
          <Button title={todayEntry ? t('Update') : t('Save')} onPress={onLog} loading={logWeight.isPending} />
        </Row>
        <Row style={{ alignItems: 'flex-end' }}>
          <View style={{ flex: 1 }}>
            <Input
              label={t('Goal weight ({unit})', { unit: t(unit) })}
              value={goalText}
              onChangeText={setGoalDraft}
              keyboardType="decimal-pad"
              placeholder={t('Not set')}
              onSubmitEditing={onSaveGoal}
              returnKeyType="done"
            />
          </View>
          <Button variant="secondary" title={t('Set goal')} onPress={onSaveGoal} loading={setGoal.isPending} />
        </Row>
        <ErrorText>{formError ?? logWeight.error?.message ?? setGoal.error?.message}</ErrorText>
      </Card>

      {/* Trend */}
      {entries.length > 0 ? <TrendCard entries={entries} goalKg={goalKg} unit={unit} /> : null}

      {/* Insights and tips */}
      <Card style={{ gap: spacing.md }}>
        <Row>
          <Ionicons name="bulb-outline" size={20} color={colors.accent} />
          <Txt variant="h3">{t('Tips for your goal')}</Txt>
        </Row>
        {insights.length > 0 ? (
          <View style={styles.insight}>
            {insights.map((line) => <Txt key={line} style={{ lineHeight: 21 }}>{line}</Txt>)}
          </View>
        ) : null}
        {tipsFor(direction).map((tip) => (
          <Row key={tip} style={{ alignItems: 'flex-start' }}>
            <Ionicons name="checkmark" size={18} color={colors.success} style={{ marginTop: 1 }} />
            <Txt variant="muted" style={{ flex: 1, lineHeight: 20 }}>{tip}</Txt>
          </Row>
        ))}
        <Button
          variant="secondary"
          icon="sparkles"
          title={t('Ask your AI coach')}
          onPress={() => router.navigate('/coach')}
        />
      </Card>

      {/* History */}
      {entries.length > 0 ? (
        <View style={{ gap: spacing.sm }}>
          <Txt variant="label">{t('Recent entries')}</Txt>
          <Card style={{ gap: 0, paddingVertical: spacing.xs }}>
            {[...entries].reverse().slice(0, 14).map((e, i, list) => {
              const prev = list[i + 1];
              return (
                <Row key={e.id} style={[styles.entry, i < list.length - 1 && styles.entryBorder]}>
                  <Txt style={{ flex: 1 }}>{shortDate(e.logged_on)}</Txt>
                  {prev ? <Txt variant="small">{signed(e.weight_kg - prev.weight_kg, unit)}</Txt> : null}
                  <Txt variant="h3" style={{ minWidth: 72, textAlign: 'right' }}>{formatWeight(e.weight_kg, unit)}</Txt>
                  <IconButton name="trash-outline" size={18} color={colors.faint} onPress={() => onDelete(e)} accessibilityLabel={t('Delete')} />
                </Row>
              );
            })}
          </Card>
        </View>
      ) : null}
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <Txt variant="small">{label}</Txt>
      <Txt variant="h3">{value}</Txt>
    </View>
  );
}

// ---------- Trend chart ----------

const RANGES = [
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '1Y', days: 365 },
] as const;

const CHART_HEIGHT = 150;
const DOT = 8;

function TrendCard({ entries, goalKg, unit }: { entries: BodyWeight[]; goalKg: number | null; unit: WeightUnit }) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [range, setRange] = useState<(typeof RANGES)[number]['key']>('3M');
  const [width, setWidth] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const days = RANGES.find((r) => r.key === range)!.days;
  const end = parseDay(entries.at(-1)!.logged_on).getTime();
  const start = end - (days - 1) * DAY_MS;
  const shown = entries.filter((e) => parseDay(e.logged_on).getTime() >= start);
  const selected = shown.find((e) => e.id === selectedId) ?? shown.at(-1)!;

  // Y range covers the points and the goal, with a little padding.
  const values = shown.map((e) => e.weight_kg).concat(goalKg != null ? [goalKg] : []);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const pad = Math.max(0.5, (hi - lo) * 0.15);
  lo -= pad;
  hi += pad;

  const x = (day: string) => (shown.length === 1 ? width / 2 : ((parseDay(day).getTime() - start) / ((days - 1) * DAY_MS)) * (width - DOT) + DOT / 2);
  const y = (kg: number) => CHART_HEIGHT - ((kg - lo) / (hi - lo)) * CHART_HEIGHT;
  const points = shown.map((e) => ({ e, px: x(e.logged_on), py: y(e.weight_kg) }));

  return (
    <Card style={{ gap: spacing.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Txt variant="h3">{t('Weight trend')}</Txt>
        <Row style={styles.segment}>
          {RANGES.map((r) => (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: range === r.key }}
              style={[styles.segmentItem, range === r.key && { backgroundColor: colors.surface }]}
            >
              <Txt variant="small" style={range === r.key && { color: colors.text, fontWeight: '700' }}>{t(r.key)}</Txt>
            </Pressable>
          ))}
        </Row>
      </Row>

      <Txt variant="muted">
        <Txt style={{ fontWeight: '700' }}>{formatWeight(selected.weight_kg, unit)}</Txt>
        {' · '}
        {shortDate(selected.logged_on)}
      </Txt>

      <View
        style={{ height: CHART_HEIGHT, direction: 'ltr' }}
        onLayout={(ev) => setWidth(ev.nativeEvent.layout.width)}
        accessibilityLabel={t('Weight trend chart')}
      >
        {/* Recessive guides: top and bottom of the range */}
        <View style={[styles.grid, { top: 0 }]} />
        <View style={[styles.grid, { top: CHART_HEIGHT }]} />

        {goalKg != null ? (
          <>
            <View style={[styles.goalLine, { top: y(goalKg) }]} />
            <Txt variant="small" style={[styles.goalLabel, { top: y(goalKg) - 18 }]}>
              {t('Goal {weight}', { weight: formatWeight(goalKg, unit) })}
            </Txt>
          </>
        ) : null}

        {width > 0
          ? points.slice(1).map((p, i) => {
              const a = points[i]!;
              const dx = p.px - a.px;
              const dy = p.py - a.py;
              const len = Math.hypot(dx, dy);
              return (
                <View
                  key={`l-${p.e.id}`}
                  style={[
                    styles.line,
                    {
                      left: (a.px + p.px) / 2 - len / 2,
                      top: (a.py + p.py) / 2 - 1,
                      width: len,
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    },
                  ]}
                />
              );
            })
          : null}

        {width > 0
          ? points.map((p) => {
              const active = p.e.id === selected.id;
              const size = active ? DOT + 4 : DOT;
              return (
                <Pressable
                  key={p.e.id}
                  onPress={() => setSelectedId(p.e.id)}
                  hitSlop={10}
                  accessibilityLabel={`${shortDate(p.e.logged_on)}: ${formatWeight(p.e.weight_kg, unit)}`}
                  style={[
                    styles.dot,
                    {
                      left: p.px - size / 2,
                      top: p.py - size / 2,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                    },
                  ]}
                />
              );
            })
          : null}
      </View>

      <Row style={{ justifyContent: 'space-between', direction: 'ltr' }}>
        <Txt variant="small">{shortDate(localDay(new Date(start)))}</Txt>
        <Txt variant="small">{shortDate(entries.at(-1)!.logged_on)}</Txt>
      </Row>
    </Card>
  );
}

const useStyles = makeStyles((colors) => ({
  hero: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5, color: colors.text },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: 8, borderRadius: radius.pill, backgroundColor: colors.accent },
  insight: { gap: spacing.xs, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentTint },
  entry: { paddingVertical: spacing.sm, gap: spacing.md },
  entryBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  segment: { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill, padding: 2, gap: 2 },
  segmentItem: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  grid: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border, opacity: 0.6 },
  goalLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 0,
    borderTopWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.success,
  },
  goalLabel: { position: 'absolute', right: 0 },
  line: { position: 'absolute', height: 2, backgroundColor: colors.accent, borderRadius: 1 },
  dot: { position: 'absolute', backgroundColor: colors.accent, borderWidth: 2, borderColor: colors.surface },
}));
