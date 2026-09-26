import { CATEGORY_COLORS, type DashboardData } from "@mony/shared-types";
import { tokens, type SemanticColorName, type TypeVariant } from "@mony/ui-tokens";
import { useNavigation } from "@react-navigation/native";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import {
  BalanceHero,
  GoalProgress,
  Initials,
  MoneyHero,
  NotebookSwitch,
  PeriodSummary,
  StatusPill,
  YearChart,
  type StatusKind,
} from "../components/domain";
import {
  AppImage,
  Button,
  Card,
  Checkbox,
  ConfirmSheet,
  IconBadge,
  IconButton,
  InlineNotice,
  MarkLoader,
  PaperSheet,
  ProgressBar,
  ScrollScreen,
  SegmentedControl,
  SelectChip,
  SheetHeader,
  Skeleton,
  Text,
  TextField,
} from "../components/ui";
import { useToastStore } from "../lib/toast-store";
import { radius, space, useTheme } from "../theme";
import { images, type ImageKey } from "../theme/images";

const SWATCHES: SemanticColorName[] = [
  "background",
  "backgroundTop",
  "surface",
  "surfaceMuted",
  "border",
  "text",
  "textMuted",
  "textSubtle",
  "primary",
  "primaryMuted",
  "brandFrom",
  "brandTo",
  "accent",
  "success",
  "successMuted",
  "warning",
  "warningMuted",
  "danger",
  "dangerMuted",
];

const STATUSES: StatusKind[] = [
  "paid",
  "toPay",
  "installmentPaid",
  "installmentOverdue",
  "debtActive",
  "debtOverdue",
  "debtPaidOff",
  "goalLate",
  "goalReached",
];

// Category colors come from data (the fixed picker palette).
const [BLUE, , GREEN, , VIOLET, , , ORANGE] = CATEGORY_COLORS;

const DEMO: DashboardData = {
  summary: {
    totalIncome: "6588.72",
    totalExpensesPaid: "3471.21",
    totalExpensesPending: "1091.53",
    balance: "3117.51",
    expenseRatio: 0.527,
  },
  previousPeriodIncomeChangePercent: 13.6,
  averageDailyExpense: "115.71",
  incompleteGoals: [],
  yearlyBreakdown: Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    income: index < 9 ? String(5200 + ((index * 731) % 1900)) : "0",
    expensesPaid: index < 9 ? String(3800 + ((index * 977) % 2400)) : "0",
  })),
};

// The style guide rendered in the app (design/style-guide.md): palette,
// type, domain components, chrome, messages, effects and primitives — to
// judge each piece in isolation.
export function DesignSystemScreen() {
  const navigation = useNavigation();
  const { colors, gradients } = useTheme();
  const [statusIndex, setStatusIndex] = useState(0);
  const [amount, setAmount] = useState("2059.45");
  const [confirm, setConfirm] = useState<"danger" | "warning" | null>(null);
  const [sheet, setSheet] = useState(false);
  const [chip, setChip] = useState("mercado");
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [checked, setChecked] = useState(true);
  const toast = useToastStore((state) => state.show);

  return (
    <ScrollScreen title="Design system" onBack={() => navigation.goBack()}>
      <Section title="Paleta">
        <View style={styles.swatches}>
          {SWATCHES.map((name) => (
            <View key={name} style={styles.swatch}>
              <View
                style={[
                  styles.swatchColor,
                  { backgroundColor: colors[name], borderColor: colors.border },
                ]}
              />
              <Text variant="caption" numberOfLines={1}>
                {name}
              </Text>
              <Text variant="caption" tone="muted">
                {colors[name]}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.gradients}>
          {(Object.keys(gradients) as Array<keyof typeof gradients>).map((name) => (
            <View key={name} style={styles.gradientItem}>
              <View style={styles.gradientSwatch}>
                <GradientSwatch colors={gradients[name]} />
              </View>
              <Text variant="caption">{name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Tipografia">
        <Card>
          {(Object.keys(tokens.typeScale) as TypeVariant[]).map((variant) => (
            <View key={variant} style={styles.typeRow}>
              <Text variant="caption" tone="muted" style={styles.typeName}>
                {variant} · {tokens.typeScale[variant].fontSize}/
                {tokens.typeScale[variant].lineHeight}
              </Text>
              <Text variant={variant} style={styles.flex}>
                {variant === "display" ||
                variant === "amountInput" ||
                variant.startsWith("numeral") ||
                variant === "odometer"
                  ? "R$ 2.059,45"
                  : "Saldo do mês"}
              </Text>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Componentes do app">
        <Label>Hero do Início</Label>
        <BalanceHero
          bleedTop={false}
          eyebrow="Bom dia,"
          name="Marina Costa"
          overlap={0}
          avatar={<Initials name="Marina Costa" size={48} variant="glass" />}
          periodControl={
            <SegmentedControl
              variant="glass"
              value={tab}
              onChange={setTab}
              options={[
                { value: "a", label: "Dia" },
                { value: "b", label: "Semana" },
                { value: "c", label: "Mês" },
              ]}
            />
          }
          notebookSwitch={<NotebookSwitch variant="glass" />}
          state={{
            kind: "ready",
            data: DEMO,
            periodLabel: "de setembro",
            comparisonLabel: "vs. agosto",
          }}
        />
        <Label>Resumo do período</Label>
        <PeriodSummary data={DEMO} />
        <Label>Metas</Label>
        <Card>
          <View style={styles.stack}>
            <GoalProgress
              title="Viagem para Salvador"
              currentAmount="3000"
              targetAmount="5000"
              targetDate="2026-07-01"
              overdue
            />
            <GoalProgress
              title="Reserva de emergência"
              currentAmount="800"
              targetAmount="10000"
              index={1}
            />
            <GoalProgress
              title="Notebook novo"
              currentAmount="4200"
              targetAmount="4200"
              completed
              index={2}
            />
          </View>
        </Card>
        <Label>Gráfico do ano</Label>
        <Card>
          <YearChart data={DEMO.yearlyBreakdown} currentMonth={9} />
        </Card>
        <Label>Status (toque na grande para trocar)</Label>
        <View style={styles.wrap}>
          {STATUSES.map((kind) => (
            <StatusPill key={kind} kind={kind} />
          ))}
        </View>
        <StatusPill
          kind={STATUSES[statusIndex % STATUSES.length] ?? "paid"}
          onPress={() => setStatusIndex((value) => value + 1)}
        />
        <Label>Caderno, avatar e valor que conta</Label>
        <View style={styles.inline}>
          <NotebookSwitch />
          <Initials name="Marina Costa" />
        </View>
        <MoneyHero value={amount} />
        <Button
          label="Trocar valor"
          size="sm"
          variant="secondary"
          fullWidth={false}
          onPress={() => setAmount((value) => (value === "2059.45" ? "-320.00" : "2059.45"))}
        />
      </Section>

      <Section title="Chrome">
        <Label>Cabeçalho de formulário</Label>
        <Card padded={false}>
          <SheetHeader title="Novo lançamento" onClose={() => undefined} />
        </Card>
        <Text variant="footnote" tone="muted">
          Tab bar e barra do topo: veja em qualquer tela real do app.
        </Text>
      </Section>

      <Section title="Mensagens">
        <View style={styles.wrap}>
          <Button
            label="Confirmação (perigo)"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => setConfirm("danger")}
          />
          <Button
            label="Confirmação (aviso)"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => setConfirm("warning")}
          />
          <Button
            label="Sheet com campo"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => setSheet(true)}
          />
          <Button
            label="Toast sucesso"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() =>
              toast("Lançamento registrado.", {
                tone: "success",
                receipt: { amount: "− R$ 212,40", detail: "Mercado" },
              })
            }
          />
          <Button
            label="Toast erro"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => toast("Não foi possível excluir. Tente novamente.")}
          />
          <Button
            label="Toast neutro"
            size="sm"
            variant="secondary"
            fullWidth={false}
            onPress={() => toast("Não há itens faltando para compartilhar.", { tone: "neutral" })}
          />
        </View>
        <InlineNotice tone="danger" message="Algo deu errado. Tente novamente." />
        <InlineNotice
          tone="warning"
          title="Falta uma categoria"
          message="Cada parcela vira uma despesa."
          action={{ label: "Criar categoria", onPress: () => undefined }}
        />
        <InlineNotice tone="success" message="Perfil atualizado com sucesso." />
        <InlineNotice
          tone="neutral"
          message="Como já há parcelas pagas, o número de parcelas não pode mais ser alterado."
        />
      </Section>

      <Section title="Efeitos">
        <Label>Espera</Label>
        <View style={styles.inline}>
          <MarkLoader size="md" color={colors.primary} />
        </View>
        <Skeleton width="70%" height={16} />
        <Skeleton width="40%" height={12} />
        <ProgressBar percent={64} />
      </Section>

      <Section title="Primitivas">
        <Button label="Lançar despesa" onPress={() => undefined} />
        <Button label="Salvar alterações" variant="secondary" onPress={() => undefined} />
        <Button label="Registrando" loading onPress={() => undefined} />
        <Button label="Excluir lançamento" variant="danger" onPress={() => undefined} />
        <Button label="Manter" variant="ghost" onPress={() => undefined} />
        <Button label="Desabilitado" disabled onPress={() => undefined} />
        <View style={styles.inline}>
          <IconButton
            icon="chevron-back"
            variant="soft"
            accessibilityLabel="Voltar"
            onPress={() => undefined}
          />
          <IconButton
            icon="notifications-outline"
            variant="soft"
            accessibilityLabel="Avisos"
            onPress={() => undefined}
          />
          <IconButton
            icon="remove"
            variant="ink"
            accessibilityLabel="Diminuir"
            onPress={() => undefined}
          />
          <IconButton
            icon="trash-outline"
            tone="danger"
            accessibilityLabel="Excluir"
            onPress={() => undefined}
          />
        </View>
        <View style={styles.inline}>
          <IconBadge icon="storefront-outline" color={GREEN} />
          <IconBadge icon="car-outline" color={VIOLET} />
          <IconBadge icon="home-outline" color={BLUE} />
          <IconBadge icon="restaurant-outline" color={ORANGE} />
        </View>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: "a", label: "Todos" },
            { value: "b", label: "Despesas" },
            { value: "c", label: "Receitas" },
          ]}
        />
        <View style={styles.wrap}>
          <SelectChip
            label="Mercado"
            icon="storefront-outline"
            iconColor={GREEN}
            selected={chip === "mercado"}
            onPress={() => setChip("mercado")}
          />
          <SelectChip
            label="Casa"
            icon="home-outline"
            iconColor={BLUE}
            selected={chip === "casa"}
            onPress={() => setChip("casa")}
          />
          <SelectChip
            label="Automática"
            dashed
            selected={chip === "auto"}
            onPress={() => setChip("auto")}
          />
        </View>
        <Checkbox label="Repetir todo mês" checked={checked} onChange={setChecked} />
        <TextField label="Descrição" placeholder="Pão de Açúcar" />
        <TextField label="E-mail" value="marina@" error="E-mail inválido" />
        <TextField label="Senha" secureToggle value="segredo123" />
        <TextField label="Placa" value="ABC1D23" editable={false} />
      </Section>

      <Section title="Espaço e raio">
        <Card>
          {(Object.entries(tokens.spacing) as Array<[string, number]>).map(([name, value]) => (
            <View key={name} style={styles.typeRow}>
              <Text variant="caption" tone="muted" style={styles.typeName}>
                {name} · {value}
              </Text>
              <View
                style={{
                  width: value,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: colors.primary,
                }}
              />
            </View>
          ))}
        </Card>
        <View style={styles.wrap}>
          {(Object.entries(tokens.radius) as Array<[string, number]>).map(([name, value]) => (
            <View
              key={name}
              style={[
                styles.radius,
                { borderRadius: Math.min(value, 28), backgroundColor: colors.surface },
              ]}
            >
              <Text variant="caption">{name}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title="Imagens">
        {(Object.keys(images) as ImageKey[]).map((name) => (
          <AppImage key={name} name={name} />
        ))}
      </Section>

      <ConfirmSheet
        visible={confirm !== null}
        tone={confirm ?? "danger"}
        title={
          confirm === "warning" ? "Desfazer o pagamento da parcela 3?" : "Excluir 3 lançamentos?"
        }
        message={
          confirm === "warning"
            ? "Ela volta a ficar a pagar."
            : "Somam − R$ 540,00 e saem das somas do período."
        }
        confirmLabel={confirm === "warning" ? "Desfazer pagamento" : "Excluir 3 lançamentos"}
        cancelLabel={confirm === "warning" ? "Voltar" : "Manter"}
        onConfirm={() => setConfirm(null)}
        onClose={() => setConfirm(null)}
      />
      <PaperSheet visible={sheet} onClose={() => setSheet(false)} title="Orçamento mensal">
        <Text variant="footnote" tone="muted">
          Apenas informativo — o app avisa quando a estimativa passa do orçamento, mas nunca
          bloqueia.
        </Text>
        <TextField label="Valor" keyboardType="number-pad" placeholder="R$ 0,00" />
        <Button label="Salvar orçamento" onPress={() => setSheet(false)} />
      </PaperSheet>
    </ScrollScreen>
  );
}

function GradientSwatch({ colors }: { colors: readonly [string, string] }) {
  return (
    <View style={styles.gradientRow}>
      <View style={[styles.flex, { backgroundColor: colors[0] }]} />
      <View style={[styles.flex, { backgroundColor: colors[1] }]} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="title2" accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

function Label({ children }: { children: ReactNode }) {
  return (
    <Text variant="subhead" tone="muted" style={styles.label}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: space.md,
    marginBottom: space["4xl"],
  },
  label: {
    marginTop: space.sm,
  },
  flex: {
    flex: 1,
  },
  stack: {
    gap: space.xl,
  },
  swatches: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  swatch: {
    width: 96,
    gap: space.xxs,
  },
  swatchColor: {
    height: 44,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  gradients: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: space.md,
  },
  gradientItem: {
    gap: space.xxs,
  },
  gradientSwatch: {
    width: 96,
    height: 36,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  gradientRow: {
    flex: 1,
    flexDirection: "row",
  },
  typeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
    paddingVertical: space.xs,
  },
  typeName: {
    width: 118,
  },
  inline: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.md,
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space.sm,
  },
  radius: {
    width: 64,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
});
